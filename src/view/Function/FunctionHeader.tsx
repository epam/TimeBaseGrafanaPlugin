import { ButtonCascader, CascaderOption, Tooltip } from '@grafana/ui';
import { css, cx } from 'emotion';
import React, { PureComponent } from 'react';

import { Select } from '../../types';
import { CHANGE_OPTION_KEY, REMOVE_OPTION_KEY } from '../../utils/constants';
import { getNewAggregationFunction } from '../../utils/functions';
import { getAggregationFunctionsOptions, getAvailableTypes } from '../../utils/options';
import { commonStyles } from '../../utils/styles';
import { FunctionDeclaration, FunctionValue, Schema } from '../../utils/types';
import { toOption } from '../../utils/utils';

const REMOVE_ALIAS_KEY = 'Remove alias';
const ADD_ALIAS_KEY = 'Add alias';

const styles = css`
  height: 32px;
  background-color: #202226;
  &.gf-form-label-mr {
    margin-right: 0 !important;
  }
  &.reset-offset {
    padding-left: 0px;
    padding-right: 0px;
    margin: 0;
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface FunctionProps {
  value: FunctionValue;
  description: FunctionDeclaration;
  schema: Schema;
  dependsSelect?: Select | null;
  disableColoring?: boolean;
  hideName?: boolean;
  className?: string;
  onRemove: null | (() => any);
  emitValue: (streamFunction: FunctionValue) => any;
}

export class FunctionHeaderComponent extends PureComponent<FunctionProps> {
  state = {
    showAlias: false,
  };

  static getDerivedStateFromProps(nextProps: FunctionProps) {
    return { showAlias: nextProps.value.as != null };
  }

  removeFunction = () => {
    if (this.props.onRemove != null) {
      this.props.onRemove();
    }
  };

  addAlias = () => {
    this.props.emitValue({
      ...this.props.value,
      as: this.props.value.name.toLowerCase() as string,
    });
  };

  removeAlias = () => {
    this.props.emitValue({ ...this.props.value, as: null });
  };

  onChangeButtonCascaderValue = (values: string[]) => {
    if (values.length === 1 && values[0] === REMOVE_OPTION_KEY) {
      this.removeFunction();
    } else if (values.length === 1 && values[0] === REMOVE_ALIAS_KEY) {
      this.removeAlias();
    } else if (values.length === 1 && values[0] === ADD_ALIAS_KEY) {
      this.addAlias();
    } else {
      const newFunction = this.props.schema.functions.find(
        (f) => f.id === values[values.length - 1]
      ) as FunctionDeclaration;
      if (newFunction != null) {
        this.props.emitValue(getNewAggregationFunction(newFunction));
      }
    }
  };

  private getOptions = () => {
    let result: CascaderOption[] = [];
    if (
      this.props.description != null &&
      this.props.description.isAggregation &&
      this.props.description.fields.length === 1 &&
      this.props.dependsSelect != null &&
      this.props.schema != null
    ) {
      const usedAggregation = this.props.dependsSelect.selectedAggregations.map((a) => a.id);
      const options = getAggregationFunctionsOptions(
        this.props.schema.functions,
        usedAggregation,
        getAvailableTypes(this.props.dependsSelect, this.props.schema) as any
      );
      if (options.length !== 0) {
        result.push({
          label: CHANGE_OPTION_KEY,
          children: options,
        } as CascaderOption);
      }
    }

    if (
      this.props.description != null &&
      this.props.description.isAggregation &&
      this.props.value.returnFields == null
    ) {
      result.push(toOption(this.state.showAlias ? REMOVE_ALIAS_KEY : ADD_ALIAS_KEY));
    }
    if (this.props.onRemove != null) {
      result.push(toOption(REMOVE_OPTION_KEY));
    }

    return result;
  };

  getHeader = () => {
    return (
      <ButtonCascader
        className={cx(
          `gf-form-label-mr btn-cascader ${!this.props.disableColoring ? 'orange' : ''}`,
          styles,
          commonStyles
        )}
        options={this.getOptions()}
        value={undefined}
        onChange={this.onChangeButtonCascaderValue}
      >
        {this.props.value == null ? '' : this.props.value.name}
      </ButtonCascader>
    );
  };

  render() {
    return (
      <div
        className={cx(`gf-form-label reset-offset ${this.props.className != null ? this.props.className : ''}`, styles)}
      >
        {this.props.hideName ? null : this.props.description != null && this.props.description.doc !== '' ? (
          <Tooltip content={this.props.description.doc} theme="info">
            {this.getHeader()}
          </Tooltip>
        ) : (
          this.getHeader()
        )}
      </div>
    );
  }
}
