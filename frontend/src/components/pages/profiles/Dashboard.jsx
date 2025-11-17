import React from "react";
import {
  ChevronLeft,
  Sparkles,
  Download,
  Camera,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { StatCard } from "../../StatCard";
import { ProfileCard } from "../../ProfileCard";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";

export function Dashboard({
  profiles = [],
  onNavigate,
  onSendRequest,
  onAddToCompare,
  compareProfiles = [],
  shortlistedIds = [],
  onToggleShortlist,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const selectedProfile = profiles.find((p) => String(p.id) === id);
  const matchProfiles = profiles.slice(0, 6);

  const activities = [
    { name: "Aarohi Shah", time: "2 hours ago", action: "viewed your profile" },
    { name: "Priya Mehta", time: "5 hours ago", action: "sent you a request" },
    { name: "Ananya Iyer", time: "1 day ago", action: "accepted your request" },
    { name: "Divya Reddy", time: "2 days ago", action: "shortlisted you" },
  ];

  /* ✅ 1️⃣ Profile Details View (if a profile is selected) */
  if (selectedProfile) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
        {/* 🔙 Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="fixed top-6 left-6 z-50 flex items-center gap-2 text-[#C8A227] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm hover:opacity-80 transition"
        >
          <ChevronLeft size={20} className="text-[#C8A227]" />
          Back
        </button>

        {/* 🧾 Profile Card Section */}
        <div className="bg-white rounded-[20px] p-6 shadow-sm flex items-start gap-6">
          {/* 🖼️ Profile Image */}
          <div className="relative w-[120px] h-[120px] shrink-0 overflow-visible">
            <img
              src={
                selectedProfile.image ||
                selectedProfile.photo ||
                "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80"
              }
              alt="Profile"
              id="profile-photo"
              className="w-full h-full object-cover rounded-2xl border border-gray-200 shadow-md"
            />

            {/* 📸 Upload Icon */}
            <label
              htmlFor="upload-photo"
              className="absolute bottom-1 right-1 bg-[#C8A227] p-2 rounded-full shadow-md cursor-pointer hover:bg-[#B49520] border border-white flex items-center justify-center"
              title="Upload new photo"
            >
              <Camera className="w-4 h-4 text-white" />
            </label>
            <input
              id="upload-photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const imageURL = URL.createObjectURL(file);
                  document.getElementById("profile-photo").src = imageURL;
                }
              }}
            />
          </div>

          {/* 🧾 Profile Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">{selectedProfile.name}</h2>
              <Badge className="bg-[#C8A2271A] text-[#C8A227] border border-[#C8A22733] rounded-full px-2 py-0.5 flex items-center">
                <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain" />
              </Badge>
            </div>

            <p className="text-gray-700 text-base">
              {selectedProfile.age} years • {selectedProfile.city} •{" "}
              {selectedProfile.profession}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>
                <strong>Height:</strong> {selectedProfile.height || "—"}
              </p>
              <p>
                <strong>Religion:</strong> {selectedProfile.religion || "—"}
              </p>
              <p>
                <strong>Education:</strong> {selectedProfile.education || "—"}
              </p>
              <p>
                <strong>Community:</strong> {selectedProfile.community || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 👤 Personal Details */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Date of Birth:</strong> {selectedProfile.dob || "—"}
            </p>
            <p>
              <strong>Time of Birth:</strong> {selectedProfile.birthTime || "—"}
            </p>
            <p>
              <strong>Diet:</strong> {selectedProfile.diet || "—"}
            </p>
            <p>
              <strong>City:</strong> {selectedProfile.city || "—"}
            </p>
          </div>
        </div>

        {/* 🧩 Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button
            variant="outline"
            className="border-[#C8A227] text-[#C8A227] hover:bg-[#C8A227] hover:text-white"
            onClick={() => onAddToCompare?.(selectedProfile)}
          >
            Add to Compare
          </Button>
          <Button
            className="bg-[#C8A227] hover:bg-[#B49520] text-white"
            onClick={() => onSendRequest?.(selectedProfile)}
          >
            Send Request
          </Button>
        </div>
      </div>
    );
  }

  /* ✅ 2️⃣ Dashboard Overview (Default View) */
  return (
    <div className="max-w-[1440px] mx-auto px-8 space-y-8">
      {/* 🧑‍💼 Profile Overview */}
      <div className="bg-white rounded-[20px] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Profile Image */}
          <div className="relative w-28 h-28">
            <img
              src="https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80"
              alt="Your Profile"
              id="dashboard-photo"
              className="w-full h-full rounded-xl border border-gray-200 shadow-sm object-cover"
            />
            <label
              htmlFor="dashboard-upload"
              className="absolute bottom-1 right-1 bg-[#C8A227] p-2 rounded-full shadow-md cursor-pointer hover:bg-[#B49520] border border-white flex items-center justify-center"
              title="Upload new photo"
            >
              <Camera className="w-4 h-4 text-white" />
            </label>
            <input
              id="dashboard-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const imageURL = URL.createObjectURL(file);
                  document.getElementById("dashboard-photo").src = imageURL;
                }
              }}
            />
          </div>

          {/* Profile Info */}
          <div className="flex flex-col text-center md:text-left">
            <div className="flex flex-col md:flex-col items-center md:items-start">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold">Rajesh Kumar</h2>
                <Badge className="bg-[#C8A2271A] text-[#C8A227] border border-[#C8A22733] rounded-full px-2 py-0.5 flex items-center">
                  <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain" />
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                28 years • Mumbai • Software Engineer
              </p>
            </div>

            <div className="flex items-center justify-center md:justify-start mt-3 mb-4">
              <span className="text-sm px-4 py-2 bg-[#F9F7F5] rounded-full border border-[#C8A22733]">
                Account: Basic
              </span>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/edit-profile')}
                className="rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200"
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button className="bg-[#C8A227] hover:bg-[#B49520] text-white rounded-[12px] flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <StatCard
          label="Interests Sent"
          value={12}
          onViewClick={() => onNavigate?.("requests")}
        />
        <StatCard
          label="Your Matches"
          value={48}
          onViewClick={() => onNavigate?.("browse")}
        />
        <StatCard
          label="Profile Views"
          value={156}
          metric="this week"
          onViewClick={() => onNavigate?.("profile-views")}
        />
        <StatCard
          label="Shortlisted"
          value={8}
          onViewClick={() => onNavigate?.("shortlisted")}
        />
      </div>

      {/* ❤️ Matches For You */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold mb-1 text-[#4b3f33]">
              Matches For You
            </h3>
            <p className="text-muted-foreground m-0">
              Based on your preferences and profile
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {matchProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              {...profile}
              variant="dashboard"
              onSendRequest={onSendRequest}
              onAddToCompare={onAddToCompare}
              isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(profile.id)) : false}
              onToggleShortlist={onToggleShortlist}
            />
          ))}
        </div>
      </div>

      {/* 🕓 Recent Activity */}
      <div className="bg-white rounded-[20px] p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-lg">Recent Activity</h3>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-[#F9F7F5] rounded-[12px]"
            >
              <div className="w-12 h-12 rounded-full bg-[#C8A2271A] flex items-center justify-center">
                <span className="text-[#C8A227] font-semibold">
                  {activity.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div className="flex-1">
                <p className="m-0">
                  <span className="font-semibold">{activity.name}</span>{" "}
                  {activity.action}
                </p>
                <p className="text-sm text-muted-foreground m-0">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
