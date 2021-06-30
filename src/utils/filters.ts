import { SelectableValue } from '@grafana/data';

import { Operator, SpecialValue } from './constants';
import { DataType, PropertyType } from './types';
import { isBooleanType, isEnumType, isFloatType, isNumberType, toOption } from './utils';

const STRING_OPERATORS = [
  Operator.EQUALS,
  Operator.NOT_EQUAL,
  Operator.STARTS_WITH,
  Operator.ENDS_WITH,
  Operator.CONTAINS,
  Operator.NOT_CONTAINS,
  Operator.IN,
  Operator.NOT_IN,
];

const NUMBER_OPERATORS = [
  Operator.EQUALS,
  Operator.NOT_EQUAL,
  Operator.GREATER_THAN,
  Operator.GREATER_THAN_OR_EQUALS,
  Operator.LESS_THAN,
  Operator.LESS_THAN_OR_EQUALS,
  Operator.IN,
  Operator.NOT_IN,
];

const ENUM_OPERATORS = [Operator.EQUALS, Operator.NOT_EQUAL, Operator.IN, Operator.NOT_IN];
const BOOLEAN_OPERATORS = [Operator.EQUALS, Operator.NOT_EQUAL];
export const DEFAULT_OPERATOR = Operator.EQUALS;
export const TRUE = 'True';
export const FALSE = 'False';

export const getOperators = (type: PropertyType) => {
  if (isNumberType(type)) {
    return NUMBER_OPERATORS.map(toOption);
  }

  if (isEnumType(type)) {
    return ENUM_OPERATORS.map(toOption);
  }

  if (isBooleanType(type)) {
    return BOOLEAN_OPERATORS.map(toOption);
  }
  return STRING_OPERATORS.map(toOption);
};

export const getValues = (fieldType: DataType | undefined) => {
  if (isEnumType(fieldType?.dataType as PropertyType)) {
    return fieldType?.values;
  }

  if (isBooleanType(fieldType?.dataType as PropertyType)) {
    return [TRUE, FALSE];
  }
  return [];
};

export const getSelectedItem = (
  type: PropertyType,
  enumValues: string[] | undefined,
  filterValues: string[],
  values: Array<SelectableValue<string>>,
  selectedItem: SelectableValue<string> | undefined
) => {
  if (isEnumType(type) || isBooleanType(type)) {
    if (filterValues.length !== 0 && enumValues?.includes(filterValues[0])) {
      return toOption(filterValues[0]);
    }
  }

  if (filterValues.length !== 0 && values.find((v) => v.value === filterValues[0])) {
    return toOption(filterValues[0]);
  }

  return selectedItem == null || !values.some((v) => v.value === selectedItem.value) ? values[0] : selectedItem;
};

export const getFilterValues = (type: PropertyType, enumValues: string[]) => {
  const values: string[] = [SpecialValue.NULL];
  if (isFloatType(type)) {
    values.push(SpecialValue.NAN);
    values.push(SpecialValue.MINUS_INF);
    values.push(SpecialValue.PLUS_INF);
  }
  if (isEnumType(type) || isBooleanType(type)) {
    values.unshift(...enumValues);
  }

  if (!isEnumType(type) && !isBooleanType(type)) {
    values.unshift('Value');
  }
  return values.map(toOption);
};
