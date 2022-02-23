import {
  AppEvents,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataQueryResponseData,
  DataSourceApi,
  DataSourceInstanceSettings,
  dateTimeForTimeZone,
  Field,
  FieldType,
  MetricFindValue,
  MutableDataFrame,
  SelectableValue,
  TimeRange,
  TimeSeries,
  VariableModel,
} from '@grafana/data';
import { BackendSrvRequest, FetchResponse, getBackendSrv, SystemJS } from '@grafana/runtime';
import deepEqual from 'fast-deep-equal';
import { forkJoin, from, merge, Observable, Subject } from '@grafana/data/node_modules/rxjs';
import { map, mergeMap, toArray } from '@grafana/data/node_modules/rxjs/operators';

import { MyDataSourceOptions, TimeBaseQuery } from './types';
import { COLUMN_KEY, DATAFRAME_KEY } from './utils/constants';
import { getFilters, getFunctions, getInterval } from './utils/query';
import { getIntervals } from './utils/time-intervals';
import { Schema, TypeDef, Version } from './utils/types';
import { extractType, separateTypeAndField } from './utils/utils';
import { getReplacedValue, getVariables } from './utils/variables';
import semver from 'semver';

const HEADERS = { 'Content-Type': 'application/json' };
const GRAFANA_API_PREFIX = '/grafana/v0';
const API_PREFIX = '/api/v0';
const DATETIME_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]';
export const ALL_KEY = 'ALL()';

export class TimeBaseDataSource extends DataSourceApi<TimeBaseQuery, MyDataSourceOptions> {
  intervals: Array<SelectableValue<any>> = [];
  currentTimeRange: TimeRange | undefined;
  scopedVars: any;
  isChangeCurrentInterval = false;

