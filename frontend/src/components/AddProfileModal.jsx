import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { TabsComponent } from './TabsComponent';
import { ProfileCard } from './ProfileCard';

export function AddProfileModal({
  open,
  onOpenChange,
  profiles,
  shortlistedProfiles,
  onAddToCompare,
  onRemoveCompare,
  compareProfileIds,
  shortlistedIds,
  onToggleShortlist,
}) {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { key: 'browse', label: 'Browse All' },
    { key: 'shortlisted', label: 'Shortlisted' },
  ];

  const getFilteredProfiles = () => {
    const compareIdStrs = Array.isArray(compareProfileIds)
      ? compareProfileIds.map((id) => String(id))
      : [];
    
    const shortlistedIdStrs = Array.isArray(shortlistedIds)
      ? shortlistedIds.map((id) => String(id))
      : [];

    // Determine base profiles based on active tab
    let baseProfiles = [];
    if (activeTab === 'shortlisted') {
      baseProfiles = Array.isArray(shortlistedProfiles) ? shortlistedProfiles : [];
    } else {
      // Browse All: use profiles but exclude shortlisted ones
      baseProfiles = Array.isArray(profiles) ? profiles : [];
    }

    // Normalize and dedupe profiles by canonical id to avoid duplicates showing
    const canonicalId = (p) => {
      // Handle backend format: { user: {...}, scoreDetail: {...} }
      const user = p?.user || p;
      return String(user?.id ?? user?.userId ?? user?._id ?? p?.id ?? p?.userId ?? p?._id ?? '');
    };
    
    const normalizeName = (p) => {
      const user = p?.user || p;
      return String(p?.name ?? user?.name ?? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ?? 'Unknown');
    };

    const dedupMap = new Map();
    for (const p of baseProfiles) {
      const id = canonicalId(p);
      if (!id) continue; // skip entries without id
      
      if (!dedupMap.has(id)) {
        const user = p?.user || p;
        const scoreDetail = p?.scoreDetail || user?.scoreDetail;
        const safe = {
          ...user,
          ...p,
          id,
          name: normalizeName(p),
          age: user?.age,
          profession: p?.profession ?? user?.profession ?? user?.professional?.Occupation ?? user?.occupation ?? '',
          city: p?.city ?? user?.city ?? user?.personal?.city ?? user?.personal?.full_address?.city ?? '',
          religion: user?.religion ?? user?.personal?.religion ?? '',
          caste: user?.subCaste ?? user?.personal?.subCaste ?? '',
          image: user?.closerPhoto?.url ?? p?.image ?? '',
          compatibility: scoreDetail?.score ?? p?.compatibility ?? 0,
          status: user?.status ?? p?.status ?? null,
        };
        dedupMap.set(id, safe);
      }
    }

    const prepared = Array.from(dedupMap.values());
    
    console.log('🔍 AddProfileModal getFilteredProfiles:', {
      activeTab,
      baseProfilesCount: baseProfiles.length,
      preparedCount: prepared.length,
      compareIdStrs,
      shortlistedIdStrs,
      prepared: prepared.map(p => ({ id: p.id, name: p.name }))
    });

    // Filter out profiles that are already in compare
    const availableProfiles = prepared.filter(p => {
      const pid = String(p.id);
      const isInCompare = compareIdStrs.includes(pid);
      if (isInCompare) {
        console.log('🚫 Filtered out (in compare):', pid, p.name);
      }
      return !isInCompare;
    });
    
    console.log('✅ Available profiles after compare filter:', availableProfiles.length);

    if (!searchQuery.trim()) {
      return availableProfiles.slice(0, 6);
    }

    const q = searchQuery.toLowerCase();
    return availableProfiles
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const prof = (p.profession || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        return name.includes(q) || prof.includes(q) || city.includes(q);
      })
      .slice(0, 6);
  };

  const filteredProfiles = getFilteredProfiles();
  const [addingIds, setAddingIds] = useState([]);

  // Diagnostic logs to help debug "Browse All" list and compare ids
  useEffect(() => {
    if (!open) return;
    try {
      console.log('🔍 AddProfileModal opened. props:', {
        open,
        activeTab,
        profilesCount: Array.isArray(profiles) ? profiles.length : profiles,
        profiles: profiles,
        shortlistedCount: Array.isArray(shortlistedProfiles) ? shortlistedProfiles.length : shortlistedProfiles,
        compareProfileIds: compareProfileIds,
        filteredProfilesCount: filteredProfiles.length
      });
      console.log('🔍 First 2 profiles:', Array.isArray(profiles) ? profiles.slice(0, 2) : profiles);
      console.log('🔍 Filtered profiles:', filteredProfiles);
    } catch (e) {
      console.error('AddProfileModal debug error:', e);
    }
  }, [open, activeTab, profiles, shortlistedProfiles, compareProfileIds, filteredProfiles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] !top-[52%] my-12 mx-4 overflow-hidden bg-white rounded-[20px] p-0 gap-0">
        <div className="px-8 py-6 border-b border-border-subtle">
          <DialogHeader>
            <DialogTitle>Add Profile to Compare</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="space-y-6">
            <div className="relative w-full">
              <Input
                placeholder="Search by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-input-background border-border-subtle rounded-[12px]"
              />
            </div>

            {/* Tabs */}
            <TabsComponent tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Profiles Grid */}
            {filteredProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map(profile => {
                  const pid = String(profile.id || profile.userId || profile._id || profile.user?.userId || profile.user?.id || '');
                  const isAdding = addingIds.includes(pid);
                  return (
                    <ProfileCard
                      key={profile.id}
                      {...profile}
                      variant="browse"
                      onView={(id) => console.log('View', id)}
                      onSendRequest={() => { }}
                      onAddToCompare={async (id) => {
                        try {
                          const compareIdStrs = Array.isArray(compareProfileIds)
                            ? compareProfileIds.map((cid) => String(cid))
                            : [];
                          if (compareIdStrs.includes(String(id))) {
                            return;
                          }
                          if (compareIdStrs.length >= 5) {
                            alert('You can compare up to 5 profiles only.');
                            return;
                          }
                          setAddingIds((s) => Array.from(new Set([...s, String(id)])));
                          // await parent handler so UI stays in sync
                          if (typeof onAddToCompare === 'function') {
                            await onAddToCompare(id, profile);
                          }
                        } catch (e) {
                          console.warn('AddProfileModal: add to compare failed', e);
                        } finally {
                          setAddingIds((s) => (s || []).filter(x => String(x) !== String(id)));
                        }
                      }}
                      onRemoveCompare={onRemoveCompare}
                      isInCompare={Array.isArray(compareProfileIds) ? compareProfileIds.some((cid) => String(cid) === pid) : false}
                      isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid) => String(sid) === pid) : false}
                      onToggleShortlist={onToggleShortlist}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery
                  ? 'No profiles found matching your search'
                  : activeTab === 'shortlisted' 
                    ? 'No shortlisted profiles available. Add profiles to your shortlist first.'
                    : 'No profiles available to add. All available profiles might already be in comparison.'}
                <div className="text-xs mt-2 text-gray-400">
                  Debug: {Array.isArray(profiles) ? profiles.length : 0} total profiles, 
                  {Array.isArray(compareProfileIds) ? compareProfileIds.length : 0} in compare
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
