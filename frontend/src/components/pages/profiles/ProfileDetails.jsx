import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getViewProfiles, addToCompare as apiAddToCompare, blockUserProfile, unblockUserProfile } from "../../../api/auth";
import { Clock, MapPin, Ruler, Weight, User, Heart, GraduationCap, MessageCircle, Briefcase, Calendar, ChevronLeft, Star, Mail, Phone } from "lucide-react";
import { Button } from "../../../components/ui/button";
import toast from "react-hot-toast";
export function ProfileDetails({
  profiles,
  sentProfileIds = [],
  shortlistedIds = [],
  onToggleShortlist,
  compareProfiles = [],
  onAddToCompare,
  onRemoveCompare,
  onSendRequest,
  onWithdraw,
  onAccept,
  onReject
}) {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockingInProgress, setIsBlockingInProgress] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [optimisticInCompare, setOptimisticInCompare] = useState(false);
  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState(null);
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    async function fetchProfileWithRetry() {
      if (!id) return;
      if (isMounted) setLoading(true);
      let response;
      while (retryCount < 3 && isMounted) {
        response = await getViewProfiles(id);
        if (response?.success && response?.data) {
          if (isMounted) {
            setProfile(response.data);
            setLoading(false);
          }
          return;
        } else if (response?.message?.includes("timeout")) {
          retryCount++;
          if (isMounted) {
            await new Promise(res => setTimeout(res, 1000 * retryCount));
          }
        } else {
          break;
        }
      }
      if (isMounted) {
        setProfile(null);
        setLoading(false);
      }
    }
    fetchProfileWithRetry();
    return () => {
      isMounted = false;
    };
  }, [id]);
  useEffect(() => {
    try {
      const cp = Array.isArray(compareProfiles) ? compareProfiles.map(String) : [];
      if (cp.includes(String(profileId))) {
        setOptimisticInCompare(false);
      }
    } catch (e) {}
  }, [compareProfiles]);
  const capitalize = useCallback(str => {
    if (!str) return "—";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }, []);
  const getAgeParts = useCallback(dob => {
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
      return {
        years,
        months,
        days
      };
    } catch {
      return null;
    }
  }, []);
  const formatAgeFromDob = useCallback(dob => {
    const parts = getAgeParts(dob);
    if (!parts) return "—";
    const out = [];
    if (parts.years > 0) out.push(`${parts.years} year${parts.years !== 1 ? "s" : ""}`);
    if (parts.months > 0) out.push(`${parts.months} month${parts.months !== 1 ? "s" : ""}`);
    if (parts.days > 0 || out.length === 0) out.push(`${parts.days} day${parts.days !== 1 ? "s" : ""}`);
    return out.join(" ");
  }, [getAgeParts]);
  const profileId = useMemo(() => String(profile?.id || profile?.userId || profile?._id || profile?.user?.userId || profile?.user?.id || id), [profile, id]);
  const photos = useMemo(() => {
    const arr = [];
    if (profile?.closerPhoto?.url) arr.push({
      url: profile.closerPhoto.url,
      label: "Close-up Portrait",
      ratio: 1 // 600x600
    });
    if (profile?.personalPhoto?.url) {
      arr.push({
        url: profile.personalPhoto.url,
        label: "Full Body",
        ratio: 4 / 5, // 1080x1350
        blurred: !!profile?.personalPhoto?.isBlurred
      });
    }
    if (Array.isArray(profile?.personalPhotos)) {
      profile.personalPhotos.forEach(p => {
        if (p?.url) arr.push({
          url: p.url,
          label: "Full Body",
          ratio: 4 / 5, // 1080x1350
          blurred: !!p?.isBlurred
        });
      });
    }
    if (profile?.familyPhoto?.url) arr.push({
      url: profile.familyPhoto.url,
      label: "Family",
      ratio: 4 / 3, // 1600x1200
      blurred: !!profile?.familyPhoto?.isBlurred
    });
    if (Array.isArray(profile?.otherPhotos)) {
      profile.otherPhotos.forEach(p => {
        if (p?.url) arr.push({
          url: p.url,
          label: p.title || "Additional Photo",
          ratio: 1, // 1200x1200
          blurred: !!p?.isBlurred
        });
      });
    }
    return arr;
  }, [profile]);
  const shortlistSource = useMemo(() => Array.isArray(shortlistedIds) && shortlistedIds.length > 0 ? shortlistedIds.map(s => String(s)) : [], [shortlistedIds]);
  const isShortlisted = useMemo(() => profileId && Array.isArray(shortlistSource) ? shortlistSource.some(sid => String(sid) === String(profileId)) : false, [profileId, shortlistSource]);
  const isInCompare = useMemo(() => profileId && Array.isArray(compareProfiles) ? compareProfiles.map(c => String(c)).some(cid => String(cid) === String(profileId)) : false, [profileId, compareProfiles]);
  const isUiInCompare = isInCompare || optimisticInCompare;
  const profileFromList = useMemo(() => profiles?.find(p => String(p.id) === String(profileId)), [profiles, profileId]);
  const status = useMemo(() => profileFromList?.status ? String(profileFromList.status).toLowerCase() : String(profile?.status || "none").toLowerCase(), [profileFromList, profile?.status]);
  const canShowFullAddress = useMemo(() => ["accepted", "approved"].includes(status), [status]);
  const isSentRequest = useMemo(() => profileId && (sentProfileIds.includes(String(profileId)) || profiles?.some(p => String(p.id) === String(profileId) && p.type === "sent")), [profileId, sentProfileIds, profiles]);
  const matchText = useMemo(() => profile?.scoreDetail?.score ? `${profile.scoreDetail.score}% Match` : "", [profile?.scoreDetail?.score]);
  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleToggle = useCallback(() => {
    const idStr = String(profileId);
    const currentlyShortlisted = Array.isArray(shortlistSource) ? shortlistSource.some(s => String(s) === idStr) : false;
    if (typeof onToggleShortlist === "function") {
      const num = Number(profileId);
      const idToToggle = Number.isFinite(num) ? num : profileId;
      onToggleShortlist(idToToggle);
      if (!currentlyShortlisted) {
        const prefix = (location?.pathname || "").startsWith("/dashboard") ? "/dashboard" : "/userdashboard";
        navigate(`${prefix}/shortlisted`);
      }
    }
  }, [profileId, shortlistSource, onToggleShortlist, location?.pathname, navigate]);
  const getProfileForCompare = useCallback(() => {
    if (!profile) return null;
    const pid = profile?.id || profile?.userId || profile?._id || profile?.user?.userId || profile?.user?.id || id;
    const user = profile?.user || profile;
    const name = `${user?.firstName || user?.name || ""} ${user?.lastName || ""}`.trim() || user?.name || "Unknown";
    return {
      id: String(pid),
      name,
      image: user?.closerPhoto?.url || user?.image || profile?.closerPhoto?.url || profile?.image || "",
      city: user?.city || profile?.personal?.city || profile?.city || "",
      profession: user?.occupation || user?.professional?.Occupation || profile?.professional?.Occupation || profile?.occupation || "",
      age: user?.age || profile?.age || null,
      religion: user?.religion || profile?.personal?.religion || profile?.religion || null,
      caste: user?.subCaste || profile?.personal?.subCaste || profile?.subCaste || null,
      education: user?.education || profile?.education || null,
      compatibility: profile?.scoreDetail?.score ?? profile?.compatibility ?? 0
    };
  }, [profile, id]);
  const addToCompareHandler = useCallback(async (selectedId, profileObj = null) => {
    try {
      if (typeof onAddToCompare === "function") {
        return onAddToCompare(selectedId, profileObj);
      }
      const resp = await apiAddToCompare(selectedId, compareProfiles);
      if (resp?.success !== false) {
        setOptimisticInCompare(true);
        try {
          window.dispatchEvent(new CustomEvent("satfera:addToCompare", {
            detail: {
              id: selectedId,
              profile: profileObj || getProfileForCompare()
            }
          }));
        } catch (e) {}
      } else {
        toast.error(resp?.message || "Failed to add to compare");
      }
      return resp;
    } catch (e) {
      console.error("Add to compare error:", e);
      toast.error("Failed to add to compare");
    }
  }, [onAddToCompare, compareProfiles, getProfileForCompare]);
  const triggerAddToCompare = useCallback(async theId => {
    setOptimisticInCompare(true);
    try {
      if (typeof onAddToCompare === "function") {
        return onAddToCompare(theId, getProfileForCompare());
      }
      return await addToCompareHandler(theId, getProfileForCompare());
    } catch (e) {
      console.error("Add to compare error:", e);
      setOptimisticInCompare(false);
      throw e;
    }
  }, [onAddToCompare, getProfileForCompare, addToCompareHandler]);
  const triggerRemoveFromCompare = useCallback(async theId => {
    setOptimisticInCompare(false);
    try {
      if (typeof onRemoveCompare === "function") {
        return onRemoveCompare(theId);
      }
      return await addToCompareHandler(theId, getProfileForCompare());
    } catch (e) {
      console.error("Remove from compare error:", e);
      setOptimisticInCompare(true);
      throw e;
    }
  }, [onRemoveCompare, getProfileForCompare, addToCompareHandler]);
  const handleAddClick = useCallback(async () => {
    setOptimisticInCompare(true);
    try {
      await triggerAddToCompare(profileId);
    } catch (e) {
      console.warn("Add to compare failed:", e);
      setOptimisticInCompare(false);
    }
  }, [profileId, triggerAddToCompare]);
  const handleRemoveClick = useCallback(async () => {
    setOptimisticInCompare(false);
    try {
      await triggerRemoveFromCompare(profileId);
    } catch (e) {
      console.warn("Remove from compare failed:", e);
      setOptimisticInCompare(true);
    }
  }, [profileId, triggerRemoveFromCompare]);
  const handleBlockToggle = useCallback(async () => {
    if (isBlockingInProgress) return;
    const customId = profile?.customId;
    if (!customId) {
      toast.error("Unable to block: Profile ID not found");
      return;
    }
    const userName = profile?.personal?.firstName || "User";
    setIsBlockingInProgress(true);
    try {
      if (isBlocked) {
        const response = await unblockUserProfile(customId);
        if (response?.success) {
          setIsBlocked(false);
          toast.success(`${userName} has been unblocked`);
        } else {
          toast.error(response?.message || "Failed to unblock user");
        }
      } else {
        const response = await blockUserProfile(customId);
        if (response?.success) {
          setIsBlocked(true);
          toast.success(`${userName} has been blocked`);
        } else {
          toast.error(response?.message || "Failed to block user");
        }
      }
    } catch (error) {
      console.error("Block/unblock error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsBlockingInProgress(false);
    }
  }, [isBlocked, isBlockingInProgress, profile?.customId, profile?.personal?.firstName]);
  if (loading) {
    return <div className="min-h-screen bg-[#f6f1e6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>;
  }
  if (!profile) {
    return <div className="min-h-screen bg-[#f6f1e6] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <p className="text-sm text-gray-500 mt-2">Profile ID: {id}</p>
          <button onClick={handleBack} className="mt-4 text-[#C8A227] hover:underline">
            Go Back
          </button>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-[#f6f1e6] flex justify-center container">
      <div className="w-full px-6 py-4 space-y-4 relative">
        <button onClick={handleBack} className="w-24 flex items-center gap-2 text-[#C8A227] font-medium transition bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm hover:opacity-80">
          <ChevronLeft size={20} className="text-[#C8A227]" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:gap-8">
          {}
          <div className="w-full max-w-[320px]">
            <PhotoSection photos={photos} activeIndex={activeIndex} setActiveIndex={setActiveIndex} matchText={matchText} isShortlisted={isShortlisted} onToggleShortlist={handleToggle} profile={profile} onPhotoClick={() => setFullscreenPhotoIndex(activeIndex)} />
          </div>

          {}
          <div className="min-w-0 space-y-7">
            <HeaderSection profile={profile} capitalize={capitalize} />
            <PersonalDetailsSection profile={profile} capitalize={capitalize} formatAgeFromDob={formatAgeFromDob} canShowFullAddress={canShowFullAddress} />
            <FamilyDetailsSection profile={profile} capitalize={capitalize} />
            <EducationDetailsSection profile={profile} />
            <ProfessionalDetailsSection profile={profile} capitalize={capitalize} />
            <HealthLifestyleSection profile={profile} capitalize={capitalize} />
            <ActionButtonsSection status={status} profileId={profileId} isSentRequest={isSentRequest} isUiInCompare={isUiInCompare} onSendRequest={onSendRequest} onWithdraw={onWithdraw} onAccept={onAccept} onReject={onReject} onAddClick={handleAddClick} onRemoveClick={handleRemoveClick} />
          </div>
        </div>

      
        {fullscreenPhotoIndex !== null && photos[fullscreenPhotoIndex] && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreenPhotoIndex(null)}>
            <div className="relative flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {/* Close button */}
              <button
                onClick={() => setFullscreenPhotoIndex(null)}
                className="absolute top-4 right-4 z-50 bg-white text-black rounded-full p-2 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

       
              <div
                className="flex items-center justify-center max-w-2xl max-h-[70vh]"
                style={{ aspectRatio: photos[fullscreenPhotoIndex]?.ratio || "4/5" }}
              >
                <img
                  src={photos[fullscreenPhotoIndex]?.url}
                  alt={photos[fullscreenPhotoIndex]?.label}
                  className="w-full h-full object-contain"
                />
              </div>

           
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setFullscreenPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1))}
                    className="absolute -left-12 top-1/2 transform -translate-y-1/2 z-50 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setFullscreenPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1))}
                    className="absolute -right-12 top-1/2 transform -translate-y-1/2 z-50 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                
                  <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs">
                    {fullscreenPhotoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>;
}
function PhotoSection({
  photos,
  activeIndex,
  setActiveIndex,
  matchText,
  isShortlisted,
  onToggleShortlist,
  profile,
  onPhotoClick
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const totalPhotos = photos.length;
  const activePhoto = photos[activeIndex]?.url || profile?.closerPhoto?.url || "https://images.unsplash.com/photo-1554733998-0ddd4f28f5d0?w=800";
  return <div className="lg:col-span-1 space-y-4">
      <div className="rounded-[20px] sticky top-24">
        <div className="w-full items-center md:w-[280px] lg:w-[300px] max-w-[300px] mx-auto relative lg:pr-4">
          <span className="absolute top-4 left-4 z-30 bg-[#DDB84E] text-white text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
            {matchText}
          </span>
          <button onClick={onToggleShortlist} className="absolute top-4 w-12 right-4 z-30 rounded-full flex items-center justify-center bg-transparent hover:scale-110 transition-transform active:scale-95 p-2 md:p-2 sm:p-3" aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"} title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}>
            {isShortlisted ? <Star size={24} className="text-[#DDB84E] fill-[#DDB84E] sm:size-[20px]" /> : <Star size={24} className="text-[#C8A227] sm:size-[20px]" />}
          </button>
          <div
            className="relative cursor-pointer hover:opacity-90 transition-opacity md:h-[420px] lg:h-[430px]"
            style={isMobile ? {
            aspectRatio: photos[activeIndex]?.ratio || "4/5"
          } : {}}
            onClick={onPhotoClick}
          >
            {totalPhotos > 0 && <span className="absolute z-30 bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {activeIndex + 1}/{totalPhotos}
              </span>}
            <img
              src={activePhoto}
              alt="Profile"
              className="w-full h-full object-cover rounded-2xl shadow-lg border border-gray-200"
            />
          </div>
        </div>

        {photos.length > 1 && <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1 px-1">
            {photos.map((p, idx) => {
          const isActive = idx === activeIndex;
          return <button key={`${p.url}-${idx}`} onClick={() => setActiveIndex(idx)} className={`relative shrink-0 size-20 rounded-xl overflow-hidden border transition-all duration-150 flex items-center justify-center bg-white ${isActive ? "border-[#DDB84E] ring-2 ring-[#DDB84E]/40 shadow-md" : "border-gray-200 hover:border-[#DDB84E]/60"}`} aria-label={`Thumbnail ${idx + 1}`}>
                  <img src={p.url} alt={p.label || `Photo ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  {isActive && <span className="absolute -top-1 -right-1 bg-[#DDB84E] text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">
                      Active
                    </span>}
                </button>;
        })}
          </div>}
      </div>
    </div>;
}
function HeaderSection({
  profile,
  capitalize
}) {
  return <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-3xl font-semibold text-[#222]">
            {profile?.firstName || "—"}{" "}
            {profile?.middleName ? `${profile.middleName} ` : ""}
            {profile?.lastName || ""}
          </h2>
          <img src="/badge.png" alt="Verified" className="w-6 h-6" />
        </div>
        <p className="text-[#5C5C5C] text-[15px]">
          {profile?.age || "—"} Years • {capitalize(profile?.gender)} •{" "}
          {capitalize(profile?.personal?.city) || "—"},{" "}
          {capitalize(profile?.personal?.state) || "—"} •{" "}
          {capitalize(profile?.professional?.Occupation) || "—"}
        </p>
        {(profile?.email || profile?.phoneNumber) && <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
            {profile?.email && <div className="flex items-center gap-1">
                <Mail size={14} className="text-[#C8A227]" />
                {profile.email}
              </div>}
            {profile?.phoneNumber && <div className="flex items-center gap-1">
                <Phone size={14} className="text-[#C8A227]" />
                {profile.phoneNumber}
              </div>}
          </div>}
        {profile?.customId && <div className="text-sm text-gray-500 mt-1">
            <span className="bg-gray-100 px-2 py-1 rounded">
              ID: {profile.customId}
            </span>
          </div>}
        <hr className="my-3 border-gray-200" />
        <div className="grid grid-cols-2 sm:grid-cols-4 text-center text-sm">
          <StatItem label="Height" value={profile?.personal?.height} />
          <StatItem label="Religion" value={profile?.personal?.religion} />
          <StatItem label="Education" value={profile?.education?.HighestEducation} />
          <StatItem label="Diet" value={capitalize(profile?.healthAndLifestyle?.diet)} />
        </div>
      </div>
    </div>;
}
function StatItem({
  label,
  value
}) {
  return <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-semibold text-sm">{value || "—"}</p>
    </div>;
}
function DetailRow({
  icon,
  label,
  value
}) {
  return <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="text-gray-500 text-[13px]">{label}</p>
        <p className="font-semibold text-[#222]">{value}</p>
      </div>
    </div>;
}
function PersonalDetailsSection({
  profile,
  capitalize,
  formatAgeFromDob,
  canShowFullAddress
}) {
  const fullAddress = profile?.personal?.full_address;
  const formattedFullAddress = useMemo(() => {
    if (!fullAddress) return null;
    const parts = [fullAddress.street1, fullAddress.street2, fullAddress.city, fullAddress.state, fullAddress.zipCode].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }, [fullAddress]);
  return <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
        <User className="text-[#C8A227]" size={20} />
        Personal Details
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
        {(profile?.gender || profile?.personal?.gender) && <DetailRow icon={<User className="text-[#C8A227]" size={18} />} label="Gender" value={capitalize(profile?.gender || profile?.personal?.gender)} />}
        {(profile?.dateOfBirth || profile?.personal?.dateOfBirth) && <>
            <DetailRow icon={<Calendar className="text-[#C8A227]" size={18} />} label="Date of Birth" value={new Date(profile?.dateOfBirth || profile?.personal?.dateOfBirth).toLocaleDateString()} />
            <DetailRow icon={<Clock className="text-[#C8A227]" size={18} />} label="Age" value={formatAgeFromDob(profile?.dateOfBirth || profile?.personal?.dateOfBirth)} />
          </>}
        {profile?.personal?.birthPlace && profile?.personal?.birthState && <DetailRow icon={<MapPin className="text-[#C8A227]" size={18} />} label="Birthplace" value={`${profile.personal.birthPlace}, ${profile.personal.birthState}`} />}
        {profile?.personal?.height && <DetailRow icon={<Ruler className="text-[#C8A227]" size={18} />} label="Height" value={profile.personal.height} />}
        {profile?.personal?.weight && <DetailRow icon={<Weight className="text-[#C8A227]" size={18} />} label="Weight" value={profile.personal.weight} />}
        {profile?.personal?.religion && <DetailRow icon={<Heart className="text-[#C8A227]" size={18} />} label="Religion" value={capitalize(profile.personal.religion)} />}
        {profile?.personal?.subCaste && <DetailRow icon={<User className="text-[#C8A227]" size={18} />} label="Subcaste" value={profile.personal.subCaste} />}
        {profile?.personal?.country && <DetailRow icon={<MapPin className="text-[#C8A227]" size={18} />} label="Country" value={profile.personal.country} />}
        {profile?.personal?.city && profile?.personal?.state && <DetailRow icon={<MapPin className="text-[#C8A227]" size={18} />} label="Current Location" value={`${capitalize(profile.personal.city)}, ${profile.personal.state}`} />}
        {canShowFullAddress && formattedFullAddress && <DetailRow icon={<MapPin className="text-[#C8A227]" size={18} />} label="Full Address (shared after mutual acceptance)" value={formattedFullAddress} />}
        {profile?.personal?.nationality && <DetailRow icon={<User className="text-[#C8A227]" size={18} />} label="Nationality" value={profile.personal.nationality} />}
        {profile?.personal?.astrologicalSign && <DetailRow icon={<Star className="text-[#C8A227]" size={18} />} label="Zodiac Sign" value={profile.personal.astrologicalSign} />}
        {profile?.personal?.dosh && <DetailRow icon={<Heart className="text-[#C8A227]" size={18} />} label="Dosh" value={profile.personal.dosh} />}
        {profile?.personal?.marriedStatus && <div className="col-span-full">
            <DetailRow icon={<User className="text-[#C8A227]" size={18} />} label="Marital Status" value={profile.personal.marriedStatus} />
            
            {}
            <div className="mt-3 space-y-2">
              {}
              {(profile.personal.marriedStatus === "Divorced" || profile.personal.marriedStatus === "Awaiting Divorce") && profile.personal.divorceStatus && <ul className="list-disc list-inside ml-6 text-sm text-gray-600">
                  <li>
                    <span className="font-medium text-gray-700">Divorce Status:</span> {profile.personal.divorceStatus}
                  </li>
                </ul>}

              {}
              {profile.personal.marriedStatus !== "Never Married" && <ul className="list-disc list-inside ml-6 text-sm text-gray-600">
                  {typeof profile.personal.isHaveChildren === "boolean" && <li>
                      <span className="font-medium text-gray-700">Has Children:</span> {profile.personal.isHaveChildren ? "Yes" : "No"}
                    </li>}
                  {profile.personal.isHaveChildren && profile.personal.numberOfChildren && <li>
                      <span className="font-medium text-gray-700">Number of Children:</span> {profile.personal.numberOfChildren}
                    </li>}
                  {profile.personal.isHaveChildren && typeof profile.personal.isChildrenLivingWithYou === "boolean" && <li>
                      <span className="font-medium text-gray-700">Children Living With:</span> {profile.personal.isChildrenLivingWithYou ? "With Me" : "Not With Me"}
                    </li>}
                </ul>}

              {}
              {profile.personal.marriedStatus === "Separated" && <ul className="list-disc list-inside ml-6 text-sm text-gray-600">
                  {typeof profile.personal.isLegallySeparated === "boolean" && <li>
                      <span className="font-medium text-gray-700">Legally Separated:</span> {profile.personal.isLegallySeparated ? "Yes" : "No"}
                    </li>}
                  {profile.personal.separatedSince && <li>
                      <span className="font-medium text-gray-700">Separated Since:</span> {profile.personal.separatedSince}
                    </li>}
                </ul>}
            </div>
          </div>}
      </div>
    </section>;
}
function FamilyDetailsSection({
  profile,
  capitalize
}) {
  if (!profile?.family) return null;
  const family = profile.family;
  return <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
        <User className="text-[#C8A227]" size={20} />
        Family Details
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        {family.fatherName && <div>
            <p className="text-gray-500">Father's Name</p>
            <p className="font-medium">
              {capitalize(family.fatherName)}
            </p>
          </div>}
        {family.fatherOccupation && <div>
            <p className="text-gray-500">Father's Occupation</p>
            <p className="font-medium">
              {capitalize(family.fatherOccupation)}
            </p>
          </div>}
        {family.fatherNativePlace && <div>
            <p className="text-gray-500">Father's Native Place</p>
            <p className="font-medium">
              {capitalize(family.fatherNativePlace)}
            </p>
          </div>}
        {family.motherName && <div>
            <p className="text-gray-500">Mother's Name</p>
            <p className="font-medium">
              {capitalize(family.motherName)}
            </p>
          </div>}
        {family.motherOccupation && <div>
            <p className="text-gray-500">Mother's Occupation</p>
            <p className="font-medium">
              {capitalize(family.motherOccupation)}
            </p>
          </div>}
        {family.grandFatherName && <div>
            <p className="text-gray-500">Grandfather's Name</p>
            <p className="font-medium">
              {capitalize(family.grandFatherName)}
            </p>
          </div>}
        {family.grandMotherName && <div>
            <p className="text-gray-500">Grandmother's Name</p>
            <p className="font-medium">
              {capitalize(family.grandMotherName)}
            </p>
          </div>}
        {family.nanaName && <div>
            <p className="text-gray-500">Maternal Grandfather's Name</p>
            <p className="font-medium">
              {capitalize(family.nanaName)}
            </p>
          </div>}
        {family.nanaNativePlace && <div>
            <p className="text-gray-500">Maternal Grandfather's Native Place</p>
            <p className="font-medium">
              {capitalize(family.nanaNativePlace)}
            </p>
          </div>}
        {family.naniName && <div>
            <p className="text-gray-500">Maternal Grandmother's Name</p>
            <p className="font-medium">
              {capitalize(family.naniName)}
            </p>
          </div>}
        {family.familyType && <div className="sm:col-span-2">
            <p className="text-gray-500">Family Type</p>
            <p className="font-medium">
              {capitalize(family.familyType)}
            </p>
          </div>}
      </div>
    </section>;
}
function EducationDetailsSection({
  profile
}) {
  const education = profile?.education;
  if (!education) return null;
  return <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
        <GraduationCap className="text-[#C8A227]" size={20} />
        Education
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        {education.HighestEducation && <div>
            <p className="text-gray-500">Qualification</p>
            <p className="font-semibold">
              {education.HighestEducation}
            </p>
          </div>}
        {education.FieldOfStudy && <div>
            <p className="text-gray-500">Field of Study</p>
            <p className="font-semibold">{education.FieldOfStudy}</p>
          </div>}
        {education.SchoolName && <div>
            <p className="text-gray-500">School/Institute</p>
            <p className="font-semibold">{education.SchoolName}</p>
          </div>}
        {education.University && <div>
            <p className="text-gray-500">University / College</p>
            <p className="font-semibold">{education.University}</p>
          </div>}
        {education.CountryOfEducation && <div>
            <p className="text-gray-500">Country of Education</p>
            <p className="font-semibold">{education.CountryOfEducation}</p>
          </div>}
      </div>
    </section>;
}
function ProfessionalDetailsSection({
  profile,
  capitalize
}) {
  if (!profile?.professional) return null;
  return <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
        <Briefcase className="text-[#C8A227]" size={20} />
        Professional
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <p className="text-gray-500">Employment Status</p>
          <p className="font-semibold">
            {capitalize(profile.professional.EmploymentStatus) || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Company</p>
          <p className="font-semibold">
            {profile.professional.OrganizationName || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Job Title</p>
          <p className="font-semibold">
            {profile.professional.Occupation || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Annual Income</p>
          <p className="font-semibold">
            {profile.professional.AnnualIncome || "Not Disclosed"}
          </p>
        </div>
      </div>
    </section>;
}
function HealthLifestyleSection({
  profile,
  capitalize
}) {
  if (!profile?.healthAndLifestyle) return null;
  return <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
        <Heart className="text-[#C8A227]" size={20} />
        Health & Lifestyle
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
        <div>
          <p className="text-gray-500">Alcohol</p>
          <p className="font-semibold">
            {capitalize(profile.healthAndLifestyle.isAlcoholic) || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Tobacco</p>
          <p className="font-semibold">
            {capitalize(profile.healthAndLifestyle.isTobaccoUser) || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Tattoo</p>
          <p className="font-semibold">
            {capitalize(profile.healthAndLifestyle.isHaveTattoos) || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Diet</p>
          <p className="font-semibold">
            {capitalize(profile.healthAndLifestyle.diet) || "—"}
          </p>
        </div>
      </div>
    </section>;
}
function ActionButtonsSection({
  status,
  profileId,
  isSentRequest,
  isUiInCompare,
  onSendRequest,
  onWithdraw,
  onAccept,
  onReject,
  onAddClick,
  onRemoveClick
}) {
  const CompareButton = isUiInCompare ? <Button onClick={onRemoveClick} className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12">
      Remove From Compare
    </Button> : <Button onClick={onAddClick} className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12">
      Add to Compare
    </Button>;
  return <div className="bg-white rounded-[20px] p-6 sticky bottom-4 border border-gold-light shadow-md">
      <div className="flex flex-col sm:flex-row gap-3">
        {status === "none" && <>
            {onSendRequest && <Button onClick={() => onSendRequest(profileId)} className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12">
                Send Request
              </Button>}
            {CompareButton}
          </>}

        {status === "pending" && isSentRequest && onWithdraw && <>
            <Button onClick={() => onWithdraw(profileId)} className="flex-1 bg-[#f6f1e7] hover:text-white hover:bg-[#d95655] border-2 border-[#d64545] text-[#d95655] rounded-[8px] h-12">
              Withdraw Request
            </Button>
            {CompareButton}
          </>}

        {status === "pending" && !isSentRequest && onAccept && onReject && <>
            <Button onClick={() => onAccept(profileId)} className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12">
              Accept
            </Button>
            <Button onClick={() => onReject(profileId)} className="flex-1 bg-[#f6f1e7] hover:text-white hover:bg-[#d95655] border-2 border-[#d64545] text-[#d95655] rounded-[8px] h-12">
              Reject
            </Button>
            {CompareButton}
          </>}

        {status === "accepted" && <>
            <Button onClick={() => undefined} className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12 flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat
            </Button>
            {CompareButton}
          </>}

        {status === "rejected" && CompareButton}
      </div>
    </div>;
}