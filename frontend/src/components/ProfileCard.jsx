import React from "react";
import { Button } from "./ui/button";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function ProfileCard({
  id,
  name = "Priya Sharma",
  age = 26,
  city = "Delhi",
  profession = "Graphic Designer",
  religion = "Hindu",
  caste = "Khatri",
  image = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80",
  compatibility = "92",
  status = "Pending",
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
}) {
  const navigate = useNavigate();
  const [optimisticInCompare, setOptimisticInCompare] = React.useState(false);
  const isUiInCompare = isInCompare || optimisticInCompare;
  // ⭐ Favorite toggle stored in localStorage
  const [isFavorite, setIsFavorite] = React.useState(() => {
    try {
      const saved = localStorage.getItem(`favorite_profile_${id}`);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(`favorite_profile_${id}`, JSON.stringify(isFavorite));
    } catch { }
  }, [isFavorite, id]);

  // ⚡ Render action buttons for each variant
  const renderActions = () => {
    switch (variant) {
      case "browse":
        return (
          <div className="space-y-2">
            <div className="flex gap-3 mt-2">
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
                  onClick={() => {
                    setOptimisticInCompare(false);
                    onRemoveCompare?.(id);
                  }}
                  className="flex-1 bg-[#DDB84E] text-white rounded-[12px]"
                >
                  Remove Compare
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOptimisticInCompare(true);
                    onAddToCompare?.(id);
                  }}
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
              className="flex-1 bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium 
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
              return s === "rejected" ? null : (
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
            <div className="flex items-center gap-2 -mx-2 px-0">

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
                onTouchStart={() => setOptimisticInCompare(true)}
                onMouseDown={() => setOptimisticInCompare(true)}
                onClick={() => {
                  if (isUiInCompare) {
                    setOptimisticInCompare(false);
                    onRemoveCompare?.(id);
                  } else {
                    setOptimisticInCompare(true);
                    onAddToCompare?.(id);
                  }
                }}
                className={`flex-1 rounded-full font-medium py-2 border transition-all duration-200 ${isUiInCompare
                  ? "bg-[#c8a227] text-white border-[#c8a227] hover:bg-[#c8a227]"
                  : "bg-[#f9f5ed] text-[#c8a227]  border-[1.3px] hover:text-white border-[#c8a227] hover:bg-[#c8a227]"
                  }`}
              >
                {isUiInCompare ? "Added" : "Compare"}
              </Button>
            </div>

            {/* 💬 Chat Button (Full width) */}
            <Button
              onClick={() => onChat?.(profile || { id })}
              className="w-full bg-[#c8a227] text-white rounded-full py-2 font-medium flex items-center justify-center gap-2 
        hover:bg-[#b8941e] transition-all duration-200"
            >
              💬 Chat
            </Button>
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
                onTouchStart={() => setOptimisticInCompare(true)}
                onMouseDown={() => setOptimisticInCompare(true)}
                onClick={() => {
                  if (isUiInCompare) {
                    setOptimisticInCompare(false);
                    onRemoveCompare?.(id);
                  } else {
                    setOptimisticInCompare(true);
                    onAddToCompare?.(id);
                  }
                }}
                className={`flex-1 h-11 rounded-full font-medium text-[14px] border transition-all duration-200 ${isUiInCompare
                  ? "bg-[#c8a227] text-white border-[#c8a227]"
                  : "bg-[#f9f5ed] text-[#c8a227] border-[1.3px] hover:bg-[#c8a227] hover:text-white border-[#c8a227]"
                  }`}
              >
                {isUiInCompare ? "Added" : "Compare"}
              </Button>
            </div>

            {/* 💬 Chat Button (Full width with icon) */}
            <Button
              onClick={() => onChat?.(profile || { id })}
              className="w-full bg-[#c8a227] text-white rounded-full h-12 font-medium flex items-center justify-center gap-3 shadow-md hover:bg-[#b8941e] transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#ffffff" d="M20 2H4a2 2 0 00-2 2v14l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
              </svg>
              <span className="text-base font-semibold">Chat</span>
            </Button>
          </div>
        );



      case "received":
        {
          const s = String(status || "").toLowerCase();
          // If the received request is rejected, show only 'View Profile'
          if (s === "rejected") {
            return (
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => onView?.(profile || { id })}
                  className="flex-1 h-[38px] bg-[#f9f5ed] text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium 
            hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227] transition-all duration-200"
                >
                  View Profile
                </Button>
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-3 mt-3">
              {/* 👁️ View Profile Button */}
              <Button
                onClick={() => onView?.(profile || { id })}
                className="flex items-center justify-center gap-2 bg-[#f9f5ed]   text-[#c8a227] border-[1.3px] border-[#c8a227] rounded-full font-medium 
          hover:bg-[#c8a227]  hover:text-white  transition-all duration-200"
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
                View Profile
              </Button>

              {/* ✅ Accept / ❌ Reject Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => onAccept?.(id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#c8a227] text-white rounded-full font-medium 
            hover:bg-[#c8a227] transition-all duration-200"
                >
                  ✓ Accept
                </Button>

                <Button
                  onClick={() => onReject?.(id)}
                  className="flex-1 bg-[#f9f5ed] text-[#d64545] border-[1.3px] border-[#d64545] rounded-full font-medium 
                hover:bg-[#d64545] hover:text-white hover:border-[#d64545] transition-all duration-200"
                >
                  ✕ Reject
                </Button>
              </div>
            </div>
          );
        }

      case "newprofiles":
        return (
          <div className="space-y-3 mt-3">
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
                onTouchStart={() => setOptimisticInCompare(true)}
                onMouseDown={() => setOptimisticInCompare(true)}
                onClick={() => {
                  if (isUiInCompare) {
                    setOptimisticInCompare(false);
                    onRemoveCompare?.(id);
                  } else {
                    setOptimisticInCompare(true);
                    onAddToCompare?.(id);
                  }
                }}
                className={`flex-1 h-[38px] rounded-full font-medium text-[13px] border transition-all duration-200 px-4 ${isUiInCompare
                  ? "bg-[#c8a227] text-white border-[#c8a227]"
                  : "bg-[#f9f5ed] text-[#c8a227] border border-[#c8a227] hover:bg-[#c8a227] hover:text-white"
                  }`}
              >
                {isUiInCompare ? "Added" : "Compare"}
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

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow hover:shadow-lg transition-all duration-300">
      {/* 🖼️ Profile Image */}
      <div className="relative w-full overflow-visible rounded-t-[20px]">
        <img
          src={image}
          alt={name}
          className="w-full h-[280px] object-cover object-center"
        />

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
      <div className="px-6 pb-6 pt-3 relative">
        {/* ⭐ Shortlist Star Button */}
        {onToggleShortlist && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggleShortlist(id)}
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

        <p className="text-sm text-gray-600 mb-3">
          {city}, India • {profession}
        </p>

        {(religion || caste) && (
          <div className="flex flex-wrap gap-2 mb-4 mt-2">
            {religion && (
              <span
                className="text-black px-4 py-[4px] rounded-full text-sm font-semibold"
                style={{ backgroundColor: "#f6f1e6" }}
              >
                {religion}
              </span>
            )}
            {caste && (
              <span
                className="text-black px-4 py-[4px] rounded-full text-sm font-semibold"
                style={{ backgroundColor: "#f6f1e6" }}
              >
                {caste}
              </span>
            )}
          </div>
        )}

        {/* 🎯 Actions */}
        {renderActions()}
      </div>
    </div>
  );
}
