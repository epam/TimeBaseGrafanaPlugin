import { Select } from '../types';
import { DEFAULT_FUNCTION } from './constants';
import { ALL_FUNCTION } from './options';
import { FunctionDeclaration, FunctionParameter, FunctionValue, FunctionValueBase, Schema } from './types';

export const getDefaultFunctionDescription = (schema: Schema) => {
  const lastDescription = schema?.functions.find((f) => f.name === DEFAULT_FUNCTION) as FunctionDeclaration;
  return getNewAggregationFunction(lastDescription, true);
};

export const getNewAggregationFunction = (declaration: FunctionDeclaration, parametersEmpty?: boolean) => {
  return {
    name: declaration.name,
    id: declaration.id,
    isAggregation: declaration.isAggregation,
    parameters: parametersEmpty
      ? []
      : declaration.constants.map((con) => {
          return {
            name: con.name,
            value: con.defaultValue != null && con.defaultValue !== '' ? Number(con.defaultValue) : null,
            isConstant: true,
            returnTypes: [con.type],
          } as FunctionParameter;
        }),
    as: null,
  };
};

export const getNewFunction = (declaration: FunctionDeclaration, values: string[]) => {
  const functionValue: FunctionValue = {
    name: declaration.name,
    id: declaration.id,
    isAggregation: declaration.isAggregation,
    parameters: [
      ...declaration.fields.map((f) => {
        return { name: f.name, value: null, returnTypes: f.types, isConstant: false };
      }),
      ...declaration.constants.map((f) => {
        return {
          name: f.name,
          value: f.defaultValue != null && f.defaultValue !== '' ? Number(f.defaultValue) : null,
          returnTypes: [f.type],
          isConstant: true,
        };
      }),
    ],
    as: null,
    returnFields: values[values.length - 1].includes(`${values[1]}.`) ? [] : getReturnFields(declaration, values, []),
  };

  return functionValue;
};

export const isEmptySelect = (select: Select) =>
  select.selectedField == null && select.selectedRecordType == null && select.selectedFunction == null;

export const getReturnFields = (
  declaration: FunctionDeclaration,
  values: string[],
  additional: FunctionValueBase[]
) => {
  return values[values.length - 1] === ALL_FUNCTION
    ? declaration.returnFields.map((v) => {
        return { name: v.constantName as string } as FunctionValueBase;
      })
    : [...additional, { name: values[values.length - 1] } as FunctionValueBase];
};

export const getId = (values: string[]) =>
  values.find((value) => value.includes(`${values[1]}.${values[2]}`) || value.includes(`${values[1]}.`));
