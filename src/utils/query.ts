import { Filter, Select } from '../types';
import { getValue } from '../view/TimeGrouping/TimeGrouping';
import { Operator } from './constants';
import { FunctionParameter, FunctionValue } from './types';
import { getServerFilterType, separateTypeAndField } from './utils';
import { getReplacedValue } from './variables';

export const getFunctions = (selects: Select[], scopedVars: { [key: string]: any }) => {
  const functions = [];
  for (const select of selects) {
    if (
      select.selectedAggregations.length === 0 &&
      (select.selectedFunction == null || !select.selectedFunction.isAggregation)
    ) {
      continue;
    }

    if (select.selectedFunction != null) {
      if (select.selectedAggregations.length === 0) {
        const mainFunction: any = {
          id: select.selectedFunction.id,
          name: select.selectedFunction.name,
          fieldArgs: [],
        };
        let resultField = getStartExpression(mainFunction.name, '');
        resultField += ')';
        mainFunction.resultField = getReturnFields(select.selectedFunction, resultField, mainFunction);

        functions.push(mainFunction);
      } else {
        functions.push(...getRequestForNonAggregationFunction(select, scopedVars));
      }
    } else {
      if (select.selectedRecordType == null) {
        continue;
      }
      functions.push(...getRequestForField(select, scopedVars));
    }
  }
  return functions;
};

const getRequestForNonAggregationFunction = (select: Select, scopedVars: { [key: string]: any }): any[] => {
  const result = [];
  const selectedFunction = select.selectedFunction as FunctionValue;

  for (const aggregation of select.selectedAggregations) {
    const mainFunction: any = {
      id: aggregation.id,
      name: aggregation.name,
      fieldArgs: [],
      constantArgs: {},
    };
    const constantArgs = addConstantToAggregation(aggregation.parameters, scopedVars);
    if (aggregation.parameters.length !== Object.keys(constantArgs).length) {
      continue;
    } else {
      mainFunction.constantArgs = constantArgs;
    }

    const { nestedFunction, nestedResultField } = getNestedFunction(selectedFunction, aggregation);
    if (nestedFunction == null) {
      continue;
    }
    const constantKeysLength = Object.keys(nestedFunction.function.constantArgs).length;
    if (
      (nestedFunction.function.fieldArgs.length === 0 &&
        constantKeysLength === 0 &&
        selectedFunction.returnFields == null) ||
      nestedFunction.function.fieldArgs.length + constantKeysLength !== selectedFunction.parameters.length
    ) {
      return [{ nestedFunction: null, nestedResultField: null }];
    }
    mainFunction.fieldArgs.push(nestedFunction);
    mainFunction.resultField = nestedResultField;
    result.push(mainFunction);
  }
  return result;
};

const getRequestForField = (select: Select, scopedVars: { [key: string]: any }) => {
  const result = [];

  for (const aggregation of select.selectedAggregations) {
    let resultField = getStartExpression(aggregation.name, `${select.selectedRecordType}:${select.selectedField}`);
    const obj = {
      id: aggregation.id,
      name: aggregation.name,
      fieldArgs: [
        {
          field: {
            type: select.selectedRecordType,
            name: select.selectedField,
          },
        },
      ],
    } as any;
    const constantArgs = addConstantToAggregation(aggregation.parameters, scopedVars);
    if (aggregation.parameters.length !== Object.keys(constantArgs).length) {
      continue;
    } else {
      obj.constantArgs = constantArgs;
    }

    resultField += ')';
    resultField = addAs(aggregation.as, resultField);
    obj.resultField = resultField;
    result.push(obj);
  }
  return result;
};

const getStartExpression = (aggregation: string | undefined, field: string) => {
  return `${aggregation || ''}${aggregation != null && aggregation[0] !== '(' ? '(' : ''}${field}`;
};

const addAs = (as: string | null | undefined, resultField: string) => {
  if (as != null) {
    resultField += ` as ${as}`;
  }
  return resultField;
};

