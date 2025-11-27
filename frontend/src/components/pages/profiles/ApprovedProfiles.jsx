import { useState } from "react";
import { MessageCircle, Users } from "lucide-react";
import { ProfileCard } from "../../ProfileCard"
import { PremiumUpgradeModal } from "../../PremiumUpgradeModal"

export function ApprovedProfiles({
  profiles = [],
  onViewProfile,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles = [],
  shortlistedIds = [],
  onToggleShortlist,
}) {
  const [premiumModal, setPremiumModal] = useState(false);

  // ✅ Only show profiles where status is Accepted or Approved
  const approvedProfiles = profiles.filter(
    (p) =>
      p.status?.toLowerCase() === "accepted" ||
      p.status?.toLowerCase() === "approved"
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 m-0">Approved Profiles</h2>
        <p className="text-muted-foreground m-0">
          Mutual matches – both parties have shown interest
        </p>
      </div>

      {/* Chat Feature Notice */}
      <div className="bg-gradient-to-r from-[#fff8e6] to-[#fffaf0] rounded-[20px] p-6 border border-yellow-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#c8a227] flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="m-0 mb-1 text-gray-900">Start a conversation</h4>
            <p className="text-sm text-gray-600 m-0">
              You can now chat with approved matches. Upgrade to Premium to
              unlock unlimited messaging and video calls.
            </p>
          </div>
        </div>
      </div>

      {/* Approved Profiles Grid */}
      {approvedProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {approvedProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              {...profile}
              variant="approved"
              onView={onViewProfile}
              onAddToCompare={onAddToCompare}
              onRemoveCompare={onRemoveCompare}
              onChat={() => setPremiumModal(true)}
              isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false}
              isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(profile.id)) : false}
              onToggleShortlist={onToggleShortlist}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[20px] p-16 satfera-shadow text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-[#f9f5ed] flex items-center justify-center">
              <Users className="w-10 h-10 text-[#c8a227]" />
            </div>
            <h3 className="m-0 text-gray-900">No approved matches yet</h3>
            <p className="text-muted-foreground m-0">
              When both you and another member show interest, they'll appear
              here. Keep browsing and sending requests!
            </p>
          </div>
        </div>
      )}

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal open={premiumModal} onOpenChange={setPremiumModal} />
    </div>
  );
}
