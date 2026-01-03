import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { addToCompare, getCompare } from '../api/auth';
export default function AddToCompareButton({
  profileId,
  compareIds = [],
  onUpdated
}) {
  const idStr = String(profileId);
  const already = Array.isArray(compareIds) && compareIds.map(String).includes(idStr);
  const [loading, setLoading] = useState(false);
  const handleAdd = async () => {
    if (already || loading) return;
    setLoading(true);
    if (typeof onUpdated === 'function') {
      try {
        await onUpdated(idStr);
      } catch (e) {
        console.error('onUpdated callback failed', e);
        toast.error('Failed to add to compare');
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      if (typeof window?.__satfera_handleAddToCompare === 'function') {
        await window.__satfera_handleAddToCompare(idStr, null);
        setLoading(false);
        return;
      }
      const resp = await addToCompare(idStr);
      if (resp?.success) {
        try {
          window.dispatchEvent(new CustomEvent('satfera:addToCompare', {
            detail: {
              id: idStr,
              profile: null
            }
          }));
        } catch (notifyErr) {
          console.warn('AddToCompareButton: failed to notify dashboard', notifyErr);
        }
      } else {
        alert(resp?.message || 'Failed to add to compare');
      }
    } catch (e) {
      console.error('Add to compare failed', e);
      alert('Failed to add to compare');
    } finally {
      setLoading(false);
    }
  };
  return <button onClick={handleAdd} disabled={already || loading} className={`px-3 py-1 rounded ${already ? 'bg-gray-300 text-gray-700' : 'bg-gold text-white'}`}>
      {already ? 'Added' : loading ? 'Adding...' : 'Add to Compare'}
    </button>;
}