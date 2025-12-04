import React, { createContext, useContext } from 'react';

// Minimal CompareContext fallback
// This file provides a lightweight context API so components that import
// `useCompare()` don't crash when a full provider isn't present. It also
// routes compare mutations to the existing global fallbacks used elsewhere
// in the app (window.__satfera_handleAddToCompare / removeFromCompare and
// the custom events). This keeps behavior compatible while the app migrates
// to a proper centralized provider.

const defaultValue = {
  compareProfiles: [],
  selectedCompareProfiles: [],
  addToCompare: async (id, profile = null) => {
    try {
      if (typeof window?.__satfera_handleAddToCompare === 'function') {
        return await window.__satfera_handleAddToCompare(String(id), profile);
      }
      // Dispatch an event so `UserDashboard` (or its fallbacks) can respond
      try {
        window.dispatchEvent(new CustomEvent('satfera:addToCompare', { detail: { id: String(id), profile } }));
      } catch (e) { /* ignore */ }
      return null;
    } catch (e) {
      console.warn('CompareContext.addToCompare failed', e);
      return null;
    }
  },
  removeFromCompare: async (id) => {
    try {
      if (typeof window?.__satfera_handleRemoveFromCompare === 'function') {
        return await window.__satfera_handleRemoveFromCompare(String(id));
      }
      try {
        window.dispatchEvent(new CustomEvent('satfera:removeFromCompare', { detail: { id: String(id) } }));
      } catch (e) { /* ignore */ }
      return null;
    } catch (e) {
      console.warn('CompareContext.removeFromCompare failed', e);
      return null;
    }
  },
};

const CompareContext = createContext(defaultValue);

export const CompareProvider = ({ children, value }) => {
  // If a value is passed, merge it with defaults to ensure the shape remains
  const merged = { ...defaultValue, ...(value || {}) };
  return <CompareContext.Provider value={merged}>{children}</CompareContext.Provider>;
};

export const useCompare = () => useContext(CompareContext);

export default CompareProvider;
