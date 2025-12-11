import { useState, useEffect } from "react";
import { CompareTable } from "../../CompareTable";
import { AddProfileModal } from "../../AddProfileModal";
import { getMatches } from "../../../api/auth";

export function ComparePage({
  profiles,
  selectedProfiles,
  onRemoveFromCompare,
  onSendRequest,
  onNavigateBack,
  onAddToCompare,
  shortlistedIds,
  onToggleShortlist,
  onViewProfile,
  sentProfileIds = [],
}) {
  import.meta && import.meta.env;
  const [resolvedSelectedProfiles, setResolvedSelectedProfiles] = useState([]);
  const [fetchedProfiles, setFetchedProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolveFromPool = (id) => {
      if (!Array.isArray(profiles)) return undefined;
      return profiles.find(
        (p) =>
          String(p?.id) === String(id) ||
          String(p?.userId) === String(id) ||
          String(p?._id) === String(id) ||
          String(p?.user?.userId) === String(id) ||
          String(p?.user?.id) === String(id)
      );
    };

    const doResolve = async () => {
      if (!Array.isArray(selectedProfiles)) {
        setResolvedSelectedProfiles([]);
        return;
      }
      const results = [];
      const toFetch = [];

      for (const sp of selectedProfiles) {
        if (!sp) continue;
        if (typeof sp === "object") {
          results.push(sp);
          continue;
        }
        const found = resolveFromPool(sp);
        if (found) results.push(found);
        else toFetch.push(sp);
      }

      if (toFetch.length) {
        try {
          const { getViewProfiles } = await import("../../../api/auth");
          const fetched = await Promise.all(
            toFetch.map((id) =>
              getViewProfiles(id)
                .then((r) => (r && r.success ? r.data : null))
                .catch(() => null)
            )
          );
          fetched.forEach((f) => {
            if (f) results.push(f);
          });
        } catch (e) {
          console.warn(
            "ComparePage: failed to dynamically import getViewProfiles",
            e
          );
        }
      }

      const uniq = [];
      const seen = new Set();
      for (const r of results) {
        const key = String(
          (r?.userId ??
            r?.id ??
            r?._id ??
            (r?.user && (r.user.userId || r.user.id))) ||
            ""
        ).trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        uniq.push(r);
      }
      if (mounted) setResolvedSelectedProfiles(uniq);
    };

    doResolve();
    return () => {
      mounted = false;
    };
  }, [selectedProfiles, profiles]);

  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (loadingProfiles || fetchedProfiles.length > 0) return;

      setLoadingProfiles(true);
      try {
        const response = await getMatches({
          page: 1,
          limit: 50,
          useCache: false,
        });
        if (response?.success && Array.isArray(response?.data)) {
          setFetchedProfiles(response.data);
        }
      } catch (error) {
        console.error("❌ Failed to fetch profiles:", error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchRecommendations();
  }, []);

  const compareProfileIds = Array.isArray(selectedProfiles)
    ? selectedProfiles
        .map((p) => (typeof p === "object" ? p?.id || p?.userId || p?._id : p))
        .filter(Boolean)
    : [];

  const allProfiles = [
    ...(Array.isArray(profiles) ? profiles : []),
    ...fetchedProfiles,
  ];

  const shortlistedProfiles =
    Array.isArray(allProfiles) && Array.isArray(shortlistedIds)
      ? allProfiles.filter((p) => {
          const pid = String(
            p?.id || p?.userId || p?._id || p?.user?.userId || p?.user?.id || ""
          );
          return pid && shortlistedIds.some((sid) => String(sid) === pid);
        })
      : [];

  const handleAddToCompare = async (id, profile = null) => {
    const found =
      profile ||
      (Array.isArray(allProfiles)
        ? allProfiles.find((p) =>
            [p?.id, p?.userId, p?._id, p?.user?.userId, p?.user?.id].some(
              (c) => String(c) === String(id)
            )
          )
        : null);
    try {
      await onAddToCompare(id, found || null);
    } catch (e) {
      console.warn("ComparePage: add to compare failed", e);
    }
    setAddModalOpen(false);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2 m-0 font-bold text-lg">Compare Profiles</h2>
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
        sentProfileIds={sentProfileIds}
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
    </div>
  );
}
