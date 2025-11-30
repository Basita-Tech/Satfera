import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { Routes, Route, useNavigate, Outlet, useLocation } from "react-router-dom";
import { Navigation } from "../Navigation";
import { Dashboard } from "./profiles/Dashboard";
import { Requests } from "./profiles/Requests";
import { ApprovedProfiles } from "./profiles/ApprovedProfiles";
import { ProfileDetails } from "./profiles/ProfileDetails";
import { Browse } from "./profiles/Browse";
import NewProfiles from "./profiles/NewProfiles";
import { Shortlisted } from "./profiles/Shortlisted";
import { ComparePage } from "./profiles/ComparePage";
import { EditProfile } from "./profiles/EditProfile";
import { Settings } from "./profiles/Settings";
import Notifications from "./Notifications";
import { 
  getFavorites, 
  addToFavorites, 
  removeFromFavorites, 
  getViewProfiles,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  withdrawConnectionRequest,
  getSentRequests,
  getReceivedRequests,
  getProfileViews
} from "../../api/auth";
import { addToCompare, removeFromCompare, getCompare } from "../../api/auth";
import { ProfileViews } from "./profiles/ProfileViews";

export function UserDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const location = useLocation();

  // ✅ Profiles split: sent & received (no dummy data - will be fetched from backend)
  const [profiles, setProfiles] = useState({
    sent: [],
    received: [],
  });

  const [compareProfiles, setCompareProfiles] = useState([]);
  const [selectedCompareProfiles, setSelectedCompareProfiles] = useState([]);
  const [shortlistedIds, setShortlistedIds] = useState([]);
  const [shortlistedProfiles, setShortlistedProfiles] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [sentProfileIds, setSentProfileIds] = useState([]);
  
  // Profile Views state
  const [profileViews, setProfileViews] = useState([]);
  const [loadingProfileViews, setLoadingProfileViews] = useState(false);
  const [profileViewsPage, setProfileViewsPage] = useState(1);
  const [profileViewsPagination, setProfileViewsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Fetch favorites from backend on mount (with image enrichment)
  useEffect(() => {
    async function fetchFavorites() {
      setLoadingFavorites(true);
      const response = await getFavorites();
      console.log("⭐ Favorites Response:", response);
      if (response?.success && Array.isArray(response?.data)) {
        // Detect duplicate images to decide if enrichment is needed
        const rawImages = response.data.map((item) => item?.user?.closerPhoto?.url).filter(Boolean);
        const allSameImage = rawImages.length > 1 && rawImages.every((u) => u === rawImages[0]);
        let favoritesData = response.data;

        if (allSameImage) {
          console.log("🌀 Detected duplicate images for all favorites. Attempting enrichment via individual profile fetch.");
          favoritesData = await Promise.all(
            response.data.map(async (item) => {
              try {
                const userId = item?.user?.userId;
                if (!userId) return item;
                const detail = await getViewProfiles(userId);
                if (detail?.success && detail?.data?.closerPhoto?.url) {
                  return { ...item, user: { ...item.user, closerPhoto: detail.data.closerPhoto } };
                }
                return item;
              } catch (e) {
                console.warn("⚠️ Failed to enrich favorite profile", item?.user?.userId, e);
                return item;
              }
            })
          );
        }

        console.log("📋 First favorite item structure (post-enrichment attempt):", favoritesData[0]);
        setShortlistedProfiles(favoritesData);

        // Extract profile IDs from the user object
        const ids = favoritesData.map((item) => {
          const userId = item?.user?.userId || item?.userId || item?.id || item?._id;
          console.log("🔍 Extracting ID from item:", { item, extractedId: userId });
          return String(userId);
        });
        setShortlistedIds(ids);
        console.log("✅ Loaded favorites:", ids);
      }
      setLoadingFavorites(false);
    }
    fetchFavorites();
  }, []);

  // Fetch sent and received connection requests on mount
  useEffect(() => {
    async function fetchConnectionRequests() {
      try {
        console.log("📥 Fetching connection requests...");

        const [sentResponse, receivedResponse] = await Promise.all([
          getSentRequests(),
          getReceivedRequests()
        ]);

        console.log("📤 Sent Requests Raw:", sentResponse);
        console.log("📥 Received Requests Raw:", receivedResponse);

        const transformProfile = (item) => {
          const user = item?.user || {};
          const scoreDetail = item?.scoreDetail || { score: 0 };
          const connectionRequestId =
            item?.connectionRequestId ||
            user?.connectionRequestId ||
            item?.connectionId ||
            user?.connectionId ||
            item?._id;

          if (!connectionRequestId) {
            console.warn("⚠️ Missing connectionRequestId for item:", item);
          }

          return {
            id: user.userId || user.id,
            connectionRequestId,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            age: user.age,
            city: user.city,
            profession: user.profession || 'Graphic Designer',
            religion: user.religion,
            caste: user.subCaste,
            image: user.closerPhoto?.url || '',
            compatibility: scoreDetail.score || 0,
            status: user.status || 'pending'
          };
        };

        const sentProfiles = sentResponse?.success && Array.isArray(sentResponse.data)
          ? sentResponse.data.map(item => ({ ...transformProfile(item), type: 'sent' })).filter(profile => profile.status !== 'cancelled')
          : [];

        const receivedProfiles = receivedResponse?.success && Array.isArray(receivedResponse.data)
          ? receivedResponse.data.map(item => ({ ...transformProfile(item), type: 'received' })).filter(profile => profile.status !== 'cancelled')
          : [];

        console.log("📤 Sent Requests Transformed:", sentProfiles);
        console.log("📥 Received Requests Transformed:", receivedProfiles);

        setProfiles({ sent: sentProfiles, received: receivedProfiles });

        const sentIds = sentProfiles.map(p => String(p.id));
        setSentProfileIds(sentIds);
        console.log("✅ Connection requests loaded. Sent profile IDs:", sentIds);
      } catch (error) {
        console.error("❌ Error fetching connection requests:", error);
      }
    }

    fetchConnectionRequests();
  }, []);

  useEffect(() => {
    setActivePage("dashboard");
  }, []);

  // Fetch profile views when activePage changes to "profile-views"
  useEffect(() => {
    if (activePage === "profile-views") {
      fetchProfileViews();
    }
  }, [activePage, profileViewsPage]);

  // Function to fetch profile views
  const fetchProfileViews = async () => {
    setLoadingProfileViews(true);
    try {
      console.log("👁️ Fetching profile views - page:", profileViewsPage);
      const response = await getProfileViews(profileViewsPage, 10, false);
      console.log("👁️ Profile Views Response:", response);
      console.log("👁️ First item structure:", response?.data?.[0]);
      
      if (response?.success && Array.isArray(response?.data)) {
        // Transform backend data to match ProfileViews component format
        // Backend returns: { user: { userId, firstName, lastName, age, city, closerPhoto: { url } }, scoreDetail: { score } }
        const transformedViews = response.data.map((item, index) => {
          const user = item?.user || {};
          const scoreDetail = item?.scoreDetail || {};
          
          console.log(`👁️ Transforming item ${index}:`, {
            rawItem: item,
            user: user,
            scoreDetail: scoreDetail,
            extractedName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            profession: user.profession,
            compatibility: scoreDetail?.score
          });
          
          const compatibilityScore = scoreDetail?.score || 0;
          
          return {
            id: user.userId || item?.userId || item?.id || item?._id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
            age: user.age || 0,
            city: user.city || user.state || 'Unknown',
            profession: user.profession || 'Not Specified',
            image: user.closerPhoto?.url || '/placeholder.jpg',
            viewedAt: formatViewedAt(user.createdAt || item?.viewedAt || item?.createdAt),
            compatibility: compatibilityScore > 0 ? compatibilityScore : null
          };
        }).filter(view => view.name !== 'Unknown User'); // Filter out invalid entries
        
        console.log("✅ Transformed profile views:", transformedViews);
        setProfileViews(transformedViews);
        
        // Update pagination info
        if (response.pagination) {
          const totalPages = Math.ceil((response.pagination.total || 0) / (response.pagination.limit || 10));
          console.log("📄 Pagination calculation:", {
            total: response.pagination.total,
            limit: response.pagination.limit,
            totalPages,
            currentPage: response.pagination.page
          });
          setProfileViewsPagination({
            ...response.pagination,
            total: response.pagination.total || 0,
            totalPages
          });
        }
        
        // Store total profile view count for display
        if (response.profileViewCount !== undefined) {
          setProfileViewsPagination(prev => ({
            ...prev,
            profileViewCount: response.profileViewCount
          }));
        }
        
        console.log("✅ Profile views loaded:", transformedViews);
      } else {
        console.warn("⚠️ No profile views data received");
        setProfileViews([]);
      }
    } catch (error) {
      console.error("❌ Error fetching profile views:", error);
      toast.error("Failed to load profile views");
      setProfileViews([]);
    } finally {
      setLoadingProfileViews(false);
    }
  };

  // Helper function to format the viewedAt timestamp
  const formatViewedAt = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    try {
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Recently';
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      // Format as "Nov 4" for older dates
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  };

  // Whenever compareProfiles (IDs) changes we derive the full profile objects
  useEffect(() => {
    let mounted = true;
    const resolveProfiles = async () => {
      try {
        const ids = Array.isArray(compareProfiles) ? compareProfiles.map(String) : [];
        const pool = [...profiles.sent, ...profiles.received, ...shortlistedProfiles];
        const results = [];
        const toFetch = [];

        ids.forEach((id) => {
          const found = pool.find((p) => String(p.id) === id || String(p.userId) === id || String(p._id) === id);
          if (found) results.push(found);
          else toFetch.push(id);
        });

        if (toFetch.length) {
          const fetched = await Promise.all(
            toFetch.map((id) => getViewProfiles(id).catch((e) => {
              console.warn('Failed to fetch profile for compare id', id, e);
              return null;
            }))
          );
          fetched.forEach((f) => {
            if (f && f.success && f.data) results.push(f.data);
          });
        }

        // Deduplicate by id (in case of duplicates)
        const uniq = [];
        const seen = new Set();
        for (const r of results) {
          const key = String(r?.userId || r?.id || r?._id || '');
          if (!key) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push(r);
        }

        if (mounted) setSelectedCompareProfiles(uniq);
      } catch (err) {
        console.error('Error resolving compare profiles', err);
      }
    };
    resolveProfiles();
    return () => { mounted = false; };
  }, [compareProfiles, profiles, shortlistedProfiles]);

  // Load compare list from backend so UI toggle matches server state
  // Reusable fetcher: backend is source-of-truth. Normalizes response to two states:
  // - compareProfiles: array of string ids (userId / id)
  // - selectedCompareProfiles: array of full profile objects returned by backend or resolved via getViewProfiles
  const getCompareProfiles = async () => {
    try {
      console.log('📥 getCompareProfiles — fetching from server');
      const resp = await getCompare();
      console.log('📥 getCompareProfiles response:', resp);

      if (resp && resp.success && Array.isArray(resp.data)) {
        // Server returned full profile objects
        const profilesFromServer = resp.data;
        // Normalize ids
        const ids = profilesFromServer
          .map((p) => String(p?.userId ?? p?.id ?? p?._id ?? '').trim())
          .filter(Boolean);

        // Deduplicate ids preserving order
        const idSet = new Set();
        const dedupedIds = [];
        for (const id of ids) {
          if (!idSet.has(id)) {
            idSet.add(id);
            dedupedIds.push(id);
          }
        }

        // Deduplicate full profiles by id as well and normalize shape
        const seen = new Set();
        const dedupedProfiles = [];
        const normalize = (raw) => {
          const user = raw?.user || raw || {};
          const id = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
          const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
          const image = raw?.image || raw?.closerPhoto?.url || raw?.closerPhoto || user?.closerPhoto?.url || user?.closerPhoto || '';
          const age = raw?.age ?? user?.age ?? null;
          return { ...raw, id, name, image, age };
        };

        for (const p of profilesFromServer) {
          const key = String(p?.userId ?? p?.id ?? p?._id ?? p?.user?.userId ?? p?.user?.id ?? '').trim();
          if (!key) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          dedupedProfiles.push(normalize(p));
        }

        setCompareProfiles(dedupedIds);
        setSelectedCompareProfiles(dedupedProfiles);
        console.log('✅ Synced compareProfiles from server:', dedupedIds);
        return { ids: dedupedIds, profiles: dedupedProfiles };
      }

      // Fallback: server returned { ids: [...] } or other shape
      if (resp && Array.isArray(resp.ids)) {
        const deduped = Array.from(new Set(resp.ids.map(String)));
        setCompareProfiles(deduped);
        console.log('✅ Synced compareProfiles (ids-only) from server:', deduped);

        // Attempt to resolve full profile objects by fetching each id
        try {
          const resolved = await Promise.all(
            deduped.map(async (pid) => {
              try {
                const view = await getViewProfiles(pid);
                if (view && view.success && view.data) return view.data;
                return null;
              } catch (e) {
                return null;
              }
            })
          );
          const profilesList = resolved.filter(Boolean);
          if (profilesList.length > 0) {
            // normalize and dedupe resolved profiles
            const seen = new Set();
            const norm = [];
            for (const raw of profilesList) {
              const key = String(raw?.userId ?? raw?.id ?? raw?._id ?? raw?.user?.userId ?? raw?.user?.id ?? '').trim();
              if (!key || seen.has(key)) continue;
              seen.add(key);
              const user = raw?.user || raw || {};
              const id = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
              const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
              const image = raw?.image || raw?.closerPhoto?.url || raw?.closerPhoto || user?.closerPhoto?.url || user?.closerPhoto || '';
              const age = raw?.age ?? user?.age ?? null;
              norm.push({ ...raw, id, name, image, age });
            }
            if (norm.length > 0) setSelectedCompareProfiles(norm);
          }
        } catch (e) {
          console.warn('⚠️ Failed to resolve full profiles for compare ids', e);
        }

        return { ids: deduped, profiles: [] };
      }

      console.warn('⚠️ getCompare returned unexpected shape:', resp);
      return { ids: [], profiles: [] };
    } catch (err) {
      console.error('❌ getCompareProfiles failed:', err);
      return { ids: [], profiles: [] };
    }
  };

  // fetch on mount
  useEffect(() => {
    getCompareProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: poll getCompare until predicate satisfied or timeout
  const pollCompare = async (predicate, { retries = 6, delay = 300 } = {}) => {
    for (let i = 0; i < retries; i++) {
      try {
        const resp = await getCompare();
        const ids = Array.isArray(resp?.ids) ? resp.ids.map(String) : (Array.isArray(resp?.data) ? resp.data.map(p => String(p?.userId ?? p?.id ?? p?._id ?? '')).filter(Boolean) : []);
        if (predicate(ids, resp)) return { ok: true, ids, resp };
      } catch (e) {
        // ignore and retry
      }
      await new Promise((res) => setTimeout(res, delay));
    }
    return { ok: false };
  };

  // sync activePage with the current URL path so routing and state stay consistent
  useEffect(() => {
    try {
      // location.pathname like /userdashboard or /userdashboard/shortlisted or /dashboard/newprofiles
      const prefixes = ["/userdashboard", "/dashboard"];
      let path = location.pathname || "";
      for (const prefix of prefixes) {
        if (path.startsWith(prefix)) {
          path = path.slice(prefix.length);
          break;
        }
      }
      if (path.startsWith("/")) path = path.slice(1);
      const first = path.split("/")[0];
      const page = first && first.length > 0 ? first : "dashboard";
      // only update if changed
      if (page !== activePage) setActivePage(page);
    } catch (e) {
      // ignore
    }
  }, [location.pathname]);

  // Debug: log whenever activePage changes to trace navigation
  useEffect(() => {
    // console.log("UserDashboard: activePage ->", activePage);
  }, [activePage]);

  // ✅ Handle accept / reject / withdraw
  const handleAccept = async (payload) => {
    // payload can be either a profile object or an id
    const profileId = typeof payload === "number" ? payload : payload?.id;
    const idKey = String(profileId);

    try {
      // Find the profile to get the connectionRequestId
      const profile = profiles.received.find((p) => String(p.id) === idKey);
      
      if (!profile) {
        console.warn("⚠️ Profile not found in received requests:", idKey);
        toast.error("Profile not found");
        return;
      }
      
      const connectionRequestId = profile?.connectionRequestId;
      
      console.log("✅ Accepting request:", { profileId: idKey, connectionRequestId, profile });
      
      // Validate connectionRequestId exists
      if (!connectionRequestId) {
        console.error("❌ No connectionRequestId found for profile:", profile);
        toast.error("Unable to accept: Connection request ID not found. Please refresh the page.");
        return;
      }
      
      // Use connectionRequestId instead of user ID
      const response = await acceptConnectionRequest(connectionRequestId);
      
      if (response?.success) {
        setProfiles((prev) => {
          // Mark the profile as "accepted" inside the `received` list
          const updatedReceived = prev.received.map((p) =>
            String(p.id) === idKey ? { ...p, status: "accepted" } : p
          );

          // Don't add to sent - accepted received requests should stay in received
          return { ...prev, received: updatedReceived };
        });

        const name = typeof payload === "object" ? payload.name : undefined;
        toast.success(`Accepted request${name ? ` from ${name}` : ""}`);
      } else {
        console.error("❌ Failed to accept request:", response?.message);
        toast.error(response?.message || "Failed to accept connection request");
      }
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      toast.error("An error occurred while accepting the request");
    }
  };

  const handleReject = async (payload) => {
    const profileId = typeof payload === "number" ? payload : payload?.id;
    const idKey = String(profileId);
    
    try {
      // Find the profile to get the connectionRequestId
      const profile = profiles.received.find((p) => String(p.id) === idKey);
      
      if (!profile) {
        console.warn("⚠️ Profile not found in received requests:", idKey);
        toast.error("Profile not found");
        return;
      }
      
      const connectionRequestId = profile?.connectionRequestId;
      
      console.log("❌ Rejecting request:", { profileId: idKey, connectionRequestId, profile });
      
      // Validate connectionRequestId exists
      if (!connectionRequestId) {
        console.error("❌ No connectionRequestId found for profile:", profile);
        toast.error("Unable to reject: Connection request ID not found. Please refresh the page.");
        return;
      }
      
      // Use connectionRequestId instead of user ID
      const response = await rejectConnectionRequest(connectionRequestId);
      
      if (response?.success) {
        setProfiles((prev) => {
          const updatedReceived = prev.received.map((p) =>
            String(p.id) === idKey ? { ...p, status: "rejected" } : p
          );
          return { ...prev, received: updatedReceived };
        });
        
        const name = typeof payload === "object" ? payload.name : undefined;
        toast.success(`Rejected request${name ? ` from ${name}` : ""}`);
      } else {
        console.error("❌ Failed to reject request:", response?.message);
        toast.error(response?.message || "Failed to reject connection request");
      }
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      toast.error("An error occurred while rejecting the request");
    }
  };

  const handleWithdraw = async (id) => {
    const idKey = String(id);
    
    try {
      // Find the profile to get the connectionRequestId
      const profile = profiles.sent.find((p) => String(p.id) === idKey);
      
      // If profile not found in sent requests, it may have already been withdrawn
      if (!profile) {
        console.warn("⚠️ Profile not found in sent requests:", idKey);
        toast.error("Profile not found or already withdrawn");
        return;
      }
      
      const connectionRequestId = profile?.connectionRequestId;
      
      console.log("🗑️ Withdrawing request:", { profileId: idKey, connectionRequestId, profile });
      
      // Check if already cancelled
      if (profile.status === 'cancelled') {
        console.warn("⚠️ Request already cancelled");
        toast.error("This request has already been withdrawn");
        // Remove from UI
        setProfiles((prev) => {
          const updatedSent = prev.sent.filter((p) => String(p.id) !== idKey);
          return { ...prev, sent: updatedSent };
        });
        setSentProfileIds(prev => prev.filter(pid => String(pid) !== idKey));
        return;
      }
      
      // Validate connectionRequestId exists
      if (!connectionRequestId) {
        console.error("❌ No connectionRequestId found for profile:", profile);
        toast.error("Unable to withdraw: Connection request ID not found. Please refresh the page.");
        return;
      }
      
      // Optimistically update UI - change status to 'withdrawn' instead of removing
      setProfiles((prev) => {
        const updatedSent = prev.sent.map((p) => 
          String(p.id) === idKey ? { ...p, status: 'withdrawn' } : p
        );
        return { ...prev, sent: updatedSent };
      });
      
      // Always use connectionRequestId (never fall back to user ID)
      const response = await withdrawConnectionRequest(connectionRequestId);
      
      if (response?.success) {
        console.log("✅ Request withdrawn successfully");
        toast.success(`Request withdrawn successfully`);
        
        // Remove from sentProfileIds so "Send Request" button appears again
        setSentProfileIds(prev => prev.filter(pid => String(pid) !== idKey));
        
        // Refresh the sent requests list
        const sentResponse = await getSentRequests();
        if (sentResponse?.success) {
          const updatedSentProfiles = sentResponse.data
            .map(item => {
              const user = item?.user || {};
              const scoreDetail = item?.scoreDetail || { score: 0 };
              // Handle both field names for backward compatibility
              const connReqId = item?.connectionRequestId || user?.connectionRequestId || item?.connectionId || user?.connectionId;
              return {
                id: user.userId || user.id,
                connectionRequestId: connReqId,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                age: user.age,
                city: user.city,
                profession: user.profession || 'Graphic Designer',
                religion: user.religion,
                caste: user.subCaste,
                image: user.closerPhoto?.url || '',
                compatibility: scoreDetail.score || 0,
                status: user.status || 'pending',
                type: 'sent'
              };
            });
          // Keep withdrawn status for profiles that were just withdrawn
          const finalProfiles = updatedSentProfiles.map(p => {
            const existing = profiles.sent.find(ep => String(ep.id) === String(p.id));
            if (existing?.status === 'withdrawn') {
              return { ...p, status: 'withdrawn' };
            }
            return p;
          });
          setProfiles(prev => ({ ...prev, sent: finalProfiles }));
          
          // Update sentProfileIds with current pending/accepted requests only (not withdrawn)
          const sentIds = finalProfiles
            .filter(p => p.status !== 'withdrawn' && p.status !== 'cancelled')
            .map(p => String(p.id));
          setSentProfileIds(sentIds);
        }
      } else {
        console.error("❌ Failed to withdraw request:", response?.message);
        // Revert the optimistic update on failure
        setProfiles((prev) => {
          const updatedSent = prev.sent.map((p) => 
            String(p.id) === idKey ? profile : p
          );
          return { ...prev, sent: updatedSent };
        });
        toast.error(response?.message || "Failed to withdraw connection request");
      }
    } catch (error) {
      console.error("❌ Error withdrawing request:", error);
      toast.error("An error occurred while withdrawing the request");
      // Revert the optimistic update on error
      const profile = profiles.sent.find((p) => String(p.id) === idKey);
      if (profile) {
        setProfiles((prev) => {
          if (prev.sent.some((p) => String(p.id) === idKey)) return prev;
          return { ...prev, sent: [...prev.sent, profile] };
        });
      }
    }
  };

  // ✅ Compare & shortlist
  const handleAddToCompare = async (id) => {
    const idStr = String(id);
    console.log('🔀 handleAddToCompare called for id:', idStr, { currentCompare: compareProfiles });

    // Optimistic UI: add id locally first
    setCompareProfiles((prev) => {
      const s = prev ? prev.map(String) : [];
      if (s.includes(idStr)) return s;
      return [...s, idStr];
    });

    try {
      const resp = await addToCompare(idStr);
      console.log('📤 addToCompare response for', idStr);

      if (!resp || resp.success === false) {
        console.error('Add to compare failed', resp?.message || resp);
        // Revert optimistic add
        setCompareProfiles((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x) !== idStr) : []));
        toast.error(resp?.message || 'Failed to add to compare');
        return;
      }

      // Show success toast when backend confirms add
      try { toast.success('✅ Added to Compare'); } catch (e) { /* ignore */ }

      // If backend returned explicit ids, use them (authoritative)
      if (Array.isArray(resp.ids) && resp.ids.length > 0) {
        const dedup = Array.from(new Set(resp.ids.map(String)));
        setCompareProfiles(dedup);
        console.log('🔁 Updated compareProfiles from addToCompare response:', dedup);
        return { ids: dedup, profiles: [] };
      }

      // Fallback: try fetching canonical list and ensure the id exists there
      try {
        const server = await getCompare();
        if (server && Array.isArray(server.ids) && server.ids.length > 0) {
          setCompareProfiles(server.ids);
          console.log('🔁 Synced compareProfiles from server after add (normalized):', server.ids);
          return;
        }

        // If server returned empty list, keep optimistic state for now but log warning
        console.warn('⚠️ Server returned empty compare list after add; keeping optimistic state for id:', idStr);
      } catch (syncErr) {
        console.warn('⚠️ Failed to sync compare after add', syncErr);
      }

      // Always re-fetch authoritative list after attempting add (backend is source of truth)
      if (resp && resp.success) {
        // Try to poll until backend reflects the new id to avoid eventual-consistency races
        try {
          // brief delay to allow backend to settle under eventual-consistency
          await new Promise((r) => setTimeout(r, 300));
          const pol = await pollCompare((ids) => Array.isArray(ids) ? ids.map(String).includes(idStr) : false, { retries: 12, delay: 500 });
          if (pol.ok) {
            const final = await getCompareProfiles();
            return final;
          }
        } catch (e) {
          console.warn('⚠️ pollCompare failed during add:', e);
        }

        // If polling didn't observe the change, attempt a best-effort UI update:
        try {
          const view = await getViewProfiles(idStr);
          if (view && view.success && view.data) {
            const raw = view.data;
            const user = raw?.user || raw || {};
            const nid = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
            const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
            const image = raw?.image || raw?.closerPhoto?.url || raw?.closerPhoto || user?.closerPhoto?.url || user?.closerPhoto || '';
            const age = raw?.age ?? user?.age ?? null;
            const normalized = { ...raw, id: nid, name, image, age };
            setSelectedCompareProfiles((prev) => {
              const existing = Array.isArray(prev) ? prev.map(p => String(p?.id || p?.userId || p?._id)) : [];
              if (existing.includes(nid)) return prev || [normalized];
              return prev ? [...prev, normalized] : [normalized];
            });
          }
        } catch (e) {
          console.warn('⚠️ Failed to fetch profile after add for UI fallback', e);
        }

        // Ensure compareProfiles contains the id (already optimistic)
        setCompareProfiles((prev) => {
          const s = Array.isArray(prev) ? prev.map(String) : [];
          if (!s.includes(idStr)) return [...s, idStr];
          return s;
        });

        // Return current state snapshot
        return { ids: Array.isArray(compareProfiles) ? compareProfiles.map(String) : [], profiles: selectedCompareProfiles || [] };
      }
    } catch (err) {
      console.error('Add to compare error', err);
      // Revert optimistic add on network error
      setCompareProfiles((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x) !== idStr) : []));
      toast.error('Failed to add to compare');
    }
  };
  const handleRemoveCompare = async (id) => {
    const idStr = String(id);
    console.log('🔀 handleRemoveCompare called for id:', idStr, { currentCompare: compareProfiles });

    // Optimistic UI: remove id locally first
    setCompareProfiles((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x) !== idStr) : []));

    try {
      const resp = await removeFromCompare(idStr);
      console.log('🗑️ removeFromCompare response for', idStr, resp);

      if (!resp || resp.success === false) {
        console.error('Remove from compare failed', resp?.message || resp);
        // Revert optimistic removal
        setCompareProfiles((prev) => (Array.isArray(prev) ? [...prev, idStr] : [idStr]));
        return;
      }

      // Show success toast when backend confirms removal
      try { toast.success('✅ Removed from Compare'); } catch (e) { /* ignore */ }

      // If backend returned explicit ids, use them
      if (Array.isArray(resp.ids)) {
        const dedup = Array.from(new Set(resp.ids.map(String)));
        setCompareProfiles(dedup);
        console.log('🔁 Updated compareProfiles from removeFromCompare response:', dedup);
        return { ids: dedup, profiles: [] };
      }

      // Fallback: try fetching canonical list and ensure id is removed there
      try {
        const server = await getCompare();
        if (server && Array.isArray(server.ids)) {
          setCompareProfiles(server.ids);
          console.log('🔁 Synced compareProfiles from server after remove (normalized):', server.ids);
          return;
        }

        // If server returned empty list or didn't include id, keep current optimistic state
        console.warn('⚠️ Server did not return authoritative compare list after remove for id:', idStr);
      } catch (syncErr) {
        console.warn('⚠️ Failed to sync compare after remove', syncErr);
      }

      // Always re-fetch authoritative list after attempting remove
      if (resp && resp.success) {
        // brief delay to allow backend to settle, then poll for removal
        await new Promise((r) => setTimeout(r, 300));
        try {
          const pol = await pollCompare((ids) => Array.isArray(ids) ? !ids.map(String).includes(idStr) : false, { retries: 12, delay: 500 });
          if (pol.ok) {
            const final = await getCompareProfiles();
            return final;
          }
        } catch (e) {
          console.warn('⚠️ pollCompare failed during remove:', e);
        }

        const final = await getCompareProfiles();
        return final;
      }
    } catch (err) {
      console.error('Remove from compare error', err);
      // Revert optimistic removal on network error
      setCompareProfiles((prev) => (Array.isArray(prev) ? [...prev, idStr] : [idStr]));
    }
  };
  // Expose global handlers and listen for cross-component compare events
  React.useEffect(() => {
    try {
      // Attach global callables so pages (ProfileDetails) can notify dashboard
      window.__satfera_handleAddToCompare = async (id, profile) => {
        try {
          // If ProfileDetails supplied a profile object, optimistically add it to selectedCompareProfiles
          if (profile) {
            try {
              const raw = profile;
              const user = raw?.user || raw || {};
              const nid = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
              const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
              const image = raw?.image || raw?.closerPhoto?.url || raw?.closerPhoto || user?.closerPhoto?.url || user?.closerPhoto || '';
              const age = raw?.age ?? user?.age ?? null;
              const normalized = { ...raw, id: nid, name, image, age };
              setSelectedCompareProfiles((prev) => {
                const existing = Array.isArray(prev) ? prev.map(p => String(p?.id || p?.userId || p?._id)) : [];
                if (existing.includes(nid)) return prev || [normalized];
                return prev ? [...prev, normalized] : [normalized];
              });
              setCompareProfiles((prev) => {
                const s = Array.isArray(prev) ? prev.map(String) : [];
                if (!s.includes(nid)) return [...s, nid];
                return s;
              });
            } catch (e) {
              console.warn('⚠️ Failed optimistic injection of profile to selectedCompareProfiles', e);
            }
          }

          await handleAddToCompare(id);
        } catch (e) { console.warn('global addToCompare failed', e); }
      };
      window.__satfera_handleRemoveFromCompare = async (id, profile) => {
        try {
          // Optimistically remove from selectedCompareProfiles if profile id provided
          try {
            const pid = String(id);
            setSelectedCompareProfiles((prev) => Array.isArray(prev) ? prev.filter(p => String(p?.id || p?.userId || p?._id) !== pid) : prev);
            setCompareProfiles((prev) => Array.isArray(prev) ? prev.filter(x => String(x) !== pid) : prev);
          } catch (e) { /* ignore */ }
          await handleRemoveCompare(id);
        } catch (e) { console.warn('global removeFromCompare failed', e); }
      };

      const onAdd = (e) => {
        const detail = e?.detail || {};
        if (detail?.id) handleAddToCompare(detail.id, detail.profile);
      };
      const onRemove = (e) => {
        const detail = e?.detail || {};
        if (detail?.id) handleRemoveCompare(detail.id);
      };

      window.addEventListener('satfera:addToCompare', onAdd);
      window.addEventListener('satfera:removeFromCompare', onRemove);

      return () => {
        try { delete window.__satfera_handleAddToCompare; } catch {};
        try { delete window.__satfera_handleRemoveFromCompare; } catch {};
        window.removeEventListener('satfera:addToCompare', onAdd);
        window.removeEventListener('satfera:removeFromCompare', onRemove);
      };
    } catch (e) {
      console.warn('Failed to register global compare handlers', e);
    }
  }, [handleAddToCompare, handleRemoveCompare]);
  const handleToggleShortlist = async (id) => {
    const idStr = String(id);
    const isAlready = shortlistedIds.some((sid) => String(sid) === idStr);

    console.log("🔄 Toggle shortlist called:", { id: idStr, isAlready, currentIds: shortlistedIds });

    try {
      if (isAlready) {
        // Remove from favorites
        console.log("🗑️ Removing from favorites:", idStr);
        const response = await removeFromFavorites(idStr);
        console.log("🗑️ Remove response:", response);
        
        if (response?.success) {
          // Update local state - remove from both arrays
          setShortlistedIds((prev) => {
            const updated = prev.filter((sid) => String(sid) !== idStr);
            console.log("✅ Updated shortlistedIds:", updated);
            return updated;
          });
          
          setShortlistedProfiles((prev) => {
            // Backend returns { user: {...}, scoreDetail: {...} }
            const updated = prev.filter((item) => {
              const userId = item?.user?.userId || item?.userId || item?.id || item?._id;
              return String(userId) !== idStr;
            });
            console.log("✅ Updated shortlistedProfiles count:", updated.length);
            return updated;
          });
          
          toast.success("Removed from shortlisted");
          console.log("✅ Removed from favorites successfully");
        } else {
          console.error("❌ Failed to remove from favorites:", response?.message);
          toast.error(response?.message || "Failed to remove from favorites");
        }
      } else {
        // Add to favorites
        console.log("⭐ Adding to favorites:", idStr);
        const response = await addToFavorites(idStr);
        console.log("⭐ Add response:", response);
        
        if (response?.success) {
          // Update local state
          setShortlistedIds((prev) => [...prev, idStr]);
          
          // Fetch updated favorites to get full profile data
          const favoritesResponse = await getFavorites();
          if (favoritesResponse?.success && Array.isArray(favoritesResponse?.data)) {
            setShortlistedProfiles(favoritesResponse.data);
            console.log("✅ Fetched updated favorites count:", favoritesResponse.data.length);
          }
          
          toast.success("Profile added to shortlisted");
          console.log("✅ Added to favorites successfully");
          
          // Do not navigate; show toast only
        } else {
          console.error("❌ Failed to add to favorites:", response?.message);
          toast.error(response?.message || "Failed to add to favorites");
        }
      }
    } catch (error) {
      console.error("❌ Error toggling shortlist:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  // ✅ Send request handler
  const handleSendRequest = async (id) => {
    const idStr = String(id);
    console.log("📤 Send request clicked for profile ID:", idStr);
    
    // Add to sent profile IDs immediately for UI update
    setSentProfileIds(prev => [...prev, idStr]);
    
    try {
      const response = await sendConnectionRequest(idStr);
      
      if (response?.success) {
        console.log("✅ Connection request sent successfully");
        toast.success("Request sent successfully");
        
        // Refresh sent requests with proper transformation
        const sentRequestsResponse = await getSentRequests();
        if (sentRequestsResponse?.success && Array.isArray(sentRequestsResponse.data)) {
          const transformProfile = (item) => {
            const user = item?.user || {};
            const scoreDetail = item?.scoreDetail || { score: 0 };
            // Handle both field names for backward compatibility
            const connReqId = item?.connectionRequestId || user?.connectionRequestId || item?.connectionId || user?.connectionId;
            
            return {
              id: user.userId || user.id,
              connectionRequestId: connReqId, // Include connection request ID
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              age: user.age,
              city: user.city,
              profession: user.profession || 'Graphic Designer',
              religion: user.religion,
              caste: user.subCaste,
              image: user.closerPhoto?.url || '',
              compatibility: scoreDetail.score || 0,
              status: user.status || 'pending',
              type: 'sent'
            };
          };
          
          const sentProfiles = sentRequestsResponse.data.map(item => transformProfile(item));
          
          setProfiles((prev) => ({
            ...prev,
            sent: sentProfiles
          }));
        }
        
        // Do not navigate; show toast only
      } else {
        console.error("❌ Failed to send request:", response?.message);
        toast.error(response?.message || "Failed to send connection request");
      }
    } catch (error) {
      console.error("❌ Error sending request:", error);
      toast.error("An error occurred while sending the request");
    }
  };

  // No longer need localStorage since we're using backend API

  // Navigation handler that uses React Router
  const handleNavigate = (page) => {
    setActivePage(page);
    navigate(`/dashboard/${page}`);
  };

  // Resolve profile object or id into a usable id string for navigation
  const resolveToProfileId = (p) => {
    if (!p) return undefined;
    if (typeof p === 'string' || typeof p === 'number') return String(p);
    return String(p?.userId ?? p?.id ?? p?._id ?? (p?.user && (p.user.userId || p.user.id)) ?? '');
  };

  const handleViewProfile = (p) => {
    const id = resolveToProfileId(p);
    if (!id) {
      console.warn('handleViewProfile: could not resolve profile id from', p);
      return;
    }
    navigate(`/dashboard/profile/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#f9f5ed] flex flex-col">

      {/* TOP NAV */}
      <Navigation activePage={activePage} onNavigate={handleNavigate} />

      {/* debug banner removed */}

      {/* MAIN CONTENT BASED ON activePage */}
      <div className="flex-1">
        <Routes>
          <Route index element={
            <Dashboard
              profiles={[...profiles.sent, ...profiles.received]}
              onNavigate={handleNavigate}
              onSendRequest={handleSendRequest}
              onAddToCompare={handleAddToCompare}
              onRemoveCompare={handleRemoveCompare}
              compareProfiles={compareProfiles}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              sentProfileIds={sentProfileIds}
            />
          } />
          <Route path="compare" element={
            <ComparePage
              profiles={[
                ...(Array.isArray(profiles.sent) ? profiles.sent : []),
                ...(Array.isArray(profiles.received) ? profiles.received : []),
                ...(Array.isArray(shortlistedProfiles) ? shortlistedProfiles : [])
              ]}
              selectedProfiles={
                selectedCompareProfiles && selectedCompareProfiles.length > 0
                  ? selectedCompareProfiles
                  : compareProfiles
                      .map((cid) => {
                        const allProfiles = [
                          ...(Array.isArray(profiles.sent) ? profiles.sent : []),
                          ...(Array.isArray(profiles.received) ? profiles.received : []),
                          ...(Array.isArray(shortlistedProfiles) ? shortlistedProfiles : [])
                        ];
                        return allProfiles.find((p) => String(p?.id || p?.userId || p?._id || p?.user?.userId || p?.user?.id) === String(cid));
                      })
                      .filter(Boolean)
              }
              onRemoveFromCompare={handleRemoveCompare}
              onSendRequest={handleSendRequest}
              onNavigateBack={() => navigate('/dashboard/browse')}
              onAddToCompare={handleAddToCompare}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              onViewProfile={handleViewProfile}
            />
          } />
          <Route path="edit-profile" element={
            <EditProfile
              onNavigateBack={() => navigate('/dashboard')}
            />
          } />
          <Route path="settings" element={
            <Settings />
          } />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile/:id" element={
            <ProfileDetails
              profiles={[...profiles.sent, ...profiles.received]}
              sentProfileIds={sentProfileIds}
              onNavigate={setActivePage}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              compareProfiles={compareProfiles}
              onAddToCompare={handleAddToCompare}
              onRemoveCompare={handleRemoveCompare}
              onSendRequest={handleSendRequest}
              onWithdraw={handleWithdraw}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          } />
        </Routes>

          {!location.pathname.includes('/profile/') && !location.pathname.includes('/compare') && !location.pathname.includes('/edit-profile') && activePage === "requests" && (
          <Requests
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={handleViewProfile}
            onWithdraw={handleWithdraw}
            onAccept={handleAccept}
            onReject={handleReject}
            onChat={handleViewProfile}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}

          {!location.pathname.includes('/profile/') && activePage === "approved" && (
          <ApprovedProfiles
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={handleViewProfile}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}

          {!location.pathname.includes('/profile/') && activePage === "browse" && (
          <Browse
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={handleViewProfile}
            onSendRequest={handleSendRequest}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
            sentProfileIds={sentProfileIds}
          />
        )}

          {!location.pathname.includes('/profile/') && activePage === "newprofiles" && (
          <NewProfiles
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={handleViewProfile}
            onSendRequest={handleSendRequest}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
            sentProfileIds={sentProfileIds}
          />
        )}

          {!location.pathname.includes('/profile/') && activePage === "shortlisted" && (
          <Shortlisted
            profiles={shortlistedProfiles}
            loading={loadingFavorites}
            onViewProfile={handleViewProfile}
            onSendRequest={handleSendRequest}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}

        {!location.pathname.includes('/profile/') && activePage === "profile-views" && (
          <div>
            {loadingProfileViews ? (
              <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-[20px] p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                    <p className="text-gray-600">Loading profile views...</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <ProfileViews 
                  views={profileViews} 
                  onViewProfile={handleViewProfile}
                  totalViews={profileViewsPagination?.profileViewCount || profileViewsPagination?.total || 0}
                  weeklyViews={0}
                  pagination={{
                    page: profileViewsPage,
                    totalPages: profileViewsPagination.totalPages || 1
                  }}
                  onPageChange={setProfileViewsPage}
                />
              </>
            )}
          </div>
        )}
      </div>

      <Outlet />
    </div>
  );
}