import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { CascaderOption, TextArea } from '@grafana/ui';
import { css, cx } from 'emotion';
import React, { PureComponent } from 'react';

import { ALL_KEY, DataSource } from './DataSource';
import { MyDataSourceOptions, TimeBaseQuery } from './types';
import {
  AGGREGATIONS_KEY,
  COLUMN_KEY,
  DATAFRAME_KEY,
  EMPTY_SELECT,
  FIELDS_KEY,
  FUNCTIONS_KEY,
  PROPERTIES_KEY,
  VIEWS,
} from './utils/constants';
import { DEFAULT_OPERATOR } from './utils/filters';
import {
  getDefaultFunctionDescription,
  getId,
  getNewAggregationFunction,
  getNewFunction,
  getReturnFields,
  isEmptySelect,
} from './utils/functions';
import { getAggregationFunctionsOptions, getAvailableTypes, getFunctionsOptions } from './utils/options';
import { commonStyles } from './utils/styles';
import { SPECIAL_VALUES } from './utils/time-intervals';
import { FunctionDeclaration, FunctionValue, Schema } from './utils/types';
import {
  getAllListFields,
  getErrorForFields,
  getFilteredListFields,
  getFilterFields,
  getGroupsFields,
  getSelectedFieldType,
  getTypeWithField,
  getUsedFields,
  separateTypeAndField,
  toOption,
} from './utils/utils';
import { getReplacedValue, usedInQuery } from './utils/variables';
import { FieldLabel } from './view/FieldLabels/FieldLabels';
import { FieldValidation } from './view/FieldValidation/FieldValidation';
import { SegmentFrameFilter } from './view/Filter/Filter';
import { FunctionComponent } from './view/Function/Function';
import { SegmentFrame } from './view/SegmentFrame/SegmentFrame';
import { CustomSelect } from './view/SegmentSelect/CustomAsyncSelect';
import { SegmentSelect } from './view/SegmentSelect/SegmentSelect';
import { TimeGrouping } from './view/TimeGrouping/TimeGrouping';
import { QueryEditorModeSwitcher } from './QueryEditorModeSwitcher';

interface QueryEditorState {
  validStreamControl: boolean;
  selectedStream: SelectableValue<string> | undefined;
  validSymbolControl: boolean;
  selectedSymbol: SelectableValue<string> | undefined;
  schema: Schema | undefined;
  groupByViewOptions: Array<SelectableValue<string>>;

  invalidFieldsMap: { [key: string]: boolean };
}

export class QueryEditor extends PureComponent<
  QueryEditorProps<DataSource, TimeBaseQuery, MyDataSourceOptions>,
  QueryEditorState
