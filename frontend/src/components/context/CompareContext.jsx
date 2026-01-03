import React, { createContext, useContext } from 'react';
const defaultValue = {
  compareProfiles: [],
  selectedCompareProfiles: [],
  addToCompare: async (id, profile = null) => {
    try {
      if (typeof window?.__satfera_handleAddToCompare === 'function') {
        return await window.__satfera_handleAddToCompare(String(id), profile);
      }
      try {
        window.dispatchEvent(new CustomEvent('satfera:addToCompare', {
          detail: {
            id: String(id),
            profile
          }
        }));
      } catch (e) {}
      return null;
    } catch (e) {
      console.warn('CompareContext.addToCompare failed', e);
      return null;
    }
  },
  removeFromCompare: async id => {
    try {
      if (typeof window?.__satfera_handleRemoveFromCompare === 'function') {
        return await window.__satfera_handleRemoveFromCompare(String(id));
      }
      try {
        window.dispatchEvent(new CustomEvent('satfera:removeFromCompare', {
          detail: {
            id: String(id)
          }
        }));
      } catch (e) {}
      return null;
    } catch (e) {
      console.warn('CompareContext.removeFromCompare failed', e);
      return null;
    }
  }
};
const CompareContext = createContext(defaultValue);
export const CompareProvider = ({
  children,
  value
}) => {
  const merged = {
    ...defaultValue,
    ...(value || {})
  };
  return <CompareContext.Provider value={merged}>{children}</CompareContext.Provider>;
};
export const useCompare = () => useContext(CompareContext);
export default CompareProvider;