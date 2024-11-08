import { SelectableValue } from '@grafana/data';
import { cx } from '@emotion/css';
import React, { useRef, useState } from 'react';

import { CustomAsyncSelect } from './CustomAsyncSelect';

const PLACEHOLDER = 'Select...';

interface SegmentSelectProps {
  value: SelectableValue<string> | undefined;
  loadOptions: (search: string, loadedOptions: any) => any;
  onChange: (item: SelectableValue<string>) => any;
}

export function SegmentSelect(props: SegmentSelectProps) {
  const [Label, width, expanded, setExpanded] = useExpandableLabel(false);

  console.log(width);

  return !expanded ? (
    <Label
      Component={
        <a title={props.value?.label || PLACEHOLDER} className={cx('gf-form-label', 'query-part')}>
          {props.value?.label || PLACEHOLDER}
        </a>
      }
    />
  ) : (
    <CustomAsyncSelect loadOptions={props.loadOptions} onChange={props.onChange} setExpanded={setExpanded} />
  );
}

export const useExpandableLabel = (initialExpanded: boolean): [any, number, boolean, (expanded: boolean) => void] => {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<boolean>(initialExpanded);
  const [width, setWidth] = useState(0);

  const Label: any = ({ Component, onClick }: any) => (
    <div
      className="gf-form"
      ref={ref}
      onClick={() => {
        setExpanded(true);
        if (ref && ref.current) {
          setWidth(ref.current.clientWidth * 1.25);
        }
        if (onClick) {
          onClick();
        }
      }}
    >
      {Component}
    </div>
  );

  return [Label, width, expanded, setExpanded];
};
