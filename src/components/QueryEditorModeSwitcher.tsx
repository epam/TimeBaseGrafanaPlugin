import React, { useEffect, useState } from 'react';
import { Button, ConfirmModal, Tooltip } from '@grafana/ui';

type Props = {
  isRaw: boolean;
  onChange: (newIsRaw: boolean) => void;
};

export const QueryEditorModeSwitcher = ({ isRaw, onChange }: Props): JSX.Element => {
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // if the isRaw changes, we hide the modal
    setModalOpen(false);
  }, [isRaw]);

  if (isRaw) {
    return (
      <>
        <Tooltip content="Switch to visual editor mode" theme="info">
          <Button
            icon="pen"
            variant="secondary"
            type="button"
            onClick={() => {
              // we show the are-you-sure modal
              setModalOpen(true);
            }}
          />
        </Tooltip>
        <ConfirmModal
          isOpen={isModalOpen}
          title="Switch to visual editor mode"
          body="Are you sure to switch to visual editor mode?"
          confirmText="Yes, switch to editor mode"
          dismissText="No, stay in raw query mode"
          onConfirm={() => {
            onChange(false);
          }}
          onDismiss={() => {
            setModalOpen(false);
          }}
        />
      </>
    );
  } else {
    return (
      <Tooltip content="Switch to raw query mode" theme="info">
        <Button
          icon="pen"
          variant="secondary"
          type="button"
          onClick={() => {
            onChange(true);
          }}
        />
      </Tooltip>
    );
  }
};
