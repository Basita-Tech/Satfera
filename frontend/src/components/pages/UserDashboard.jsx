import React, { useState, useEffect, lazy, Suspense } from "react";
import toast from 'react-hot-toast';
import { Routes, Route, useNavigate, Outlet, useLocation } from "react-router-dom";
import { Navigation } from "../Navigation";
const Dashboard = lazy(() => import("./profiles/Dashboard").then(m => ({
  default: m.Dashboard
})));
const Requests = lazy(() => import("./profiles/Requests").then(m => ({
  default: m.Requests
})));
const ApprovedProfiles = lazy(() => import("./profiles/ApprovedProfiles").then(m => ({
  default: m.ApprovedProfiles
})));
const ProfileDetails = lazy(() => import("./profiles/ProfileDetails").then(m => ({
  default: m.ProfileDetails
})));
const Browse = lazy(() => import("./profiles/Browse").then(m => ({
  default: m.Browse
})));
const NewProfiles = lazy(() => import("./profiles/NewProfiles").then(m => ({
  default: m.default || m.NewProfiles
})));
const Shortlisted = lazy(() => import("./profiles/Shortlisted").then(m => ({
  default: m.Shortlisted
})));
const ComparePage = lazy(() => import("./profiles/ComparePage").then(m => ({
  default: m.ComparePage
})));
const EditProfile = lazy(() => import("./profiles/EditProfile").then(m => ({
  default: m.EditProfile
})));
const Settings = lazy(() => import("./profiles/Settings").then(m => ({
  default: m.Settings
})));
const Support = lazy(() => import("./profiles/Support").then(m => ({
  default: m.Support
})));
const Notifications = lazy(() => import("./Notifications").then(m => ({
  default: m.default || m.Notifications
})));
import { getFavorites, addToFavorites, removeFromFavorites, getViewProfiles, sendConnectionRequest, acceptConnectionRequest, rejectConnectionRequest, acceptRejectedConnection, rejectAcceptedConnection, withdrawConnectionRequest, getSentRequests, getReceivedRequests, getProfileViews } from "../../api/auth";
import { addToCompare, removeFromCompare, getCompare } from "../../api/auth";
const ProfileViews = lazy(() => import("./profiles/ProfileViews").then(m => ({
  default: m.ProfileViews
})));
const LazyFallback = () => <div className="flex items-center justify-center py-12">
    <div className="text-center text-sm text-gray-600">Loading…</div>
  </div>;
