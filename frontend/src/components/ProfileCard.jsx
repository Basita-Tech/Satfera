import React from "react";
import { Button } from "./ui/button";
import { Star, Download, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getViewProfiles } from "../api/auth";
import toast from "react-hot-toast";

const PROFILE_PHOTO_ASPECT_RATIO = 1/1;
const isValidProfileId = id => {
  if (!id || typeof id !== 'string') return false;
  if (id === 'undefined' || id === 'null' || id.length < 10) return false;
  return true;
};
export function ProfileCard({
  id,
  name = "Unknown",
  age = null,
  state = "",
  country = "",
  profession = "",
  religion = null,
  caste = null,
  image = "",
  compatibility = 0,
  status = null,
  variant = "browse",
  onSendRequest,
  onView,
  onWithdraw,
  hideMatch,
  onAccept,
  onReject,
  onAddToCompare,
  onRemoveCompare,
  isInCompare = false,
  isShortlisted = false,
  onToggleShortlist,
  hideStatus = false,
  profile,
  onChat,
  onDownloadPDF,
  isVerified: isVerifiedProp,
  photoAspectRatio
}) {
  const navigate = useNavigate();
  const [optimisticInCompare, setOptimisticInCompare] = React.useState(false);
  const isUiInCompare = isInCompare || optimisticInCompare;
  const isVerified = true;
  const resolvedState = state || profile?.state || profile?.full_address?.state || profile?.fullAddress?.state || profile?.location?.state;
  const resolvedCountry = country || profile?.country || profile?.full_address?.country || profile?.fullAddress?.country || profile?.location?.country || (Array.isArray(profile?.livingInCountry) ? profile.livingInCountry.map(c => c?.value ?? c).find(Boolean) : typeof profile?.livingInCountry === "string" ? profile?.livingInCountry : "");
  const locationParts = [resolvedState, resolvedCountry].filter(Boolean);
  const detailParts = [];
  if (locationParts.length) detailParts.push(locationParts.join(", "));
  if (profession) detailParts.push(profession);
  const detailLine = detailParts.join(" • ");
  const handleSendRequestClick = async e => {
    try {
      if (e?.stopPropagation) e.stopPropagation();
    } catch {}
    try {
      await onSendRequest?.(id);
    } catch (err) {
      console.error('Send request error:', err);
    }
  };
  const handleToggleShortlistClick = async e => {
    try {
      if (e?.stopPropagation) e.stopPropagation();
    } catch {}
    try {
      await onToggleShortlist?.(id);
    } catch (err) {
      console.error('Shortlist toggle error:', err);
    }
  };
  const handleAddClick = async e => {
    try {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    } catch (err) {}
    setOptimisticInCompare(true);
    try {
      const resp = id ? await onAddToCompare?.(id, profile) : null;
      if (resp && resp.success === false) {
        try {
          window?.toast?.error?.(resp?.message || 'Failed to add to compare');
        } catch (e) {}
        setOptimisticInCompare(false);
      }
    } catch (err) {
      console.warn('Add to compare failed', err);
      setOptimisticInCompare(false);
      try {
        toast.error('Failed to add to compare');
      } catch (e) {}
    }
  };
  const handleRemoveClick = async e => {
    try {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    } catch (err) {}
    setOptimisticInCompare(false);
    try {
      if (id) await onRemoveCompare?.(id);
    } catch (err) {
      console.warn('Remove compare failed', err);
      setOptimisticInCompare(true);
    }
  };
  const renderActions = () => {
    switch (variant) {
      case "browse":
        return <div className="mt-3 space-y-3">
            <div className="flex gap-2 w-full">
              <Button onClick={() => {
              const profileId = profile?.id || id;
              if (!isValidProfileId(profileId)) {
                toast.error('Invalid profile ID');
                console.error('Invalid profile ID:', profileId);
                return;
              }
              navigate(`/dashboard/profile/${profileId}`);
            }} className="flex-1 bg-[#f9f5ed] text-[#c8a227] border-[1.5px] border-[#c8a227] rounded-full font-medium hover:bg-[#c8a227] hover:text-white transition-all duration-200 flex items-center justify-center gap-1 h-10 text-sm">
                <Eye className="w-4 h-4" />
                View
              </Button>

              <Button className="flex-1 bg-[#c8a227] border-[1.5px] border-[#c8a227] text-white rounded-full font-medium hover:bg-[#b49520] transition-all duration-200 h-10 text-sm" onClick={handleSendRequestClick}>
                Send Request
              </Button>
            </div>

            <div className="w-full">
              {isUiInCompare ? <Button onClick={handleRemoveClick} className="w-full bg-[#c8a227] text-white rounded-full hover:bg-[#b49520] font-medium h-10 text-sm">
                  Remove Compare
                </Button> : <Button variant="outline" onClick={handleAddClick} className="w-full border-[1.5px] border-[#c8a227] text-[#c8a227] font-medium rounded-full bg-[#f9f5ed] hover:bg-[#c8a227] hover:text-white transition-all duration-200 h-10 text-sm">
                  Add to Compare
                </Button>}
            </div>
          </div>;
      case "dashboard":
        return <div className="flex gap-2">
            <Button onClick={() => {
            const profileId = profile?.id || id;
            if (!isValidProfileId(profileId)) {
              toast.error('Invalid profile ID');
              console.error('Invalid profile ID:', profileId);
              return;
            }
            navigate(`/dashboard/profile/${profileId}`);
            }} className="flex-1 bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#e0c36a] rounded-full font-medium 
              hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] transition-all duration-200 flex items-center justify-center gap-2">
              <Eye size={16} />
              <span>View Profile</span>
            </Button>
            <Button size="sm" onClick={handleSendRequestClick} className="flex-1 bg-[#c8a227] text-white rounded-[12px]">
              Send Request
            </Button>
          </div>;
      case "sent":
        return <div className="flex gap-2 mt-2 pr-6 pb-6 items-center">
            <Button onClick={() => onView?.(profile || {
            id
          })} className="flex-1 h-[38px] bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium 
              hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] transition-all duration-200 flex items-center justify-center gap-2">
              <Eye size={16} />
              <span>View </span>
            </Button>
            {onWithdraw && (() => {
            const s = String(status || "").toLowerCase();
            if (s === "rejected" || s === "withdrawn") {
              return <Button disabled className="flex-1 h-[38px] bg-gray-100 text-gray-500 border-[1.3px] border-gray-300 rounded-full font-medium cursor-not-allowed opacity-60">
                    {s === "withdrawn" ? "Withdrawn" : "Rejected"}
                  </Button>;
            }
            return <Button onClick={() => onWithdraw?.(id)} className=" flex-1  h-[38px] bg-[#f9f5ed] text-[#d64545] border-[1.3px] border-[#d64545] rounded-full font-medium 
                hover:bg-[#d64545] hover:text-white hover:border-[#d64545] transition-all duration-200">
                  Withdraw
                </Button>;
          })()}
          </div>;
      case "received":
        return <div className="flex flex-col gap-2 mt-2 pr-6 pb-6">
            {}
            <Button onClick={() => onView?.(profile || {
            id
          })} className="w-full h-[38px] bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium 
              hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] transition-all duration-200 flex items-center justify-center gap-2">
              <Eye size={16} />
              <span>View </span>
            </Button>

            {}
            {(() => {
            const currentStatus = String(status || "").toLowerCase();
            if (currentStatus === "rejected") {
              return <Button onClick={() => onAccept?.(profile || {
                id
              })} className="w-full h-[38px] bg-[#c8a227] text-white rounded-full font-medium 
                    hover:bg-[#b8941e] transition-all duration-200">
                    ✓ Accept
                  </Button>;
            }
            if (currentStatus === "accepted") {
              return <Button variant="outline" onClick={() => onReject?.(profile || {
                id
              })} className="w-full h-[38px] bg-[#f9f5ed] text-[#d64545] border-[1.3px] border-[#d64545] rounded-full font-medium 
                    hover:bg-[#d64545] hover:text-white hover:border-[#d64545] transition-all duration-200">
                    ✕ Reject
                  </Button>;
            }
            return <div className="flex gap-2">
                  <Button onClick={() => onAccept?.(profile || {
                id
              })} className="flex-1 h-[38px] bg-[#c8a227] text-white rounded-full font-medium 
                    hover:bg-[#b8941e] transition-all duration-200">
                    ✓ Accept
                  </Button>
                  <Button variant="outline" onClick={() => onReject?.(profile || {
                id
              })} className="flex-1 h-[38px] bg-[#f9f5ed] text-[#d64545] border-[1.3px] border-[#d64545] rounded-full font-medium 
                    hover:bg-[#d64545] hover:text-white hover:border-[#d64545] transition-all duration-200">
                    ✕ Reject
                  </Button>
                </div>;
          })()}
          </div>;
      case "approved":
        return <div className="flex flex-col gap-3 mt-3">
            {}
            <div className="flex items-center gap-2">
              {}
              <Button onClick={() => onView?.(profile || {
              id
            })} className="flex-1 bg-[#f9f5ed] text-[#c8a227]  hover:text-white  border-[1.3px] border-[#c8a227] rounded-full font-medium py-2 
          hover:bg-[#c8a227] transition-all duration-200 flex items-center justify-center gap-2">
                <Eye size={16} />
                <span>View </span>
              </Button>

              {}
              <Button onClick={e => {
              if (isUiInCompare) handleRemoveClick(e);else handleAddClick(e);
            }} className={`flex-1 rounded-full font-medium py-2 px-3 border transition-all duration-200 whitespace-nowrap ${isUiInCompare ? "bg-[#c8a227] text-white border-[#c8a227] hover:bg-[#c8a227]" : "bg-[#f9f5ed] text-[#c8a227]  border-[1.3px] hover:text-white border-[#c8a227] hover:bg-[#c8a227]"}`}>
                {isUiInCompare ? "Remove Compare" : "Add to Compare"}
              </Button>
            </div>

            {}
            {status === "accepted" && (onChat || onReject || onDownloadPDF) && <div className="flex items-center gap-2">
                {onReject && <Button onClick={() => onReject?.(profile || {
              id
            })} className="flex-1 bg-[#f9f5ed] text-[#d64545] border-[1.3px] border-[#d64545] rounded-full py-2 font-medium flex items-center justify-center gap-2 
              hover:bg-[#d64545] hover:text-white transition-all duration-200">
                    ✕ Reject
                  </Button>}
                {onChat && <Button onClick={() => onChat?.(profile || {
              id
            })} className="flex-1 bg-[#c8a227] text-white rounded-full py-2 font-medium flex items-center justify-center gap-2 
              hover:bg-[#b8941e] transition-all duration-200">
                    💬 Chat
                  </Button>}
                {onDownloadPDF && <Button onClick={() => onDownloadPDF?.(profile || {
              id
            })} className="flex-1 bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full py-2 font-medium flex items-center justify-center gap-2 
              hover:bg-[#c8a227] hover:text-white transition-all duration-200">
                    <Download size={16} />
                    PDF
                  </Button>}
              </div>}
          </div>;
      case "shortlisted":
        return <div className="flex flex-col gap-3 mt-3">
            {}
            <div className="flex items-center gap-3">
              <Button onClick={() => onView?.(profile || {
              id
            })} className="flex-1 h-11 bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium text-[14px] 
                  hover:bg-[#c8a227] hover:text-white transition-all duration-200 flex items-center justify-center gap-2">
                <Eye size={16} />
                <span>View </span>
              </Button>

              {}
              <Button onClick={e => {
              if (isUiInCompare) handleRemoveClick(e);else handleAddClick(e);
            }} className={`flex-1 h-11 rounded-full font-medium text-[14px] border transition-all duration-200 ${isUiInCompare ? "bg-[#c8a227] text-white border-[#c8a227]" : "bg-[#f9f5ed] text-[#c8a227] border-[1.3px] hover:bg-[#c8a227] hover:text-white border-[#c8a227]"}`}>
                {isUiInCompare ? "Remove From Compare" : "Add toCompare"}
              </Button>
              <Button onClick={e => {
              if (isUiInCompare) handleRemoveClick(e);else handleAddClick(e);
            }} className={`flex-1 h-[38px] rounded-full font-medium text-[13px] border transition-all duration-200 px-4 ${isUiInCompare ? "bg-[#c8a227] text-white border-[#c8a227]" : "bg-[#f9f5ed] text-[#c8a227]  border-[1.3px] border-[#c8a227] hover:bg-[#c8a227] hover:text-white"}`}>
                {isUiInCompare ? "Remove From Compare" : "Add to Compare"}
              </Button>
            </div>

            {}
            {status === "accepted" && onChat && <Button onClick={() => onChat?.(profile || {
            id
          })} className="w-full bg-[#c8a227] text-white rounded-full py-2 font-medium flex items-center justify-center gap-2 
          hover:bg-[#b8941e] transition-all duration-200">
                💬 Chat
              </Button>}
          </div>;
      case "newprofiles":
        return <div className="mt-2 flex flex-col gap-2">
            {}
            <div className="flex gap-2 items-center">
              <Button onClick={() => {
              const profileId = profile?.id || id;
              if (!isValidProfileId(profileId)) {
                toast.error('Invalid profile ID');
                console.error('Invalid profile ID:', profileId);
                return;
              }
              navigate(`/dashboard/profile/${profileId}`);
            }} className="flex-1 h-[38px] bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full 
          font-medium text-[13px] hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] 
          transition-all duration-200 px-4 flex items-center justify-center gap-2">
                <Eye size={16} />
                <span>View </span>
              </Button>

              <Button onClick={handleSendRequestClick} className="w-full h-[38px] bg-[#c8a227] text-white rounded-full font-medium text-[13px] 
          hover:bg-[#b8941e] transition-all duration-200 px-4">
                Send Request
              </Button>
            </div>

            {}
            <div className="flex gap-2">
              <Button onClick={e => {
              if (isUiInCompare) handleRemoveClick(e);else handleAddClick(e);
            }} className={`flex-1 h-[38px] rounded-full font-medium text-[13px] border transition-all duration-200 px-4 ${isUiInCompare ? "bg-[#c8a227] text-white border-[#c8a227]" : "bg-[#f9f5ed] text-[#c8a227]  border-[1.3px] border-[#c8a227] hover:bg-[#c8a227] hover:text-white"}`}>
                {isUiInCompare ? "Remove From Compare" : "Add to Compare"}
              </Button>
              
            </div>
          </div>;
      default:
        return null;
    }
  };
  const handleMouseEnter = () => {
    if (id) {
      getViewProfiles(id, {
        useCache: true
      }).catch(err => {});
    }
  };
  return <div className="bg-white rounded-[20px] overflow-hidden shadow hover:shadow-lg transition-all duration-300 flex flex-col w-full max-w-[380px] mx-auto h-full" onMouseEnter={handleMouseEnter}>
      {}
      <div className="relative w-full overflow-visible rounded-t-[20px]" style={{
      aspectRatio: photoAspectRatio || PROFILE_PHOTO_ASPECT_RATIO
    }}>
        {image ? <div className="relative w-full h-full">
            <img src={image} alt={name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-center rounded-t-[20px]" onError={e => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling;
          if (fallback) fallback.style.display = 'flex';
        }} />
            {}
            <div style={{
          display: 'none'
        }} className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#fefdfb] via-[#f9f5ed] to-[#f5f0e3] flex items-center justify-center rounded-t-[20px] border-b-2 border-[#e6dec5]">
              <div className="text-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-[#fef9f0] shadow-md flex items-center justify-center mx-auto border-4 border-[#e4c48a]/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#c8a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 font-semibold">No Photo Available</p>
              </div>
            </div>
          </div> : <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#fefdfb] via-[#f9f5ed] to-[#f5f0e3] flex items-center justify-center rounded-t-[20px] border-b-2 border-[#e6dec5]">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-[#fef9f0] shadow-md flex items-center justify-center mx-auto border-4 border-[#e4c48a]/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#c8a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-semibold">No Photo Available</p>
            </div>
          </div>}

        {}
        {variant === "browse" && compatibility && <div className="absolute top-3 left-3 z-20">
            <div className="bg-[#c8a227] backdrop-blur-md  text-white text-[13px] font-semibold px-3 py-[4px] rounded-full shadow border border-[#e0c36a]/80">
              {compatibility}% Match
            </div>
          </div>}

        {variant !== "newprofiles" && compatibility && <div className="absolute top-3 left-3 z-20">
            <div className="bg-[#c8a227] backdrop-blur-md text-white text-[13px] font-semibold px-3 py-[4px] rounded-full shadow border border-[#e0c36a]/80">
              {compatibility}% Match
            </div>
          </div>}

        {}
        {!["browse", "newprofiles"].includes(variant) && !hideStatus && status && status !== "None" && (() => {
        const s = String(status || "").toLowerCase();
        const badgeClass = s === "accepted" ? "bg-[#f9f5ed] text-[#c8a227] border-[#e9d8a6]" : s === "pending" ? "bg-yellow-50 text-[#f54800] border-yellow-200" : s === "rejected" ? "bg-[#fdecec] text-[#d64545] border-[#f5c2c2]" : "bg-gray-100 text-gray-700 border-gray-200";
        const label = s.charAt(0).toUpperCase() + s.slice(1);
        return <div className="absolute top-3 right-3 z-20">
              <div className={`inline-flex items-center justify-center rounded-full px-3 py-[4px] text-[13px] font-medium border ${badgeClass}`}>
                {label}
              </div>
            </div>;
      })()}
      </div>

      {}
      <div className="px-6 pb-6 pt-3 relative flex flex-col flex-1">
        {}
        {onToggleShortlist && <motion.button whileTap={{
        scale: 0.9
      }} onClick={handleToggleShortlistClick} className={`absolute top-3 right-3 p-2 rounded-full flex items-center justify-center w-auto
    shadow-none border-none bg-transparent hover:bg-[#fff8e1]/60 transition-all z-50
    ${isShortlisted ? "bg-[#fff8e1]/80" : ""}`}>
            <Star size={20} className={`transition-all duration-200 ${isShortlisted ? "text-[#c8a227] fill-[#c8a227]" : "text-[#c8a227]"}`} strokeWidth={2} />
          </motion.button>}

  {name.length > 18 ? <div className="flex flex-col mb-1 min-w-0">
      <span className="text-lg font-semibold text-gray-900 leading-snug break-words w-full">
        {name}
      </span>
      <span className="flex items-center flex-shrink-0 mt-0.5">
        {typeof age === "number" && <span className="whitespace-nowrap">, {age}</span>}
        {isVerified && <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain ml-1 inline-block align-middle" />}
      </span>
    </div> : <div className="flex items-center flex-wrap mb-1 min-w-0">
      <span className="text-lg font-semibold text-gray-900 leading-snug break-words">
        {name}
      </span>
      {typeof age === "number" && <span className="whitespace-nowrap">, {age}</span>}
      {isVerified && <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain ml-1 inline-block align-middle" />}
    </div>}


        <p className="text-sm text-gray-600 mb-1">
          {detailLine}
        </p>

        <div className="flex gap-2 mb-1 mt-0.5 h-[36px] items-start">
          {religion && <span className="text-black px-4 py-[4px] rounded-full text-sm font-semibold max-w-[160px] h-7 flex items-center overflow-hidden text-ellipsis whitespace-nowrap" style={{
          backgroundColor: "#f6f1e6"
        }} title={religion}>
              {religion}
            </span>}
          {caste && <span className="text-black px-3 min-w-0 max-w-[160px] h-7 flex items-center justify-center rounded-full text-sm font-semibold bg-[#f6f1e6] truncate" title={caste}>
              {caste}
            </span>}
        </div>

        {}
        <div className="">
          {renderActions()}
        </div>
      </div>
    </div>;
}