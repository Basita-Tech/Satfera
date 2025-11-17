import { useState } from 'react';
import { CompareTable } from '../../CompareTable';
import { Button } from '../../ui/button';
import { ArrowLeft } from 'lucide-react';
import { AddProfileModal } from '../../AddProfileModal';

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
  const [addModalOpen, setAddModalOpen] = useState(false);

  const shortlistedProfiles = profiles.filter(p =>
    Array.isArray(shortlistedIds)
      ? shortlistedIds.some((sid) => String(sid) === String(p.id))
      : false
  );

  const handleAddToCompare = (id) => {
    onAddToCompare(id);
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
        profiles={selectedProfiles}
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
        profiles={profiles}
        shortlistedProfiles={shortlistedProfiles}
        onAddToCompare={handleAddToCompare}
        onRemoveCompare={onRemoveFromCompare}
        compareProfileIds={selectedProfiles.map(p => p.id)}
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
