import {
  AppEvents,
  ArrayVector,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  SelectableValue,
  TimeRange,
  VariableModel,
  StandardVariableSupport,
  StandardVariableQuery,
  AnnotationSupport,
} from '@grafana/data';
import { BackendSrvRequest, getBackendSrv, SystemJS } from '@grafana/runtime';
import deepEqual from 'fast-deep-equal';
import { Subject } from 'rxjs';

import { MyDataSourceOptions, TimeBaseQuery, TimeBaseVariableQuery } from './types';
import { COLUMN_KEY, DATAFRAME_KEY } from './utils/constants';
import { getFilters, getFunctions, getInterval } from './utils/query';
import { getIntervals } from './utils/time-intervals';
import { Schema } from './utils/types';
import { separateTypeAndField } from './utils/utils';
import { getReplacedValue, getVariables } from './utils/variables';

const HEADERS = { 'Content-Type': 'application/json' };
const PREFIX = '/grafana/v0';
export const ALL_KEY = 'ALL()';

export class VariableSupport extends StandardVariableSupport<DataSourceApi<TimeBaseQuery, MyDataSourceOptions>> {
  toDataQuery(query: StandardVariableQuery): TimeBaseQuery {
    return {
      filters: [],
      variableQuery: true,
      raw: true,
      rawQuery: query.query,
      refId: query.refId,
      requestType: undefined,
      selectedGroups: [],
      selectedInterval: null,
      selectedOption: undefined,
      selectedStream: undefined,
      selectedSymbol: null,
      selects: [],
    };
  }
}

export class DataSource extends DataSourceApi<TimeBaseQuery, MyDataSourceOptions> {
  intervals: Array<SelectableValue<any>> = [];
  currencyTimeRange: TimeRange | undefined;
  scopedVars: any;
  isChangeCurrencyInterval = false;

