import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getViewProfiles, removeFromCompare } from '../api/auth';
export default function ComparePageClient({
  selectedIds = [],
  onUpdated
}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const fetched = await Promise.all((selectedIds || []).map(id => getViewProfiles(String(id)).catch(() => null)));
        const normalized = fetched.map(r => r && r.data ? r.data : null).filter(Boolean);
        if (mounted) setProfiles(normalized);
      } catch (e) {
        console.error('Failed to fetch compare profiles', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedIds]);
  const handleRemove = async id => {
    try {
      const resp = await removeFromCompare([id]);
      if (resp?.success) {
        const updated = resp.ids || [];
        if (typeof onUpdated === 'function') {
          onUpdated(updated);
        } else {
          try {
            if (typeof window?.__satfera_handleRemoveFromCompare === 'function') {
              await window.__satfera_handleRemoveFromCompare(String(id));
            } else {
              window.dispatchEvent(new CustomEvent('satfera:removeFromCompare', {
                detail: {
                  id: String(id)
                }
              }));
            }
          } catch (notifyErr) {
            console.warn('ComparePageClient: failed to notify dashboard after remove', notifyErr);
          }
        }
        setProfiles(prev => prev.filter(p => String(p.userId || p.id || p._id) !== String(id)));
      } else {
        toast.error(resp?.message || 'Failed to remove from compare');
      }
    } catch (e) {
      console.error('Failed to remove from compare', e);
      toast.error('Failed to remove from compare');
    }
  };
  if (loading) return <div>Loading profiles...</div>;
  if (!profiles.length) return <div>No profiles selected for comparison.</div>;
  return <div className="compare-container">
      <div style={{
      display: 'flex',
      gap: 16,
      overflowX: 'auto'
    }}>
        {profiles.map(p => <div key={p.userId || p.id || p._id} style={{
        border: '1px solid #ddd',
        padding: 12,
        minWidth: 200
      }}>
            <img src={p.closerPhoto?.url || p.image || ''} alt={p.name || ''} style={{
          width: '100%',
          height: 120,
          objectFit: 'cover'
        }} />
            <h4>{p.firstName ? `${p.firstName} ${p.lastName || ''}` : p.name}</h4>
            <p>Age: {p.age}</p>
            <p>City: {p.city || p.location}</p>
            <button onClick={() => handleRemove(p.userId || p.id || p._id)}>Remove</button>
          </div>)}
      </div>
    </div>;
}