export const getInterval = (
  selectedInterval: number | undefined,
  isChange: boolean,
  label: string | undefined,
  scopedVars: any
) => {
  const interval: any = {};
  if (selectedInterval === Number.MIN_VALUE) {
    interval.intervalType = 'FULL_INTERVAL';
  } else if (
    label?.match(/\$\{\w+/gi) == null &&
    (selectedInterval == null || isNaN(selectedInterval) || (selectedInterval != null && isChange))
  ) {
    interval.intervalType = 'MAX_DATA_POINTS';
  } else {
    interval.intervalType = 'MILLISECONDS';
    if (label != null && label.match(/\$\{\w+/gi) != null) {
      const currentValue = getReplacedValue(label, scopedVars);

      const numbers = currentValue.match(/\d+/gi);
      const letters = currentValue.match(/[a-zA-Z]+/gi);
      const value = getValue(numbers, letters);
      if (value != null) {
        interval.value = value;
      }
    } else {
      interval.value = selectedInterval;
    }
  }
  return interval;
};

export const getFilters = (filters: Filter[], scopedVars: { [key: string]: any }) => {
  const result: { [key: string]: any } = {};

  for (const filter of filters) {
    if (
      filter.values.length === 0 ||
      (filter.values.length === 1 && (filter.values[0] === '-' || filter.values[0] === '' || filter.values[0] == null))
    ) {
      continue;
    }
    const [type, field] = separateTypeAndField(filter.field);
    if (result[type] == null) {
      result[type] = [];
    }

    const values = filter.values.map((v) => {
      const replacedValue = getReplacedValue(v, scopedVars);
      if (v.toString() === replacedValue) {
        return v;
      }
      return replacedValue;
    });
    result[type].push({
      fieldName: field,
      filterType: getServerFilterType(filter.operator as Operator),
      values,
    });
  }
  return result;
};

const addConstantToAggregation = (parameters: FunctionParameter[], scopedVars: { [key: string]: any }) => {
  const constantArgs: any = {};
  for (const parameter of parameters) {
    if (parameter.value == null || parameter.invalid) {
      continue;
    }
    constantArgs[parameter.name] = getReplacedValue(parameter.value, scopedVars);
  }
  return constantArgs;
};

export const getNestedFunction = (selectedFunction: FunctionValue, aggregation?: FunctionValue) => {
  const nestedFunction: any = {
    function: {
      id: selectedFunction.id,
      name: selectedFunction.name,
      fieldArgs: [],
      constantArgs: {},
    },
  };

  let resultField = getStartExpression(selectedFunction.name, '');

  for (let i = 0; i < selectedFunction.parameters.length; i++) {
    const parameter = selectedFunction.parameters[i];

    if (parameter.value == null || parameter.invalid) {
      return { nestedFunction: null, nestedResultField: null };
    }
    if (parameter.isConstant) {
      nestedFunction.function.constantArgs[parameter.name] = parameter.value;
      resultField += `${i === 0 ? '' : ', '}${parameter.value}`;
    } else if (typeof parameter.value === 'string') {
      const [type, field] = separateTypeAndField(parameter.value);
      if (type == null || field == null) {
        continue;
      }
      nestedFunction.function.fieldArgs.push({
        field: {
          type,
          name: field,
        },
      });
      resultField += `${i === 0 ? '' : ', '}${parameter.value}`;
    } else {
      const obj = getNestedFunction(parameter.value as FunctionValue);
      if (obj.nestedFunction == null) {
        continue;
      }
      nestedFunction.function.fieldArgs.push(obj.nestedFunction);
      resultField += `${i === 0 ? '' : ', '}${obj.nestedResultField}`;
    }
  }

  resultField += ')';

  nestedFunction.function.resultField = getReturnFields(selectedFunction, resultField, nestedFunction.function);
  let nestedResultField = getStartExpression(aggregation?.name, nestedFunction.function.resultField);
  nestedResultField += ')';

  nestedResultField = addAs(aggregation?.as, nestedResultField);
  const constantKeysLength = Object.keys(nestedFunction.function.constantArgs).length;
  if (
    (nestedFunction.function.fieldArgs.length === 0 &&
      constantKeysLength === 0 &&
      selectedFunction.returnFields == null) ||
    nestedFunction.function.fieldArgs.length + constantKeysLength !== selectedFunction.parameters.length
  ) {
    return { nestedFunction: null, nestedResultField: null };
  }
  return { nestedFunction, nestedResultField };
};

const getReturnFields = (selectedFunction: FunctionValue, resultField: string, fun: any) => {
  if (selectedFunction.returnFields != null && selectedFunction.returnFields.length !== 0) {
    resultField = fun.name;
    const mainResultField = resultField;
    fun.resultFields = {};
    selectedFunction.returnFields.forEach((v) => {
      resultField += ` ${v.name}`;
      fun.resultFields[v.name] = v.as || `${mainResultField}.${v.name}`;
    });
  }
  return selectedFunction.returnFields != null && selectedFunction.returnFields.length === 1
    ? fun.resultFields[selectedFunction.returnFields[0].name]
    : resultField;
};
