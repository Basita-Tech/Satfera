import { useState, useEffect } from 'react';
import { CompareTable } from '../../CompareTable';
import { Button } from '../../ui/button';
import { ArrowLeft } from 'lucide-react';
import { AddProfileModal } from '../../AddProfileModal';
import { getMatches } from '../../../api/auth';

export function ComparePage({ 
  profiles,
  selectedProfiles, 
  onRemoveFromCompare, 
  onSendRequest,
  onNavigateBack,
  onAddToCompare,
  shortlistedIds,
  onToggleShortlist,
  onViewProfile
}) {
  // Diagnostic log: inspect incoming data
  console.log('ComparePage: props ->', {
    profilesCount: Array.isArray(profiles) ? profiles.length : profiles,
    selectedProfilesCount: Array.isArray(selectedProfiles) ? selectedProfiles.length : selectedProfiles,
    selectedIds: Array.isArray(selectedProfiles) ? selectedProfiles.map(p => p?.id) : selectedProfiles
  });
  // Ensure selectedProfiles passed to CompareTable are full profile objects (not just ids)
  import.meta && import.meta.env; // keep bundlers happy
  const [resolvedSelectedProfiles, setResolvedSelectedProfiles] = useState([]);
  const [fetchedProfiles, setFetchedProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolveFromPool = (id) => {
      if (!Array.isArray(profiles)) return undefined;
      return profiles.find(p => String(p?.id) === String(id) || String(p?.userId) === String(id) || String(p?._id) === String(id) || String(p?.user?.userId) === String(id) || String(p?.user?.id) === String(id));
    };

    const doResolve = async () => {
      if (!Array.isArray(selectedProfiles)) { setResolvedSelectedProfiles([]); return; }
      const results = [];
      const toFetch = [];

      for (const sp of selectedProfiles) {
        if (!sp) continue;
        if (typeof sp === 'object') { results.push(sp); continue; }
        const found = resolveFromPool(sp);
        if (found) results.push(found);
        else toFetch.push(sp);
      }

      if (toFetch.length) {
        // fetch missing profiles from server
        try {
          const { getViewProfiles } = await import('../../../api/auth');
          const fetched = await Promise.all(toFetch.map(id => getViewProfiles(id).then(r => (r && r.success ? r.data : null)).catch(() => null)));
          fetched.forEach(f => { if (f) results.push(f); });
        } catch (e) {
          console.warn('ComparePage: failed to dynamically import getViewProfiles', e);
        }
      }

      // dedupe by id/userId
      const uniq = [];
      const seen = new Set();
      for (const r of results) {
        const key = String((r?.userId ?? r?.id ?? r?._id ?? (r?.user && (r.user.userId || r.user.id))) || '').trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        uniq.push(r);
      }
      if (mounted) setResolvedSelectedProfiles(uniq);
    };

    doResolve();
    return () => { mounted = false; };
  }, [selectedProfiles, profiles]);

  console.log('ComparePage: resolvedSelectedProfiles ->', resolvedSelectedProfiles);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Fetch recommendation profiles if no profiles available
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (loadingProfiles || fetchedProfiles.length > 0) return;
      
      setLoadingProfiles(true);
      try {
        console.log('🔍 Fetching recommendation profiles for compare...');
        const response = await getMatches({ page: 1, limit: 50, useCache: false });
        if (response?.success && Array.isArray(response?.data)) {
          console.log('✅ Fetched profiles for compare:', response.data.length);
          setFetchedProfiles(response.data);
        }
      } catch (error) {
        console.error('❌ Failed to fetch profiles:', error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchRecommendations();
  }, [loadingProfiles, fetchedProfiles.length]);

  // Extract IDs from selectedProfiles (handle both objects and string IDs)
  const compareProfileIds = Array.isArray(selectedProfiles) 
    ? selectedProfiles.map(p => typeof p === 'object' ? (p?.id || p?.userId || p?._id) : p).filter(Boolean)
    : [];

  // Combine passed profiles with fetched profiles
  const allProfiles = [
    ...(Array.isArray(profiles) ? profiles : []),
    ...fetchedProfiles
  ];
  
  console.log('📊 ComparePage - Profile counts:', {
    passedProfiles: Array.isArray(profiles) ? profiles.length : 0,
    fetchedProfiles: fetchedProfiles.length,
    allProfiles: allProfiles.length,
    compareProfileIds: compareProfileIds.length,
    shortlistedIdsCount: Array.isArray(shortlistedIds) ? shortlistedIds.length : 0
  });

  // Build shortlisted profiles from the profiles pool
  const shortlistedProfiles = Array.isArray(allProfiles) && Array.isArray(shortlistedIds)
    ? allProfiles.filter(p => {
        const pid = String(p?.id || p?.userId || p?._id || p?.user?.userId || p?.user?.id || '');
        return pid && shortlistedIds.some((sid) => String(sid) === pid);
      })
    : [];
    
  console.log('📋 ComparePage - Shortlisted profiles:', shortlistedProfiles.length);

  const handleAddToCompare = async (id, profile = null) => {
    // Use passed profile object when available (from modal), otherwise try to find in all profiles pool
    const found = profile || (Array.isArray(allProfiles) ? allProfiles.find(p => [p?.id, p?.userId, p?._id, p?.user?.userId, p?.user?.id].some(c => String(c) === String(id))) : null);
    try { await onAddToCompare(id, found || null); } catch (e) { console.warn('ComparePage: add to compare failed', e); }
    setAddModalOpen(false);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={onNavigateBack}
            className="mb-2 -ml-2 text-muted-foreground hover:text-gold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h2 className="mb-2 m-0">Compare Profiles</h2>
          <p className="text-muted-foreground m-0">
            Compare up to 5 profiles side by side to make an informed decision
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <CompareTable
        profiles={resolvedSelectedProfiles}
        onRemove={onRemoveFromCompare}
        onViewProfile={onViewProfile}
        onSendRequest={onSendRequest}
        onAddProfile={() => setAddModalOpen(true)}
        shortlistedIds={shortlistedIds}
        onToggleShortlist={onToggleShortlist}
      />

      {/* Add Profile Modal */}
      <AddProfileModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        profiles={allProfiles}
        shortlistedProfiles={shortlistedProfiles}
        onAddToCompare={handleAddToCompare}
        onRemoveCompare={onRemoveFromCompare}
        compareProfileIds={compareProfileIds}
        shortlistedIds={shortlistedIds}
        onToggleShortlist={onToggleShortlist}
      />

      {/* Add More Profiles Suggestion */}
      {selectedProfiles.length < 5 && selectedProfiles.length > 0 && (
        <div className="bg-beige rounded-[20px] p-6 border border-border-subtle text-center">
          <p className="text-sm text-muted-foreground m-0">
            You can add up to {5 - selectedProfiles.length} more profile
            {5 - selectedProfiles.length > 1 ? 's' : ''} for comparison.
            Browse or visit your Shortlisted page to add more.
          </p>

          <Button
            onClick={onNavigateBack}
            className="mt-4 bg-gold hover:bg-gold/90 text-white rounded-[12px]"
          >
            Add More Profiles
          </Button>
        </div>
      )}
    </div>
  );
}
