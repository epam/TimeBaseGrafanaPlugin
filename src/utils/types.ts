export interface StreamType {
  fields: Field[];
  type: string;
}
export interface Schema {
  functions: FunctionDeclaration[];
  types: StreamType[];
}
export interface Field {
  fieldType: DataType;
  name: string;
}
export interface DataType {
  dataType: PropertyType;
  values?: string[];
}

export interface FunctionDeclaration {
  name: string;
  id: string;
  doc: string;
  group: string;
  isAggregation: boolean;
  fields: FieldArgumentDef[];
  constants: ConstantArgumentDef[];
  returnFields: ReturnValueDef[];
}

export interface FieldArgumentDef {
  name: string;
  types: PropertyType[];
}
interface ConstantArgumentDef {
  name: string;
  type: PropertyType;
  defaultValue?: string;
  min?: string;
  max?: string;
}

interface ReturnValueDef {
  type: PropertyType;
  constantName?: string;
}

export interface FunctionValue extends FunctionValueBase {
  id: string;
  parameters: FunctionParameter[];
  returnFields?: FunctionValueBase[];
}

export interface FunctionValueBase {
  name: string;
  isAggregation: boolean;
  as: string | undefined | null;
}

export interface FunctionParameter {
  name: string;
  value: number | string | null | FunctionValue;
  returnTypes: PropertyType[];
  isConstant: boolean;
  invalid?: boolean;
}

export enum PropertyType {
  ENUM = 'ENUM',
  DECIMAL64 = 'DECIMAL64',
  INT = 'INT',
  LONG = 'LONG',
  VARCHAR = 'VARCHAR',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  SHORT = 'SHORT',
  BYTE = 'BYTE',
  BOOLEAN = 'BOOLEAN',
}

export interface DataTypeDef {
  encoding?: string;
  nullable: boolean;
  name: string;
  types?: string[];
  elementType?: DataTypeDef;
}

export interface FieldDef {
  name: string;
  title?: string;
  hide: boolean;
  type: DataTypeDef;
  static: boolean;
  value?: string;
}

export interface TypeDef {
  name: string;
  title?: string;
  isEnum: boolean;
  isAbstract: boolean;
  fields: FieldDef[];
  parent: string;
}

export interface TimeBase {
  clientVersion: string;
  serverVersion: string;
}

export interface Version {
  name: string;
  version: string;
  timestamp: number;
  authentication: boolean;
  timebase: TimeBase;
}
