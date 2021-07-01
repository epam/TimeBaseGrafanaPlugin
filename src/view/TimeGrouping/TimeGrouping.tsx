import { SelectableValue } from '@grafana/data';
import { Segment } from '@grafana/ui';
import { css } from '@emotion/react';
import cx from 'classnames';
import React, { PureComponent } from 'react';

import { getReplacedValue } from '../../utils/variables';
import { FieldValidation } from '../FieldValidation/FieldValidation';

const INVALID_VALUE = 'Invalid value';
const styles = css`
  height: 32px;
  background-color: #202226;
  padding: 0;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface TimeGroupingProps {
  intervals: Array<SelectableValue<number>>;
  value: SelectableValue<number> | null;
  scopedVars: any;
  onChangeInterval: (value: SelectableValue<number> | null) => any;
}

export class TimeGrouping extends PureComponent<TimeGroupingProps> {
  state = { timeGroupingError: '' };

  static getDerivedStateFromProps(nextProps: TimeGroupingProps) {
    return {
      timeGroupingError:
        nextProps.value?.label === 'MIN INTERVAL' ? '' : getError(nextProps.value, nextProps.scopedVars),
    };
  }

  onChangeInterval = (v: SelectableValue<any>) => {
    let value;
    if (!v.__isNew__) {
      value = v;
    } else if (v.value == null) {
      value = null;
    } else {
      const numbers = v.value.match(/\d+/gi);
      const letters = v.value.match(/[a-zA-Z]+/gi);
      if (invalidText(numbers, letters) || v?.value.match(/\$\{\w+/gi) != null) {
        value = { label: v.label, isCustom: true };
      } else {
        value = { label: v.label, value: getValue(numbers, letters), isCustom: true };
      }
    }

    this.setState({ ...this.state, timeGroupingError: getError(v, this.props.scopedVars) });
    this.props.onChangeInterval(value);
  };

  render() {
    return (
      <div className={cx(`gf-form-label`, styles)}>
        <FieldValidation
          invalid={this.state.timeGroupingError !== '' && this.state.timeGroupingError != null}
          text={this.state.timeGroupingError}
        >
          <Segment
            Component={
              <div className="gf-form-label pointer">
                <div>time({this.props.value?.label})</div>
              </div>
            }
            options={this.props.intervals}
            allowCustomValue
            onChange={this.onChangeInterval}
          />
        </FieldValidation>
      </div>
    );
  }
}

const enum TimeIntervalLiterals {
  ms = 'ms',
  s = 's',
  m = 'm',
  d = 'd',
  h = 'h',
  M = 'M',
  w = 'w',
}

const getError = (v: SelectableValue<any> | null, scopedVars: any) => {
  if (v == null) {
    return;
  }
  if (v.value == null && v.isCustom && (v.label as string).match(/\$\{\w+/gi) == null) {
    return INVALID_VALUE;
  }
  if (typeof v.value === 'number') {
    return;
  }
  const currentValue = (v.label as string).match(/\$\{\w+/gi) != null ? getReplacedValue(v.label, scopedVars) : v.label;

  const numbers = currentValue?.match(/\d+/gi);
  const letters = currentValue?.match(/[a-zA-Z]+/gi);
  if (invalidText(numbers, letters)) {
    return INVALID_VALUE;
  } else {
    const convertedValue = getValue(numbers, letters);
    if (convertedValue == null) {
      return INVALID_VALUE;
    }
  }
  return;
};

export const getValue = (numbers: string[] | null | undefined, letters: string[] | null | undefined) => {
  if (invalidText(numbers, letters)) {
    return;
  }
  const num = Number(numbers);
  const letter = (letters as string[])[0];
  if (letter === TimeIntervalLiterals.M) {
    return num * 1000 * 60 * 60 * 24 * 30;
  }
  if (letter === TimeIntervalLiterals.w) {
    return num * 1000 * 60 * 60 * 24 * 7;
  }
  if (letter === TimeIntervalLiterals.d) {
    return num * 1000 * 60 * 60 * 24;
  }
  if (letter === TimeIntervalLiterals.h) {
    return num * 1000 * 60 * 60;
  }
  if (letter === TimeIntervalLiterals.m) {
    return num * 1000 * 60;
  }
  if (letter === TimeIntervalLiterals.s) {
    return num * 1000;
  }
  if (letter === TimeIntervalLiterals.ms) {
    return num;
  }
  return null;
};

const invalidText = (numbers: string[] | null | undefined, letters: string[] | null | undefined) => {
  return numbers == null || numbers.length > 1 || letters == null || letters[0].length > 1 || letters.length > 1;
};
