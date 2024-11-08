import { DataSourceJsonData, SelectableValue } from '@grafana/data';
import { DataQuery } from '@grafana/schema';
import { FunctionValue } from './utils/types';

export interface MyQuery extends DataQuery {
  queryText?: string;
  constant: number;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  constant: 6.5,
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}


export interface TimeBaseQuery extends DataQuery {
  selectedStream: string | null | undefined;
  selectedSymbol: string | null;
  selectedInterval: SelectableValue<number> | null;
  selects: Select[];
  filters: Filter[];
  selectedGroups: string[];
  selectedOption: string | null | undefined;
  requestType: string | null | undefined;
  raw: boolean | null | undefined;
  rawQuery: string | string[] | number;
  variableQuery: boolean;
  maxRecords: number;
}

export interface Select {
  selectedRecordType: string | null;
  selectedField: string | null;
  selectedFunction: FunctionValue | null;
  selectedAggregations: FunctionValue[];
}

export interface Filter {
  field: string;
  values: string[];
  operator: string;
}

export interface MyDataSourceOptions extends DataSourceJsonData {
  timebaseUrl?: string;
  timebaseUser?: string;
}

export interface TimeBaseVariableQuery {
  rawQuery: string;
}

