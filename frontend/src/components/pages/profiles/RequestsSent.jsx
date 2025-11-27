import { useState } from "react";
import { TabsComponent } from "../../TabsComponent";
import { ProfileCard } from "../../ProfileCard";
import { WithdrawModal } from "../../WithdrawModal";
import { PremiumUpgradeModal } from "../../PremiumUpgradeModal";
import { Heart } from "lucide-react";

export function RequestsSent({
  profiles,
  onViewProfile,
  onWithdraw,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles,
  shortlistedIds,
  onToggleShortlist,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [withdrawModal, setWithdrawModal] = useState({
    open: false,
    profile: null,
  });
  const [premiumModal, setPremiumModal] = useState(false);

  // Separate profiles by status
  const pendingProfiles = profiles.filter((p) => p.status === "Pending").slice(0, 4);
  const acceptedProfiles = profiles.filter((p) => p.status === "Accepted").slice(0, 2);
  const rejectedProfiles = profiles.filter((p) => p.status === "Rejected").slice(0, 1);
  const allProfiles = [...pendingProfiles, ...acceptedProfiles, ...rejectedProfiles];

  const getFilteredProfiles = () => {
    switch (activeTab) {
      case "pending":
        return pendingProfiles;
      case "accepted":
        return acceptedProfiles;
      case "rejected":
        return rejectedProfiles;
      default:
        return allProfiles;
    }
  };

  const filteredProfiles = getFilteredProfiles();

  const tabs = [
    { key: "all", label: "All", count: allProfiles.length },
    { key: "pending", label: "Pending", count: pendingProfiles.length },
    { key: "accepted", label: "Accepted", count: acceptedProfiles.length },
    { key: "rejected", label: "Rejected", count: rejectedProfiles.length },
  ];

  const handleWithdrawClick = (id) => {
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      setWithdrawModal({ open: true, profile });
    }
  };

  const handleConfirmWithdraw = () => {
    if (withdrawModal.profile) {
      onWithdraw(withdrawModal.profile.id);
      setWithdrawModal({ open: false, profile: null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <TabsComponent tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              {...profile}
              variant="sent"
              onView={onViewProfile}
              onWithdraw={handleWithdrawClick}
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
            <div className="w-20 h-20 rounded-full bg-beige flex items-center justify-center">
              <Heart className="w-10 h-10 text-gold" />
            </div>
            <h3 className="m-0">No {activeTab !== "all" ? activeTab : ""} requests</h3>
            <p className="text-muted-foreground m-0">
              {activeTab === "all"
                ? "You haven't sent any requests yet. Browse profiles to find your perfect match!"
                : `No ${activeTab} requests at the moment.`}
            </p>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      <WithdrawModal
        open={withdrawModal.open}
        onOpenChange={(open) => setWithdrawModal({ open, profile: null })}
        profileName={withdrawModal.profile?.name || ""}
        onConfirm={handleConfirmWithdraw}
      />

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal open={premiumModal} onOpenChange={setPremiumModal} />
    </div>
  );
}
