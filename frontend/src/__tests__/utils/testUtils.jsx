import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Create a simple mock AuthProvider for tests
const MockAuthProvider = ({ children }) => {
  return (
    <div data-testid="auth-provider">
      {children}
    </div>
  );
};

const AllTheProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    </BrowserRouter>
  );
};

const customRender = (ui, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };