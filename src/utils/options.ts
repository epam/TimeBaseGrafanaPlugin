import { CascaderOption } from '@grafana/ui';

import { Select } from '../types';
import { FunctionDeclaration, FunctionValue, PropertyType, Schema, StreamType } from './types';
import { getSelectedFieldType, getTypeWithField, toOption, toOptionWithCustomLabel } from './utils';

export const ALL_FUNCTION = 'all';

export const getFunctionsOptions = (schemaFunctions: FunctionDeclaration[] | undefined) => {
  if (schemaFunctions == null) {
    return [];
  }
  const options: CascaderOption[] = [];
  const groups = new Set<string>();

  for (const func of schemaFunctions) {
    if (func.isAggregation && func.fields.length === 1) {
      continue;
    }
    groups.add(func.group);
  }

  groups.forEach((group) => {
    const filteredValue = schemaFunctions.filter(
      (f) => f.group === group && ((f.isAggregation && f.fields.length !== 1) || !f.isAggregation)
    );
    const values: CascaderOption[] = [];
    const names = new Set<string>(filteredValue.map((f) => f.name));
    names.forEach((name) => {
      const functions = filteredValue.filter((f) => f.name === name);
      if (functions.length === 1) {
        values.push(getOption(functions[0], false));
      } else {
        const descriptionsFun: CascaderOption[] = [];
        for (const func of functions) {
          descriptionsFun.push(getOption(func, true));
        }
        values.push({
          label: name,
          value: name,
          children: descriptionsFun,
        });
      }
    });

    values.sort(sortOptions);

    options.push({
      label: group,
      value: group,
      children: values,
    });
    options.sort(sortOptions);
  });
  return options;
};

const getOption = (func: FunctionDeclaration, isExpression: boolean) => {
  const obj: CascaderOption = toOptionWithCustomLabel(func.id, isExpression ? getFunctionTitle(func) : func.name);
  if (func.returnFields != null && func.returnFields.length > 1) {
    const children = func.returnFields.map((v) => v.constantName);
    children.unshift(ALL_FUNCTION);
    obj.children = children.map(toOption);
    obj.children.sort(sortOptions);
  } else {
    obj.title = func.doc !== '' ? func.doc : undefined;
  }
  return obj;
};

export const getAggregationFunctionsOptions = (
  schemaFunctions: FunctionDeclaration[] | undefined,
  usedAggregation: string[],
  types: Array<PropertyType | undefined>
) => {
  if (schemaFunctions == null || types == null || types.length === 0) {
    return [];
  }

  const options: CascaderOption[] = [];

  const filteredValues = schemaFunctions.filter(
    (f) => f.isAggregation && f.fields.length === 1 && !usedAggregation.includes(f.id)
  );
  const filteredValuesByType = [];
  if (types != null) {
    for (const aggregation of filteredValues) {
      const aggregationTypes: any[] = [];
      for (const field of aggregation.fields) {
        aggregationTypes.push(...field.types);
      }

      if (!types.some((type) => !aggregationTypes.includes(type))) {
        filteredValuesByType.push(aggregation);
      }
    }
  }
  const values = [];

  for (const func of filteredValuesByType) {
    const obj: CascaderOption = toOptionWithCustomLabel(func.id, func.name);
    obj.title = func.doc !== '' ? func.doc : undefined;
    values.push(obj);
  }
  values.sort(sortOptions);
  if (values.length !== 0) {
    options.push(...values);
  }
  return options;
};

export const getAvailableTypes = (select: Select, streamSchema: Schema) => {
  return select.selectedFunction == null && select.selectedRecordType != null
    ? [
        getSelectedFieldType(
          getTypeWithField(select.selectedField as string, select.selectedRecordType),
          streamSchema.types as StreamType[]
        )?.dataType,
      ]
    : getTypesReturnField(streamSchema.functions, select.selectedFunction as FunctionValue);
};

const getTypesReturnField = (schemaFunctions: FunctionDeclaration[] | undefined, funValue: FunctionValue) => {
  if (funValue == null) {
    return [];
  }
  const declaration = schemaFunctions?.find((f) => f.id === funValue.id);
  return Array.from(new Set(declaration?.returnFields.map((field) => field.type)));
};

export const sortOptions = (a: CascaderOption, b: CascaderOption) => {
  if (a.label > b.label) {
    return 1;
  }
  if (a.label < b.label) {
    return -1;
  }
  return 0;
};

export const getFunctionTitle = (declaration: FunctionDeclaration) => {
  let str = `${declaration.name}(`;
  const fields = declaration.fields.map((field) => {
    if (field.types.length === 1) {
      return `${field.types[0]}: ${field.name}`;
    }

    const isFloat =
      field.types.includes(PropertyType.DECIMAL64) ||
      field.types.includes(PropertyType.DOUBLE) ||
      field.types.includes(PropertyType.FLOAT);
    const isInteger =
      field.types.includes(PropertyType.LONG) ||
      field.types.includes(PropertyType.INT) ||
      field.types.includes(PropertyType.BYTE);
    const types: string[] = [];

    if (isFloat) {
      types.push('FLOAT');
    }
    if (isInteger) {
      types.push('INTEGER');
    }
    return `${types.join(' | ')}: ${field.name}`;
  });
  const constants = declaration.constants.map((constant) => `${constant.type}: ${constant.name}`);

  str += fields.join(', ');
  if (constants.length !== 0) {
    str += ', ';
    str += constants.join(', ');
  }
  str += ')';
  return str;
};