export function UserDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const location = useLocation();
  const [profiles, setProfiles] = useState({
    sent: [],
    received: []
  });
  const [compareProfiles, setCompareProfiles] = useState([]);
  const [selectedCompareProfiles, setSelectedCompareProfiles] = useState([]);
  const [shortlistedIds, setShortlistedIds] = useState([]);
  const [shortlistedProfiles, setShortlistedProfiles] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [sentProfileIds, setSentProfileIds] = useState([]);
  const [profileViews, setProfileViews] = useState([]);
  const [loadingProfileViews, setLoadingProfileViews] = useState(false);
  const [profileViewsPage, setProfileViewsPage] = useState(1);
  const [profileViewsPagination, setProfileViewsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  useEffect(() => {
    async function fetchFavorites() {
      setLoadingFavorites(true);
      const response = await getFavorites();
      if (response?.success && Array.isArray(response?.data)) {
        const rawImages = response.data.map(item => item?.user?.closerPhoto?.url).filter(Boolean);
        const allSameImage = rawImages.length > 1 && rawImages.every(u => u === rawImages[0]);
        let favoritesData = response.data;
        if (allSameImage) {
          favoritesData = await Promise.all(response.data.map(async item => {
            try {
              const userId = item?.user?.userId;
              if (!userId) return item;
              const detail = await getViewProfiles(userId);
              if (detail?.success && detail?.data?.closerPhoto?.url) {
                return {
                  ...item,
                  user: {
                    ...item.user,
                    closerPhoto: detail.data.closerPhoto
                  }
                };
              }
              return item;
            } catch (e) {
              console.warn("⚠️ Failed to enrich favorite profile", item?.user?.userId, e);
              return item;
            }
          }));
        }
        setShortlistedProfiles(favoritesData);
        const ids = favoritesData.map(item => {
          const userId = item?.user?.userId || item?.userId || item?.id || item?._id;
          return String(userId);
        });
        setShortlistedIds(ids);
      }
      setLoadingFavorites(false);
    }
    fetchFavorites();
  }, []);
  useEffect(() => {
    async function fetchConnectionRequests() {
      try {
        const [sentResponse, receivedResponse] = await Promise.all([getSentRequests(), getReceivedRequests()]);
        if (sentResponse?.data?.[0]) {}
        if (receivedResponse?.data?.[0]) {}
        const transformProfile = item => {
          const user = item?.user || {};
          const scoreDetail = item?.scoreDetail || {
            score: 0
          };
          const connectionRequestId = item?.connectionRequestId || user?.connectionId || user?.connectionRequestId || item?.connectionId || item?._id;
          if (!connectionRequestId) {
            console.warn("⚠️ Missing connectionRequestId for item:", item);
            console.warn("⚠️ Item keys:", Object.keys(item));
            console.warn("⚠️ User keys:", Object.keys(user));
          }
          const status = item?.status || user?.status || 'pending';
          const personal = user?.personal || {};
          
          return {
            id: user.userId || user.id,
            connectionRequestId,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            age: user.age,
            city: user.city || personal.city || '',
            state: user.state || personal.state || '',
            country: user.country || personal.country || '',
            profession: user.profession || user.occupation || personal.occupation || 'Graphic Designer',
            religion: user.religion || personal.religion || '',
            caste: user.subCaste || personal.subCaste || '',
            image: user.closerPhoto?.url || '',
            compatibility: scoreDetail.score || 0,
            status
          };
        };
        const sentProfiles = sentResponse?.success && Array.isArray(sentResponse.data) ? sentResponse.data.map(item => ({
          ...transformProfile(item),
          type: 'sent'
        })).filter(profile => profile.status !== 'cancelled') : [];
        const receivedProfiles = receivedResponse?.success && Array.isArray(receivedResponse.data) ? receivedResponse.data.map(item => ({
          ...transformProfile(item),
          type: 'received'
        })).filter(profile => profile.status !== 'cancelled') : [];
        setProfiles({
          sent: sentProfiles,
          received: receivedProfiles
        });
        const sentIds = sentProfiles.map(p => String(p.id));
        setSentProfileIds(sentIds);
      } catch (error) {
        console.error("❌ Error fetching connection requests:", error);
      }
    }
    fetchConnectionRequests();
  }, []);
  useEffect(() => {
    setActivePage("dashboard");
  }, []);
  useEffect(() => {
    if (activePage === "profile-views") {
      fetchProfileViews();
    }
  }, [activePage, profileViewsPage]);
  const fetchProfileViews = async () => {
    setLoadingProfileViews(true);
    try {
      const response = await getProfileViews(profileViewsPage, 10, false);
      if (response?.success && Array.isArray(response?.data)) {
        const transformedViews = response.data.map((item, index) => {
          const user = item?.user || {};
          const scoreDetail = item?.scoreDetail || {};
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
        }).filter(view => view.name !== 'Unknown User');
        setProfileViews(transformedViews);
        if (response.pagination) {
          const totalPages = Math.ceil((response.pagination.total || 0) / (response.pagination.limit || 10));
          setProfileViewsPagination({
            ...response.pagination,
            total: response.pagination.total || 0,
            totalPages
          });
        }
        if (response.profileViewCount !== undefined) {
          setProfileViewsPagination(prev => ({
            ...prev,
            profileViewCount: response.profileViewCount
          }));
        }
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
  const formatViewedAt = timestamp => {
    if (!timestamp) return 'Recently';
    try {
      const date = new Date(timestamp);
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
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  };
  useEffect(() => {
    let mounted = true;
    const resolveProfiles = async () => {
      try {
        const ids = Array.isArray(compareProfiles) ? compareProfiles.map(String) : [];
        setSelectedCompareProfiles(currentProfiles => {
          const existingMap = new Map();
          (Array.isArray(currentProfiles) ? currentProfiles : []).forEach(p => {
            const key = String((p?.userId ?? p?.id ?? p?._id ?? (p?.user && (p.user.userId || p.user.id))) || '').trim();
            if (key) existingMap.set(key, p);
          });
          const pool = [...profiles.sent, ...profiles.received, ...shortlistedProfiles];
          const results = [];
          const toFetchIds = [];
          ids.forEach(id => {
            if (existingMap.has(id)) {
              const cached = existingMap.get(id);
              if (!cached.image) {
                const poolProfile = pool.find(p => {
                  const pid = String(p?.id || p?.userId || p?._id || p?.user && (p.user.userId || p.user.id) || '');
                  return pid === id;
                });
                if (poolProfile) {
                  const user = poolProfile?.user || poolProfile;
                  const normalizedImage = user?.closerPhoto?.url || poolProfile?.closerPhoto?.url || user?.image || poolProfile?.image || '';
                  if (normalizedImage) {
                    results.push({
                      ...cached,
                      image: normalizedImage
                    });
                    return;
                  }
                }
              }
              results.push(cached);
              return;
            }
            const found = pool.find(p => {
              const pid = String(p?.id || p?.userId || p?._id || p?.user && (p.user.userId || p.user.id) || '');
              return pid === id;
            });
            if (found) {
              const user = found?.user || found;
              const image = found.image || user.closerPhoto?.url || user.image || found.user?.closerPhoto?.url || '';
              const normalized = {
                ...found,
                id: found.id || found.userId || user.userId || user.id,
                userId: found.userId || found.id || user.userId || user.id,
                name: found.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                image: image,
                user: user
              };
              results.push(normalized);
            } else {
              toFetchIds.push(id);
            }
          });
          if (toFetchIds.length > 0 && mounted) {
            Promise.all(toFetchIds.map(id => getViewProfiles(id).catch(e => {
              console.warn('Failed to fetch profile for compare id', id, e);
              return null;
            }))).then(fetched => {
              if (!mounted) return;
              const fetchedProfiles = fetched.filter(f => f && f.success && f.data).map(f => {
                const rawProfile = f.data;
                const user = rawProfile?.user || rawProfile;
                const scoreDetail = rawProfile?.scoreDetail || {};
                return {
                  ...rawProfile,
                  id: user.userId || user.id || rawProfile.id,
                  userId: user.userId || user.id,
                  name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                  firstName: user.firstName,
                  lastName: user.lastName,
                  age: user.age,
                  city: user.city,
                  image: user.closerPhoto?.url || user.image || '',
                  closerPhoto: user.closerPhoto,
                  profession: user.profession,
                  religion: user.religion,
                  subCaste: user.subCaste,
                  user: user,
                  scoreDetail: scoreDetail
                };
              });
              if (fetchedProfiles.length > 0) {
                setSelectedCompareProfiles(prev => {
                  const combined = [...(Array.isArray(prev) ? prev : []), ...fetchedProfiles];
                  const uniq = [];
                  const seen = new Set();
                  for (const r of combined) {
                    const key = String(r?.userId || r?.id || r?._id || '');
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    if (ids.includes(key)) uniq.push(r);
                  }
                  return uniq;
                });
              }
            });
          }
          const uniq = [];
          const seen = new Set();
          for (const r of results) {
            const key = String(r?.userId || r?.id || r?._id || '');
            if (!key || seen.has(key)) continue;
            seen.add(key);
            uniq.push(r);
          }
          if (uniq.length > 0 || compareProfiles.length === 0) {
            return uniq;
          }
          return currentProfiles;
        });
      } catch (err) {
        console.error('Error resolving compare profiles', err);
      }
    };
    resolveProfiles();
    return () => {
      mounted = false;
    };
  }, [compareProfiles, profiles.sent, profiles.received, shortlistedProfiles]);
  const getCompareProfiles = async () => {
    try {
      const resp = await getCompare();
      if (resp && resp.success && Array.isArray(resp.data)) {
        const profilesFromServer = resp.data;
        const ids = profilesFromServer.map(p => String(p?.userId ?? p?.id ?? p?._id ?? '').trim()).filter(Boolean);
        const idSet = new Set();
        const dedupedIds = [];
        for (const id of ids) {
          if (!idSet.has(id)) {
            idSet.add(id);
            dedupedIds.push(id);
          }
        }
        const seen = new Set();
        const dedupedProfiles = [];
        const normalize = raw => {
          const user = raw?.user || raw || {};
          const id = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
          const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
          const image = user?.closerPhoto?.url || raw?.closerPhoto?.url || user?.image || raw?.image || '';
          const age = raw?.age ?? user?.age ?? null;
          return {
            ...raw,
            id,
            name,
            image,
            age
          };
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
        return {
          ids: dedupedIds,
          profiles: dedupedProfiles
        };
      }
      if (resp && Array.isArray(resp.ids)) {
        const deduped = Array.from(new Set(resp.ids.map(String)));
        setCompareProfiles(deduped);
        try {
          const resolved = await Promise.all(deduped.map(async pid => {
            try {
              const view = await getViewProfiles(pid);
              if (view && view.success && view.data) return view.data;
              return null;
            } catch (e) {
              return null;
            }
          }));
          const profilesList = resolved.filter(Boolean);
          if (profilesList.length > 0) {
            const seen = new Set();
            const norm = [];
            for (const raw of profilesList) {
              const key = String(raw?.userId ?? raw?.id ?? raw?._id ?? raw?.user?.userId ?? raw?.user?.id ?? '').trim();
              if (!key || seen.has(key)) continue;
              seen.add(key);
              const user = raw?.user || raw || {};
              const id = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
              const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
              const image = user?.closerPhoto?.url || raw?.closerPhoto?.url || user?.image || raw?.image || '';
              const age = raw?.age ?? user?.age ?? null;
              norm.push({
                ...raw,
                id,
                name,
                image,
                age
              });
            }
            if (norm.length > 0) setSelectedCompareProfiles(norm);
          }
        } catch (e) {
          console.warn('⚠️ Failed to resolve full profiles for compare ids', e);
        }
        return {
          ids: deduped,
          profiles: []
        };
      }
      console.warn('⚠️ getCompare returned unexpected shape:', resp);
      return {
        ids: [],
        profiles: []
      };
    } catch (err) {
      console.error('❌ getCompareProfiles failed:', err);
      return {
        ids: [],
        profiles: []
      };
    }
  };
  useEffect(() => {
    getCompareProfiles();
  }, []);
  const pollCompare = async (predicate, {
    retries = 6,
    delay = 300
  } = {}) => {
    for (let i = 0; i < retries; i++) {
      try {
        const resp = await getCompare();
        const ids = Array.isArray(resp?.ids) ? resp.ids.map(String) : Array.isArray(resp?.data) ? resp.data.map(p => String(p?.userId ?? p?.id ?? p?._id ?? '')).filter(Boolean) : [];
        if (predicate(ids, resp)) return {
          ok: true,
          ids,
          resp
        };
      } catch (e) {}
      await new Promise(res => setTimeout(res, delay));
    }
    return {
      ok: false
    };
  };
  useEffect(() => {
    try {
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
      if (page !== activePage) setActivePage(page);
    } catch (e) {}
  }, [location.pathname]);
  useEffect(() => {}, [activePage]);
  const handleAccept = async payload => {
    const profileId = typeof payload === "number" ? payload : payload?.id;
    const idKey = String(profileId);
    try {
      const profile = profiles.received.find(p => String(p.id) === idKey);
      if (!profile) {
        console.warn("⚠️ Profile not found in received requests:", idKey);
        toast.error("Profile not found");
        return;
      }
      const connectionRequestId = profile?.connectionRequestId;
      const currentStatus = profile?.status?.toLowerCase();
      if (!connectionRequestId) {
        console.error("❌ No connectionRequestId found for profile:", profile);
        toast.error("Unable to accept: Connection request ID not found. Please refresh the page.");
        return;
      }
      let response;
      if (currentStatus === "rejected") {
        response = await acceptRejectedConnection(connectionRequestId);
      } else {
        response = await acceptConnectionRequest(connectionRequestId);
      }
      if (response?.success) {
        setProfiles(prev => {
          const updatedReceived = prev.received.map(p => String(p.id) === idKey ? {
            ...p,
            status: "accepted"
          } : p);
          return {
            ...prev,
            received: updatedReceived
          };
        });
        const name = typeof payload === "object" ? payload.name : undefined;
        const message = currentStatus === "rejected" ? `Connection with ${name || "user"} changed to accepted` : `Accepted request${name ? ` from ${name}` : ""}`;
        toast.success(message);
      } else {
        console.error("❌ Failed to accept request:", response?.message);
        toast.error(response?.message || "Failed to accept connection request");
      }
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      toast.error("An error occurred while accepting the request");
    }
  };
  const handleReject = async payload => {
    const profileId = typeof payload === "number" ? payload : payload?.id;
    const idKey = String(profileId);
    try {
      const profile = profiles.received.find(p => String(p.id) === idKey);
      if (!profile) {
        console.warn("⚠️ Profile not found in received requests:", idKey);
        toast.error("Profile not found");
        return;
      }
      const connectionRequestId = profile?.connectionRequestId;
      const currentStatus = profile?.status?.toLowerCase();
      if (!connectionRequestId) {
        console.error("❌ No connectionRequestId found for profile:", profile);
        toast.error("Unable to reject: Connection request ID not found. Please refresh the page.");
        return;
      }
      let response;
      if (currentStatus === "accepted") {
        response = await rejectAcceptedConnection(connectionRequestId);
      } else {
        response = await rejectConnectionRequest(connectionRequestId);
      }
      if (response?.success) {
        setProfiles(prev => {
          const updatedReceived = prev.received.map(p => String(p.id) === idKey ? {
            ...p,
            status: "rejected"
          } : p);
          return {
            ...prev,
            received: updatedReceived
          };
        });
        const name = typeof payload === "object" ? payload.name : undefined;
        const message = currentStatus === "accepted" ? `Connection with ${name || "user"} changed to rejected` : `Rejected request${name ? ` from ${name}` : ""}`;
        toast.success(message);
      } else {
        console.error("❌ Failed to reject request:", response?.message);
        toast.error(response?.message || "Failed to reject connection request");
      }
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      toast.error("An error occurred while rejecting the request");
    }
  };
  const handleWithdraw = async id => {
    const idKey = String(id);
    try {
      const profile = profiles.sent.find(p => String(p.id) === idKey);
      if (!profile) {
        console.warn("⚠️ Profile not found in sent requests:", idKey);
        toast.error("Profile not found or already withdrawn");
        return;
      }
      const connectionRequestId = profile?.connectionRequestId;
      if (profile.status === 'cancelled') {
        console.warn("⚠️ Request already cancelled");
        toast.error("This request has already been withdrawn");
        setProfiles(prev => {
          const updatedSent = prev.sent.filter(p => String(p.id) !== idKey);
          return {
            ...prev,
            sent: updatedSent
          };
        });
        setSentProfileIds(prev => prev.filter(pid => String(pid) !== idKey));
        return;
      }
      if (!connectionRequestId) {
        console.error("❌ No connectionRequestId found for profile:", profile);
        toast.error("Unable to withdraw: Connection request ID not found. Please refresh the page.");
        return;
      }
      setProfiles(prev => {
        const updatedSent = prev.sent.map(p => String(p.id) === idKey ? {
          ...p,
          status: 'withdrawn'
        } : p);
        return {
          ...prev,
          sent: updatedSent
        };
      });
      const response = await withdrawConnectionRequest(connectionRequestId);
      if (response?.success) {
        toast.success(`Request withdrawn successfully`);
        setSentProfileIds(prev => prev.filter(pid => String(pid) !== idKey));
        const sentResponse = await getSentRequests();
        if (sentResponse?.success) {
          const updatedSentProfiles = sentResponse.data.map(item => {
            const user = item?.user || {};
            const scoreDetail = item?.scoreDetail || {
              score: 0
            };
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
          const finalProfiles = updatedSentProfiles.map(p => {
            const existing = profiles.sent.find(ep => String(ep.id) === String(p.id));
            if (existing?.status === 'withdrawn') {
              return {
                ...p,
                status: 'withdrawn'
              };
            }
            return p;
          });
          setProfiles(prev => ({
            ...prev,
            sent: finalProfiles
          }));
          const sentIds = finalProfiles.filter(p => p.status !== 'withdrawn' && p.status !== 'cancelled').map(p => String(p.id));
          setSentProfileIds(sentIds);
        }
      } else {
        console.error("❌ Failed to withdraw request:", response?.message);
        setProfiles(prev => {
          const updatedSent = prev.sent.map(p => String(p.id) === idKey ? profile : p);
          return {
            ...prev,
            sent: updatedSent
          };
        });
        toast.error(response?.message || "Failed to withdraw connection request");
      }
    } catch (error) {
      console.error("❌ Error withdrawing request:", error);
      toast.error("An error occurred while withdrawing the request");
      const profile = profiles.sent.find(p => String(p.id) === idKey);
      if (profile) {
        setProfiles(prev => {
          if (prev.sent.some(p => String(p.id) === idKey)) return prev;
          return {
            ...prev,
            sent: [...prev.sent, profile]
          };
        });
      }
    }
  };
  const handleAddToCompare = async id => {
    const idStr = String(id);
    setCompareProfiles(prev => {
      const s = prev ? prev.map(String) : [];
      if (s.includes(idStr)) return s;
      return [...s, idStr];
    });
    try {
      const resp = await addToCompare(idStr);
      if (!resp || resp.success === false) {
        console.error('Add to compare failed', resp?.message || resp);
        setCompareProfiles(prev => Array.isArray(prev) ? prev.filter(x => String(x) !== idStr) : []);
        toast.error(resp?.message || 'Failed to add to compare');
        return;
      }
      try {
        toast.success('✅ Added to Compare');
      } catch (e) {}
      if (Array.isArray(resp.ids) && resp.ids.length > 0) {
        const dedup = Array.from(new Set(resp.ids.map(String)));
        setCompareProfiles(dedup);
        return {
          ids: dedup,
          profiles: []
        };
      }
      try {
        const server = await getCompare();
        if (server && Array.isArray(server.ids) && server.ids.length > 0) {
          setCompareProfiles(server.ids);
          return;
        }
        console.warn('⚠️ Server returned empty compare list after add; keeping optimistic state for id:', idStr);
      } catch (syncErr) {
        console.warn('⚠️ Failed to sync compare after add', syncErr);
      }
      if (resp && resp.success) {
        try {
          await new Promise(r => setTimeout(r, 300));
          const pol = await pollCompare(ids => Array.isArray(ids) ? ids.map(String).includes(idStr) : false, {
            retries: 12,
            delay: 500
          });
          if (pol.ok) {
            const final = await getCompareProfiles();
            return final;
          }
        } catch (e) {
          console.warn('⚠️ pollCompare failed during add:', e);
        }
        try {
          const view = await getViewProfiles(idStr);
          if (view && view.success && view.data) {
            const raw = view.data;
            const user = raw?.user || raw || {};
            const nid = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
            const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
            const image = raw?.image || raw?.closerPhoto?.url || raw?.closerPhoto || user?.closerPhoto?.url || user?.closerPhoto || '';
            const age = raw?.age ?? user?.age ?? null;
            const normalized = {
              ...raw,
              id: nid,
              name,
              image,
              age
            };
            setSelectedCompareProfiles(prev => {
              const existing = Array.isArray(prev) ? prev.map(p => String(p?.id || p?.userId || p?._id)) : [];
              if (existing.includes(nid)) return prev || [normalized];
              return prev ? [...prev, normalized] : [normalized];
            });
          }
        } catch (e) {
          console.warn('⚠️ Failed to fetch profile after add for UI fallback', e);
        }
        setCompareProfiles(prev => {
          const s = Array.isArray(prev) ? prev.map(String) : [];
          if (!s.includes(idStr)) return [...s, idStr];
          return s;
        });
        return {
          ids: Array.isArray(compareProfiles) ? compareProfiles.map(String) : [],
          profiles: selectedCompareProfiles || []
        };
      }
    } catch (err) {
      console.error('Add to compare error', err);
      setCompareProfiles(prev => Array.isArray(prev) ? prev.filter(x => String(x) !== idStr) : []);
      toast.error('Failed to add to compare');
    }
  };
  const handleRemoveCompare = async id => {
    const idStr = String(id);
    setCompareProfiles(prev => Array.isArray(prev) ? prev.filter(x => String(x) !== idStr) : []);
    try {
      const resp = await removeFromCompare(idStr);
      if (!resp || resp.success === false) {
        console.error('Remove from compare failed', resp?.message || resp);
        setCompareProfiles(prev => Array.isArray(prev) ? [...prev, idStr] : [idStr]);
        return;
      }
      try {
        toast.success('✅ Removed from Compare');
      } catch (e) {}
      if (Array.isArray(resp.ids)) {
        const dedup = Array.from(new Set(resp.ids.map(String)));
        setCompareProfiles(dedup);
        return {
          ids: dedup,
          profiles: []
        };
      }
      try {
        const server = await getCompare();
        if (server && Array.isArray(server.ids)) {
          setCompareProfiles(server.ids);
          return;
        }
        console.warn('⚠️ Server did not return authoritative compare list after remove for id:', idStr);
      } catch (syncErr) {
        console.warn('⚠️ Failed to sync compare after remove', syncErr);
      }
      if (resp && resp.success) {
        await new Promise(r => setTimeout(r, 300));
        try {
          const pol = await pollCompare(ids => Array.isArray(ids) ? !ids.map(String).includes(idStr) : false, {
            retries: 12,
            delay: 500
          });
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
      setCompareProfiles(prev => Array.isArray(prev) ? [...prev, idStr] : [idStr]);
    }
  };
  React.useEffect(() => {
    try {
      window.__satfera_handleAddToCompare = async (id, profile) => {
        try {
          if (profile) {
            try {
              const raw = profile;
              const user = raw?.user || raw || {};
              const nid = String(raw?.userId ?? raw?.id ?? raw?._id ?? user?.userId ?? user?.id ?? '').trim();
              const name = raw?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
              const image = raw?.image || raw?.closerPhoto?.url || raw?.closerPhoto || user?.closerPhoto?.url || user?.closerPhoto || '';
              const age = raw?.age ?? user?.age ?? null;
              const normalized = {
                ...raw,
                id: nid,
                name,
                image,
                age
              };
              setSelectedCompareProfiles(prev => {
                const existing = Array.isArray(prev) ? prev.map(p => String(p?.id || p?.userId || p?._id)) : [];
                if (existing.includes(nid)) return prev || [normalized];
                return prev ? [...prev, normalized] : [normalized];
              });
              setCompareProfiles(prev => {
                const s = Array.isArray(prev) ? prev.map(String) : [];
                if (!s.includes(nid)) return [...s, nid];
                return s;
              });
            } catch (e) {
              console.warn('⚠️ Failed optimistic injection of profile to selectedCompareProfiles', e);
            }
          }
          await handleAddToCompare(id);
        } catch (e) {
          console.warn('global addToCompare failed', e);
        }
      };
      window.__satfera_handleRemoveFromCompare = async (id, profile) => {
        try {
          try {
            const pid = String(id);
            setSelectedCompareProfiles(prev => Array.isArray(prev) ? prev.filter(p => String(p?.id || p?.userId || p?._id) !== pid) : prev);
            setCompareProfiles(prev => Array.isArray(prev) ? prev.filter(x => String(x) !== pid) : prev);
          } catch (e) {}
          await handleRemoveCompare(id);
        } catch (e) {
          console.warn('global removeFromCompare failed', e);
        }
      };
      const onAdd = e => {
        const detail = e?.detail || {};
        if (detail?.id) handleAddToCompare(detail.id, detail.profile);
      };
      const onRemove = e => {
        const detail = e?.detail || {};
        if (detail?.id) handleRemoveCompare(detail.id);
      };
      window.addEventListener('satfera:addToCompare', onAdd);
      window.addEventListener('satfera:removeFromCompare', onRemove);
      return () => {
        try {
          delete window.__satfera_handleAddToCompare;
        } catch {}
        ;
        try {
          delete window.__satfera_handleRemoveFromCompare;
        } catch {}
        ;
        window.removeEventListener('satfera:addToCompare', onAdd);
        window.removeEventListener('satfera:removeFromCompare', onRemove);
      };
    } catch (e) {
      console.warn('Failed to register global compare handlers', e);
    }
  }, [handleAddToCompare, handleRemoveCompare]);
  const handleToggleShortlist = async id => {
    const idStr = String(id);
    const isAlready = shortlistedIds.some(sid => String(sid) === idStr);
    try {
      if (isAlready) {
        const response = await removeFromFavorites(idStr);
        if (response?.success) {
          setShortlistedIds(prev => {
            const updated = prev.filter(sid => String(sid) !== idStr);
            return updated;
          });
          setShortlistedProfiles(prev => {
            const updated = prev.filter(item => {
              const userId = item?.user?.userId || item?.userId || item?.id || item?._id;
              return String(userId) !== idStr;
            });
            return updated;
          });
          toast.success("Removed from shortlisted");
        } else {
          console.error("❌ Failed to remove from favorites:", response?.message);
          toast.error(response?.message || "Failed to remove from favorites");
        }
      } else {
        const response = await addToFavorites(idStr);
        if (response?.success) {
          setShortlistedIds(prev => [...prev, idStr]);
          const favoritesResponse = await getFavorites();
          if (favoritesResponse?.success && Array.isArray(favoritesResponse?.data)) {
            setShortlistedProfiles(favoritesResponse.data);
          }
          toast.success("Profile added to shortlisted");
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
  const handleSendRequest = async id => {
    const idStr = String(id);
    setSentProfileIds(prev => [...prev, idStr]);
    try {
      const response = await sendConnectionRequest(idStr);
      if (response?.success) {
        toast.success("Request sent successfully");
        const sentRequestsResponse = await getSentRequests();
        if (sentRequestsResponse?.success && Array.isArray(sentRequestsResponse.data)) {
          const transformProfile = item => {
            const user = item?.user || {};
            const scoreDetail = item?.scoreDetail || {
              score: 0
            };
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
          };
          const sentProfiles = sentRequestsResponse.data.map(item => transformProfile(item));
          setProfiles(prev => ({
            ...prev,
            sent: sentProfiles
          }));
        }
        return response;
      } else {
        console.error("❌ Failed to send request:", response?.message);
        toast.error(response?.message || "Failed to send connection request");
        return response;
      }
    } catch (error) {
      console.error("❌ Error sending request:", error);
      toast.error("An error occurred while sending the request");
      return {
        success: false,
        error
      };
    }
  };
  const handleNavigate = page => {
    setActivePage(page);
    navigate(`/dashboard/${page}`);
  };
  const resolveToProfileId = p => {
    if (!p) return undefined;
    if (typeof p === 'string' || typeof p === 'number') return String(p);
    return String(p?.userId ?? p?.id ?? p?._id ?? (p?.user && (p.user.userId || p.user.id)) ?? '');
  };
  const handleViewProfile = p => {
    const id = resolveToProfileId(p);
    if (!id) {
      console.warn('handleViewProfile: could not resolve profile id from', p);
      return;
    }
    navigate(`/dashboard/profile/${id}`);
  };
  return <div className="min-h-screen bg-[#f9f5ed] flex flex-col">

      {}
      <Navigation activePage={activePage} onNavigate={handleNavigate} />

      {}

      {}
      <div className="flex-1">
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route index element={<Dashboard profiles={[...profiles.sent, ...profiles.received]} onNavigate={handleNavigate} onSendRequest={handleSendRequest} onAddToCompare={handleAddToCompare} onRemoveCompare={handleRemoveCompare} compareProfiles={compareProfiles} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} sentProfileIds={sentProfileIds} />} />
            <Route path="compare" element={<ComparePage profiles={[...(Array.isArray(profiles.sent) ? profiles.sent : []), ...(Array.isArray(profiles.received) ? profiles.received : []), ...(Array.isArray(shortlistedProfiles) ? shortlistedProfiles : [])]} selectedProfiles={selectedCompareProfiles && selectedCompareProfiles.length > 0 ? selectedCompareProfiles : compareProfiles.map(cid => {
            const allProfiles = [...(Array.isArray(profiles.sent) ? profiles.sent : []), ...(Array.isArray(profiles.received) ? profiles.received : []), ...(Array.isArray(shortlistedProfiles) ? shortlistedProfiles : [])];
            return allProfiles.find(p => String(p?.id || p?.userId || p?._id || p?.user?.userId || p?.user?.id) === String(cid));
          }).filter(Boolean)} onRemoveFromCompare={handleRemoveCompare} onSendRequest={handleSendRequest} onNavigateBack={() => navigate('/dashboard/browse')} onAddToCompare={handleAddToCompare} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} onViewProfile={handleViewProfile} sentProfileIds={sentProfileIds} />} />
            <Route path="edit-profile" element={<EditProfile onNavigateBack={() => navigate('/dashboard')} />} />
            <Route path="settings" element={<Settings />} />
            <Route path="support" element={<Support />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile/:id" element={<ProfileDetails profiles={[...profiles.sent, ...profiles.received]} sentProfileIds={sentProfileIds} onNavigate={setActivePage} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} compareProfiles={compareProfiles} onAddToCompare={handleAddToCompare} onRemoveCompare={handleRemoveCompare} onSendRequest={handleSendRequest} onWithdraw={handleWithdraw} onAccept={handleAccept} onReject={handleReject} />} />
          </Routes>

          {!location.pathname.includes('/profile/') && !location.pathname.includes('/compare') && !location.pathname.includes('/edit-profile') && activePage === "requests" && <Requests profiles={[...profiles.sent, ...profiles.received]} onViewProfile={handleViewProfile} onWithdraw={handleWithdraw} onAccept={handleAccept} onReject={handleReject} onChat={handleViewProfile} onAddToCompare={handleAddToCompare} onRemoveCompare={handleRemoveCompare} compareProfiles={compareProfiles} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} />}

          {!location.pathname.includes('/profile/') && activePage === "approved" && <ApprovedProfiles profiles={[...profiles.sent, ...profiles.received]} onViewProfile={handleViewProfile} onAddToCompare={handleAddToCompare} onRemoveCompare={handleRemoveCompare} compareProfiles={compareProfiles} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} />}

          {!location.pathname.includes('/profile/') && activePage === "browse" && <Browse profiles={[...profiles.sent, ...profiles.received]} onViewProfile={handleViewProfile} onSendRequest={handleSendRequest} onAddToCompare={handleAddToCompare} onRemoveCompare={handleRemoveCompare} compareProfiles={compareProfiles} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} sentProfileIds={sentProfileIds} />}

          {!location.pathname.includes('/profile/') && activePage === "newprofiles" && <NewProfiles profiles={[...profiles.sent, ...profiles.received]} onViewProfile={handleViewProfile} onSendRequest={handleSendRequest} onAddToCompare={handleAddToCompare} onRemoveCompare={handleRemoveCompare} compareProfiles={compareProfiles} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} sentProfileIds={sentProfileIds} />}

          {!location.pathname.includes('/profile/') && activePage === "shortlisted" && <Shortlisted profiles={shortlistedProfiles} loading={loadingFavorites} onViewProfile={handleViewProfile} onSendRequest={handleSendRequest} onAddToCompare={handleAddToCompare} onRemoveCompare={handleRemoveCompare} compareProfiles={compareProfiles} shortlistedIds={shortlistedIds} onToggleShortlist={handleToggleShortlist} />}

        {!location.pathname.includes('/profile/') && activePage === "profile-views" && <div>
            {loadingProfileViews ? <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-[20px] p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a227]"></div>
                    <p className="text-gray-600">Loading profile views...</p>
                  </div>
                </div>
              </div> : <>
                <ProfileViews views={profileViews} onViewProfile={handleViewProfile} totalViews={profileViewsPagination?.profileViewCount || profileViewsPagination?.total || 0} weeklyViews={0} pagination={{
              page: profileViewsPage,
              totalPages: profileViewsPagination.totalPages || 1
            }} onPageChange={setProfileViewsPage} />
              </>}
          </div>}
        </Suspense>
      </div>

      <Outlet />
    </div>;
}