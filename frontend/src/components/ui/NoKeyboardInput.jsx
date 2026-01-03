import React from 'react';
import { components } from 'react-select';
export const NoKeyboardInput = props => {
  return <components.Input {...props} readOnly inputMode="none" autoCapitalize="off" autoCorrect="off" spellCheck={false} onKeyDown={e => {
    e.preventDefault();
  }} onChange={e => {
    e.preventDefault();
  }} />;
};
export default NoKeyboardInput;