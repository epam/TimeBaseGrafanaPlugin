import { Icon } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import React from 'react';

import { commonStyles } from '../../../utils/styles';

const styles = css`
  &.field-validation-wrapper {
    position: absolute;
    z-index: 100;
    height: 30px;
  }

  &.validation-icon {
    margin-right: 5px;
  }
  &.invalid-mess {
    font-size: 12px;
    font-weight: 500;
    padding: 4px 8px;
    color: rgb(255, 255, 255);
    background: rgb(224, 47, 68);
    border-radius: 2px;
    position: relative;
    display: flex;
    height: 100%;
    align-items: center;
    &::before {
      content: '';
      position: absolute;
      left: 9px;
      top: -4px;
      width: 0px;
      height: 0px;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-bottom: 4px solid rgb(224, 47, 68);
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface FieldValidationProps {
  invalid: boolean;
  text: string;
  children: React.ReactElement;
}

export function FieldValidation(props: FieldValidationProps) {
  return (
    <div className={cx('h-100', commonStyles)}>
      <div className={cx('field', styles)}>
        {React.cloneElement(props.children)}
        {props.invalid && props.text != null && props.text && (
          <div className={cx('field-validation-wrapper', styles)}>
            <FieldValidationMessage>{props.text}</FieldValidationMessage>
          </div>
        )}
      </div>
    </div>
  );
}
export interface FieldValidationMessageProps {
  children: string;
  className?: string;
}

export const FieldValidationMessage: React.FC<FieldValidationMessageProps> = ({ children, className }) => {
  return (
    <div className={cx('invalid-mess', styles)}>
      <Icon className={cx('validation-icon', styles)} name="exclamation-triangle" />
      {children}
    </div>
  );
};
