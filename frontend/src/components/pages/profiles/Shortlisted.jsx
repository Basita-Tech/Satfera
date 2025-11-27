import { Star } from 'lucide-react';
import { ProfileCard } from '../../ProfileCard';
import { Button } from '../../ui/button';

export function Shortlisted({
  profiles,
  loading = false,
  onViewProfile,
  onSendRequest,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles,
  onNavigateToCompare,
  shortlistedIds,
  onToggleShortlist,
}) {
  console.log("📋 Shortlisted - Raw profiles:", profiles);
  
  // Map backend profile structure to frontend format
  // Backend returns: { user: {...}, scoreDetail: {...} }
  const shortlistedProfiles = (profiles || []).map((item, index) => {
    const user = item.user || item;
    const scoreDetail = item.scoreDetail || user.scoreDetail;
        console.log(`📋 Profile ${index} - Full user object:`, {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          closerPhoto: user.closerPhoto,
          hasCloserPhoto: !!user.closerPhoto,
          closerPhotoUrl: user.closerPhoto?.url
        });
    
    
    const mappedProfile = {
      ...user, // Spread user fields first
      id: user.userId || user.id || user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      age: user.age,
      height: user.personal?.height,
      city: user.personal?.city || user.city,
      country: user.personal?.country || user.country,
      profession: user.professional?.Occupation || user.occupation,
      religion: user.personal?.religion || user.religion,
      caste: user.personal?.subCaste || user.subCaste,
      education: user.education?.HighestEducation,
      diet: user.healthAndLifestyle?.diet,
      // If no user image, keep empty string (no fallback photo)
      image: user.closerPhoto?.url || '',
      compatibility: scoreDetail?.score || '0',
      status: user.status
    };
    
    console.log(`📋 Profile ${index} - Mapped:`, { 
      name: mappedProfile.name,
      image: mappedProfile.image,
      closerPhotoFromUser: user.closerPhoto
    });
    return mappedProfile;
  });
  // Filter out placeholder/test profiles: require id and one meaningful field
  const isMeaningful = (p) => {
    if (!p || !p.id) return false;
    return Boolean(p.image || p.city || p.age || p.profession);
  };
  const filteredShortlisted = shortlistedProfiles.filter(isMeaningful);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h5 className="mb-2 m-0">Shortlisted Profiles</h5>
          <p className="text-muted-foreground m-0">
            Your saved profiles for easy access and comparison
          </p>
        </div>

        {/* Compare CTA */}
        {compareProfiles.length >= 2 && (
          <Button
            onClick={onNavigateToCompare}
            className="bg-gold hover:bg-gold/90 text-white rounded-[12px]"
          >
            Compare {compareProfiles.length} Profiles
          </Button>
        )}
      </div>

      {/* Shortlisted Profiles Grid */}
      {filteredShortlisted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredShortlisted.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 h-full"
            >
              <ProfileCard
                {...profile}
                variant="approved"
                onView={onViewProfile}
                onSendRequest={onSendRequest}
                onAddToCompare={onAddToCompare}
                onRemoveCompare={onRemoveCompare}
                isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false}
                isShortlisted={true}
                onToggleShortlist={onToggleShortlist}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[20px] p-16 satfera-shadow text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-beige flex items-center justify-center">
              <Star className="w-10 h-10 text-gold" />
            </div>
            <h3 className="m-0">No shortlisted profiles</h3>
            <p className="text-muted-foreground m-0">
              Start shortlisting profiles you're interested in for quick access later. Browse profiles to get started!
            </p>
            <Button
              onClick={() => {}}
              className="mt-4 bg-gold hover:bg-gold/90 text-white rounded-[12px]"
            >
              Browse Profiles
            </Button>
          </div>
        </div>
      )}

      {/* Compare Info Card */}
      {filteredShortlisted.length > 0 && compareProfiles.length < 2 && (
        <div className="bg-beige rounded-[20px] p-6 border border-border-subtle">
          <p className="text-sm text-muted-foreground text-center m-0">
            💡 Tip: Select 2 or more profiles using "Add to Compare" to see side-by-side comparison
          </p>
        </div>
      )}
    </div>
  );
}
