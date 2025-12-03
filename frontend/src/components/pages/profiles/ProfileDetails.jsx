import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getViewProfiles,
  addToCompare as apiAddToCompare,
  blockUserProfile,
  unblockUserProfile,
} from "../../../api/auth";
import {
  Clock,
  MapPin,
  Ruler,
  Weight,
  User,
  Heart,
  GraduationCap,
  MessageCircle,
  Briefcase,
  Calendar,
  ChevronLeft,
  Star,
} from "lucide-react";
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
  onReject,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockingInProgress, setIsBlockingInProgress] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [optimisticInCompare, setOptimisticInCompare] = useState(false);

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
            await new Promise((res) => setTimeout(res, 1000 * retryCount));
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
      const cp = Array.isArray(compareProfiles)
        ? compareProfiles.map(String)
        : [];
      if (cp.includes(String(profileId))) {
        setOptimisticInCompare(false);
      }
    } catch (e) {}
  }, [compareProfiles]);

  const capitalize = useCallback((str) => {
    if (!str) return "—";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }, []);

  const getAgeParts = useCallback((dob) => {
    try {
      const birth = new Date(dob);
      if (Number.isNaN(birth.getTime())) return null;
      const now = new Date();

      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      let days = now.getDate() - birth.getDate();

      if (days < 0) {
        const prevMonthDays = new Date(
          now.getFullYear(),
          now.getMonth(),
          0
        ).getDate();
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
  }, []);

  const formatAgeFromDob = useCallback(
    (dob) => {
      const parts = getAgeParts(dob);
      if (!parts) return "—";
      const out = [];
      if (parts.years > 0)
        out.push(`${parts.years} year${parts.years !== 1 ? "s" : ""}`);
      if (parts.months > 0)
        out.push(`${parts.months} month${parts.months !== 1 ? "s" : ""}`);
      if (parts.days > 0 || out.length === 0)
        out.push(`${parts.days} day${parts.days !== 1 ? "s" : ""}`);
      return out.join(" ");
    },
    [getAgeParts]
  );

  const profileId = useMemo(
    () =>
      String(
        profile?.id ||
          profile?.userId ||
          profile?._id ||
          profile?.user?.userId ||
          profile?.user?.id ||
          id
      ),
    [profile, id]
  );

  const photos = useMemo(() => {
    const arr = [];
    if (profile?.closerPhoto?.url)
      arr.push({ url: profile.closerPhoto.url, label: "Profile" });
    if (profile?.familyPhoto?.url)
      arr.push({
        url: profile.familyPhoto.url,
        label: "Family",
        blurred: !!profile?.familyPhoto?.isBlurred,
      });
    if (Array.isArray(profile?.otherPhotos)) {
      profile.otherPhotos.forEach((p) => {
        if (p?.url) arr.push({ url: p.url, label: "Photo" });
      });
    }
    return arr;
  }, [profile]);

  const shortlistSource = useMemo(
    () =>
      Array.isArray(shortlistedIds) && shortlistedIds.length > 0
        ? shortlistedIds.map((s) => String(s))
        : [],
    [shortlistedIds]
  );

  const isShortlisted = useMemo(
    () =>
      profileId && Array.isArray(shortlistSource)
        ? shortlistSource.some((sid) => String(sid) === String(profileId))
        : false,
    [profileId, shortlistSource]
  );

  const isInCompare = useMemo(
    () =>
      profileId && Array.isArray(compareProfiles)
        ? compareProfiles
            .map((c) => String(c))
            .some((cid) => String(cid) === String(profileId))
        : false,
    [profileId, compareProfiles]
  );

  const isUiInCompare = isInCompare || optimisticInCompare;

  const profileFromList = useMemo(
    () => profiles?.find((p) => String(p.id) === String(profileId)),
    [profiles, profileId]
  );

  const status = useMemo(
    () =>
      profileFromList?.status
        ? String(profileFromList.status).toLowerCase()
        : String(profile?.status || "none").toLowerCase(),
    [profileFromList, profile?.status]
  );

  const isSentRequest = useMemo(
    () =>
      profileId &&
      (sentProfileIds.includes(String(profileId)) ||
        profiles?.some(
          (p) => String(p.id) === String(profileId) && p.type === "sent"
        )),
    [profileId, sentProfileIds, profiles]
  );

  const matchText = useMemo(
    () =>
      profile?.scoreDetail?.score ? `${profile.scoreDetail.score}% Match` : "",
    [profile?.scoreDetail?.score]
  );

  const totalPhotos = photos.length;
  const activePhoto =
    photos[activeIndex]?.url ||
    profile?.closerPhoto?.url ||
    "https://images.unsplash.com/photo-1554733998-0ddd4f28f5d0?w=800";

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const goPrev = useCallback(
    () =>
      totalPhotos > 0 &&
      setActiveIndex((i) => (i - 1 + totalPhotos) % totalPhotos),
    [totalPhotos]
  );

  const goNext = useCallback(
    () => totalPhotos > 0 && setActiveIndex((i) => (i + 1) % totalPhotos),
    [totalPhotos]
  );

  const handleToggle = useCallback(() => {
    const idStr = String(profileId);
    const currentlyShortlisted = Array.isArray(shortlistSource)
      ? shortlistSource.some((s) => String(s) === idStr)
      : false;

    if (typeof onToggleShortlist === "function") {
      const num = Number(profileId);
      const idToToggle = Number.isFinite(num) ? num : profileId;
      onToggleShortlist(idToToggle);

      if (!currentlyShortlisted) {
        const prefix = (location?.pathname || "").startsWith("/dashboard")
          ? "/dashboard"
          : "/userdashboard";
        navigate(`${prefix}/shortlisted`);
      }
    }
  }, [
    profileId,
    shortlistSource,
    onToggleShortlist,
    location?.pathname,
    navigate,
  ]);

  const getProfileForCompare = useCallback(() => {
    if (!profile) return null;

    const pid =
      profile?.id ||
      profile?.userId ||
      profile?._id ||
      profile?.user?.userId ||
      profile?.user?.id ||
      id;
    const user = profile?.user || profile;
    const name =
      `${user?.firstName || user?.name || ""} ${user?.lastName || ""}`.trim() ||
      user?.name ||
      "Unknown";

    return {
      id: String(pid),
      name,
      image:
        user?.closerPhoto?.url ||
        user?.image ||
        profile?.closerPhoto?.url ||
        profile?.image ||
        "",
      city: user?.city || profile?.personal?.city || profile?.city || "",
      profession:
        user?.occupation ||
        user?.professional?.Occupation ||
        profile?.professional?.Occupation ||
        profile?.occupation ||
        "",
      age: user?.age || profile?.age || null,
      religion:
        user?.religion ||
        profile?.personal?.religion ||
        profile?.religion ||
        null,
      caste:
        user?.subCaste ||
        profile?.personal?.subCaste ||
        profile?.subCaste ||
        null,
      education: user?.education || profile?.education || null,
      compatibility: profile?.scoreDetail?.score ?? profile?.compatibility ?? 0,
    };
  }, [profile, id]);

  const addToCompareHandler = useCallback(
    async (selectedId, profileObj = null) => {
      try {
        if (typeof onAddToCompare === "function") {
          return onAddToCompare(selectedId, profileObj);
        }

        const resp = await apiAddToCompare(selectedId, compareProfiles);

        if (resp?.success !== false) {
          setOptimisticInCompare(true);

          try {
            window.dispatchEvent(
              new CustomEvent("satfera:addToCompare", {
                detail: {
                  id: selectedId,
                  profile: profileObj || getProfileForCompare(),
                },
              })
            );
          } catch (e) {}
        } else {
          toast.error(resp?.message || "Failed to add to compare");
        }
        return resp;
      } catch (e) {
        console.error("Add to compare error:", e);
        toast.error("Failed to add to compare");
      }
    },
    [onAddToCompare, compareProfiles, getProfileForCompare]
  );

  const triggerAddToCompare = useCallback(
    async (theId) => {
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
    },
    [onAddToCompare, getProfileForCompare, addToCompareHandler]
  );

  const triggerRemoveFromCompare = useCallback(
    async (theId) => {
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
    },
    [onRemoveCompare, getProfileForCompare, addToCompareHandler]
  );

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
  }, [
    isBlocked,
    isBlockingInProgress,
    profile?.customId,
    profile?.personal?.firstName,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f1e6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f6f1e6] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <p className="text-sm text-gray-500 mt-2">Profile ID: {id}</p>
          <button
            onClick={handleBack}
            className="mt-4 text-[#C8A227] hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

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
          {/* LEFT COLUMN: PHOTOS */}
          <PhotoSection
            photos={photos}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            matchText={matchText}
            isShortlisted={isShortlisted}
            onToggleShortlist={handleToggle}
            profile={profile}
          />

          {/* RIGHT COLUMN: DETAILS */}
          <div className="lg:col-span-3 space-y-7">
            <HeaderSection profile={profile} capitalize={capitalize} />
            <PersonalDetailsSection
              profile={profile}
              capitalize={capitalize}
              formatAgeFromDob={formatAgeFromDob}
            />
            <FamilyDetailsSection profile={profile} capitalize={capitalize} />
            <EducationDetailsSection profile={profile} />
            <ProfessionalDetailsSection
              profile={profile}
              capitalize={capitalize}
            />
            <HealthLifestyleSection profile={profile} capitalize={capitalize} />
            <ActionButtonsSection
              status={status}
              profileId={profileId}
              isSentRequest={isSentRequest}
              isUiInCompare={isUiInCompare}
              onSendRequest={onSendRequest}
              onWithdraw={onWithdraw}
              onAccept={onAccept}
              onReject={onReject}
              onAddClick={handleAddClick}
              onRemoveClick={handleRemoveClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoSection({
  photos,
  activeIndex,
  setActiveIndex,
  matchText,
  isShortlisted,
  onToggleShortlist,
  profile,
}) {
  const totalPhotos = photos.length;
  const activePhoto =
    photos[activeIndex]?.url ||
    profile?.closerPhoto?.url ||
    "https://images.unsplash.com/photo-1554733998-0ddd4f28f5d0?w=800";

  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="rounded-[20px] sticky top-24">
        <div className="w-full items-center md:w-[280px] lg:w-[300px] max-w-[300px] mx-auto relative lg:pr-4">
          <span className="absolute top-4 left-4 z-30 bg-[#DDB84E] text-white text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
            {matchText}
          </span>
          <button
            onClick={onToggleShortlist}
            className="absolute top-4 w-12 right-4 z-30 rounded-full flex items-center justify-center bg-transparent hover:scale-110 transition-transform active:scale-95 p-2 md:p-2 sm:p-3"
            aria-label={
              isShortlisted ? "Remove from shortlist" : "Add to shortlist"
            }
            title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
          >
            {isShortlisted ? (
              <Star
                size={24}
                className="text-[#DDB84E] fill-[#DDB84E] sm:size-[20px]"
              />
            ) : (
              <Star size={24} className="text-[#C8A227] sm:size-[20px]" />
            )}
          </button>
          <div className="relative">
            {totalPhotos > 0 && (
              <span className="absolute z-30 bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {activeIndex + 1}/{totalPhotos}
              </span>
            )}
            <img
              src={activePhoto}
              alt="Profile"
              className="w-full h-[360px] md:h-[420px] lg:h-[430px] object-cover rounded-2xl shadow-lg border border-gray-200"
            />
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
                  className={`relative shrink-0 size-20 rounded-xl overflow-hidden border transition-all duration-150 flex items-center justify-center bg-white ${
                    isActive
                      ? "border-[#DDB84E] ring-2 ring-[#DDB84E]/40 shadow-md"
                      : "border-gray-200 hover:border-[#DDB84E]/60"
                  }`}
                  aria-label={`Thumbnail ${idx + 1}`}
                >
                  <img
                    src={p.url}
                    alt={p.label || `Photo ${idx + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 bg-[#DDB84E] text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderSection({ profile, capitalize }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
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
        {(profile?.email || profile?.phoneNumber) && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
            {profile?.email && (
              <div className="flex items-center gap-1">
                <MessageCircle size={14} />
                {profile.email}
              </div>
            )}
            {profile?.phoneNumber && (
              <div className="flex items-center gap-1">
                <span>📱</span>
                {profile.phoneNumber}
              </div>
            )}
          </div>
        )}
        {profile?.customId && (
          <div className="text-sm text-gray-500 mt-1">
            <span className="bg-gray-100 px-2 py-1 rounded">
              ID: {profile.customId}
            </span>
          </div>
        )}
        <hr className="my-3 border-gray-200" />
        <div className="grid grid-cols-2 sm:grid-cols-4 text-center text-sm">
          <StatItem label="Height" value={profile?.personal?.height} />
          <StatItem label="Religion" value={profile?.personal?.religion} />
          <StatItem
            label="Education"
            value={profile?.education?.HighestEducation}
          />
          <StatItem
            label="Diet"
            value={capitalize(profile?.healthAndLifestyle?.diet)}
          />
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-semibold text-sm">{value || "—"}</p>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="text-gray-500 text-[13px]">{label}</p>
        <p className="font-semibold text-[#222]">{value}</p>
      </div>
    </div>
  );
}

function PersonalDetailsSection({ profile, capitalize, formatAgeFromDob }) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
        <User className="text-[#C8A227]" size={20} />
        Personal Details
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
        {profile?.gender && (
          <DetailRow
            icon={<User className="text-[#C8A227]" size={18} />}
            label="Gender"
            value={capitalize(profile.gender)}
          />
        )}
        {profile?.dateOfBirth && (
          <>
            <DetailRow
              icon={<Calendar className="text-[#C8A227]" size={18} />}
              label="Date of Birth"
              value={new Date(profile.dateOfBirth).toLocaleDateString()}
            />
            <DetailRow
              icon={<Clock className="text-[#C8A227]" size={18} />}
              label="Age"
              value={formatAgeFromDob(profile.dateOfBirth)}
            />
          </>
        )}
        {profile?.personal?.birthPlace && profile?.personal?.birthState && (
          <DetailRow
            icon={<MapPin className="text-[#C8A227]" size={18} />}
            label="Birthplace"
            value={`${profile.personal.birthPlace}, ${profile.personal.birthState}`}
          />
        )}
        {profile?.personal?.height && (
          <DetailRow
            icon={<Ruler className="text-[#C8A227]" size={18} />}
            label="Height"
            value={profile.personal.height}
          />
        )}
        {profile?.personal?.weight && (
          <DetailRow
            icon={<Weight className="text-[#C8A227]" size={18} />}
            label="Weight"
            value={profile.personal.weight}
          />
        )}
        {profile?.personal?.religion && (
          <DetailRow
            icon={<Heart className="text-[#C8A227]" size={18} />}
            label="Religion"
            value={capitalize(profile.personal.religion)}
          />
        )}
        {profile?.personal?.subCaste && (
          <DetailRow
            icon={<User className="text-[#C8A227]" size={18} />}
            label="Subcaste"
            value={profile.personal.subCaste}
          />
        )}
        {profile?.personal?.country && (
          <DetailRow
            icon={<MapPin className="text-[#C8A227]" size={18} />}
            label="Country"
            value={profile.personal.country}
          />
        )}
        {profile?.personal?.city && profile?.personal?.state && (
          <DetailRow
            icon={<MapPin className="text-[#C8A227]" size={18} />}
            label="Current Location"
            value={`${capitalize(profile.personal.city)}, ${
              profile.personal.state
            }`}
          />
        )}
      </div>
    </section>
  );
}

function FamilyDetailsSection({ profile, capitalize }) {
  if (!profile?.family) return null;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4">Family Details</h3>

      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        {profile.family.fatherName && (
          <div>
            <p className="text-gray-500">Father's Name</p>
            <p className="font-medium">
              {capitalize(profile.family.fatherName)}
            </p>
          </div>
        )}
        {profile.family.motherName && (
          <div>
            <p className="text-gray-500">Mother's Name</p>
            <p className="font-medium">
              {capitalize(profile.family.motherName)}
            </p>
          </div>
        )}
        {profile.family.familyType && (
          <div className="sm:col-span-2">
            <p className="text-gray-500">Family Type</p>
            <p className="font-medium">
              {capitalize(profile.family.familyType)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function EducationDetailsSection({ profile }) {
  if (!profile?.education) return null;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
        <GraduationCap className="text-[#C8A227]" size={20} />
        Education
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        {profile.education.HighestEducation && (
          <div>
            <p className="text-gray-500">Qualification</p>
            <p className="font-semibold">
              {profile.education.HighestEducation}
            </p>
          </div>
        )}
        {profile.education.University && (
          <div>
            <p className="text-gray-500">University / College</p>
            <p className="font-semibold">{profile.education.University}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfessionalDetailsSection({ profile, capitalize }) {
  if (!profile?.professional) return null;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
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
    </section>
  );
}

function HealthLifestyleSection({ profile, capitalize }) {
  if (!profile?.healthAndLifestyle) return null;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
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
          <p className="text-gray-500">Diet</p>
          <p className="font-semibold">
            {capitalize(profile.healthAndLifestyle.diet) || "—"}
          </p>
        </div>
      </div>
    </section>
  );
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
  onRemoveClick,
}) {
  const CompareButton = isUiInCompare ? (
    <Button
      onClick={onRemoveClick}
      className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
    >
      Remove From Compare
    </Button>
  ) : (
    <Button
      onClick={onAddClick}
      className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
    >
      Add to Compare
    </Button>
  );

  return (
    <div className="bg-white rounded-[20px] p-6 sticky bottom-4 border border-gold-light shadow-md">
      <div className="flex flex-col sm:flex-row gap-3">
        {status === "none" && (
          <>
            {onSendRequest && (
              <Button
                onClick={() => onSendRequest(profileId)}
                className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
              >
                Send Request
              </Button>
            )}
            {CompareButton}
          </>
        )}

        {status === "pending" && isSentRequest && onWithdraw && (
          <>
            <Button
              onClick={() => onWithdraw(profileId)}
              className="flex-1 bg-[#f6f1e7] hover:text-white hover:bg-[#d95655] border-2 border-[#d64545] text-[#d95655] rounded-[8px] h-12"
            >
              Withdraw Request
            </Button>
            {CompareButton}
          </>
        )}

        {status === "pending" && !isSentRequest && onAccept && onReject && (
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
            {CompareButton}
          </>
        )}

        {status === "accepted" && (
          <>
            <Button
              onClick={() => console.log("Chat clicked")}
              className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Chat
            </Button>
            {CompareButton}
          </>
        )}

        {status === "rejected" && CompareButton}
      </div>
    </div>
  );
}