  queryError: string | undefined;
  variables$: Subject<VariableModel>;
  private vars: VariableModel[] = [];
  private appEvents: any;
  private url: string | undefined;
  private previousInterval: any;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;
    this.variables$ = new Subject<VariableModel>();
    this.annotations = {};

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
        this.executeQuery(
          typeof target.rawQuery === 'string' ? target.rawQuery : '',
          options.range,
          target.variableQuery,
          target.requestType == null ? DATAFRAME_KEY : target.requestType,
          target.maxRecords
        )
      );
      return merge(...dataframes).pipe(
        toArray(),
        map((frames: DataQueryResponseData) => {
          return { data: frames };
        })
      );
    }

    const rawTargets = options.targets
      .filter((target) => target.raw)
      .map((target) =>
        this.executeQuery(
          typeof target.rawQuery === 'string' ? target.rawQuery : '',
          options.range,
          target.variableQuery,
          target.requestType == null ? DATAFRAME_KEY : target.requestType,
          target.maxRecords
        )
      );

    options.targets = options.targets
      .filter((target) => !target.raw)
      .map((target) => {
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

    const request$: Observable<FetchResponse> = this.fetchGrafanaBackend('POST', '/queries/select', options);

    request$.subscribe((event) => {
      if (event.status !== 200) {
        this.queryError = event.data.message;
      }
    });

    const otherTargets: Observable<DataQueryResponseData> = request$.pipe(
      map((response) => response.data),
      mergeMap((data: DataQueryResponseData) => data),
      map((data: DataQueryResponseData) => {
        return 'target' in data ? data : new MutableDataFrame(data);
      })
    );

    return merge(...rawTargets, otherTargets).pipe(
      toArray(),
      map((data: DataQueryResponseData[]) => {
        return { data: data };
      })
    );
  }

  async testDatasource() {
    return this.sendRequest('GET', '/')
      .then((response: FetchResponse<Version>) => {
        const versionCheckResult = TimeBaseDataSource.versionCheck(
          response.data.version,
          response.data?.timebase?.serverVersion
        );
        if (versionCheckResult.status === 'failed') {
          return versionCheckResult;
        }
        if (response.status === 200) {
          return { status: 'success', message: 'Data source is working', title: 'Success' };
        } else {
          return { status: 'failed', message: `Received status ${response.status}`, title: 'Error' };
        }
      })
      .catch((er: HttpError) => {
        return { status: 'failed', message: er.data.error_description, title: 'Error' };
      });
  }

  private static versionCheck(
    webAdminVersion: string,
    serverVersion?: string
  ): { status: string; message: string; title: string } {
    if (semver.lt(webAdminVersion, '0.5.5')) {
      return {
        status: 'failed',
        message: `You're using old TimeBase WebAdmin version:
           (${webAdminVersion}). Some features could be unstable. Please install version >= 0.5.5`,
        title: 'Error',
      };
    }
    if (serverVersion != null && semver.lt(serverVersion, '5.5.6')) {
      return {
        status: 'failed',
        message: `You're using old TimeBase server version:
           (${serverVersion}). Some features could be unstable. Please install version >= 5.5.6`,
        title: 'Error',
      };
    }
    return {
      status: 'success',
      message: '',
      title: 'Success',
    };
  }

  async metricFindQuery(query: string, options?: any): Promise<MetricFindValue[]> {
    const response = await this.executeVariableQuery(getReplacedValue(query, this.scopedVars));
    if (response.error != null) {
      this.createAlert(response.error.data?.message || response.error.message);
      return [];
    }
    if (response.dataframe == null) {
      return [];
    }
    const fields = response.dataframe.fields.filter((field) => field.name === '__var');
    if (fields.length === 0) {
      this.createAlert(
        "To use some field as variable you should name it '__var'. Example: select symbol as '__var' from stream"
      );
      return [];
    }
    const field: Field = fields[0];
    return field.values.toArray().map((value) => ({ text: value }));
  }

  getGroupByViewOptions() {
    return this.sendGrafanaRequest('GET', '/groupByViewOptions').then((result) => result.data);
  }

  getStreams(template: string, offset: number): Promise<{ list: string[]; hasMore: boolean }> {
    const templateStream = getReplacedValue(template, this.scopedVars);
    return this.sendGrafanaRequest('GET', `/streams?template=${templateStream}&offset=${offset}&limit=50`)
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
    return this.sendGrafanaRequest(
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
    return this.sendGrafanaRequest('GET', `/schema?stream=${getReplacedValue(stream, this.scopedVars)}`)
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

  rawQuery(query: string, range: TimeRange, variableQuery: boolean, rows?: number): Observable<any[]> {
    return this.fetch('POST', '/query', {
      query: getReplacedValue(query, this.scopedVars),
      from: variableQuery ? null : range.from.utc().format(DATETIME_FORMAT),
      to: variableQuery ? null : range.to.utc().format(DATETIME_FORMAT),
      rows: rows,
    }).pipe(map((response: FetchResponse<any[]>) => response.data));
  }

  variableQuery(query: string): Observable<any[]> {
    return this.fetch('POST', '/query', {
      query: getReplacedValue(query, this.scopedVars),
      from: null,
      to: null,
    }).pipe(map((response: FetchResponse<any[]>) => response.data));
  }

  executeVariableQuery(query: string): Promise<{ error?: HttpError; dataframe?: DataFrame }> {
    return forkJoin({
      schema: this.describeQuery(query),
      data: this.variableQuery(query),
    })
      .pipe(
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
          return { dataframe: frame };
        })
      )
      .toPromise()
      .catch((er: HttpError) => {
        return { error: er };
      });
  }

  executeQuery(
    query: string,
    range: TimeRange,
    variableQuery: boolean,
    type: string,
    maxDataPoints?: number
  ): Observable<TimeSeries | DataFrame> {
    if (type === DATAFRAME_KEY) {
      return this.executeDataFrameQuery(query, range, variableQuery, maxDataPoints);
    } else {
      return this.executeTimeSeriesQuery(query, range, variableQuery, maxDataPoints);
    }
  }

  executeTimeSeriesQuery(
    query: string,
    range: TimeRange,
    variableQuery: boolean,
    maxDataPoints?: number
  ): Observable<TimeSeries> {
    return forkJoin({
      schema: this.describeQuery(query),
      data: this.rawQuery(query, range, variableQuery, maxDataPoints),
    }).pipe(
      map((response: { schema: TypeDef[]; data: any[] }) => {
        const numeric = new Set<string>();
        const map = new Map<string, TimeSeries>();
        map.set('symbol', {
          target: 'symbol',
          datapoints: [],
        });
        for (let typeDef of response.schema) {
          for (let field of typeDef.fields) {
            map.set(field.name, {
              target: field.name,
              datapoints: [],
            });
            if (extractType(field.type.name) === FieldType.number) {
              numeric.add(field.type.name);
            }
          }
        }
        for (let msg of response.data) {
          const timestampString: string = msg.timestamp;
          const millis: number = +timestampString.substr(20, 3);
          const timestamp: number = dateTimeForTimeZone('utc', timestampString, DATETIME_FORMAT).unix() * 1000 + millis;
          for (let key in msg) {
            if (msg.hasOwnProperty(key)) {
              map.get(key)?.datapoints.push([numeric.has(key) ? +msg[key] : msg[key], timestamp]);
            }
          }
        }
        console.log(map);
        return [...map.values()];
      }),
      mergeMap((timeSeries) => timeSeries)
    );
  }

  executeDataFrameQuery(
    query: string,
    range: TimeRange,
    variableQuery: boolean,
    maxDataPoints?: number
  ): Observable<DataFrame> {
    return forkJoin({
      schema: this.describeQuery(query),
      data: this.rawQuery(query, range, variableQuery, maxDataPoints),
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

  private sendGrafanaRequest(method: string, postfix: string, body?: any): Promise<any> {
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

  private sendRequest(
    method: string,
    postfix: string,
    body?: any,
    showSuccessAlert = false,
    showErrorAlert = false
  ): Promise<any> {
    return this.fetch(method, postfix, body, showSuccessAlert, showErrorAlert).toPromise();
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

  private fetch(
    method: string,
    postfix: string,
    body: any,
    showSuccessAlert = false,
    showErrorAlert = false
  ): Observable<FetchResponse> {
    const request: BackendSrvRequest = {
      url: this.getUrl(postfix),
      method,
      headers: HEADERS,
      showSuccessAlert: showSuccessAlert,
      showErrorAlert: showErrorAlert,
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
