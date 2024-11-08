import { css, cx } from '@emotion/css';
import { ButtonCascader, CascaderOption } from '@grafana/ui';
import React, { PureComponent, ReactNode } from 'react';

const styles = css`
  width: 100%;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface SegmentFrameProps {
  options?: CascaderOption[];
  index?: number;
  title?: string;
  className?: string;
  hideShadow?: boolean;
  resetTitleWidth?: boolean;
  children: ReactNode

  onChange?: (value: string[], index: number | undefined) => any;
}

export class SegmentFrame extends PureComponent<SegmentFrameProps> {
  onChangeValue = (values: string[]) => {
    if (this.props.onChange != null) {
      this.props.onChange(values, this.props.index);
    }
  };

  render() {
    return (
      <>
        <div className={this.props.className != null ? this.props.className : cx('gf-form-inline', styles)}>
          <div className="gf-form">
            {this.props.title != null ? (
              <span className={`gf-form-label ${this.props.resetTitleWidth ? '' : 'width-8'} query-keyword`}>
                {this.props.title}{' '}
              </span>
            ) : null}
          </div>
          {this.props.children}
          {this.props.options != null && this.props.onChange != null ? (
            <ButtonCascader value={undefined} onChange={this.onChangeValue} options={this.props.options}>
              +
            </ButtonCascader>
          ) : null}
          {!this.props.hideShadow ? <div className="gf-form-label gf-form-label--grow"></div> : null}
        </div>
      </>
    );
  }
}
