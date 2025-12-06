import React, { useEffect, useState } from "react";
import { Sparkles, Download, Camera, Loader2 } from "lucide-react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { StatCard } from "../../StatCard";
import { ProfileCard } from "../../ProfileCard";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  getUserProfileDetails,
  getMatches,
  getNotifications,
  getUserPhotos,
  downloadUserPdf,
} from "../../../api/auth";
import usePhotoUpload from "../../../hooks/usePhotoUpload";
import toast from "react-hot-toast";

export function Dashboard({
  onNavigate,
  onSendRequest,
  onAddToCompare,
  compareProfiles = [],
  shortlistedIds = [],
  onToggleShortlist,
  sentProfileIds = [],
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { uploadPhotos } = usePhotoUpload();
  const [uploading, setUploading] = useState(false);

  const [user, setUser] = useState(null);
  const [matchedProfiles, setMatchedProfiles] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingPhotos, setExistingPhotos] = useState(null);

  const mapPhotos = (photosData) => {
    const mappedPhotos = {};
    if (!photosData) return mappedPhotos;
    if (photosData.closerPhoto?.url)
      mappedPhotos.closer = photosData.closerPhoto.url;
    return mappedPhotos;
  };

  useEffect(() => {
    async function fetchDashboardData() {
      if (id) return;

      const hasExistingData = user && matchedProfiles.length > 0;
      if (!hasExistingData) {
        setIsLoading(true);
      }

      try {
        const [userRes, matchesRes, photosRes] = await Promise.all([
          getUserProfileDetails(),
          getMatches({ page: 1, limit: 24, useCache: false }),
          getUserPhotos(),
        ]);

        if (userRes?.success) {
          setUser(userRes.data);
        }

        if (photosRes?.success && photosRes?.data) {
          setExistingPhotos(mapPhotos(photosRes.data));
        }

        if (matchesRes?.success && Array.isArray(matchesRes?.data)) {
          setMatchedProfiles(matchesRes.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, [id, location.pathname]);

  useEffect(() => {
    let isMounted = true;
    async function fetchActivities() {
      setActivityLoading(true);
      try {
        const notificationsRes = await getNotifications(1, 8, false);

        if (
          isMounted &&
          notificationsRes?.success &&
          Array.isArray(notificationsRes?.data)
        ) {
          setRecentActivities(notificationsRes.data.slice(0, 8));
        }
      } catch (e) {
        console.error("❌ Error fetching activities:", e);
      } finally {
        if (isMounted) setActivityLoading(false);
      }
    }
    fetchActivities();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatActivityTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityDescription = (type, message) => {
    const typeMap = {
      request_sent: "sent you a request",
      request_received: "received your request",
      request_accepted: "accepted your request",
      request_rejected: "declined your request",
      profile_view: "viewed your profile",
      like: "liked your profile",
      admin_message: "sent you a message",
      profile_approved: "Your profile was approved",
      profile_rejected: "Your profile needs attention",
      welcome: "Welcome to the platform",
    };
    return typeMap[type] || message;
  };

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C8A227] mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-8">
      <div className="bg-white rounded-[20px] p-4 md:p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
            <img
              src={
                user?.closerPhotoUrl ||
                "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80"
              }
              alt="Your Profile"
              id="dashboard-photo"
              className="w-full h-full rounded-xl border border-gray-200 shadow-sm object-cover"
              onError={(e) => {
                console.error("Image failed to load:", e.target.src);
                e.target.src =
                  "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80";
              }}
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
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files[0];
                if (!f) return;

                const MAX_FILE_SIZE = 2 * 1024 * 1024;
                if (f.size > MAX_FILE_SIZE) {
                  toast.error("File too large. Maximum allowed size is 2MB.");
                  const imgElReset = document.getElementById("dashboard-photo");
                  if (user?.closerPhotoUrl && imgElReset)
                    imgElReset.src = user.closerPhotoUrl;
                  e.target.value = "";
                  return;
                }

                const preview = URL.createObjectURL(f);
                const imgEl = document.getElementById("dashboard-photo");
                if (imgEl) imgEl.src = preview;

                setUploading(true);
                try {
                  const photosToUpload = [
                    { key: "closer", file: f, photoType: "closer" },
                  ];

                  const uploadResult = await uploadPhotos(
                    photosToUpload,
                    existingPhotos
                  );

                  if (uploadResult?.success) {
                    const userRes = await getUserProfileDetails();
                    if (userRes?.success) setUser(userRes.data);

                    const photosRes = await getUserPhotos();
                    if (photosRes?.success && photosRes?.data) {
                      setExistingPhotos(mapPhotos(photosRes.data));
                    }

                    URL.revokeObjectURL(preview);
                  } else {
                    toast.error(
                      uploadResult?.errors[0].error || "Upload failed"
                    );
                    if (user?.closerPhotoUrl && imgEl)
                      imgEl.src = user.closerPhotoUrl;
                  }
                } catch (err) {
                  if (err?.response?.data?.message) {
                    toast.error(err.response.data.message);
                  } else {
                    toast.error("Upload failed. Please try again.");
                  }
                  const imgEl2 = document.getElementById("dashboard-photo");
                  if (user?.closerPhotoUrl && imgEl2)
                    imgEl2.src = user.closerPhotoUrl;
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>

            <div className="flex flex-col text-center md:text-left">
            <div className="flex flex-col md:flex-col items-center md:items-start">
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <h2 className="text-xl md:text-2xl font-semibold">
                  {user?.firstName || "User"} {user?.lastName || ""}
                </h2>
                {user?.isVerified && (
                  <Badge className="bg-[#C8A2271A] text-[#C8A227] border border-[#C8A22733] rounded-full px-2 py-0.5 flex items-center">
                    <img
                      src="/badge.png"
                      alt="Verified"
                      className="w-4 h-4 object-contain"
                    />
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start mt-1">
                {(() => {
                  const customId = user?.customId || user?.userId || user?.id;
                  if (!customId) return null;
                  return (
                    <span className="inline-flex items-center rounded-full px-3 py-[4px] text-[12px] font-medium border bg-[#f9f5ed] text-[#c8a227] border-[#e9d8a6]">
                      ID: {String(customId)}
                    </span>
                  );
                })()}
              </div>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                {user?.age || "N/A"} years • {user?.city || "N/A"} •{" "}
                {user?.occupation || "N/A"}
              </p>
            </div>

            <div className="flex items-center justify-center md:justify-start mt-3 mb-4">
              <span className="text-sm px-4 py-2 bg-[#f9f5ed] rounded-full border border-[#C8A22733]">
                Account:{" "}
                {(() => {
                  const acct = user?.accountType?.str;
                  const display = acct
                    ? acct.charAt(0).toUpperCase() + acct.slice(1)
                    : "Free";
                  return display;
                })()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/edit-profile")}
                className="w-full sm:w-auto rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200 text-sm"
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  setDownloadingPdf(true);
                  await downloadUserPdf();
                  setDownloadingPdf(false);
                }}
                disabled={downloadingPdf}
                className="w-full sm:w-auto rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloadingPdf ? "Downloading..." : "Download PDF"}
              </Button>
              <Button className="w-full sm:w-auto bg-[#C8A227] hover:bg-[#B49520] text-white rounded-[12px] flex items-center justify-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <StatCard
          label="Interests Sent"
          value={user?.interestSentCount ?? 0}
          onViewClick={() => onNavigate?.("requests")}
        />
        <StatCard
          label="Your Matches"
          value={matchedProfiles?.length ?? 0}
          onViewClick={() => onNavigate?.("browse")}
        />
        <StatCard
          label="Profile Views"
          value={user?.profileViewsCount ?? 0}
          onViewClick={() => onNavigate?.("profile-views")}
        />
        <StatCard
          label="Shortlisted"
          value={user?.shortListedCount ?? 0}
          onViewClick={() => onNavigate?.("shortlisted")}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 md:px-0">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold mb-1 text-[#4b3f33]">
              Matches For You
            </h3>
            <p className="text-muted-foreground m-0">
              Based on your preferences and profile
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {matchedProfiles.length > 0 ? (
            matchedProfiles
              .filter(
                (match) => !sentProfileIds.includes(String(match.user.userId))
              )
              .sort((a, b) => {
                const dateA =
                  a.user?.createdAt || a.user?.profileCreatedAt || null;
                const dateB =
                  b.user?.createdAt || b.user?.profileCreatedAt || null;

                if (!dateA && !dateB) {
                  return (
                    (b.scoreDetail?.score || 0) - (a.scoreDetail?.score || 0)
                  );
                }
                if (!dateA) return 1;
                if (!dateB) return -1;

                return new Date(dateB) - new Date(dateA);
              })
              .slice(0, 6)
              .map((match) => (
                <ProfileCard
                  key={match.user.userId}
                  id={match.user.userId}
                  name={`${match.user.firstName} ${match.user.lastName}`}
                  age={match.user.age}
                  city={match.user.city}
                  state={match.user.state}
                  religion={match.user.religion}
                  caste={match.user.subCaste}
                  profession={match.user.profession}
                  image={match.user.closerPhoto?.url}
                  compatibility={match.scoreDetail?.score}
                  status={match.user.connectionStatus || null}
                  variant="browse"
                  onView={() =>
                    navigate(`/userdashboard/profile/${match.user.userId}`)
                  }
                  onSendRequest={onSendRequest}
                  onAddToCompare={onAddToCompare}
                  onRemoveCompare={(id) => {
                    const updatedCompare = compareProfiles.filter(
                      (cid) => String(cid) !== String(id)
                    );
                  }}
                  isInCompare={
                    Array.isArray(compareProfiles)
                      ? compareProfiles
                          .map(String)
                          .includes(
                            String(
                              match.user.userId ||
                                match.user.id ||
                                match.user._id
                            )
                          )
                      : false
                  }
                  isShortlisted={
                    match.user.isFavorite ||
                    (Array.isArray(shortlistedIds) &&
                      shortlistedIds.some(
                        (sid) => String(sid) === String(match.user.userId)
                      ))
                  }
                  onToggleShortlist={onToggleShortlist}
                />
              ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No matches found. Try updating your preferences.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Recent Activity</h3>
          <Link
            to="/dashboard/notifications"
            className="text-sm text-[#C8A227] hover:underline"
            aria-label="View all notifications"
          >
            View all
          </Link>
        </div>
        <div className="space-y-4">
          {activityLoading && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-[#C8A227]" />{" "}
              Loading activity...
            </div>
          )}
          {!activityLoading && recentActivities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No recent activity yet</p>
              <p className="text-xs mt-1">
                Start connecting with profiles to see activity here
              </p>
            </div>
          )}
          {!activityLoading && recentActivities.length > 0 && (
            <>
              {recentActivities.map((activity) => (
                <div
                  key={activity._id}
                  className={`flex items-center gap-4 p-4 rounded-[12px] transition-colors ${
                    activity.isRead ? "bg-[#F9F7F5]" : "bg-blue-50/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#C8A2271A] flex items-center justify-center">
                    <span className="text-[#C8A227] font-semibold text-sm">
                      {activity.title
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="m-0">
                      <span className="font-semibold">{activity.title}</span>
                    </p>
                    <p className="text-sm text-gray-600 m-0 mt-0.5">
                      {activity.message ||
                        getActivityDescription(activity.type, activity.message)}
                    </p>
                    <p className="text-xs text-muted-foreground m-0 mt-1">
                      {formatActivityTime(activity.createdAt)}
                    </p>
                  </div>
                  {!activity.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
