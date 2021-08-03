import { FieldType, SelectableValue } from '@grafana/data';

import { Filter, Select } from '../types';
import { Operator } from './constants';
import { Field, PropertyType, StreamType } from './types';

const SEPARATOR = ' : ';

export const toOption = (value: any) => ({ label: value, value });
export const toOptionWithCustomLabel = (value: any, label: any) => ({ label, value });

export const separateTypeAndField = (value: string) => value?.split(SEPARATOR);
export const getTypeWithField = (field: string, type: string) => `${type}${SEPARATOR}${field}`;

export const getFilterFields = (schema: StreamType[] | undefined) => {
  if (schema == null) {
    return [];
  }

  const listFields = [];

  for (const obj of schema) {
    const filteredFields = obj.fields.filter(
      (field: Field) =>
        field.name !== 'symbol' &&
        (isNumberType(field.fieldType.dataType) ||
          isStringType(field.fieldType.dataType) ||
          isBooleanType(field.fieldType.dataType) ||
          isEnumType(field.fieldType.dataType))
    );
    listFields.push(...filteredFields.map((field: Field) => getTypeWithField(field.name, obj.type)));
  }

  return listFields.map(toOption);
};

export const getGroupsFields = (schema: StreamType[] | undefined) => {
  if (schema == null) {
    return [];
  }

  const listFields = [];

  for (const obj of schema) {
    const filteredFields = obj.fields.filter(
      (field: Field) => isStringType(field.fieldType.dataType) || isEnumType(field.fieldType.dataType)
    );
    listFields.push(...filteredFields.map((field: Field) => getTypeWithField(field.name, obj.type)));
  }

  return listFields.map(toOption);
};

export const getAllListFields = (schema: StreamType[] | undefined) => {
  if (schema == null) {
    return [];
  }

  const listFields = [];
  for (const obj of schema) {
    listFields.push(...obj.fields.map((field: Field) => getTypeWithField(field.name, obj.type)));
  }
  return listFields.map(toOption);
};

export const getFilteredListFields = (item: string, values: Array<SelectableValue<string>>) => {
  return values.filter((v) => v.value !== item);
};

export const getSelectedFieldType = (selectedField: string, schema: StreamType[] | undefined) => {
  const [type, field] = separateTypeAndField(selectedField);
  const recordType = schema == null ? null : schema.find((s) => s.type === type);
  if (recordType != null) {
    const fieldObject = recordType.fields.find((f) => f.name === field);
    if (fieldObject != null) {
      return fieldObject.fieldType;
    }
  }
  return;
};

export const isNumberType = (type: PropertyType) => {
  return isIntType(type) || isFloatType(type);
};

export const isIntType = (type: PropertyType) => {
  return (
    type === PropertyType.INT || type === PropertyType.LONG || type === PropertyType.BYTE || type === PropertyType.SHORT
  );
};

export const isFloatType = (type: PropertyType) => {
  return type === PropertyType.DECIMAL64 || type === PropertyType.DOUBLE;
};

export const isStringType = (type: PropertyType) => {
  return type === PropertyType.VARCHAR;
};

export const isEnumType = (type: PropertyType) => {
  return type === PropertyType.ENUM;
};

export const isBooleanType = (type: PropertyType) => {
  return type === PropertyType.BOOLEAN;
};

export const showSpecialValues = (operator: Operator) => {
  return operator === Operator.EQUALS || operator === Operator.NOT_EQUAL;
};

export const isInFilters = (operator: Operator) => {
  return operator === Operator.IN || operator === Operator.NOT_IN;
};

export const getServerFilterType = (type: Operator) => {
  switch (type) {
    case Operator.EQUALS:
      return 'EQUAL';
    case Operator.NOT_EQUAL:
      return 'NOTEQUAL';
    case Operator.GREATER_THAN:
      return 'GREATER';
    case Operator.LESS_THAN:
      return 'LESS';
    case Operator.IN:
      return 'IN';
    case Operator.NOT_IN:
      return 'NOT_IN';
    case Operator.GREATER_THAN_OR_EQUALS:
      return 'NOTLESS';
    case Operator.LESS_THAN_OR_EQUALS:
      return 'NOTGREATER';
    case Operator.STARTS_WITH:
      return 'STARTS_WITH';
    case Operator.ENDS_WITH:
      return 'ENDS_WITH';
    case Operator.CONTAINS:
      return 'CONTAINS';
    case Operator.NOT_CONTAINS:
      return 'NOT_CONTAINS';
    default:
      return 'IN';
  }
};

export const getUsedFields = (filters: Filter[], selects: Select[]) => {
  const usedFields = new Set<string>();
  for (const filter of filters) {
    usedFields.add(filter.field);
  }

  for (const sel of selects) {
    if (sel.selectedFunction != null && sel.selectedFunction.parameters.length !== 0) {
      sel.selectedFunction.parameters
        .filter((p) => typeof p.value === 'string')
        .forEach((p) => {
          usedFields.add(p.value as string);
        });
    }
    if (sel.selectedField == null || sel.selectedRecordType == null) {
      continue;
    }
    usedFields.add(getTypeWithField(sel.selectedField as string, sel.selectedRecordType as string));
  }
  return Array.from(usedFields);
};

export const getErrorForFields = (
  type: string,
  field: string,
  schemaFields: StreamType[] | undefined,
  serverError: string | undefined,
  isFilter = false
) => {
  const typeObject = schemaFields == null ? null : schemaFields.find((s) => s.type === type);
  if (typeObject == null && type !== '') {
    return `Type ${type} not found`;
  }
  const fieldObject = typeObject?.fields.find((o) => o.name === field);
  if (fieldObject == null && field !== '') {
    return `Field ${field} not found`;
  }
  if (
    isFilter &&
    serverError?.includes(type) &&
    serverError?.includes(field) &&
    serverError?.includes("Couldn't parse value")
  ) {
    return serverError;
  }
  return '';
};

export const extractType = (dataType: string) => {
  if (dataType === 'INTEGER' || dataType === 'FLOAT') {
    return FieldType.number;
  } else if (dataType === 'BOOLEAN') {
    return FieldType.boolean;
  } else if (dataType === 'VARCHAR' || dataType === 'CHAR') {
    return FieldType.string;
  } else if (dataType === 'TIMESTAMP') {
    return FieldType.time;
  } else if (
    dataType === 'BINARY' ||
    dataType === 'TIMEOFDAY' ||
    dataType.startsWith('OBJECT') ||
    dataType.startsWith('ARRAY')
  ) {
    return FieldType.other;
  } else {
    return FieldType.string; // for enums
  }
};
