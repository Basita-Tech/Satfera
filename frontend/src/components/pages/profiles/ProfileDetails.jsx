import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getViewProfiles, addToCompare as apiAddToCompare, blockUserProfile, unblockUserProfile } from "../../../api/auth";
import {
  Sparkles,
  Clock,
  AlarmClock,
  MapPin,
  Ruler,
  Weight,
  Moon,
  Zap,
  User,
  Heart,
  Lock,
  GraduationCap,
  MessageCircle,
  CheckCircle,
  Briefcase,
  Calendar,
  ChevronLeft,
  Star,
  UserX,
  Shield
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import toast from 'react-hot-toast';


export function ProfileDetails({ profiles, sentProfileIds = [], onNavigate, shortlistedIds = [], onToggleShortlist, compareProfiles = [], selectedCompareProfiles = [], onAddToCompare, onRemoveCompare, onSendRequest, onWithdraw, onAccept, onReject }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [premiumModal, setPremiumModal] = useState(false);
  
  // Local shortlist fallback state when parent doesn't provide handler
  const [localShortlisted, setLocalShortlisted] = useState(() => {
    try {
      const raw = localStorage.getItem("shortlisted_profiles") || "[]";
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((s) => String(s)) : [];
    } catch {
      return [];
    }
  });


  // Fetch profile from backend
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localStatus, setLocalStatus] = useState(null); // Track local status changes
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockingInProgress, setIsBlockingInProgress] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    
    async function fetchProfileWithRetry() {
      if (!id) {
        console.warn("⚠️ [ProfileDetails] No profile ID provided");
        return;
      }
      
      console.log("🔄 [ProfileDetails] Starting profile fetch for ID:", id);
      if (isMounted) setLoading(true);
      
      let response;
      
      while (retryCount < 3 && isMounted) {
        console.log(`🔄 [ProfileDetails] Attempt ${retryCount + 1} to fetch profile`);
        response = await getViewProfiles(id);
        
        console.log("📦 [ProfileDetails] Response received:", {
          success: response?.success,
          hasData: !!response?.data,
          dataType: typeof response?.data,
          message: response?.message,
          fullResponse: response
        });
        
        if (response?.success && response?.data) {
          console.log("✅ [ProfileDetails] Profile data found:", response.data);
          console.log("✅ [ProfileDetails] Profile data fields:", Object.keys(response.data));
          
          if (isMounted) {
            console.log("✅ [ProfileDetails] Setting profile state with data:", response.data);
            setProfile(response.data);
            setLoading(false);
          } else {
            console.warn("⚠️ [ProfileDetails] Component unmounted, skipping state update");
          }
          return;
        } else if (response?.message && response.message.includes('timeout')) {
          retryCount++;
          console.warn(`⚠️ [ProfileDetails] Timeout on attempt ${retryCount}, retrying...`);
          if (isMounted) {
            await new Promise(res => setTimeout(res, 1000 * retryCount)); // Exponential backoff
          }
        } else {
          console.error("❌ [ProfileDetails] Failed to fetch profile:", {
            success: response?.success,
            data: response?.data,
            message: response?.message
          });
          break;
        }
      }
      
      console.error("❌ [ProfileDetails] All retry attempts exhausted or no data found");
      if (isMounted) {
        setProfile(null);
        setLoading(false);
      }
    }
    
    fetchProfileWithRetry();
    
    return () => { 
      console.log("🧹 [ProfileDetails] Component unmounting");
      isMounted = false; 
    };
  }, [id]);

  const dummyImage =
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80";

  // Helper function to capitalize first letter
  const capitalize = (str) => {
    if (!str) return "—";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Compute age as years, months, days from a DOB
  const getAgeParts = (dob) => {
    try {
      const birth = new Date(dob);
      if (Number.isNaN(birth.getTime())) return null;
      const now = new Date();

      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      let days = now.getDate() - birth.getDate();

      if (days < 0) {
        const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        days += prevMonthDays;
        months -= 1;
      }
      if (months < 0) {
        months += 12;
        years -= 1;
      }
      return { years, months, days };
    } catch {
      return null;
    }
  };

  const formatAgeFromDob = (dob) => {
    const parts = getAgeParts(dob);
    if (!parts) return '—';
    const out = [];
    if (parts.years > 0) out.push(`${parts.years} year${parts.years !== 1 ? 's' : ''}`);
    if (parts.months > 0) out.push(`${parts.months} month${parts.months !== 1 ? 's' : ''}`);
    if (parts.days > 0 || out.length === 0) out.push(`${parts.days} day${parts.days !== 1 ? 's' : ''}`);
    return out.join(' ');
  };

  // convenience fields for backend data
  console.log("🎨 [ProfileDetails] Rendering with profile:", profile);
  console.log("🎨 [ProfileDetails] Profile structure check:", {
    hasCloserPhoto: !!profile?.closerPhoto,
    closerPhotoUrl: profile?.closerPhoto?.url,
    hasScoreDetail: !!profile?.scoreDetail,
    score: profile?.scoreDetail?.score,
    userId: profile?.userId,
    personal: profile?.personal ? Object.keys(profile.personal) : null,
    education: profile?.education ? Object.keys(profile.education) : null,
    professional: profile?.professional ? Object.keys(profile.professional) : null
  });
  
  // Build gallery photos from backend
  const photos = React.useMemo(() => {
    const arr = [];
    if (profile?.closerPhoto?.url) arr.push({ url: profile.closerPhoto.url, label: "Profile" });
    if (profile?.familyPhoto?.url) arr.push({ url: profile.familyPhoto.url, label: "Family", blurred: !!profile?.familyPhoto?.isBlurred });
    if (Array.isArray(profile?.otherPhotos)) {
      profile.otherPhotos.forEach((p) => {
        if (p?.url) arr.push({ url: p.url, label: "Photo" });
      });
    }
    return arr;
  }, [profile]);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalPhotos = photos.length;
  const activePhoto = photos[activeIndex]?.url || profile?.closerPhoto?.url || "https://images.unsplash.com/photo-1554733998-0ddd4f28f5d0?w=800";
  const isActiveBlurred = photos[activeIndex]?.blurred === true;
  const goPrev = () => totalPhotos > 0 && setActiveIndex((i) => (i - 1 + totalPhotos) % totalPhotos);
  const goNext = () => totalPhotos > 0 && setActiveIndex((i) => (i + 1) % totalPhotos);
  const matchText = profile?.scoreDetail?.score ? `${profile.scoreDetail.score}% Match` : "";
  const profileId = String(profile?.id || profile?.userId || profile?._id || profile?.user?.userId || profile?.user?.id || id);
  // robust check: prefer parent `shortlistedIds` when provided, otherwise use localShortlisted
  const shortlistSource = Array.isArray(shortlistedIds) && shortlistedIds.length > 0 ? shortlistedIds.map((s) => String(s)) : localShortlisted;
  const isShortlisted = profileId && Array.isArray(shortlistSource)
    ? shortlistSource.some((sid) => String(sid) === String(profileId))
    : false;
  const isInCompare = profileId && Array.isArray(compareProfiles)
    ? compareProfiles.map((c) => String(c)).some((cid) => String(cid) === String(profileId))
    : false;
  const [optimisticInCompare, setOptimisticInCompare] = useState(false);
  const isUiInCompare = isInCompare || optimisticInCompare;

  // Keep optimistic flag in sync with authoritative parent state.
  // If parent reports the profile id in `compareProfiles`, clear optimistic flag.
  React.useEffect(() => {
    try {
      const cp = Array.isArray(compareProfiles) ? compareProfiles.map(String) : [];
      if (cp.includes(String(profileId))) {
        setOptimisticInCompare(false);
      }
    } catch (e) {
      // ignore
    }
  }, [compareProfiles, profileId]);

  // If parent has appended the full profile object into selectedCompareProfiles,
  // use that as a signal to show optimistic state immediately.
  React.useEffect(() => {
    try {
      const sc = Array.isArray(selectedCompareProfiles) ? selectedCompareProfiles.map(p => String(p?.id || p?.userId || p?._id)) : [];
      if (sc.includes(String(profileId))) {
        setOptimisticInCompare(true);
      }
    } catch (e) {
      // ignore
    }
  }, [selectedCompareProfiles, profileId]);

  // Debug logs to trace UI state when user interacts
  React.useEffect(() => {
    try {
      console.log('🔎 ProfileDetails state:', {
        profileId,
        optimisticInCompare,
        isInCompare,
        compareProfilesSnapshot: Array.isArray(compareProfiles) ? compareProfiles.map(String) : compareProfiles,
        selectedCompareProfilesSnapshot: Array.isArray(selectedCompareProfiles) ? selectedCompareProfiles.map(p => String(p?.id || p?.userId || p?._id)) : selectedCompareProfiles,
      });
    } catch (e) {
      // ignore
    }
  }, [optimisticInCompare, isInCompare, compareProfiles, selectedCompareProfiles, profileId]);
  
  // Determine if this is a sent or received request
  // Check both sentProfileIds array and profiles.sent array for reliability
  const isSentRequest = profileId && (
    sentProfileIds.includes(String(profileId)) ||
    profiles?.some(p => String(p.id) === String(profileId) && p.type === 'sent')
  );
  
  // Get status from profiles array if available, otherwise from profile data
  const profileFromList = profiles?.find(p => String(p.id) === String(profileId));
  const status = localStatus 
    ? localStatus 
    : (profileFromList?.status 
      ? String(profileFromList.status).toLowerCase() 
      : String(profile?.status || 'none').toLowerCase());

  const handleToggle = () => {
    const idStr = String(profileId);
    const currentlyShortlisted = Array.isArray(shortlistSource) ? shortlistSource.some((s) => String(s) === idStr) : false;

    if (typeof onToggleShortlist === "function") {
      // call parent's handler with id (preserve number if possible)
      const num = Number(profileId);
      const idToToggle = Number.isFinite(num) ? num : profileId;
      onToggleShortlist(idToToggle);
      // If we just added to shortlist (wasn't shortlisted before), navigate to the shortlist page
      if (!currentlyShortlisted) {
        try {
          if (typeof onNavigate === "function") onNavigate("shortlisted");
        } catch { }
        try {
          const prefix = (location?.pathname || "").startsWith("/dashboard") ? "/dashboard" : "/userdashboard";
          console.debug("ProfileDetails: navigating to shortlist at", `${prefix}/shortlisted`);
          navigate(`${prefix}/shortlisted`);
        } catch (e) {
          console.debug("ProfileDetails: navigate failed", e);
        }
      }
      return;
    }

    // Fallback: update localStorage and local state so the star still works when opened standalone
    try {
      const raw = localStorage.getItem("shortlisted_profiles") || "[]";
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed.map((s) => String(s)) : [];
      const exists = list.some((s) => s === idStr);
      const next = exists ? list.filter((s) => s !== idStr) : [...list, idStr];
      localStorage.setItem("shortlisted_profiles", JSON.stringify(next));
      setLocalShortlisted(next);
      if (!exists) {
        try {
          if (typeof onNavigate === "function") onNavigate("shortlisted");
        } catch { }
        try {
          const prefix = (location?.pathname || "").startsWith("/dashboard") ? "/dashboard" : "/userdashboard";
          console.debug("ProfileDetails: fallback navigate to", `${prefix}/shortlisted`);
          navigate(`${prefix}/shortlisted`);
        } catch (e) {
          console.debug("ProfileDetails: fallback navigate failed", e);
        }
      }
    } catch (e) {
      console.error("Failed to toggle shortlist in local fallback:", e);
    }
  }

  const handleBack = () => {
    navigate(-1);
  }

  // Build a minimal canonical profile object to pass to parent compare handler
  const getProfileForCompare = () => {
    if (!profile) return null;
    // Mirror the canonical id logic used in UserDashboard.getCanonicalId
    const pid = profile?.id || profile?.userId || profile?._id || profile?.user?.userId || profile?.user?.id || id;
    const user = profile?.user || profile;
    const name = `${user?.firstName || user?.name || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Unknown';
    return {
      id: String(pid),
      name,
      image: user?.closerPhoto?.url || user?.image || profile?.closerPhoto?.url || profile?.image || '',
      city: user?.city || profile?.personal?.city || profile?.city || '',
      profession: user?.occupation || user?.professional?.Occupation || profile?.professional?.Occupation || profile?.occupation || '',
      age: user?.age || profile?.age || null,
      religion: user?.religion || profile?.personal?.religion || profile?.religion || null,
      caste: user?.subCaste || profile?.personal?.subCaste || profile?.subCaste || null,
      education: user?.education || profile?.education || null,
      compatibility: profile?.scoreDetail?.score ?? profile?.compatibility ?? 0,
    };
  };

  // Centralized add-to-compare helper: prefer calling parent handler,
  // but if it's missing (undefined), dispatch a global event as a fallback
  const addToCompareHandler = async (id, profileObj = null) => {
    try {
      console.log('ProfileDetails: addToCompareHandler called', { id, hasParent: typeof onAddToCompare === 'function', hasGlobal: typeof window?.__satfera_handleAddToCompare === 'function' });
      if (typeof onAddToCompare === 'function') {
        console.log('ProfileDetails: calling parent onAddToCompare prop');
        return onAddToCompare(id, profileObj);
      }

      // Try global direct callable as a stronger fallback before trying API
      if (typeof window?.__satfera_handleAddToCompare === 'function') {
        try {
          console.log('ProfileDetails: calling window.__satfera_handleAddToCompare fallback');
          return window.__satfera_handleAddToCompare(id, profileObj);
        } catch (e) {
          console.warn('ProfileDetails: window.__satfera_handleAddToCompare failed', e);
        }
      }

      // As a last-resort, call the compare API directly so server state updates.
      try {
        const resp = await apiAddToCompare(id, compareProfiles);
        console.log('ProfileDetails: apiAddToCompare response', id, resp);
        if (resp && resp.success !== false) {
          // mark local optimistic flag so the button shows "In Compare" immediately
          setOptimisticInCompare(true);

          // Notify parent via global callable or event so it can sync its pools
          try {
            if (typeof window?.__satfera_handleAddToCompare === 'function') {
              window.__satfera_handleAddToCompare(id, profileObj || getProfileForCompare());
            } else {
              window.dispatchEvent(new CustomEvent('satfera:addToCompare', { detail: { id, profile: profileObj || getProfileForCompare() } }));
            }
          } catch (notifyErr) {
            console.warn('ProfileDetails: notification fallback failed', notifyErr);
          }

          // Persist durable pending record in case parent still misses it
          try {
            const key = 'satfera:pendingAddToCompare';
            const raw = localStorage.getItem(key) || '[]';
            const list = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
            list.push({ id: String(id), profile: profileObj || getProfileForCompare(), ts: Date.now() });
            localStorage.setItem(key, JSON.stringify(list));
          } catch (lsErr) {
            console.warn('ProfileDetails: failed to persist pending addToCompare', lsErr);
          }

          return resp;
        } else {
          console.warn('ProfileDetails: apiAddToCompare returned no success:', resp);
          try { toast.error(resp?.message || 'Failed to '); } catch (e) {}
          return resp;
        }
      } catch (apiErr) {
        console.error('ProfileDetails: apiAddToCompare error', apiErr);
        try { toast.error('Failed to add to compare'); } catch (e) {}
        // still try event + localStorage fallback so parent can pick it up
        try {
          window.dispatchEvent(new CustomEvent('satfera:addToCompare', { detail: { id, profile: profileObj } }));
        } catch (e) {}
        try {
          const key = 'satfera:pendingAddToCompare';
          const raw = localStorage.getItem(key) || '[]';
          const list = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
          list.push({ id: String(id), profile: profileObj || getProfileForCompare(), ts: Date.now() });
          localStorage.setItem(key, JSON.stringify(list));
        } catch (lsErr) {
          console.warn('ProfileDetails: failed to persist pending addToCompare after api error', lsErr);
        }
      }
    } catch (e) {
      console.error('ProfileDetails: addToCompareHandler error', e);
    }
  };

  // Helper wrappers that await parent handlers and manage optimistic UI
  const triggerAddToCompare = async (theId) => {
    const pid = String(theId);
    setOptimisticInCompare(true);
    try {
      if (typeof onAddToCompare === 'function') {
        const res = await onAddToCompare(pid, getProfileForCompare());
        return res;
      }
      // fallback to internal handler which may perform API + dispatch
      const res = await addToCompareHandler(pid, getProfileForCompare());
      return res;
    } catch (e) {
      console.error('triggerAddToCompare error', e);
      // revert optimistic on error
      setOptimisticInCompare(false);
      throw e;
    }
  };

  const triggerRemoveFromCompare = async (theId) => {
    const pid = String(theId);
    // optimistic remove
    setOptimisticInCompare(false);
    try {
      if (typeof onRemoveCompare === 'function') {
        const res = await onRemoveCompare(pid);
        return res;
      }
      if (typeof window?.__satfera_handleRemoveFromCompare === 'function') {
        return await window.__satfera_handleRemoveFromCompare(pid);
      }
      // fallback: call addToCompareHandler with remove through event
      return await addToCompareHandler(pid, getProfileForCompare());
    } catch (e) {
      console.error('triggerRemoveFromCompare error', e);
      // revert optimistic removal on error
      setOptimisticInCompare(true);
      throw e;
    }
  };

  // Centralized click handlers: only these update optimistic UI state.
  const handleAddClick = async () => {
    setOptimisticInCompare(true);
    try {
      await triggerAddToCompare(profileId);
    } catch (e) {
      console.warn('Add to compare failed', e);
      setOptimisticInCompare(false);
    }
  };

  const handleRemoveClick = async () => {
    setOptimisticInCompare(false);
    try {
      await triggerRemoveFromCompare(profileId);
    } catch (e) {
      console.warn('Remove compare failed', e);
      setOptimisticInCompare(true);
    }
  };

  const handleBlockToggle = async () => {
    if (isBlockingInProgress) return;
    
    const customId = profile?.customId;
    if (!customId) {
      toast.error('Unable to block: Profile ID not found');
      return;
    }

    const userName = profile?.personal?.firstName || 'User';
    
    setIsBlockingInProgress(true);
    try {
      if (isBlocked) {
        const response = await unblockUserProfile(customId);
        if (response?.success) {
          setIsBlocked(false);
          toast.success(`${userName} has been unblocked`);
        } else {
          toast.error(response?.message || 'Failed to unblock user');
        }
      } else {
        const response = await blockUserProfile(customId);
        if (response?.success) {
          setIsBlocked(true);
          toast.success(`${userName} has been blocked`);
        } else {
          toast.error(response?.message || 'Failed to block user');
        }
      }
    } catch (error) {
      console.error('Block/unblock error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsBlockingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f1e6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!loading && !profile) {
    return (
      <div className="min-h-screen bg-[#f6f1e6] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <p className="text-sm text-gray-500 mt-2">Profile ID: {id}</p>
          <button onClick={handleBack} className="mt-4 text-[#C8A227] hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="min-h-screen bg-[#f6f1e6] flex justify-center container">
        <div className="w-full px-6 py-4 space-y-4 relative">
          <button
            onClick={handleBack}
            className="w-24 flex items-center gap-2 text-[#C8A227] font-medium transition bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm hover:opacity-80"
          >
            <ChevronLeft size={20} className="text-[#C8A227]" />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">

            {/* 🔥 LEFT IMAGE SECTION — PERFECT FIX */}
            <div className="lg:col-span-1 space-y-4 ">

              <div className="rounded-[20px] sticky top-24">
                {/* Match Pill */}  
                


                <div className="w-full lg:w-[300px] lg:max-w-[300px] mx-auto relative lg:pr-4">
                  <span className="absolute top-4 left-4 z-30 bg-[#DDB84E] text-white text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
                  {matchText}
                </span>
                <div
                  onClick={handleToggle}
                  className="absolute top-4 right-4 z-30 rounded-full flex items-center justify-center shadow p-2"
                  aria-label="Shortlist"
                >
                  {isShortlisted ? (
                    <Star size={20} className="text-[#DDB84E] fill-[#DDB84E]" />
                  ) : (
                    <Star size={20} className="text-[#C8A227]" />
                  )}
                </div>
                  <div className="relative">
                    {totalPhotos > 0 && (
                      <span className="absolute z-30 bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        {activeIndex + 1}/{totalPhotos}
                      </span>
                    )}
                    <img
                      src={activePhoto}
                      alt={profile?.name}
                      className="w-full h-[360px] md:h-[420px] lg:h-[430px] object-cover rounded-2xl shadow-lg border border-gray-200"
                    />
                    {/* {totalPhotos > 1 && (
                      // <>
                      //   <button type="button" onClick={goPrev} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full  text-white grid place-items-center shadow-lg transition-all text-2xl font-bold">‹</button>
                      //   <button type="button" onClick={goNext} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full text-white grid place-items-center shadow-lg transition-all text-2xl font-bold">›</button>
                      // </>
                    )} */}
                  </div>
                </div>
                {photos.length > 1 && (
                  <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1 px-1">
                    {photos.map((p, idx) => {
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={`${p.url}-${idx}`}
                          onClick={() => setActiveIndex(idx)}
                          className={`relative shrink-0 size-20 rounded-xl overflow-hidden border transition-all duration-150 flex items-center justify-center bg-white ${isActive ? 'border-[#DDB84E] ring-2 ring-[#DDB84E]/40 shadow-md' : 'border-gray-200 hover:border-[#DDB84E]/60'}`}
                          aria-label={`Thumbnail ${idx + 1}`}
                          title={p.label || `Photo ${idx + 1}`}
                        >
                          <img
                            src={p.url}
                            alt={p.label || `Photo ${idx + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover  'blur-sm scale-105' : ''}`}
                            loading="lazy"
                          />
                          {/* {p.blurred && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="text-xs font-medium text-white bg-black/50 px-2 py-0.5 rounded-full">Blurred</span>
                            </div>
                          )} */}
                          {isActive && (
                            <span className="absolute -top-1 -right-1 bg-[#DDB84E] text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">Active</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-7">
              {/* 🔝 Header */}
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 w-full overflow-hidden">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-3xl font-semibold text-[#222] leading-tight">
                      {profile?.firstName || "—"} {profile?.middleName ? profile.middleName + " " : ""}{profile?.lastName || ""}
                    </h2>
                    <img 
                      src="/badge.png" 
                      alt="Verified" 
                      className="w-6 h-6 object-contain"
                      title="Verified Profile"
                    />
                  </div>
                  <p className="text-[#5C5C5C] text-[15px] leading-relaxed">
                    {profile?.age || "—"} years • {capitalize(profile?.gender)} • {profile?.personal?.city || "—"}, {profile?.personal?.state || "—"} • {profile?.professional?.Occupation || "—"}
                  </p>
                  {(profile?.email || profile?.phoneNumber) && (
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                      {profile?.email && (
                        <div className="flex items-center gap-1">
                          <MessageCircle size={14} />
                          <span>{profile.email}</span>
                        </div>
                      )}
                      {profile?.phoneNumber && (
                        <div className="flex items-center gap-1">
                          <span>📱</span>
                          <span>{profile.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {profile?.customId && (
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        ID: {profile.customId}
                      </span>
                    </div>
                  )}
                  <hr className="my-3 border-gray-200" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 text-center text-sm">
                    <div>
                      <p className="text-gray-500">Height</p>
                      <p className="font-semibold">{profile?.personal?.height || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Religion</p>
                      <p className="font-semibold">{profile?.personal?.religion || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Education</p>
                      <p className="font-semibold">{profile?.education?.HighestEducation || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Diet</p>
                      <p className="font-semibold">{profile?.healthAndLifestyle?.diet || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* 🪪 Personal Details */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <User className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">Personal Details</h3>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    {/* Row 1 */}
                    {profile?.gender && (
                      <div className="flex items-start gap-2">
                        <User className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Gender</p>
                          <p className="font-semibold text-[#222]">{capitalize(profile.gender)}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 2 */}
                    {profile?.dateOfBirth && (
                      <div className="flex items-start gap-2">
                        <Calendar className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Date of Birth</p>
                          <p className="font-semibold text-[#222]">{new Date(profile.dateOfBirth).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    {profile?.dateOfBirth && (
                      <div className="flex items-start gap-2">
                        <Clock className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Age</p>
                          <p className="font-semibold text-[#222]">{formatAgeFromDob(profile.dateOfBirth)}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.birthPlace && profile?.personal?.birthState && (
                      <div className="flex items-start gap-2">
                        <MapPin className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Birthplace</p>
                          <p className="font-semibold text-[#222]">{profile.personal.birthPlace}, {profile.personal.birthState}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 3 */}
                    {profile?.personal?.timeOfBirth && (
                      <div className="flex items-start gap-2">
                        <AlarmClock className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Time of Birth</p>
                          <p className="font-semibold text-[#222]">{profile.personal.timeOfBirth}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.marriedStatus && (
                      <div className="flex items-start gap-2">
                        <Calendar className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Marital Status</p>
                          <p className="font-semibold text-[#222]">{profile.personal.marriedStatus}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 4 */}
                    {profile?.personal?.height && (
                      <div className="flex items-start gap-2">
                        <Ruler className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Height</p>
                          <p className="font-semibold text-[#222]">{profile.personal.height}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.weight && (
                      <div className="flex items-start gap-2">
                        <Weight className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Weight</p>
                          <p className="font-semibold text-[#222]">{profile.personal.weight}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 5 */}
                    {profile?.personal?.complexion && (
                      <div className="flex items-start gap-2">
                        <User className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Complexion</p>
                          <p className="font-semibold text-[#222]">{capitalize(profile.personal.complexion)}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.hasChildren !== undefined && (
                      <div className="flex items-start gap-2">
                        <User className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Has Children</p>
                          <p className="font-semibold text-[#222]">{profile.personal.hasChildren ? "Yes" : "No"}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 6 */}
                    {profile?.personal?.divorceStatus && (
                      <div className="flex items-start gap-2">
                        <Calendar className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Divorce Status</p>
                          <p className="font-semibold text-[#222]">{capitalize(profile.personal.divorceStatus)}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.motherTongue && (
                      <div className="flex items-start gap-2">
                        <MessageCircle className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Mother Tongue</p>
                          <p className="font-semibold text-[#222]">{capitalize(profile.personal.motherTongue)}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 7 */}
                    {profile?.personal?.religion && (
                      <div className="flex items-start gap-2">
                        <Heart className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Religion</p>
                          <p className="font-semibold text-[#222]">{capitalize(profile.personal.religion)}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.caste && (
                      <div className="flex items-start gap-2">
                        <User className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Caste</p>
                          <p className="font-semibold text-[#222]">{capitalize(profile.personal.caste)}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 8 */}
                    {profile?.personal?.subCaste && (
                      <div className="flex items-start gap-2">
                        <User className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Subcaste</p>
                          <p className="font-semibold text-[#222]">{profile.personal.subCaste}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.astrologicalSign && (
                      <div className="flex items-start gap-2">
                        <Moon className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Astrological Sign</p>
                          <p className="font-semibold text-[#222]">{profile.personal.astrologicalSign}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 9 */}
                    {profile?.personal?.dosh && (
                      <div className="flex items-start gap-2">
                        <Sparkles className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Dosh Information</p>
                          <p className="font-semibold text-[#222]">{profile.personal.dosh}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.marryToOtherReligion !== undefined && (
                      <div className="flex items-start gap-2">
                        <Heart className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Open to Other Religion</p>
                          <p className="font-semibold text-[#222]">{profile.personal.marryToOtherReligion ? "Yes" : "No"}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 10 */}
                    {profile?.personal?.nationality && (
                      <div className="flex items-start gap-2">
                        <MapPin className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Nationality</p>
                          <p className="font-semibold text-[#222]">{profile.personal.nationality}</p>
                        </div>
                      </div>
                    )}
                    {profile?.personal?.country && (
                      <div className="flex items-start gap-2">
                        <MapPin className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Country</p>
                          <p className="font-semibold text-[#222]">{profile.personal.country}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 11 */}
                    {profile?.personal?.city && profile?.personal?.state && (
                      <div className="flex items-start gap-2">
                        <MapPin className="text-[#C8A227]" size={18} />
                        <div>
                          <p className="text-gray-500 text-[13px]">Current Location</p>
                          <p className="font-semibold text-[#222]">{profile.personal.city}, {profile.personal.state}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 👨‍👩‍👧 Family Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <User className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">Family Details</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {/* Father's Details Column */}
                    <div className="space-y-3">
                      {profile?.family?.fatherName && (
                        <div>
                          <p className="text-gray-500">Father's Name</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.fatherName)}</p>
                        </div>
                      )}
                      
                      {profile?.family?.fatherOccupation && (
                        <div>
                          <p className="text-gray-500">Father's Occupation</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.fatherOccupation)}</p>
                        </div>
                      )}
                      
                      {profile?.family?.fatherNativePlace && (
                        <div>
                          <p className="text-gray-500">Father's Native Place</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.fatherNativePlace)}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Mother's Details Column */}
                    <div className="space-y-3">
                      {profile?.family?.motherName && (
                        <div>
                          <p className="text-gray-500">Mother's Name</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.motherName)}</p>
                        </div>
                      )}
                      
                      {profile?.family?.motherOccupation && (
                        <div>
                          <p className="text-gray-500">Mother's Occupation</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.motherOccupation)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Grandparents Row */}
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-6">
                    <div className="space-y-3">
                      {profile?.family?.grandFatherName && (
                        <div>
                          <p className="text-gray-500">Paternal Grandfather</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.grandFatherName)}</p>
                        </div>
                      )}
                      
                      {profile?.family?.nanaName && (
                        <div>
                          <p className="text-gray-500">Maternal Grandfather</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.nanaName)}</p>
                        </div>
                      )}
                      
                      {profile?.family?.nanaNativePlace && (
                        <div>
                          <p className="text-gray-500">Nana's Native Place</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.nanaNativePlace)}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {profile?.family?.grandMotherName && (
                        <div>
                          <p className="text-gray-500">Paternal Grandmother</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.grandMotherName)}</p>
                        </div>
                      )}
                      
                      {profile?.family?.naniName && (
                        <div>
                          <p className="text-gray-500">Maternal Grandmother</p>
                          <p className="font-medium text-[#222]">{capitalize(profile.family.naniName)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Family Type */}
                  {profile?.family?.familyType && (
                    <div className="mt-6 text-sm">
                      <p className="text-gray-500">Family Type</p>
                      <p className="font-medium text-[#222]">{capitalize(profile.family.familyType)}</p>
                    </div>
                  )}
                  
                  {/* Siblings */}
                  {profile?.family?.siblings !== undefined && (
                    <div className="mt-6 text-sm">
                      <p className="text-gray-500">Number of Siblings</p>
                      <p className="font-medium text-[#222]">{profile.family.siblings}</p>
                    </div>
                  )}
                  
                  {profile?.family?.siblingDetails && profile.family.siblingDetails.length > 0 && (
                    <div className="mt-6">
                      <p className="text-gray-500 font-semibold mb-3">Sibling Details</p>
                      <div className="space-y-3">
                        {profile.family.siblingDetails.map((sibling, index) => (
                          <div key={index} className="bg-[#f6f1e7] p-3 rounded-lg">
                            <p className="font-medium text-[#222]">{capitalize(sibling.name)}</p>
                            <p className="text-sm text-gray-600">{capitalize(sibling.relation)} • {capitalize(sibling.maritalStatus)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🎓 Education Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">
                      Education Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {profile?.education?.SchoolName && (
                      <div>
                        <p className="text-gray-500">School</p>
                        <p className="font-semibold text-[#222]">
                          {profile?.education?.SchoolName}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-gray-500">Highest Qualification</p>
                      <p className="font-semibold text-[#222]">{profile?.education?.HighestEducation || "—"}</p>
                    </div>

                    {profile?.education?.University && (
                      <div>
                        <p className="text-gray-500">University / College</p>
                        <p className="font-semibold text-[#222]">
                          {profile?.education?.University}
                        </p>
                      </div>
                    )}

                    {profile?.education?.FieldOfStudy && (
                      <div>
                        <p className="text-gray-500">Field of Study</p>
                        <p className="font-semibold text-[#222]">{profile?.education?.FieldOfStudy}</p>
                      </div>
                    )}

                    {profile?.education?.CountryOfEducation && (
                      <div>
                        <p className="text-gray-500">Country of Education</p>
                        <p className="font-semibold text-[#222]">{profile?.education?.CountryOfEducation}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 💼 Professional Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">
                      Professional Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="text-gray-500">Employment Status</p>
                      <p className="font-semibold text-[#222]">{capitalize(profile?.professional?.EmploymentStatus)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Company</p>
                      <p className="font-semibold text-[#222]">
                        {profile?.professional?.OrganizationName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Job Title</p>
                      <p className="font-semibold text-[#222]">{profile?.professional?.Occupation || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Annual Income</p>
                      <p className="font-semibold text-[#222]">{profile?.professional?.AnnualIncome || "Not Disclosed"}</p>
                    </div>
                  </div>
                </div>

                {/* ❤️ Health & Lifestyle */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">Health & Lifestyle</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="text-gray-500">Alcohol</p>
                      <p className="font-semibold text-[#222]">{capitalize(profile?.healthAndLifestyle?.isAlcoholic)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tobacco</p>
                      <p className="font-semibold text-[#222]">{capitalize(profile?.healthAndLifestyle?.isTobaccoUser)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tattoos</p>
                      <p className="font-semibold text-[#222]">{capitalize(profile?.healthAndLifestyle?.isHaveTattoos)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Diet</p>
                      <p className="font-semibold text-[#222]">{capitalize(profile?.healthAndLifestyle?.diet)}</p>
                    </div>
                  </div>
                </div>
              </div>


              <div className="bg-white rounded-[20px] p-6 satfera-shadow sticky bottom-4 border border-gold-light">
                <div className="flex flex-col sm:flex-row gap-3">
                  {status === 'none' && (
                    <>
                      {onSendRequest && (
                        <Button
                          onClick={() => onSendRequest(profileId)}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          Send Request
                        </Button>
                      )}
                      {isUiInCompare ? (
                        <Button
                          onClick={handleRemoveClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemoveClick();
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAddClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleAddClick();
                            }
                          }}
                          className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
                        >
                          Add to Compare
                        </Button>
                      )}
                    </>
                  )}

                  {status === 'pending' && isSentRequest && onWithdraw && (
                    <>
                      <Button
                        onClick={async () => {
                          await onWithdraw(profileId);
                          setLocalStatus('withdrawn');
                        }}
                        className="flex-1 bg-[#f6f1e7] hover:text-white hover:bg-[#d95655] border-2 border-[#d64545] text-[#d95655] rounded-[8px] h-12"
                      >
                        Withdraw Request
                      </Button>

                      {isUiInCompare ? (
                        <Button
                          onClick={handleRemoveClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemoveClick();
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAddClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleAddClick();
                            }
                          }}
                          className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
                        >
                          Add to Compare
                        </Button>
                      )}
                    </>
                  )}

                  {status === 'withdrawn' && (
                    <Button
                      className="flex-1 bg-[#b53b3b] text-white rounded-[8px] h-12 opacity-90 cursor-default"
                      disabled
                    >
                      Withdrawn
                    </Button>
                  )}

                  {status === 'rejected' && (
                    <>
                      {isUiInCompare ? (
                        <Button
                          onClick={handleRemoveClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemoveClick();
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAddClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleAddClick();
                            }
                          }}
                          className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
                        >
                          Add to Compare
                        </Button>
                      )}
                    </>
                  )}

                  {status === 'pending' && !isSentRequest && onAccept && onReject && (
                    <>
                      <Button
                        onClick={() => onAccept(profileId)}
                        className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                      >
                        Accept
                      </Button>

                      <Button
                        onClick={() => onReject(profileId)}
                        className="flex-1 bg-[#f6f1e7] hover:text-white hover:bg-[#d95655] border-2 border-[#d64545] text-[#d95655] rounded-[8px] h-12"
                      >
                        Reject
                      </Button>

                      {isUiInCompare ? (
                        <Button
                          onClick={handleRemoveClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemoveClick();
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAddClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleAddClick();
                            }
                          }}
                          className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
                        >
                          Add to Compare
                        </Button>
                      )}
                    </>
                  )}

                  {status === 'accepted' && (
                    <>
                      <Button
                        onClick={() => setPremiumModal(true)}
                        className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12 flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Chat
                      </Button>
                      
                      {isUiInCompare ? (
                        <Button
                          onClick={handleRemoveClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemoveClick();
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAddClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleAddClick();
                            }
                          }}
                          className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
                        >
                          Add to Compare
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div >
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
      <div className="text-center text-gray-500 text-lg">
        Select a profile to view details.
      </div>
    </div>
  );
}


