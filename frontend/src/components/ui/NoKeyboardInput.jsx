import React from 'react';
import { components } from 'react-select';

/**
 * Custom Input component that prevents keyboard from appearing on mobile devices
 * Makes input readonly and disables all text input
 */
export const NoKeyboardInput = (props) => {
  return (
    <components.Input
      {...props}
      readOnly
      inputMode="none"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      onKeyDown={(e) => {
        // Prevent any keyboard input
        e.preventDefault();
      }}
      onChange={(e) => {
        // Prevent any text input changes
        e.preventDefault();
      }}
    />
  );
};

export default NoKeyboardInput;
