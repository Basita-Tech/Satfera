import { useState } from 'react';
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
    const baseProfiles = activeTab === 'shortlisted' ? shortlistedProfiles : profiles;
    const compareIdStrs = Array.isArray(compareProfileIds)
      ? compareProfileIds.map((id) => String(id))
      : [];

    if (!searchQuery.trim()) {
      return baseProfiles
        .filter(p => !compareIdStrs.includes(String(p.id)))
        .slice(0, 6);
    }

    return baseProfiles
      .filter(
        p =>
          !compareIdStrs.includes(String(p.id)) &&
          (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.city.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .slice(0, 6);
  };

  const filteredProfiles = getFilteredProfiles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden bg-white rounded-[20px] p-0">
        <div className="p-6 border-b border-border-subtle">
          <DialogHeader>
            <DialogTitle>Add Profile to Compare</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="space-y-6">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                strokeWidth={2.2}
              />

              <Input
                placeholder="Search by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input-background border-border-subtle rounded-[12px]"
              />
            </div>

            {/* Tabs */}
            <TabsComponent tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Profiles Grid */}
            {filteredProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProfiles.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    {...profile}
                    variant="browse"
                    onView={(id) => console.log('View', id)}
                    onSendRequest={() => { }}
                    onAddToCompare={(id) => {
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
                      onAddToCompare(id);
                    }}
                    onRemoveCompare={onRemoveCompare}
                    isInCompare={Array.isArray(compareProfileIds) ? compareProfileIds.some((cid) => String(cid) === String(profile.id)) : false}
                    isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid) => String(sid) === String(profile.id)) : false}
                    onToggleShortlist={onToggleShortlist}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery
                  ? 'No profiles found matching your search'
                  : 'No profiles available to add'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
