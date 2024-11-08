import { SegmentInput } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import React, { PureComponent } from 'react';

import { Select } from '../../../types';
import { FunctionDeclaration, FunctionValue, FunctionValueBase, PropertyType, Schema } from '../../../utils/types';
import { FieldValidation } from '../FieldValidation/FieldValidation';
import { LabelWithAliasComponent } from '../LabelWithAlias/LabelWithAlias';
import { SegmentFrame } from '../SegmentFrame/SegmentFrame';
import { FunctionFieldParameterComponent } from './FunctionFieldParameter';
import { FunctionHeaderComponent } from './FunctionHeader';
import { commonStyles } from '../../../utils/styles';
import { getReplacedValue } from '../../../utils/variables';

const styles = css`
  height: 32px;
  background-color: #202226;
  &.gf-form-label-mr {
    margin-right: 0 !important;
  }
  &.h-32 {
    height: 32px;
  }
  &.wrapper {
    .gf-form {
      margin: 0;
    }
  }
  &.reset-offset {
    justify-content: end;
  }
  &.gf-form-segment-input {
    padding-left: 1px;
    background-color: inherit;
    margin-right: 0;
    padding-right: 0;
  }
  &.gf-form-p {
    padding-left: 4px;
    padding-right: 4px;
  }
  &.ml-4 {
    margin-left: 4px;
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface FunctionProps {
  index: number;
  value: FunctionValue;
  description: FunctionDeclaration;
  schema: Schema;
  dependsSelect?: Select | null;
  disableColoring?: boolean;
  hideName?: boolean;
  className?: string;
  queryError: string | undefined;
  mainValid: boolean;
  classNameProperty?: string;
  scopedVars: any;
  invalidFieldsMap: { [key: string]: boolean };
  onRemove: null | ((index: number) => any);
  onChangeFunction: (index: number, streamFunction: FunctionValue) => any;
}

export class FunctionComponent extends PureComponent<FunctionProps> {
  state = { showAlias: false };

  static getDerivedStateFromProps(nextProps: FunctionProps) {
    return { showAlias: nextProps.value.as != null };
  }

  onChangeSelectParametersValue = (parameterName: string, value: string | undefined | null | FunctionValue) => {
    if (this.props.description == null) {
      return;
    }

    const field = this.props.description.fields.find((f) => f.name === parameterName);
    const constant = this.props.description.constants.find((c) => c.name === parameterName);
    let parameter = this.props.value.parameters.find((p) => p.name === parameterName);

    if (parameter != null) {
      parameter.value = value !== '' ? (value as any) : null;
      if (constant != null) {
        const numberValue = Number(value);
        const max = constant.max == null ? null : Number(constant.max);
        const min = constant.min == null ? null : Number(constant.min);
        parameter.invalid =
          !isNaN(numberValue) && ((min != null && numberValue < min) || (max != null && numberValue > max));
      }

      parameter = { ...parameter };
    } else {
      parameter = {
        name: field?.name || constant?.name || '',
        returnTypes: (field?.types || [constant?.type] || []) as PropertyType[],
        value: value !== '' ? (value as any) : null,
        isConstant: constant != null,
      };

      this.props.value.parameters.push(parameter);
    }
    this.emitValue({ ...this.props.value });
  };

  getContent = () => {
    return (
      <>
        {this.props.value.parameters.map((parameter, index) => {
          if (parameter.isConstant) {
            const constants = this.props.description?.constants.find((field) => field.name === parameter.name);
            const errorText = getErrorText(
              parameter?.value as number,
              this.props.scopedVars,
              constants?.min,
              constants?.max
            );

            return (
              <div className={cx('gf-form-inline wrapper', styles)}>
                <SegmentFrame className="gf-form-inline" hideShadow={true}>
                  <FieldValidation invalid={errorText != null} text={errorText}>
                    <div
                      title={`${parameter.name}:  ${parameter.returnTypes.join('|')}`}
                      className={cx('gf-form-label reset-offset', styles, commonStyles)}
                    >
                      <SegmentInput
                        className={cx('gf-form-segment-input', styles)}
                        placeholder={`${parameter.returnTypes.join('|')}: ${parameter.name}`}
                        value={parameter?.value as number}
                        onChange={(text: React.ReactText) =>
                          this.onChangeSelectParametersValue(parameter.name, text?.toString())
                        }
                      />
                    </div>
                  </FieldValidation>
                </SegmentFrame>
                {index !== this.props.value.parameters.length - 1 ? <div>,&nbsp;</div> : null}
              </div>
            );
          }
          const field = this.props.description?.fields.find((field) => field.name === parameter.name);
          return (
            <FunctionFieldParameterComponent
              key={index}
              parametersLength={this.props.value.parameters.length - 1}
              index={index}
              field={field}
              invalidFieldsMap={this.props.invalidFieldsMap}
              queryError={this.props.queryError}
              mainValid={this.props.mainValid}
              schema={this.props.schema}
              parameterValue={{ ...parameter }}
              scopedVars={this.props.scopedVars}
              onChangeSelectParametersValue={this.onChangeSelectParametersValue}
              emitValue={this.emitValue}
            />
          );
        })}
      </>
    );
  };

  removeFunctionReturnField = (item: string) => {
    const values = (this.props.value.returnFields as FunctionValueBase[]).filter((v) => v.name !== item);
    if (values.length === 0) {
      if (this.props.onRemove != null) {
        this.props.onRemove(this.props.index);
      }
    } else {
      this.props.value.returnFields = [...values];
      this.emitValue({ ...this.props.value });
    }
  };

  changeFunctionValueAlias = (index: number, aggregation: string, alias: string | null) => {
    const val = (this.props.value.returnFields as FunctionValueBase[])[index];
    if (val != null) {
      val.as = alias;
    }
    this.emitValue({ ...this.props.value });
  };

  changeFunctionAlias = (alias: React.ReactText) => {
    this.emitValue({ ...this.props.value, as: alias.toString() });
  };

  emitValue = (functionValue: FunctionValue) => {
    this.props.onChangeFunction(this.props.index, functionValue);
  };

  render() {
    return (
      <>
        <div className={`gf-form-label ${this.props.className != null ? this.props.className : ''}`}>
          <FunctionHeaderComponent
            className={this.props.className}
            hideName={this.props.hideName}
            description={this.props.description}
            value={this.props.value}
            schema={this.props.schema}
            dependsSelect={this.props.dependsSelect}
            disableColoring={this.props.disableColoring}
            onRemove={() => {
              if (this.props.onRemove != null) {
                this.props.onRemove(this.props.index);
              }
            }}
            emitValue={this.emitValue}
          />
          <div>(</div>
          {this.getContent()}
          <div>)</div>
          {this.state.showAlias ? (
            <div className={cx('gf-form-inline h-32', styles)}>
              <div className={cx('gf-form-label gf-form-label-mr gf-form-p', styles)}> as </div>
              <SegmentFrame className="gf-form-inline" hideShadow={true}>
                <SegmentInput
                  className={cx('gf-form-segment-input', styles)}
                  value={this.props.value.as as string}
                  onChange={this.changeFunctionAlias}
                />
              </SegmentFrame>
            </div>
          ) : null}
        </div>
        <div className="gf-form-inline">
          <ReturnFieldComponent
            value={this.props.value}
            classNameProperty={this.props.classNameProperty || ''}
            removeFunctionReturnField={this.removeFunctionReturnField}
            changeFunctionValueAlias={this.changeFunctionValueAlias}
          />
        </div>
      </>
    );
  }
}

const getErrorText = (value: number, scopedVars: any, min?: string | undefined, max?: string | undefined) => {
  if (value != null && isNaN(value)) {
    if (value.toString().match(/\$\{\w+/gi) == null) {
      return 'Invalid value';
    }
  }

  if (
    value != null &&
    min != null &&
    (Number(min) > value || Number(min) > Number(getReplacedValue(value, scopedVars)))
  ) {
    return `Min value ${min}`;
  }

  if (
    value != null &&
    max != null &&
    (Number(max) < value || Number(max) < Number(getReplacedValue(value, scopedVars)))
  ) {
    return `Max value ${max}`;
  }
  return '';
};

export const ReturnFieldComponent = ({
  value,
  removeFunctionReturnField,
  changeFunctionValueAlias,
  classNameProperty,
}: any) =>
  value.returnFields != null
    ? value.returnFields.map((value: any, index: number) => {
        return (
          <div key={index} className={cx(`${classNameProperty} gf-form-label`, styles)}>
            <LabelWithAliasComponent
              index={index}
              label={value.name}
              alias={value.as}
              additionalText="property"
              onRemove={removeFunctionReturnField}
              onChangeAlias={changeFunctionValueAlias}
            />
          </div>
        );
      })
    : null;
