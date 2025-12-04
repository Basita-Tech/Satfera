import { useState } from "react";
import { PremiumUpgradeModal } from "../../PremiumUpgradeModal";
import { ProfileCard } from "../../ProfileCard";
import { Eye } from "lucide-react";

export function Requests({
  profiles = [],
  onViewProfile,
  onWithdraw,
  onAccept,
  onReject,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles = [],
  shortlistedIds = [],
  onToggleShortlist,
  onChat,
}) {
  const [activeTab, setActiveTab] = useState("sent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [premiumModal, setPremiumModal] = useState(false);

  // ✅ Normalize data
  const normalizedProfiles = profiles.map((p) => {
    const type =
      p.type?.toLowerCase() === "received"
        ? "received"
        : p.type?.toLowerCase() === "sent"
        ? "sent"
        : "sent";

    let status = (p.status || "pending").toLowerCase();
    if (["new", "new request", "request"].includes(status)) {
      status = "pending";
    }

    return { ...p, type, status };
  });

  // ✅ Split lists
  const sentRequestsList = normalizedProfiles.filter((p) => p.type === "sent");
  const receivedRequestsList = normalizedProfiles.filter(
    (p) => p.type === "received"
  );

  // ✅ Count helper
  const getStatusCounts = (list) => ({
    all: list.length,
    pending: list.filter((p) => p.status === "pending").length,
    accepted: list.filter((p) => p.status === "accepted").length,
    rejected: list.filter((p) => p.status === "rejected").length,
  });

  const sentCounts = getStatusCounts(sentRequestsList);
  const receivedCounts = getStatusCounts(receivedRequestsList);

  // ✅ Apply filter
  const applyStatusFilter = (list) => {
    if (statusFilter === "all") return list;
    return list.filter((p) => p.status === statusFilter);
  };

  const filteredSent = applyStatusFilter(sentRequestsList);
  const filteredReceived = applyStatusFilter(receivedRequestsList);

  // ✅ Common status filter bar component
  const StatusFilterBar = ({ counts }) => (
    <div className="flex gap-3 sm:gap-6 px-3 md:px-6 py-4 border-b border-gray-100 text-sm overflow-x-auto">
      {["all", "pending", "accepted", "rejected"].map((status) => {
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`relative flex items-center gap-2 pb-2 border-b-2 transition-colors bg-transparent ${
              statusFilter === status
                ? "text-yellow-600 border-yellow-600"
                : "text-gray-500 border-transparent hover:text-yellow-600"
            }`}
          >
            {label}
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-[1px] rounded-full">
              {counts[status]}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-3 md:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Requests</h2>
        <p className="text-muted-foreground">
          Manage your sent and received interest requests
        </p>
      </div>

      <div className="bg-white rounded-[20px] satfera-shadow">
        {/* ✅ Tabs */}
        <div className="px-3 md:px-6 pt-4 flex justify-between items-center">
          <div className="flex border-b border-gray-200 text-[15px] font-medium w-full">
            {[
              { key: "sent", label: "Requests Sent" },
              { key: "received", label: "Requests Received" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setStatusFilter("all");
                }}
                className={`px-4 py-2 -mb-[1px] transition-all duration-200 ${
                  activeTab === tab.key
                    ? "text-[#D4A052] border-b-2 border-[#D4A052] font-semibold bg-transparent"
                    : "text-gray-500 hover:text-[#D4A052] border-b-2 border-transparent bg-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Status filter (Now for both Sent & Received) */}
        {activeTab === "sent" && <StatusFilterBar counts={sentCounts} />}
        {activeTab === "received" && <StatusFilterBar counts={receivedCounts} />}

        {/* ✅ Main content */}
        <div className="p-3 md:p-6">
          {activeTab === "sent" &&
            (filteredSent.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredSent.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    {...profile}
                    variant={profile.status === "accepted" ? "approved" : "sent"}
                    status={profile.status}
                    onView={onViewProfile}
                    onWithdraw={() => onWithdraw?.(profile.id)}
                    onAddToCompare={async (pid, p) => { try { if (onAddToCompare) return await onAddToCompare(profile.id, profile); } catch (e) { console.warn(e); } }}
                    onRemoveCompare={async (pid) => { try { if (onRemoveCompare) return await onRemoveCompare(profile.id); } catch (e) { console.warn(e); } }}
                    isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false}
                    isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(profile.id)) : false}
                    onToggleShortlist={() => onToggleShortlist?.(profile.id)}
                    onChat={() => onChat?.(profile)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No {statusFilter !== "all" ? statusFilter : ""} requests found.
              </p>
            ))}

          {activeTab === "received" &&
            (filteredReceived.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredReceived.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    {...profile}
                    variant={profile.status === "accepted" ? "approved" : "received"}
                    status={profile.status}
                    onView={onViewProfile}
                    onAccept={() => onAccept?.(profile)}
                    onReject={() => onReject?.(profile)}
                    onAddToCompare={async (pid, p) => { try { if (onAddToCompare) return await onAddToCompare(profile.id, profile); } catch (e) { console.warn(e); } }}
                    onRemoveCompare={async (pid) => { try { if (onRemoveCompare) return await onRemoveCompare(profile.id); } catch (e) { console.warn(e); } }}
                    isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false}
                    isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(profile.id)) : false}
                    onToggleShortlist={() => onToggleShortlist?.(profile.id)}
                    onChat={() => onChat?.(profile)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No {statusFilter !== "all" ? statusFilter : ""} requests found.
              </p>
            ))}
        </div>
      </div>

      <PremiumUpgradeModal open={premiumModal} onOpenChange={setPremiumModal} />
    </div>
  );
}
