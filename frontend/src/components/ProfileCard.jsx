import React from "react";
import { Button } from "./ui/button";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getViewProfiles } from "../api/auth";

export function ProfileCard({
  id,
  name = "Unknown",
  age = null,
  city = "",
  profession = "",
  religion = null,
  caste = null,
  image = "", // no fallback image; keep empty if none provided
  compatibility = 0,
  status = null,
  variant = "browse", // browse | dashboard | sent | received
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
}) {
  const navigate = useNavigate();
  const [optimisticInCompare, setOptimisticInCompare] = React.useState(false);
  const isUiInCompare = isInCompare || optimisticInCompare;

  // Centralized compare click handlers to avoid pre-click optimistic toggles
  const handleAddClick = async (e) => {
    try {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    } catch (err) { /* ignore */ }
    setOptimisticInCompare(true);
    try {
      const resp = id ? await onAddToCompare?.(id, profile) : null;
      // If response explicitly indicates failure, treat as error
      if (resp && resp.success === false) {
        try { window?.toast?.error?.(resp?.message || 'Failed to add to compare'); } catch(e) { /* ignore */ }
        setOptimisticInCompare(false);
      }
    } catch (err) {
      console.warn('Add to compare failed', err);
      setOptimisticInCompare(false);
      try { toast.error('Failed to add to compare'); } catch (e) { /* ignore */ }
    }
  };

  const handleRemoveClick = async (e) => {
    try {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    } catch (err) { /* ignore */ }
    setOptimisticInCompare(false);
    try {
      if (id) await onRemoveCompare?.(id);
    } catch (err) {
      console.warn('Remove compare failed', err);
      setOptimisticInCompare(true);
    }
  };

  // ⚡ Render action buttons for each variant
  const renderActions = () => {
    switch (variant) {
      case "browse":
        return (
          <div className="space-y-2 mt-2">
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  navigate(`/dashboard/profile/${profile?.id || id}`)
                }
                className="flex-1 bg-[#f9f5ed] text-[#c8a227] border-[1.5px] border-[#c8a227] rounded-full font-medium 
                hover:bg-[#c8a227]   hover:text-white transition-all duration-200"
              >
                View
              </Button>

              <Button
                className="flex-1 bg-[#c8a227] border-[1.5px] border-[#c8a227] text-white rounded-full font-medium hover:bg-[#c8a227] transition-all duration-200"
                onClick={() => onSendRequest?.(id)}
              >
                Send Request
              </Button>
            </div>

            <div className="flex gap-2">
              {isUiInCompare ? (
                <Button
                  size="sm"
                  onClick={handleRemoveClick}
                  className="flex-1 bg-[#DDB84E] text-white rounded-[12px]"
                >
                  Remove Compare
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddClick}
                  className="flex-1 border-[1.5px] border-[#c8a227] text-[#c8a227] font-medium rounded-full py-2.5 bg-[#f9f5ed] hover:bg-[#c8a227] hover:text-white transition-all duration-200"
                >
                  Add to Compare
                </Button>

              )}
            </div>
          </div>
        );

      case "dashboard":
        return (
          <div className="flex gap-2">
            <Button
              onClick={() =>
                navigate(`/dashboard/profile/${profile?.id || id}`)
              }
              className="flex-1 bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#e0c36a] rounded-full font-medium 
              hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] transition-all duration-200"
            >
              View
            </Button>
            <Button
              size="sm"
              onClick={() => onSendRequest?.(id)}
              className="flex-1 bg-[#c8a227] text-white rounded-[12px]"
            >
              Send Request
            </Button>
          </div>
        );

      case "sent":
        return (

          <div className="flex gap-2 mt-2 pr-6 pb-6 items-center">
            <Button
              onClick={() => onView?.(profile || { id })}
              className="flex-1 h-[38px] bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium 
              hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] transition-all duration-200"
            >
              View Profile
            </Button>
            {onWithdraw && (() => {
              const s = String(status || "").toLowerCase();
              if (s === "rejected" || s === "withdrawn") {
                return (
                  <Button
                    disabled
                    className="flex-1 h-[38px] bg-gray-100 text-gray-500 border-[1.3px] border-gray-300 rounded-full font-medium cursor-not-allowed opacity-60"
                  >
                    {s === "withdrawn" ? "Withdrawn" : "Rejected"}
                  </Button>
                );
              }
              return (
                <Button
                  onClick={() => onWithdraw?.(id)}
                  className=" flex-1  h-[38px] bg-[#f9f5ed] text-[#d64545] border-[1.3px] border-[#d64545] rounded-full font-medium 
                hover:bg-[#d64545] hover:text-white hover:border-[#d64545] transition-all duration-200"
                >
                  Withdraw
                </Button>
              );
            })()}
          </div>
        );

      case "approved":
        return (
          <div className="flex flex-col gap-3 mt-3">
            {/* Top Buttons: View Profile + Compare */}
            <div className="flex items-center gap-2">
              {/* 👁 View Profile */}
              <Button
                onClick={() => onView?.(profile || { id })}
                className="flex-1 bg-[#f9f5ed] text-[#c8a227]  hover:text-white  border-[1.3px] border-[#c8a227] rounded-full font-medium py-2 
          hover:bg-[#c8a227] transition-all duration-200"
              >
                👁 View Profile
              </Button>

              {/* ⚖️ Compare */}
              <Button
                onClick={(e) => { if (isUiInCompare) handleRemoveClick(e); else handleAddClick(e); }}
                className={`flex-1 rounded-full font-medium py-2 px-3 border transition-all duration-200 whitespace-nowrap ${isUiInCompare
                  ? "bg-[#c8a227] text-white border-[#c8a227] hover:bg-[#c8a227]"
                  : "bg-[#f9f5ed] text-[#c8a227]  border-[1.3px] hover:text-white border-[#c8a227] hover:bg-[#c8a227]"
                  }`}
              >
                {isUiInCompare ? "Added" : "Compare"}
              </Button>
            </div>

            {/* 💬 Chat Button (Full width) - Only show when both users accepted */}
            {status === "accepted" && onChat && (
              <Button
                onClick={() => onChat?.(profile || { id })}
                className="w-full bg-[#c8a227] text-white rounded-full py-2 font-medium flex items-center justify-center gap-2 
          hover:bg-[#b8941e] transition-all duration-200"
              >
                💬 Chat
              </Button>
            )}
          </div>
        );

      case "shortlisted":
        return (
          <div className="flex flex-col gap-3 mt-3">
            {/* Top Buttons: View Profile + Compare (eye icon on View) */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => onView?.(profile || { id })}
                className="flex-1 h-11 bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium text-[14px] 
                  hover:bg-[#c8a227] hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="#b8860b"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>View Profile</span>
              </Button>

              {/* Compare */}
              <Button
                onClick={(e) => { if (isUiInCompare) handleRemoveClick(e); else handleAddClick(e); }}
                className={`flex-1 h-11 rounded-full font-medium text-[14px] border transition-all duration-200 ${isUiInCompare
                  ? "bg-[#c8a227] text-white border-[#c8a227]"
                  : "bg-[#f9f5ed] text-[#c8a227] border-[1.3px] hover:bg-[#c8a227] hover:text-white border-[#c8a227]"
                  }`}
              >
                {isUiInCompare ? "Added" : "Compare"}
              </Button>
              <Button
                onClick={(e) => { if (isUiInCompare) handleRemoveClick(e); else handleAddClick(e); }}
                className={`flex-1 h-[38px] rounded-full font-medium text-[13px] border transition-all duration-200 px-4 ${isUiInCompare
                  ? "bg-[#c8a227] text-white border-[#c8a227]"
                  : "bg-[#f9f5ed] text-[#c8a227]  border-[1.3px] border-[#c8a227] hover:bg-[#c8a227] hover:text-white"
                  }`}
              >
                {isUiInCompare ? "Remove From Compare" : "Add to Compare"}
              </Button>
            </div>

            {/* 💬 Chat Button (Full width) - Only show when both users accepted */}
            {status === "accepted" && onChat && (
              <Button
                onClick={() => onChat?.(profile || { id })}
                className="w-full bg-[#c8a227] text-white rounded-full h-12 font-medium flex items-center justify-center gap-3 shadow-md hover:bg-[#b8941e] transition-all duration-200"
              >
                💬 Chat
              </Button>
            )}
          </div>
        );

      case "newprofiles":
        return (
          <div className="mt-2 flex flex-col gap-2">
            {/* View and Compare Buttons Row */}
            <div className="flex gap-2 items-center">
              <Button
                onClick={() =>
                  navigate(`/dashboard/profile/${profile?.id || id}`)
                }
                className="flex-1 h-[38px] bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full 
          font-medium text-[13px] hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] 
          transition-all duration-200 px-4"
              >
                View Profile
              </Button>

              <Button
                onClick={(e) => { if (isUiInCompare) handleRemoveClick(e); else handleAddClick(e); }}
                className={`flex-1 h-[38px] rounded-full font-medium text-[13px] border transition-all duration-200 px-4 ${isUiInCompare
                  ? "bg-[#c8a227] text-white border-[#c8a227]"
                  : "bg-[#f9f5ed] text-[#c8a227]  border-[1.3px] border-[#c8a227] hover:bg-[#c8a227] hover:text-white"
                  }`}
              >
                {isUiInCompare ? "Added" : " Compare"}
              </Button>
            </div>

            {/* Send Request Button */}
            <div className="flex gap-2">
              <Button
                onClick={() => onSendRequest?.(id)}
                className="w-full h-[38px] bg-[#c8a227] text-white rounded-full font-medium text-[13px] 
          hover:bg-[#b8941e] transition-all duration-200 px-4"
              >
                Send Request
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Prefetch profile data on hover for instant navigation
  const handleMouseEnter = () => {
    if (id) {
      getViewProfiles(id, { useCache: true }).catch(err => {
        console.log('Prefetch error:', err);
      });
    }
  };

  return (
    <div
      className="bg-white rounded-[20px] overflow-hidden shadow hover:shadow-lg transition-all duration-300 flex flex-col max-w-[380px] mx-auto"
      onMouseEnter={handleMouseEnter}
    >
      {/* 🖼️ Profile Image (blank if none) */}
      <div className="relative w-full overflow-visible rounded-t-[20px]">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            decoding="async"
            className="w-full h-[220px] object-cover object-center"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.classList.add('bg-gray-100');
            }}
          />
        ) : (
          <div className="w-full h-[220px] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center rounded-t-[20px]">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-xs text-gray-400 font-medium">No Photo</p>
            </div>
          </div>
        )}

        {/* 💛 Compatibility Tag (only show in browse) */}
        {variant === "browse" && compatibility && (
          <div className="absolute top-3 left-3 z-20">
            <div className="bg-[#c8a227] backdrop-blur-md  text-white text-[13px] font-semibold px-3 py-[4px] rounded-full shadow border border-[#e0c36a]/80">
              {compatibility}% Match
            </div>
          </div>
        )}

        {variant !== "newprofiles" && compatibility && (
          <div className="absolute top-3 left-3 z-20">
            <div className="bg-[#c8a227] backdrop-blur-md text-white text-[13px] font-semibold px-3 py-[4px] rounded-full shadow border border-[#e0c36a]/80">
              {compatibility}% Match
            </div>
          </div>
        )}

        {/* 🔖 Status Badge (hidden for browse & newprofiles) */}
        {!["browse", "newprofiles"].includes(variant) && !hideStatus && status && status !== "None" && (() => {
          const s = String(status || "").toLowerCase();
          const badgeClass = s === "accepted"
            ? "bg-[#f9f5ed] text-[#c8a227] border-[#e9d8a6]"
            : s === "pending"
              ? "bg-yellow-50 text-[#f54800] border-yellow-200"
              : s === "rejected"
                ? "bg-[#fdecec] text-[#d64545] border-[#f5c2c2]"
                : "bg-gray-100 text-gray-700 border-gray-200";

          const label = s.charAt(0).toUpperCase() + s.slice(1);

          return (
            <div className="absolute top-3 right-3 z-20">
              <div
                className={`inline-flex items-center justify-center rounded-full px-3 py-[4px] text-[13px] font-medium border ${badgeClass}`}
              >
                {label}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 💬 Profile Info */}
      <div className="px-6 pb-6 pt-3 relative flex flex-col flex-1">
        {/* ⭐ Shortlist Star Button */}
        {onToggleShortlist && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleShortlist(id);
            }}
            className={`absolute top-3 right-3 p-2 rounded-full flex items-center justify-center 
    shadow-none border-none bg-transparent hover:bg-[#fff8e1]/60 transition-all z-50
    ${isShortlisted ? "bg-[#fff8e1]/80" : ""}`}
          >
            <Star
              size={18}
              className={`transition-all duration-200 ${isShortlisted ? "text-[#c8a227] fill-[#c8a227]" : "text-[#c8a227]"
                }`}
            />
          </motion.button>
        )}

        <div className="flex items-center gap-2 mb-1 pr-10">
          <h3 className="text-lg font-semibold text-gray-900">
            {name}, {age}
          </h3>
          <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain" />
        </div>

        <p className="text-sm text-gray-600 mb-1">
          {city}, India • {profession}
        </p>

        <div className="flex gap-2 mb-1 mt-0.5 h-[36px] items-start">
          {religion && (
            <span
              className="text-black px-4 py-[4px] rounded-full text-sm font-semibold whitespace-nowrap"
              style={{ backgroundColor: "#f6f1e6" }}
            >
              {religion}
            </span>
          )}
          {caste && (
            <span
              className="text-black px-4 py-[4px] rounded-full text-sm font-semibold whitespace-nowrap"
              style={{ backgroundColor: "#f6f1e6" }}
            >
              {caste}
            </span>
          )}
        </div>

        {/* 🎯 Actions */}
        <div className="">
          {renderActions()}
        </div>
      </div>
    </div>
  );
}
