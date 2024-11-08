import { SelectableValue } from '@grafana/data';
import { css, cx } from '@emotion/css';
import React from 'react';
import Select, { SingleValue } from 'react-select';
import { AsyncPaginate } from 'react-select-async-paginate';

import { toOption } from '../../../utils/utils';

const styles = css`
  &.select {
    div[class*='menu'] {
      z-index: 1000 !important;
      .grafana-custom__option--is-selected {
        background-color: rgb(38, 132, 255) !important;
      }
      .grafana-custom__option--is-focused {
        background-color: transparent;
      }

      border-radius: inherit;
      background-color: rgb(11, 12, 14);
      color: #c7d0d9;
      border: 1px solid rgb(44, 50, 53);

      div[class*='option'] {
        &:hover {
          color: white;
          cursor: pointer;
        }
      }
    }
    input {
      color: #c7d0d9 !important;
    }
    div[class*='control'] {
      height: 32px;
      margin-right: 4px;
      border-radius: inherit;
      width: 208px !important;
      background-color: rgb(11, 12, 14);
      line-height: 1.5;
      font-size: 14px;
      color: #c7d0d9;
      min-height: 32px;
      flex-direction: row;
      max-width: 100%;
      align-items: center;
      cursor: default;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      position: relative;
      border-radius: 2px;
      border: 1px solid rgb(44, 50, 53);
      padding: 0px 0px 0px 8px;
      div:first-child {
        padding: 0;
      }
      div[class*='singleValue'],
      div[class*='placeholder'] {
        left: -1px;
        top: 15px;
      }
      div[class*='singleValue'] {
        color: white;
      }
      div[class*='indicatorContainer'] {
        padding-bottom: 0;
        padding-top: 0;
      }
      span[class*='indicatorSeparator'] {
        display: none;
      }
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
styles;
interface CustomAsyncSelectProps {
  loadOptions: (search: string, loadedOptions: any) => any;
  onChange: (item: SelectableValue<string>) => any;
  setExpanded?: (value: boolean) => any;
}

export function CustomAsyncSelect(props: CustomAsyncSelectProps) {
  let clickEnter = false;
  const loadOptions = (search: string, loadedOptions: any) => {
    if (search.match(/\$\{\w+/gi) != null) {
      return new Promise((res) => res({ hasMore: false, options: [] }));
    }
    return props.loadOptions(search, loadedOptions);
  };

  return (
    <AsyncPaginate
      className={cx('select', styles)}
      menuIsOpen={true}
      autoFocus={true}
      classNamePrefix="grafana-custom"
      loadOptions={loadOptions}
      onChange={(item: any) => {
        if (props.setExpanded != null) {
          props.setExpanded(false);
        }
        if (clickEnter) {
          clickEnter = false;
          return;
        }
        props.onChange(item);
      }}
      onBlur={(event) => {
        if (props.setExpanded != null) {
          props.setExpanded(false);
        }
        const value = (event.target as any).value;
        if (value == null || value === '') {
          return;
        }
        props.onChange(toOption(value));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          if (props.setExpanded != null) {
            props.setExpanded(false);
          }
          const value = (event.target as any).value;
          clickEnter = true;
          if (value == null || value === '') {
            return;
          }
          props.onChange(toOption(value));
        }
      }}
    />
  );
}

interface CustomSelectProps {
  value: SelectableValue<string>;
  options: Array<SelectableValue<string>>;

  onChange: (item: SingleValue<SelectableValue<string>> | SelectableValue<string>) => any;
}

export function CustomSelect(props: CustomSelectProps) {
  return (
    <Select
      backspaceRemovesValue={true}
      isClearable={true}
      classNamePrefix="grafana-custom"
      className={cx('select', styles)}
      value={props.value}
      options={props.options}
      onChange={props.onChange}
    ></Select>
  );
}
