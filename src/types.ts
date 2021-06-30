import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';

import { FunctionValue } from './utils/types';

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