> {
  state: QueryEditorState = {
    validStreamControl: true,
    selectedStream: void 0,
    validSymbolControl: true,
    selectedSymbol: void 0,
    schema: void 0,
    groupByViewOptions: [],

    invalidFieldsMap: {},
  };

  componentDidMount() {
    this.props.datasource.getGroupByViewOptions().then((options) => {
      this.setState({
        ...this.state,
        groupByViewOptions: options.map(toOption),
      });
    });

    if (this.props.query.selectedStream != null) {
      this.restoreView();
    }

    this.props.datasource.variables$.subscribe((variable) => {
      if (usedInQuery(variable.name, this.props.query)) {
        this.restoreView();
      }
    });
  }

  static getDerivedStateFromProps(nextProps: QueryEditorProps<DataSource, TimeBaseQuery, MyDataSourceOptions>) {
    return {
      selectedStream: nextProps.query.selectedStream == null ? null : toOption(nextProps.query.selectedStream),
      selectedSymbol: nextProps.query.selectedSymbol == null ? null : toOption(nextProps.query.selectedSymbol),
    };
  }

  loadStreams = (search: string, loadedOptions: any[]) => {
    return this.props.datasource.getStreams(search == null ? '' : search, loadedOptions.length).then((response) => {
      return {
        options: response.list.map(toOption),
        hasMore: response.hasMore,
      };
    });
  };

  loadSymbols = (search: string, loadedOptions: any[]) => {
    return this.props.datasource
      .getSymbols(
        search || '',
        (this.state.selectedStream as SelectableValue<string>).value as string,
        loadedOptions.length
      )
      .then((response) => {
        if (loadedOptions.length === 0) {
          response.list.unshift(ALL_KEY);
        }

        return {
          options: response.list.map(toOption),
          hasMore: response.hasMore,
        };
      });
  };

  getSelectOptions = (index: number) => {
    if (this.props.query.selects == null || this.props.query.selects[index] == null) {
      return;
    }

    const result = [
      { label: FIELDS_KEY, value: FIELDS_KEY, children: getFilterFields(this.state.schema?.types) },
      { label: FUNCTIONS_KEY, value: FUNCTIONS_KEY, children: getFunctionsOptions(this.state.schema?.functions) },
    ];
    const select = this.props.query.selects[index];

    if ((select.selectedFunction == null || !select.selectedFunction.isAggregation) && this.state.schema != null) {
      const aggregations = getAggregationFunctionsOptions(
        this.state.schema.functions,
        select.selectedAggregations.map((v) => v.id),
        getAvailableTypes(select, this.state.schema)
      );

      if (aggregations.length !== 0) {
        result.unshift({
          label: AGGREGATIONS_KEY,
          value: AGGREGATIONS_KEY,
          children: aggregations,
        });
      }
    }

    if (
      select.selectedFunction != null &&
      select.selectedFunction.returnFields != null &&
      select.selectedFunction.returnFields.length !== 0
    ) {
      const description = this.state.schema?.functions?.find((f) => f.id === select.selectedFunction?.id);

      if (description != null && description.returnFields != null) {
        const names = select.selectedFunction.returnFields.map((v) => v.name);
        const filteredValue = description.returnFields.filter((v) => !names.includes(v.constantName as string));
        if (filteredValue.length !== 0) {
          result.unshift({
            label: PROPERTIES_KEY,
            value: PROPERTIES_KEY,
            children: filteredValue.map((v) => v.constantName).map(toOption),
          });
        }
      }
    }

    return result as CascaderOption[];
  };

  onChangeStream = (selectedStream: SelectableValue<string>) => {
    this.props.onChange({
      ...this.props.query,
      selectedStream: selectedStream?.value,
    });
    this.fillMainData(selectedStream.value as string);
  };

  addGroup = (selectedGroup: string[]) => {
    if (this.props.query.selectedGroups == null) {
      this.props.query.selectedGroups = [];
    }

    this.props.query.selectedGroups.push(selectedGroup[0]);
    this.props.onChange({ ...this.props.query });
    this.requestData();
  };

  addSelectSection = (values: string[], index: number | undefined) => {
    if (values.length === 1) {
      return;
    }
    let select = this.props.query.selects[index as number];

    if (values[0] === AGGREGATIONS_KEY) {
      const newAggregationId = values[values.length - 1];
      const description = this.state.schema?.functions.find((f) => f.id === newAggregationId) as FunctionDeclaration;
      const newAggregation = getNewAggregationFunction(description);

      if (select.selectedAggregations == null) {
        select.selectedAggregations = [];
      }
      select.selectedAggregations.push(newAggregation);
    }

    if (values[0] === FIELDS_KEY) {
      const newField = values[values.length - 1];
      const [type, filed] = separateTypeAndField(newField);
      const obj = {
        selectedField: filed,
        selectedRecordType: type,
        selectedAggregations: [getDefaultFunctionDescription(this.state.schema as Schema)],
        selectedFunction: null,
      };
      if (isEmptySelect(select)) {
        select.selectedField = obj.selectedField;
        select.selectedRecordType = obj.selectedRecordType;
        select.selectedAggregations = obj.selectedAggregations;
      } else {
        this.props.query.selects.push(obj);
      }
    }

    if (values[0] === FUNCTIONS_KEY) {
      const newFuncId = getId(values);
      const declaration = this.state.schema?.functions.find((f) => f.id === newFuncId) as FunctionDeclaration;
      const functionValue = getNewFunction(declaration, values);
      const obj = {
        selectedAggregations: declaration.isAggregation
          ? []
          : [getDefaultFunctionDescription(this.state.schema as Schema)],
        selectedField: null,
        selectedRecordType: null,
        selectedFunction: functionValue,
      };
      if (isEmptySelect(select)) {
        select.selectedField = obj.selectedField;
        select.selectedRecordType = obj.selectedRecordType;
        select.selectedAggregations = obj.selectedAggregations;
        select.selectedFunction = obj.selectedFunction;
      } else {
        this.props.query.selects.push(obj);
      }
    }

    if (values[0] === PROPERTIES_KEY && select.selectedFunction != null) {
      const newFuncId = values.length !== 3 ? values[2] : values[values.length - 1];
      const declaration = this.state.schema?.functions.find((f) => f.id === newFuncId) as FunctionDeclaration;

      select.selectedFunction.returnFields = getReturnFields(
        declaration,
        values,
        select.selectedFunction.returnFields || []
      );
      select.selectedFunction = { ...select.selectedFunction };
    }

    this.rewriteSelects();
    this.requestData();
  };

  changeAggregation = (index: number, aggregation: FunctionValue) => {
    const select = this.props.query.selects[index];
    const objectIndex = select.selectedAggregations.findIndex((v) => v.id === aggregation.id);
    select.selectedAggregations.splice(objectIndex, 1, aggregation);

    this.rewriteSelects();
    this.requestData();
  };

  removeAggregation = (item: string, index: number) => {
    const select = this.props.query.selects[index];
    select.selectedAggregations = select.selectedAggregations.filter((v) => v.id !== item);
    this.rewriteSelects();
    this.requestData();
  };

  removeField = (index: number) => {
    this.props.query.selects.splice(index, 1);
    if (this.props.query.selects.length === 0) {
      this.props.query.selects.push({ ...EMPTY_SELECT });
    }
    this.rewriteSelects();
    this.requestData();
  };

  removeGroup = (index: number) => {
    this.props.query.selectedGroups.splice(index, 1);
    this.props.onChange({
      ...this.props.query,
      selectedGroups: [...this.props.query.selectedGroups],
    });
    this.requestData();
  };

  onChangeSymbol = (symbol: SelectableValue<string>) => {
    const symbolsTemplate = symbol != null && symbol.value !== ALL_KEY ? symbol.value : null;
    if (symbolsTemplate == null) {
      this.props.onChange({
        ...this.props.query,
        selectedSymbol: symbol.value as string,
      });
      this.setState((state) => ({ ...state, validSymbolControl: true }));
      this.requestData();
      return;
    }
    this.props.datasource
      .getSymbols(symbolsTemplate as string, this.props.query.selectedStream as string, 0)
      .then((response) => {
        this.props.onChange({
          ...this.props.query,
          selectedSymbol: symbol.value as string,
        });
        this.setState((state) => ({ ...state, validSymbolControl: response?.list?.length !== 0 }));
        this.requestData();
      });
  };

  onChangeField = (value: string, index: number) => {
    const [type, field] = separateTypeAndField(value);
    if (this.props.query.selects == null) {
      this.props.query.selects = [
        {
          selectedFunction: null,
          selectedField: field,
          selectedRecordType: type,
          selectedAggregations: [getDefaultFunctionDescription(this.state.schema as Schema)],
        },
      ];
    } else {
      const select = this.props.query.selects[index];
      const fieldType = getSelectedFieldType(value, this.state.schema?.types as any);

      const selectedAggregations = [];
      for (const aggregation of select.selectedAggregations) {
        const aggrDesription = (this.state.schema as Schema).functions.find((f) => aggregation.id === f.id);
        const types = [];
        for (const f of (aggrDesription as FunctionDeclaration).fields) {
          types.push(...f.types);
        }

        if (types.includes(fieldType?.dataType as any)) {
          selectedAggregations.push(aggregation);
        }
      }

      select.selectedField = field;
      select.selectedRecordType = type;
      select.selectedAggregations = selectedAggregations;
    }

    this.rewriteSelects();
    this.requestData();
  };

  onChangeInterval = (value: SelectableValue<number> | null) => {
    this.props.datasource.isChangeCurrentInterval = false;
    this.props.onChange({
      ...this.props.query,
      selectedInterval: value,
    });
    this.requestData();
  };

  onChangeGroup = (item: string, index: number) => {
    if (item == null) {
      return;
    }
    this.props.query.selectedGroups[index] = item;
    this.requestData();
  };

  private requestData = () => {
    if (
      !this.props.query.raw &&
      (this.props.query.selectedStream == null ||
        this.props.query.selectedSymbol == null ||
        this.props.query.selectedSymbol === '')
    ) {
      return;
    }
    this.props.onRunQuery();
  };

  addFilter = (field: string[]) => {
    if (this.props.query.filters == null) {
      this.props.query.filters = [];
    }
    this.props.query.filters.push({
      field: field[0],
      operator: DEFAULT_OPERATOR,
      values: [],
    });
    this.rewriteFilters();
    this.requestData();
  };

  removeFilter = (index: number) => {
    this.props.query.filters.splice(index, 1);
    this.rewriteFilters();
    this.requestData();
  };

  onChangeFilter = (field: string, operator: string, value: string[], index: number) => {
    const filters = this.props.query.filters[index];
    filters.field = field;
    filters.operator = operator;
    filters.values = value;

    this.rewriteFilters();
    this.requestData();
  };

  onChangeOrientation = (value: SelectableValue<string>) => {
    this.props.onChange({
      ...this.props.query,
      selectedOption: value?.value,
    });
    this.requestData();
  };

  onChangeView = (value: SelectableValue<string>) => {
    this.props.onChange({
      ...this.props.query,
      requestType: value?.value,
    });

    this.requestData();
  };

  private rewriteSelects = () => {
    this.props.onChange({
      ...this.props.query,
      selects: [...this.props.query.selects],
    });
  };

  private rewriteFilters = () => {
    this.props.onChange({
      ...this.props.query,
      filters: [...this.props.query.filters],
    });
  };

  private restoreView = () => {
    this.props.datasource.getStreams(this.props.query.selectedStream as string, 0).then((streams) => {
      const validStreamControl = streams?.list.length !== 0;
      this.setState((state) => ({ ...state, validStreamControl }));

      if (!validStreamControl) {
        return;
      }
      this.fillMainData(this.props.query.selectedStream as string);
    });
  };

  private fillMainData = (selectedStream: string) => {
    const selectedSymbol = getReplacedValue(this.props.query.selectedSymbol, this.props.datasource.scopedVars);
    const symbolsTemplate = selectedSymbol != null && selectedSymbol !== ALL_KEY ? selectedSymbol : '';

    const symbols$ = this.props.datasource.getSymbols(symbolsTemplate, selectedStream, 0);
    const schema$ = this.props.datasource.getStreamSchema(selectedStream);
    const usedFields = getUsedFields(this.props.query.filters || [], this.props.query.selects || []);

    Promise.all([symbols$, schema$]).then(([symbols, schema]) => {
      const fieldsByType = getAllListFields(schema?.types);
      const invalidFieldsMap: any = {};
      for (const usedField of usedFields) {
        invalidFieldsMap[usedField] = !fieldsByType.some((field) => field.value === usedField);
      }

      this.setState((state) => ({
        ...state,
        validSymbolControl:
          selectedSymbol == null ||
          selectedSymbol === '' ||
          selectedSymbol === ALL_KEY ||
          (symbols != null && symbols.list.length !== 0 && symbols.list.includes(selectedSymbol)),
        schema,
        invalidFieldsMap,
        validStreamControl: schema != null,
      }));

      if (this.props.query.selects == null || this.props.query.selects.length === 0) {
        this.props.onChange({
          ...this.props.query,
          selects: [{ ...EMPTY_SELECT }],
          selectedSymbol: ALL_KEY,
          selectedGroups: [],
          filters: [],
        });
      }
    });
  };

  onChangeFunctionByIndex = (index: number, streamFunction: FunctionValue) => {
    const select = this.props.query.selects[index];
    select.selectedFunction = { ...streamFunction };
    this.rewriteSelects();
    this.requestData();
  };

  getCurrentInterval = () => {
    if (this.props.datasource.intervals == null) {
      return null;
    }
    if (this.props.query.selectedInterval == null) {
      return SPECIAL_VALUES[1];
    }

    if (this.props.query.selectedInterval.value === Number.MIN_VALUE) {
      return SPECIAL_VALUES[0];
    }

    if (this.props.query.selectedInterval.isCustom && !this.props.datasource.isChangeCurrentInterval) {
      return this.props.query.selectedInterval;
    }

    if (isNaN(this.props.query.selectedInterval.value as number) || this.props.datasource.isChangeCurrentInterval) {
      if (this.props.datasource.isChangeCurrentInterval) {
        this.props.query.selectedInterval = SPECIAL_VALUES[1];
      }
      return SPECIAL_VALUES[1];
    }
    const value = this.props.datasource.intervals.find(
      (interval: any) => interval.value === this.props.query.selectedInterval?.value
    );
    console.log(value);
    return value || SPECIAL_VALUES[1];
  };

  onChangeRawQuery = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onChange({ ...this.props.query, rawQuery: event.target.value });
  };

  render() {
    const filters = this.props.query.filters == null ? [] : this.props.query.filters;
    const selects = this.props.query.selects == null ? [{ ...EMPTY_SELECT }] : this.props.query.selects;
    if (this.props.query.selects === null && this.state.schema != null) {
      selects[0].selectedAggregations = [getDefaultFunctionDescription(this.state.schema)];
    }

    return (
      <div className={css({ display: 'flex' })}>
        <div className={css({ flexGrow: 1 })}>
          {this.props.query.raw ? (
            <TextArea
              aria-label="query"
              rows={3}
              spellCheck={false}
              placeholder="QQL Query"
              onBlur={this.requestData}
              onChange={this.onChangeRawQuery}
              value={this.props.query.rawQuery}
            />
          ) : (
            <>
              <div className={cx('w-100', commonStyles)}>
                <SegmentFrame title="STREAM">
                  <FieldValidation
                    invalid={!this.state.validStreamControl}
                    text={getReplacedValue(
                      `No stream ${this.state.selectedStream?.value}`,
                      this.props.datasource.scopedVars
                    )}
                  >
                    <SegmentSelect
                      value={this.state.selectedStream}
                      loadOptions={this.loadStreams}
                      onChange={this.onChangeStream}
                    />
                  </FieldValidation>

                  <div>
                    <SegmentFrame
                      className={cx('gf-form mb-0', commonStyles)}
                      resetTitleWidth={true}
                      title="WHERE"
                      hideShadow={true}
                      options={getFilterFields(this.state.schema?.types)}
                      onChange={this.addFilter}
                    >
                      {filters.length !== 0 ? (
                        <SegmentFrameFilter
                          validStreamControl={this.state.validStreamControl}
                          validSymbolControl={this.state.validSymbolControl}
                          queryError={this.props.datasource.queryError}
                          filter={filters[0]}
                          index={0}
                          schema={this.state.schema}
                          invalid={this.state.invalidFieldsMap[filters[0].field]}
                          onChangeFilter={this.onChangeFilter}
                          removeFilter={this.removeFilter}
                        />
                      ) : null}
                    </SegmentFrame>

                    {filters.map((filter, index) => {
                      return index === 0 ? null : (
                        <div className={cx('gf-form-inline w-100', commonStyles)}>
                          <SegmentFrameFilter
                            title="AND"
                            validStreamControl={this.state.validStreamControl}
                            validSymbolControl={this.state.validSymbolControl}
                            queryError={this.props.datasource.queryError}
                            filter={filter}
                            index={index}
                            schema={this.state.schema}
                            invalid={this.state.invalidFieldsMap[filter.field]}
                            onChangeFilter={this.onChangeFilter}
                            removeFilter={this.removeFilter}
                          />
                        </div>
                      );
                    })}
                  </div>
                </SegmentFrame>
              </div>
              <div className={cx('gf-form-inline w-100 ', commonStyles)}>
                <div className="gf-form">
                  <span className="gf-form-label width-8 query-keyword">SYMBOL</span>
                </div>
                <FieldValidation
                  invalid={this.state.validStreamControl && !this.state.validSymbolControl}
                  text={getReplacedValue(
                    `No symbols [${this.state.selectedSymbol?.value}] in ${this.state.selectedStream?.value}.`,
                    this.props.datasource.scopedVars
                  )}
                >
                  <SegmentSelect
                    value={this.state.selectedSymbol}
                    loadOptions={this.loadSymbols}
                    onChange={this.onChangeSymbol}
                  />
                </FieldValidation>
                <div className="gf-form-label gf-form-label--grow"></div>
              </div>
              <div className={cx('gf-form-inline w-100 ', commonStyles)}>
                {selects.map((select, index) => {
                  return (
                    <SegmentFrame
                      key={index}
                      index={index}
                      title={index === 0 ? 'SELECT' : ''}
                      options={this.getSelectOptions(index)}
                      onChange={this.addSelectSection}
                    >
                      {select.selectedField != null && select.selectedRecordType != null ? (
                        <FieldValidation
                          invalid={
                            this.state.validStreamControl &&
                            this.state.validSymbolControl &&
                            this.state.invalidFieldsMap[
                              getTypeWithField(select.selectedField, select.selectedRecordType)
                            ]
                          }
                          text={getErrorForFields(
                            select.selectedRecordType,
                            select.selectedField,
                            this.state.schema?.types,
                            this.props.datasource.queryError
                          )}
                        >
                          <FieldLabel
                            value={select.selectedField}
                            type={select.selectedRecordType}
                            onRemove={() => this.removeField(index)}
                            items={getFilteredListFields(
                              getTypeWithField(select.selectedField, select.selectedRecordType),
                              getFilterFields(this.state.schema?.types)
                            )}
                            onChange={(item: string) => this.onChangeField(item, index)}
                          />
                        </FieldValidation>
                      ) : null}
                      {select.selectedFunction != null ? (
                        <FunctionComponent
                          value={select.selectedFunction}
                          index={index}
                          scopedVars={this.props.datasource.scopedVars}
                          invalidFieldsMap={this.state.invalidFieldsMap}
                          queryError={this.props.datasource.queryError}
                          mainValid={this.state.validStreamControl && this.state.validSymbolControl}
                          schema={this.state.schema as Schema}
                          onChangeFunction={this.onChangeFunctionByIndex}
                          description={
                            this.state.schema?.functions.find(
                              (f) => f.id === select.selectedFunction?.id
                            ) as FunctionDeclaration
                          }
                          onRemove={this.removeField}
                        />
                      ) : null}
                      {select.selectedAggregations.map((aggregation) => (
                        <FunctionComponent
                          key={index}
                          index={index}
                          disableColoring={true}
                          scopedVars={this.props.datasource.scopedVars}
                          schema={this.state.schema as Schema}
                          description={
                            this.state.schema?.functions.find((f) => f.id === aggregation.id) as FunctionDeclaration
                          }
                          value={aggregation}
                          invalidFieldsMap={this.state.invalidFieldsMap}
                          queryError={this.props.datasource.queryError}
                          mainValid={this.state.validStreamControl && this.state.validSymbolControl}
                          dependsSelect={select}
                          onRemove={(index) => this.removeAggregation(aggregation.id, index)}
                          onChangeFunction={this.changeAggregation}
                        />
                      ))}
                    </SegmentFrame>
                  );
                })}
              </div>
              <div className={cx('gf-form-inline w-100 ', commonStyles)}>
                <SegmentFrame
                  title="GROUP BY"
                  options={getGroupsFields(this.state.schema?.types)}
                  onChange={this.addGroup}
                >
                  <TimeGrouping
                    scopedVars={this.props.datasource.scopedVars}
                    value={this.getCurrentInterval()}
                    intervals={this.props.datasource.intervals}
                    onChangeInterval={this.onChangeInterval}
                  />
                  {this.props.query.selectedGroups != null
                    ? this.props.query.selectedGroups.map((group, index) => {
                        return (
                          <FieldValidation
                            key={index}
                            invalid={
                              this.state.validStreamControl &&
                              this.state.validSymbolControl &&
                              (this.state.invalidFieldsMap[group] || this.props.datasource.queryError != null)
                            }
                            text={getErrorForFields(
                              separateTypeAndField(group)[0],
                              separateTypeAndField(group)[1],
                              this.state.schema?.types,
                              this.props.datasource.queryError,
                              true
                            )}
                          >
                            <FieldLabel
                              value={separateTypeAndField(group)[1]}
                              type={separateTypeAndField(group)[0]}
                              onRemove={() => this.removeGroup(index)}
                              items={getFilteredListFields(group, getGroupsFields(this.state.schema?.types))}
                              onChange={(item: string) => this.onChangeGroup(item, index)}
                            />
                          </FieldValidation>
                        );
                      })
                    : null}
                </SegmentFrame>
              </div>
              {this.props.query.selectedGroups == null || this.props.query.selectedGroups.length === 0 ? null : (
                <div className={cx('gf-form-inline w-100 ', commonStyles)}>
                  <SegmentFrame title="OPTION">
                    <CustomSelect
                      value={toOption(this.props.query.selectedOption || COLUMN_KEY)}
                      options={this.state.groupByViewOptions}
                      onChange={this.onChangeOrientation}
                    />
                  </SegmentFrame>
                </div>
              )}
            </>
          )}
          <div className={cx('gf-form-inline w-100 ', commonStyles)}>
            <SegmentFrame title="VIEW">
              <CustomSelect
                value={toOption(this.props.query.requestType || DATAFRAME_KEY)}
                options={VIEWS.map(toOption)}
                onChange={this.onChangeView}
              />
            </SegmentFrame>
          </div>
        </div>
        <QueryEditorModeSwitcher
          isRaw={this.props.query.raw ?? false}
          onChange={(value) => {
            this.props.onChange({ ...this.props.query, raw: value });
            this.requestData();
          }}
        />
      </div>
    );
  }
}
