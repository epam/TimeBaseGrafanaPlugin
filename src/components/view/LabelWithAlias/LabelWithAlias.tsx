import { SegmentInput } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import React, { PureComponent, RefObject } from 'react';

import { commonStyles } from '../../../utils/styles';
import { SegmentFrame } from '../SegmentFrame/SegmentFrame';

const styles = css`
  height: 32px;
  .m-4 {
    margin-left: 4px !important;
    margin-right: 4px !important;
  }
  .segment-input {
    padding-left: 1px;
    background-color: inherit;
    margin-right: 0;
    padding-right: 0;
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface LabelWithAliasProps {
  index: number;
  label: string;
  alias?: string | null;
  additionalText?: string;
  onRemove: (item: string, index: number) => any;
  onChangeAlias: (index: number, aggregation: string, alias: string | null) => any;
}
interface LabelWithAliasState {
  showContextMenu: boolean;
  showAlias: boolean;
}

export class LabelWithAliasComponent extends PureComponent<LabelWithAliasProps, LabelWithAliasState> {
  state = {
    showContextMenu: false,
    showAlias: false,
  };

  wrapperRef: RefObject<any>;

  constructor(props: LabelWithAliasProps) {
    super(props);

    this.wrapperRef = React.createRef();
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  static getDerivedStateFromProps(nextProps: LabelWithAliasProps) {
    return { showAlias: nextProps.alias != null };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside(event: any) {
    if (this.wrapperRef && !this.wrapperRef.current.contains(event.target) && this.state.showContextMenu) {
      this.setState({ showContextMenu: false });
    }
  }

  showMenu = () => {
    this.setState({ ...this.state, showContextMenu: true });
  };

  remove = () => {
    this.props.onRemove(this.props.label, this.props.index);
    this.setState({ ...this.state, showContextMenu: false });
  };

  changeAlias = (alias: React.ReactText) => {
    this.props.onChangeAlias(this.props.index, this.props.label, alias.toString());
  };

  addAlias = () => {
    this.setState({ ...this.state, showContextMenu: false });
    this.props.onChangeAlias(this.props.index, this.props.label, this.props.label.toLowerCase().toString());
  };

  removeAlias = () => {
    this.setState({ ...this.state, showContextMenu: false });
    this.props.onChangeAlias(this.props.index, this.props.label, null);
  };

  render() {
    return (
      <div ref={this.wrapperRef} className={cx('dropdown open pointer', styles)}>
        <div className={cx('gf-form', styles)}>
          <div className={cx(`gf-form-label reset-offset blue`, styles, commonStyles)} onClick={this.showMenu}>
            {this.props.label}
          </div>
          {this.state.showAlias ? (
            <div className="gf-form-inline">
              <div className={cx('gf-form-label reset-offset m-4', styles, commonStyles)}> as </div>
              <SegmentFrame className="gf-form-inline" hideShadow={true}>
                <SegmentInput
                  className={cx('segment-input', styles)}
                  value={this.props.alias as string}
                  onChange={this.changeAlias}
                />
              </SegmentFrame>
            </div>
          ) : null}
        </div>

        {this.state.showContextMenu ? (
          <ul className="dropdown-menu">
            {this.state.showAlias ? (
              <li className="dropdown-menu-item" onClick={this.removeAlias}>
                <a>Remove alias</a>
              </li>
            ) : (
              <li className="dropdown-menu-item" onClick={this.addAlias}>
                <a>Add alias</a>
              </li>
            )}
            <li className="dropdown-menu-item" onClick={this.remove}>
              <a>Remove {this.props.additionalText != null ? this.props.additionalText : ''}</a>
            </li>
          </ul>
        ) : null}
      </div>
    );
  }
}