  annotations: AnnotationSupport<TimeBaseQuery> = {};
  queryError: string | undefined;
  variables$ = new Subject<VariableModel>();
  variables: VariableSupport = new VariableSupport();
  private vars: VariableModel[] = [];
  private appEvents: any;
  private url: string | undefined;
  private previousInterval: any;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;

    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      (HEADERS as any)['Authorization'] = instanceSettings.basicAuth;
    }

    SystemJS.load('app/core/app_events').then((appEvents: any) => {
      this.appEvents = appEvents;
    });
  }

  async query(options: DataQueryRequest<TimeBaseQuery>): Promise<DataQueryResponse> {
    this.isChangeCurrencyInterval = isChangeInterval(this.currencyTimeRange, options.range);
    this.scopedVars = options.scopedVars;
    this.currencyTimeRange = options.range;
    this.emitChangeVariables();

    if (
      options.targets.some(
        (target) =>
          !target.raw &&
          (target.selectedStream == null ||
            (target.selectedInterval != null &&
              target.selectedInterval.isCustom &&
              target.selectedInterval.value == null &&
              target.selectedInterval.label?.match(/\$\{\w+/gi) == null))
      )
    ) {
      this.intervals = getIntervals(options.maxDataPoints as any, options.range);
      return { data: [] };
    }

    options.targets = options.targets.map((target) => {
      if (target.raw) {
        return {
          refId: target.refId,
          raw: true,
          rawQuery: getReplacedValue(target.rawQuery, options.scopedVars),
          variableQuery: target.variableQuery,
          view: target.requestType == null ? DATAFRAME_KEY : target.requestType,
        } as any;
      }
      const interval: any = getInterval(
        target.selectedInterval?.value,
        this.isChangeCurrencyInterval,
        target.selectedInterval?.label,
        this.scopedVars
      );
      this.createIntervalChangeAlert(
        interval,
        target.selectedInterval?.isCustom ? null : target.selectedInterval?.value
      );

      return {
        refId: target.refId,
        stream: getReplacedValue(target.selectedStream, options.scopedVars),
        queryType: 'CUSTOM',
        view: target.requestType == null ? DATAFRAME_KEY : target.requestType,
        symbols:
          target.selectedSymbol != null && target.selectedSymbol !== '' && target.selectedSymbol !== ALL_KEY
            ? [getReplacedValue(target.selectedSymbol, options.scopedVars)]
            : [],
        hide: target.hide,
        types: [],
        functions: getFunctions(target.selects, options.scopedVars),
        interval,
        filters: getFilters(target.filters, options.scopedVars),
        groupBy:
          target.selectedGroups == null
            ? []
            : target.selectedGroups.map((group: string) => {
                const [type, field] = separateTypeAndField(group);
                return { type, name: field };
              }),
        groupByView: target.selectedGroups == null ? null : target.selectedOption || COLUMN_KEY,
        rawQuery: getReplacedValue(target.rawQuery, options.scopedVars),
        raw: target.raw,
        variableQuery: target.variableQuery,
      } as any;
    });
    this.intervals = getIntervals(options.maxDataPoints as any, options.range);
    const request$ = this.sendRequest('POST', '/queries/select', options);
    request$
      .then(() => {
        this.queryError = undefined;
      })
      .catch((er: HttpError) => {
        this.queryError = er.data.message;
      });

    return request$.then((result) => {
      for (const dataFrame of result.data) {
        if (dataFrame.fields != null) {
          for (const field of dataFrame.fields) {
            field.values = new ArrayVector(field.values);
          }
        }
      }
      return result;
    });
  }

  async variableQuery(rawQuery: string): Promise<DataQueryResponse> {
    const options = {
      rawQuery: rawQuery,
    };
    const request$ = this.sendRequest('POST', '/queries/variables', options);
    request$
      .then(() => {
        this.queryError = undefined;
      })
      .catch((er: HttpError) => {
        this.queryError = er.data.message;
      });

    return request$.then((result) => {
      for (const dataFrame of result.data) {
        if (dataFrame.fields != null) {
          for (const field of dataFrame.fields) {
            field.values = new ArrayVector(field.values);
          }
        }
      }
      return result;
    });
  }

  async testDatasource() {
    return getBackendSrv()
      .datasourceRequest({
        url: this.getUrl('/'),
        method: 'GET',
        headers: HEADERS,
      })
      .then((response: { status: number }) => {
        if (response.status === 200) {
          return { status: 'success', message: 'Data source is working', title: 'Success' };
        }

        return;
      })
      .catch((er: HttpError) => {
        return { status: 'failed', message: er.data.error_description, title: 'Error' };
      });
  }

  async metricFindQuery(query: TimeBaseVariableQuery, options?: any) {
    const response = await this.variableQuery(query.rawQuery);
    return response.data.map((frame) => ({ text: frame.name }));
  }

  getGroupByViewOptions() {
    return this.sendRequest('GET', '/groupByViewOptions').then((result) => result.data);
  }

  getStreams(template: string, offset: number): Promise<{ list: string[]; hasMore: boolean }> {
    const templateStream = getReplacedValue(template, this.scopedVars);
    return this.sendRequest('GET', `/streams?template=${templateStream}&offset=${offset}&limit=50`)
      .then((result) => result.data)
      .catch((er: HttpError) => {
        if (er.status !== 400) {
          this.createAlert(er.data?.message || er.message);
        }
      });
  }

  getSymbols(template: string, stream: string, offset: number): Promise<{ list: string[]; hasMore: boolean }> {
    const templateStream = getReplacedValue(stream, this.scopedVars);
    const templateSymbol = getReplacedValue(template, this.scopedVars);
    return this.sendRequest(
      'GET',
      `/symbols?template=${templateSymbol}&stream=${templateStream}&offset=${offset}&limit=50`
    )
      .then((result) => result.data)
      .catch((er: HttpError) => {
        if (er.status !== 400) {
          this.createAlert(er.data?.message || er.message);
        }
      });
  }

  getStreamSchema(stream: string): Promise<Schema> {
    return this.sendRequest('GET', `/schema?stream=${getReplacedValue(stream, this.scopedVars)}`)
      .then((result) => result.data)
      .catch((er: HttpError) => {
        if (er.status !== 400) {
          this.createAlert(er.data?.message || er.message);
        }
      });
  }

  private emitChangeVariables() {
    const newVariables = getVariables();
    if (this.vars != null && this.vars.length === newVariables.length) {
      const modifiedVariables = newVariables.find((v, i) => !deepEqual(this.vars[i], v));
      if (modifiedVariables != null) {
        this.variables$.next(modifiedVariables);
      }
    }
    this.vars = getVariables();
  }

  private createIntervalChangeAlert(interval: any, selectedInterval: number | undefined | null) {
    if (
      this.isChangeCurrencyInterval &&
      interval.intervalType === 'MAX_DATA_POINTS' &&
      selectedInterval != null &&
      !isNaN(selectedInterval) &&
      this.previousInterval !== selectedInterval
    ) {
      this.previousInterval = selectedInterval;
      this.createAlert('Selected grouping by time is reset due to time interval change.');
    }
  }

  private createAlert(text: string) {
    this.appEvents.emit(AppEvents.alertWarning, [text]);
  }

  private sendRequest(method: string, postfix: string, body?: any): Promise<any> {
    const option: BackendSrvRequest = {
      url: this.getUrl(postfix),
      method,
      headers: HEADERS,
    };

    if (body != null) {
      option.data = body;
    }
    return getBackendSrv().datasourceRequest(option);
  }

  private getUrl(postfix: string): string {
    return `${this.url}${PREFIX}${postfix}`;
  }
}

const isChangeInterval = (currencyInterval: any, range: any) => {
  if (currencyInterval == null) {
    return false;
  }
  let equalTo = false;
  if (typeof range.raw.to === 'string' && typeof currencyInterval.raw.to === 'string') {
    equalTo = currencyInterval.raw.to === range.raw.to;
  } else if (typeof range.raw.to !== 'string' && typeof currencyInterval.raw.to !== 'string') {
    equalTo = currencyInterval.raw.to.isSame(range.raw.to);
  }
  let equalFrom = false;
  if (typeof range.raw.from === 'string' && typeof currencyInterval.raw.from === 'string') {
    equalFrom = currencyInterval.raw.from === range.raw.from;
  } else if (typeof range.raw.from !== 'string' && typeof currencyInterval.raw.from !== 'string') {
    equalFrom = currencyInterval.raw.from.isSame(range.raw.from);
  }
  return !equalTo || !equalFrom;
};

interface HttpError {
  status: number;
  message: string;
  data: { error_description: string; message: string };
}
