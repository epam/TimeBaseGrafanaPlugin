export const FUNCTIONS_KEY = 'Functions';
export const AGGREGATIONS_KEY = 'Aggregations';
export const FIELDS_KEY = 'Fields';
export const PROPERTIES_KEY = 'Properties';
export const CHANGE_OPTION_KEY = 'Change';
export const REMOVE_OPTION_KEY = 'Remove';

export enum Operator {
  EQUALS = '=',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUALS = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUALS = '<=',
  STARTS_WITH = 'Starts with',
  ENDS_WITH = 'Ends with',
  CONTAINS = 'Contains',
  NOT_CONTAINS = 'Not contains',
  IN = 'In',
  NOT_IN = 'Not in',
}

export enum SpecialValue {
  NULL = 'Null',
  NAN = 'NaN',
  PLUS_INF = '+Infinity',
  MINUS_INF = '-Infinity',
}

export const DEFAULT_FUNCTION = 'last';
export const DATAFRAME_KEY = 'DATAFRAME';
export const COLUMN_KEY = 'COLUMN';
export const VIEWS = [DATAFRAME_KEY, 'TIMESERIES'];

export const EMPTY_SELECT = {
  selectedFunction: null,
  selectedRecordType: null,
  selectedField: null,
  selectedAggregations: [],
};
