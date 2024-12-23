import { SelectableValue } from '@grafana/data';
import { Input, MultiSelect, Segment, Select } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import React, { PureComponent } from 'react';

import { Operator } from '../../../utils/constants';
import { FALSE, getFilterValues, getOperators, getSelectedItem, getValues, TRUE } from '../../../utils/filters';
import { commonStyles } from '../../../utils/styles';
import { PropertyType, StreamType } from '../../../utils/types';
import {
  getErrorForFields,
  getFilteredListFields,
  getFilterFields,
  getSelectedFieldType,
  isBooleanType,
  isDateTimeType,
  isEnumType,
  isFloatType,
  isInFilters,
  isIntType,
  separateTypeAndField,
  showSpecialValues,
  toOption,
} from '../../../utils/utils';
import { FieldLabel } from '../FieldLabels/FieldLabels';
import { FieldValidation } from '../FieldValidation/FieldValidation';
import { SegmentFrame } from '../SegmentFrame/SegmentFrame';
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';

const VALUE_KEY = 'Value';
const styles = css`
  &.mr-4 {
    margin-right: 4px;
    width: inherit;
  }

  &.flex-justify {
    display: flex;
    justify-content: center;
  }
  &.datePicker button {
    margin: 0px;
    margin-right: 5px;
    padding: 0;
  }
  &.datePicker .react-datetime-picker__button {
    padding 0px;
  }
  &.datePicker svg {
    stroke: white;
    stroke-width: 1;
  }
  &.datePicker .react-datetime-picker__wrapper {
    border: thin solid rgba(204, 204, 220, 0.2);
    border-radius: 2px;
  }
  &.datePicker .react-calendar {
    background-color: black;
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface FilterProps {
  selectedField: string;
  selectedOperators: string;
  schema: StreamType[] | undefined;
  filterValues: string[];
  change: (field: string, operator: string, values: string[]) => any;
  remove: () => any;
}

interface FilterState {
  operators: Array<SelectableValue<string>>;
  values: Array<SelectableValue<string>>;
  selectedItem: SelectableValue<string> | undefined;
  filterValues: string[];
  fieldType: PropertyType | undefined;
  dateValue: Date | null;
}

class Filter extends PureComponent<FilterProps, FilterState> {
  state: FilterState = {
    operators: [],
    values: [],
    selectedItem: void 0,
    filterValues: [],
    fieldType: void 0,
    dateValue: new Date()
  };

  private customValues: Array<SelectableValue<string>> = [];
  static getDerivedStateFromProps(nextProps: FilterProps, nextState: FilterState) {
    const fieldType = getSelectedFieldType(nextProps.selectedField, nextProps.schema);
    const type = fieldType?.dataType as PropertyType;
    const enumValues = getValues(fieldType);
    const values =
      showSpecialValues(nextProps.selectedOperators as Operator) || isInFilters(nextProps.selectedOperators as Operator)
        ? getFilterValues(type, enumValues as string[])
        : [];
    const filterValues = isBooleanType(type)
      ? nextProps.filterValues.map((value: any) => (value === true ? TRUE : value === false ? FALSE : value))
      : nextProps.filterValues;
    const selectedItem = getSelectedItem(type, enumValues, filterValues, values, nextState.selectedItem);

    return {
      operators: getOperators(type),
      fieldType: type,
      values,
      selectedItem,
      filterValues: nextProps.filterValues,
      dateValue: nextProps.filterValues?.[0] ? new Date(nextProps.filterValues[0]) : null
    };
  }

  onChangeOperator = (value: SelectableValue<string>) => {
    if (!this.state.operators.some((operator) => operator.value === value.value)) {
      return;
    }
    if (
      isInFilters(this.props.selectedOperators as Operator) ||
      showSpecialValues(this.props.selectedOperators as Operator)
    ) {
      this.reset(value?.value as string);
    } else {
      this.setState((state) => ({
        ...state,
        filterValues: this.getFilterValue(),
      }));

      this.emitValue(this.props.selectedField, value?.value as string, this.getFilterValue());
    }
  };

  onChangeField = (value: string) => {
    this.emitValue(value, this.props.selectedOperators, []);
  };

  onChangeValue = (value: SelectableValue<string>) => {
    if (value == null) {
      this.reset(this.props.selectedOperators);
      return;
    }
    const values =
      value?.value !== VALUE_KEY
        ? [value?.value as string]
        : this.state.selectedItem?.value !== VALUE_KEY
        ? []
        : this.state.filterValues;
    this.setState((state) => ({
      ...state,
      selectedItem: value,
    }));

    this.emitValue(this.props.selectedField, this.props.selectedOperators, values);
  };

  private reset = (value: string) => {
    this.setState((state) => ({
      ...state,
      selectedItem: toOption(VALUE_KEY),
      filterValues: [],
    }));
    this.emitValue(this.props.selectedField, value, []);
  };

  onKeyPress = (e: any) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      (e.key === '-' && (e.target.value == null || (!e.target.value.includes('-') && e.target.selectionStart === 0)))
    ) {
      return;
    }
    if (isIntType(this.state.fieldType as PropertyType) && isNaN(e.key)) {
      e.preventDefault();
      return;
    } else if (
      isFloatType(this.state.fieldType as PropertyType) &&
      isNaN(e.key) &&
      (e.key !== '.' || (e.key === '.' && e.target.value.includes('.')))
    ) {
      e.preventDefault();
      return;
    }

    e.target.focus();
  };

  onChangeInputValue = (event: any) => {
    const va = event.target.value as string;

    this.setState((state) => ({
      ...state,
      filterValues: [va],
    }));
    this.emitValue(this.props.selectedField, this.props.selectedOperators, [event.target.value as string]);
  };

  onChangeMultiSelect = (items: Array<SelectableValue<string>>) => {
    this.setState((state) => ({
      ...state,
      filterValues: items.map((item) => item.value) as string[],
    }));

    this.emitValue(this.props.selectedField, this.props.selectedOperators, items.map((item) => item.value) as string[]);
  };

  onDateChange = (date: any) => {
    this.setState((state) => ({
      ...state,
      dateValue: date,
    }));
    this.emitValue(this.props.selectedField, this.props.selectedOperators, [date ? date.toISOString() : null]);
  }

  onCreateOption = (v: string) => {
    this.customValues.push(toOption(v));
    this.state.filterValues.push(v);
    this.setState((state) => ({ ...state }));
    this.emitValue(this.props.selectedField, this.props.selectedOperators, this.state.filterValues);
  };

  filter = (v: SelectableValue<string>, searchQuery: string) => {
    if (v.label?.includes('Create')) {
      return true;
    }
    if (searchQuery != null && searchQuery !== '') {
      return false;
    }
    return this.state.values.find((value) => value.value === v.value) != null;
  };

  getContent = () => {
    if (isInFilters(this.props.selectedOperators as Operator)) {
      const values = this.state.values.filter((v) => v.value !== VALUE_KEY);
      values.push(...this.customValues);

      return (
        <MultiSelect
          options={values}
          className={cx('mr-4 width-22', styles)}
          value={this.state.filterValues.map(toOption)}
          allowCustomValue
          onKeyDown={this.onKeyPress}
          filterOption={this.filter}
          getOptionLabel={(v) => v?.label as string}
          onChange={this.onChangeMultiSelect}
          onCreateOption={this.onCreateOption}
        />
      );
    }

    return (
      <Input
        width={15}
        value={this.state.filterValues[0]}
        onKeyDown={this.onKeyPress}
        onChange={this.onChangeInputValue}
      />
    );
  };

  private emitValue = (selectedField: string, selectedOperators: string, values: string[]) => {
    const v = isBooleanType(this.state.fieldType as PropertyType)
      ? values.map((value) => (value === TRUE ? true : value === FALSE ? false : value))
      : values;
    this.props.change(selectedField, selectedOperators, v as any);
  };

  private getFilterValue = () => {
    if (isDateTimeType(this.state.fieldType as PropertyType)) {
      return [this.state.dateValue?.toISOString() as string];
    }
    if (this.state.selectedItem?.value !== VALUE_KEY) {
      return [this.state.selectedItem?.value as string];
    }
    return this.state.filterValues;
  };

  render() {
    const [type, field] = separateTypeAndField(this.props.selectedField);
    return (
      <div className="gf-form-inline">
        <FieldLabel
          value={field}
          type={type}
          onRemove={this.props.remove}
          items={getFilteredListFields(this.props.selectedField, getFilterFields(this.props.schema))}
          onChange={(item: string) => this.onChangeField(item)}
        />
        <Segment
          Component={<div className="gf-form-label pointer">{this.props.selectedOperators}</div>}
          options={this.state.operators}
          className="width-3"
          allowCustomValue={false}
          onChange={this.onChangeOperator}
        />
        {isDateTimeType(this.state.fieldType as PropertyType) ? 
          <DateTimePicker 
            className={cx('datePicker', styles)} 
            onChange={this.onDateChange} 
            value={this.state.dateValue} 
            clearAriaLabel="Clear value"
            disableClock={true} 
            locale="en"
            format="MM/dd/yy hh:mm:ss"/> : 
          showSpecialValues(this.props.selectedOperators as Operator) ? (
          (isEnumType(this.state.fieldType as PropertyType) || isBooleanType(this.state.fieldType as PropertyType)) ?
          <Select
            width={15}
            className={cx('select mr-4' , styles)}
            options={this.state.values}
            value={this.state.selectedItem}
            onChange={this.onChangeValue}
            backspaceRemovesValue={true}
            classNamePrefix="grafana-custom"
          /> :
          <Input
            width={15}
            value={this.state.filterValues?.[0] ?? ''}
            onKeyDown={this.onKeyPress}
            onChange={this.onChangeInputValue}
          />
        ) : this.getContent()
        }
      </div>
    );
  }
}

export const SegmentFrameFilter = ({
  validStreamControl,
  validSymbolControl,
  queryError,
  filter,
  schema,
  invalid,
  onChangeFilter,
  removeFilter,
  title,
  index,
}: any) => {
  return (
    <SegmentFrame title={title} resetTitleWidth={true} hideShadow={true} className={cx('gf-form mb-0', commonStyles)}>
      <FieldValidation
        invalid={validStreamControl && validSymbolControl && (invalid || queryError != null)}
        text={getErrorForFields(
          separateTypeAndField(filter.field)[0],
          separateTypeAndField(filter.field)[1],
          schema?.types,
          queryError,
          true
        )}
      >
        <Filter
          selectedField={filter.field}
          selectedOperators={filter.operator}
          filterValues={filter.values}
          schema={schema?.types}
          change={(selectedField: string, selectedOperators: string, value: string[]) => {
            onChangeFilter(selectedField, selectedOperators, value, index);
          }}
          remove={() => removeFilter(index)}
        />
      </FieldValidation>
    </SegmentFrame>
  );
};
