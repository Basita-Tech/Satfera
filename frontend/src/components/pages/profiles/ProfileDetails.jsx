import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  Star
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";


export function ProfileDetails({ profiles, onNavigate, shortlistedIds = [], onToggleShortlist, compareProfiles = [], onAddToCompare, onRemoveCompare, onSendRequest, onWithdraw, onAccept, onReject }) {
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


  const dummyImage =
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80";

  // pick the selected profile from props (falls back to demo data)
  const selected = (profiles || []).find((p) => p.id?.toString() === id?.toString());
  const selectedProfile = selected || true;

  // convenience fields for demo or real data
  const profile = typeof selectedProfile === "object" ? selectedProfile : null;
  const profileImage = profile?.image || "https://images.unsplash.com/photo-1554733998-0ddd4f28f5d0?w=800";
  const matchText = profile?.compatibility ? `${profile.compatibility}% Match` : "96% Match";
  const profileId = profile?.id ?? id;
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
  const status = String(profile?.status || 'none').toLowerCase();

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

  if (selectedProfile) {
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
                  <img
                    src={profileImage}
                    alt={profile?.name}
                    className="w-full h-[420px] md:h-[420px] lg:h-[500px] object-cover rounded-2xl shadow-lg border border-gray-200"
                  />
                </div>


              </div>
            </div>

            <div className="lg:col-span-3 space-y-7">
              {/* 🔝 Header */}
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 w-full overflow-hidden">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-semibold text-[#222] leading-tight">
                      Aarohi Shah
                    </h2>
                    <Badge className="bg-[#FFF8E1] text-[#C8A227] border border-[#F0E0A2] flex items-center gap-2 px-3 py-1 rounded-full text-sm shadow-sm transform -translate-y-1">
                      <CheckCircle size={14} />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-[#5C5C5C] text-[15px] leading-relaxed">
                    26 years • Mumbai • Senior Marketing Manager
                  </p>
                  <hr className="my-3 border-gray-200" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 text-center text-sm">
                    <div>
                      <p className="text-gray-500">Height</p>
                      <p className="font-semibold">5'6"</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Religion</p>
                      <p className="font-semibold">Hindu</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Education</p>
                      <p className="font-semibold">MBA</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Diet</p>
                      <p className="font-semibold">Vegetarian</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Date of Birth</p>
                        <p className="font-semibold text-[#222]">15/03/1998</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Time of Birth</p>
                        <p className="font-semibold text-[#222]">14:30</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Birthplace</p>
                        <p className="font-semibold text-[#222]">Mumbai, Maharashtra</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Ruler className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Height</p>
                        <p className="font-semibold text-[#222]">5'6" (168 cm)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Weight className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Weight</p>
                        <p className="font-semibold text-[#222]">58 kg (128 lbs)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Moon className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Astrological Sign</p>
                        <p className="font-semibold text-[#222]">Pisces (Meen)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Sparkles className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Dosh Information</p>
                        <p className="font-semibold text-[#222]">Non-Manglik</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="text-[#C8A227]" size={18} />
                      <div>
                        <p className="text-gray-500 text-[13px]">Caste & Subcaste</p>
                        <p className="font-semibold text-[#222]">Patel - Kadva Patel</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 👨‍👩‍👧 Family Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-5">
                    <User className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">Family Details</h3>
                  </div>

                  {/* Parents & Grandparents */}
                  <div className="grid sm:grid-cols-2 gap-6 text-sm mb-6">
                    <div>
                      <p className="text-gray-500">Father</p>
                      <p className="font-medium text-[#222]">Rajesh Kumar Sharma</p>
                      <p className="text-gray-600">Business Owner • Ahmedabad, Gujarat</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Mother</p>
                      <p className="font-medium text-[#222]">Sunita Sharma</p>
                      <p className="text-gray-600">Homemaker • Mumbai, Maharashtra</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Grandfather (Paternal)</p>
                      <p className="font-medium text-[#222]">Late Shri Ramesh Sharma</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Grandmother (Paternal)</p>
                      <p className="font-medium text-[#222]">Smt. Kamala Sharma</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Nana (Maternal)</p>
                      <p className="font-medium text-[#222]">Late Shri Mohan Verma</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Nani (Maternal)</p>
                      <p className="font-medium text-[#222]">Smt. Sharda Verma</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-4"></div>

                  {/* 👨‍👩‍👧 Siblings */}
                  <div className="mb-6">
                    <p className="text-gray-500 mb-2">Siblings</p>
                    <div className="space-y-3">
                      {/* Elder Brother */}
                      <div className="flex items-center justify-between bg-[#FAF6EF] rounded-xl p-4 border border-gray-100">
                        <div>
                          <p className="font-semibold text-[#222]">Rahul Sharma</p>
                          <p className="text-gray-600 text-sm">Elder Brother • 29 years</p>
                        </div>
                        <span className="bg-[#F9F4EB] text-[#C8A227] text-xs font-medium px-3 py-1 rounded-full">
                          Married
                        </span>
                      </div>

                      {/* Younger Sister */}
                      <div className="flex items-center justify-between bg-[#FAF6EF] rounded-xl p-4 border border-gray-100">
                        <div>
                          <p className="font-semibold text-[#222]">Neha Sharma</p>
                          <p className="text-gray-600 text-sm">Younger Sister • 23 years</p>
                        </div>
                        <span className="bg-[#F9F4EB] text-[#C8A227] text-xs font-medium px-3 py-1 rounded-full">
                          Unmarried
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Family Type */}
                  <div>
                    <p className="text-gray-500">Family Type</p>
                    <p className="font-semibold text-[#222]">Nuclear</p>
                  </div>
                </div>

                {/* 🎓 Education Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-5">
                    <GraduationCap className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">
                      Education Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 text-sm">
                    <div>
                      <p className="text-gray-500">School</p>
                      <p className="font-semibold text-[#222]">
                        St. Xavier&apos;s High School, Mumbai
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Highest Qualification</p>
                      <p className="font-semibold text-[#222]">MBA</p>
                    </div>

                    <div>
                      <p className="text-gray-500">University / College</p>
                      <p className="font-semibold text-[#222]">
                        Indian Institute of Management, Ahmedabad
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Field of Study</p>
                      <p className="font-semibold text-[#222]">Marketing</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Country of Education</p>
                      <p className="font-semibold text-[#222]">India</p>
                    </div>
                  </div>
                </div>

                {/* 💼 Professional Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">
                      Professional Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                    <div>
                      <p className="text-gray-500">Employment Status</p>
                      <p className="font-semibold text-[#222]">Employed</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Company</p>
                      <p className="font-semibold text-[#222]">
                        Tata Consultancy Services
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Job Title</p>
                      <p className="font-semibold text-[#222]">Senior Marketing Manager</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-2">Annual Income</p>
                      <Button className="bg-[#C8A227] hover:bg-[#b99620] text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                        <Lock size={16} />
                        Upgrade to View
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ❤️ Health & Lifestyle */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-5">
                    <Heart className="text-[#C8A227]" size={20} />
                    <h3 className="text-lg font-semibold text-[#222]">Health & Lifestyle</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="text-gray-500">Alcohol</p>
                      <p className="font-semibold text-[#222]">No</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tobacco</p>
                      <p className="font-semibold text-[#222]">No</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tattoos</p>
                      <p className="font-semibold text-[#222]">No</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Diet</p>
                      <p className="font-semibold text-[#222]">Vegetarian</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Medical History</p>
                      <p className="font-semibold text-[#222]">None</p>
                    </div>
                  </div>

                  <hr className="my-5" />

                  <div className="flex items-center justify-between">
                    <p className="text-gray-700 text-sm font-medium">
                      Health Screening <span className="text-gray-400">(Premium)</span>
                    </p>
                    <Button className="flex items-center gap-2 bg-[#C8A227] hover:bg-[#b99620] text-white px-4 py-2 rounded-lg text-sm shadow-sm">
                      <Lock size={15} />
                      Upgrade to View
                    </Button>
                  </div>
                </div>
              </div>


              <div className="bg-white rounded-[20px] p-6 satfera-shadow sticky bottom-4 border border-gold-light">
                <div className="flex flex-col sm:flex-row gap-3">
                  {status === 'none' && (
                    <>
                      {onSendRequest && (
                        <Button
                          onClick={() => onSendRequest(profile.id)}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          Send Request
                        </Button>
                      )}
                      {isUiInCompare ? (
                        <Button
                          onClick={() => {
                            setOptimisticInCompare(false);
                            onRemoveCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(false);
                              onRemoveCompare?.(profile.id);
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onTouchStart={() => setOptimisticInCompare(true)}
                          onMouseDown={() => setOptimisticInCompare(true)}
                          onClick={() => {
                            setOptimisticInCompare(true);
                            onAddToCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(true);
                              onAddToCompare?.(profile.id);
                            }
                          }}
                          className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
                        >
                          Add to Compare
                        </Button>
                      )}
                    </>
                  )}

                  {status === 'pending' && onWithdraw && !onAccept && !onReject && (
                    <Button
                      onClick={() => onWithdraw(profile.id)}
                      className="flex-1 bg-[#f6f1e7] hover:text-white hover:bg-[#d95655] border-2 border-[#d64545] text-[#d95655] rounded-[8px] h-12"
                    >
                      Withdraw Request
                    </Button>
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
                          onClick={() => {
                            setOptimisticInCompare(false);
                            onRemoveCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(false);
                              onRemoveCompare?.(profile.id);
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onTouchStart={() => setOptimisticInCompare(true)}
                          onMouseDown={() => setOptimisticInCompare(true)}
                          onClick={() => {
                            setOptimisticInCompare(true);
                            onAddToCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(true);
                              onAddToCompare?.(profile.id);
                            }
                          }}
                          className="flex-1 bg-[#f6f1e7] hover:bg-[#C8A227] hover:text-white border-2 border-[#c8a227] text-[#c8a227] rounded-[12px] h-12"
                        >
                          Add to Compare
                        </Button>
                      )}
                    </>
                  )}

                  {status === 'pending' && onAccept && onReject && (
                    <>
                      <Button
                        onClick={() => onAccept(profile.id)}
                        className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                      >
                        Accept
                      </Button>

                      <Button
                        onClick={() => onReject(profile.id)}
                        className="flex-1 bg-[#f6f1e7] hover:text-white hover:bg-[#d95655] border-2 border-[#d64545] text-[#d95655] rounded-[8px] h-12"
                      >
                        Reject
                      </Button>

                      {isUiInCompare ? (
                        <Button
                          onClick={() => {
                            setOptimisticInCompare(false);
                            onRemoveCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(false);
                              onRemoveCompare?.(profile.id);
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onTouchStart={() => setOptimisticInCompare(true)}
                          onMouseDown={() => setOptimisticInCompare(true)}
                          onClick={() => {
                            setOptimisticInCompare(true);
                            onAddToCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(true);
                              onAddToCompare?.(profile.id);
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
                          onClick={() => {
                            setOptimisticInCompare(false);
                            onRemoveCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(false);
                              onRemoveCompare?.(profile.id);
                            }
                          }}
                          className="flex-1 bg-[#DDB84E] hover:bg-[#C8A227] text-white rounded-[12px] h-12"
                        >
                          In Compare
                        </Button>
                      ) : (
                        <Button
                          onTouchStart={() => setOptimisticInCompare(true)}
                          onMouseDown={() => setOptimisticInCompare(true)}
                          onClick={() => {
                            setOptimisticInCompare(true);
                            onAddToCompare?.(profile.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOptimisticInCompare(true);
                              onAddToCompare?.(profile.id);
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
