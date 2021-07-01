import { SelectableValue } from '@grafana/data';
import { ButtonCascader } from '@grafana/ui';
import cx from 'classnames';
import React, { PureComponent } from 'react';

import { CHANGE_OPTION_KEY, REMOVE_OPTION_KEY } from '../../utils/constants';
import { commonStyles } from '../../utils/styles';
import { toOption } from '../../utils/utils';

interface FieldLabelProps {
  value: string;
  type: string;
  items: Array<SelectableValue<string>>;
  onRemove: () => any;
  onChange: (value: string) => any;
}

export class FieldLabel extends PureComponent<FieldLabelProps> {
  private getOptions = () => {
    const result = [];

    result.push({
      label: CHANGE_OPTION_KEY,
      children: this.props.items,
    });

    result.push(toOption(REMOVE_OPTION_KEY));

    return result;
  };

  onChangeButtonCascaderValue = (values: string[]) => {
    if (values.length === 1 && values[0] === REMOVE_OPTION_KEY) {
      this.props.onRemove();
    } else {
      this.props.onChange(values[values.length - 1]);
    }
  };

  getField = () => {
    return (
      <div className="gf-form-label pointer">
        <div className={cx('green', commonStyles)}>{this.props.type}&nbsp;</div>
        {this.props.type !== '' && this.props.value !== '' ? <div>:</div> : null}
        <div className={cx('blue', commonStyles)}>&nbsp;{this.props.value}</div>
      </div>
    );
  };

  render() {
    return (
      <ButtonCascader
        className={cx('btn-cascader', commonStyles)}
        options={this.getOptions() as any}
        value={undefined}
        onChange={this.onChangeButtonCascaderValue}
      >
        {this.getField() as any}
      </ButtonCascader>
    );
  }
}
