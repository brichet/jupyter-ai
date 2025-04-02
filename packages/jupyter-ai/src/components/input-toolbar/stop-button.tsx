import {
  IChatModel,
  InputToolbarRegistry,
  TooltippedButton
} from '@jupyter/chat';
import StopIcon from '@mui/icons-material/Stop';
import React from 'react';
import { requestAPI } from '../../handler';

/**
 * Properties of the stop button.
 */
export interface IStopButtonProps
  extends InputToolbarRegistry.IToolbarItemProps {
  /**
   * The chat model.
   */
  chatModel: IChatModel;
}

/**
 * The stop button.
 */
export function StopButton(props: IStopButtonProps): JSX.Element {
  const tooltip = 'Stop streaming';
  const onClick = () => {
    // Assuming here that the last message is the current in edition.
    const messageId =
      props.chatModel.messages[props.chatModel.messages.length - 1].id;

    // Post request to the stop streaming handler.
    requestAPI('chats/stop_streaming', {
      method: 'POST',
      body: JSON.stringify({
        message_id: messageId
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  return (
    <TooltippedButton
      onClick={onClick}
      tooltip={tooltip}
      buttonProps={{
        size: 'small',
        variant: 'contained',
        title: tooltip
      }}
    >
      <StopIcon />
    </TooltippedButton>
  );
}

/**
 * Factory returning the toolbar item.
 */
export function stopItem(
  chatModel: IChatModel
): InputToolbarRegistry.IToolbarItem {
  return {
    element: (props: InputToolbarRegistry.IToolbarItemProps) => {
      const stopProps: IStopButtonProps = { ...props, chatModel };
      return StopButton(stopProps);
    },
    position: 50,
    hidden: true /* hidden by default */
  };
}
