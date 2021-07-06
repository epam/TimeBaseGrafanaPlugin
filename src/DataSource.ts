import {
  AnnotationSupport,
  AppEvents,
  ArrayVector,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
  SelectableValue,
  StandardVariableQuery,
  StandardVariableSupport,
  TimeRange,
  VariableModel,
} from '@grafana/data';
import { BackendSrvRequest, getBackendSrv, SystemJS, FetchResponse } from '@grafana/runtime';
import deepEqual from 'fast-deep-equal';
import { forkJoin, from, Observable, Subject, merge } from '@grafana/data/node_modules/rxjs';
import { map, toArray } from '@grafana/data/node_modules/rxjs/operators';

import { MyDataSourceOptions, TimeBaseQuery, TimeBaseVariableQuery } from './types';
import { COLUMN_KEY, DATAFRAME_KEY } from './utils/constants';
import { getFilters, getFunctions, getInterval } from './utils/query';
import { getIntervals } from './utils/time-intervals';
import { Schema, TypeDef } from './utils/types';
import { extractType, separateTypeAndField } from './utils/utils';
import { getReplacedValue, getVariables } from './utils/variables';

const HEADERS = { 'Content-Type': 'application/json' };
const GRAFANA_API_PREFIX = '/grafana/v0';
const API_PREFIX = '/api/v0';
const DATETIME_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]';
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
  currentTimeRange: TimeRange | undefined;
  scopedVars: any;
  isChangeCurrentInterval = false;

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

  query(options: DataQueryRequest<TimeBaseQuery>): Observable<DataQueryResponse> {
    this.isChangeCurrentInterval = isChangeInterval(this.currentTimeRange, options.range);
    this.scopedVars = options.scopedVars;
    this.currentTimeRange = options.range;
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
      return new Observable((subscriber) => {
        subscriber.next({ data: [] });
      });
      // return { data: [] };
    } else if (options.targets.every((target) => target.raw)) {
      const dataframes = options.targets.map((target) =>
        this.executeQuery(typeof target.rawQuery === 'string' ? target.rawQuery : '', options.range)
      );
      return merge(...dataframes).pipe(
        toArray(),
        map((frames: DataFrame[]) => {
          return { data: frames };
        })
      );
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
        this.isChangeCurrentInterval,
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

    const request$ = this.fetchGrafanaBackend('POST', '/queries/select', options);
    request$.subscribe((event) => {
      if (event.status !== 200) {
        this.queryError = event.data.message;
      }
    });
    return request$.pipe(
      map((result) => {
        for (const dataFrame of result.data) {
          if (dataFrame.fields != null) {
            for (const field of dataFrame.fields) {
              field.values = new ArrayVector(field.values);
            }
          }
        }
        return result;
      })
    );
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
      .fetch({
        url: this.getGrafanaUrl('/'),
        method: 'GET',
        headers: HEADERS,
      })
      .toPromise()
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

  describeQuery(query: string): Observable<TypeDef[]> {
    return this.fetch('POST', '/describe', { query: getReplacedValue(query, this.scopedVars) }).pipe(
      map((response: FetchResponse<{ types: TypeDef[] }>) => response.data.types)
    );
  }

  rawQuery(query: string, range: TimeRange): Observable<any[]> {
    return this.fetch('POST', '/query', {
      query: getReplacedValue(query, this.scopedVars),
      from: range.from.utc().format(DATETIME_FORMAT),
      to: range.to.utc().format(DATETIME_FORMAT),
    }).pipe(map((response: FetchResponse<any[]>) => response.data));
  }

  executeQuery(query: string, range: TimeRange): Observable<DataFrame> {
    return forkJoin({
      schema: this.describeQuery(query),
      data: this.rawQuery(query, range),
    }).pipe(
      map((response: { schema: TypeDef[]; data: any[] }) => {
        const frame = new MutableDataFrame();
        frame.addField({
          name: 'timestamp',
          type: FieldType.time,
        });
        frame.addField({
          name: 'symbol',
          type: FieldType.string,
        });
        for (let typeDef of response.schema) {
          for (let field of typeDef.fields) {
            frame.addField({
              name: field.name,
              type: extractType(field.type.name),
            });
          }
        }
        for (let msg of response.data) {
          frame.add(msg);
        }
        return frame;
      })
    );
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
      this.isChangeCurrentInterval &&
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
      url: this.getGrafanaUrl(postfix),
      method,
      headers: HEADERS,
    };

    if (body != null) {
      option.data = body;
    }
    return getBackendSrv().fetch(option).toPromise();
  }

  private fetchGrafanaBackend(method: string, postfix: string, body?: any): Observable<FetchResponse> {
    const request: BackendSrvRequest = {
      url: this.getGrafanaUrl(postfix),
      method,
      headers: HEADERS,
    };

    if (body != null) {
      request.data = body;
    }
    return from(getBackendSrv().fetch(request));
  }

  private fetch(method: string, postfix: string, body?: any): Observable<FetchResponse> {
    const request: BackendSrvRequest = {
      url: this.getUrl(postfix),
      method,
      headers: HEADERS,
    };

    if (body != null) {
      request.data = body;
    }
    return from(getBackendSrv().fetch(request));
  }

  private getUrl(postfix: string): string {
    return `${this.url}${API_PREFIX}${postfix}`;
  }

  private getGrafanaUrl(postfix: string): string {
    return `${this.url}${GRAFANA_API_PREFIX}${postfix}`;
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
