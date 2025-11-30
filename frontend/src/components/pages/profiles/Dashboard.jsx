import React, { useEffect,useState } from "react";
import {
  ChevronLeft,
  Sparkles,
  Download,
  Camera,
  Loader2,
} from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { StatCard } from "../../StatCard";
import { ProfileCard } from "../../ProfileCard";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { getUserProfileDetails, getMatches, getViewProfiles, getNotifications } from "../../../api/auth";

export function Dashboard({
  profiles = [],
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
  const [user, setUser] = useState(null);
  const [matchedProfiles, setMatchedProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  // Pagination state for recent activity
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit, setActivityLimit] = useState(10);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);


  useEffect(()=>{
    async function fetchDashboardData(){
      // Only fetch dashboard data when not viewing a specific profile
      if (id) return;
      
      // Set loading only if there's no cached data
      const hasExistingData = user && matchedProfiles.length > 0;
      if (!hasExistingData) {
        setIsLoading(true);
      }

      try {
        // Fetch all data in parallel for speed
        const [userRes, matchesRes] = await Promise.all([
          getUserProfileDetails(),
          getMatches({ page: 1, limit: 24, useCache: false })
        ]);

        console.log("👤 User Response:", userRes);
        if(userRes?.success){
          setUser(userRes.data)
        }

        console.log("💑 Matches Response:", matchesRes);
        if(matchesRes?.success && Array.isArray(matchesRes?.data)){
          setMatchedProfiles(matchesRes.data)
          console.log("✅ Set matched profiles:", matchesRes.data.length);
        }

        // Notifications are fetched in separate effect for independent pagination
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  },[id, location.pathname])

  // Fetch notifications with pagination
  useEffect(() => {
    let isMounted = true;
    async function fetchActivities(){
      setActivityLoading(true);
      try {
        const notificationsRes = await getNotifications(activityPage, activityLimit, false);
        console.log("🔔 Recent Activities Response (page change):", notificationsRes);
        if(isMounted && notificationsRes?.success && Array.isArray(notificationsRes?.data)){
          setRecentActivities(notificationsRes.data);
          if (notificationsRes.pagination){
            setActivityTotal(notificationsRes.pagination.total || notificationsRes.data.length);
            setActivityHasMore(notificationsRes.pagination.hasMore || (notificationsRes.pagination.page * notificationsRes.pagination.limit < (notificationsRes.pagination.total || 0)));
          } else {
            setActivityTotal(notificationsRes.data.length);
            setActivityHasMore(false);
          }
        }
      } catch (e){
        console.error("❌ Error fetching activities:", e);
      } finally {
        if (isMounted) setActivityLoading(false);
      }
    }
    fetchActivities();
    return () => { isMounted = false; };
  }, [activityPage, activityLimit]);

  const totalActivityPages = Math.max(1, Math.ceil(activityTotal / activityLimit));
  const handleActivityPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalActivityPages && newPage !== activityPage){
      setActivityPage(newPage);
    }
  };
  const handleActivityLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10) || 10;
    setActivityLimit(newLimit);
    setActivityPage(1);
  };

  // Fetch selected profile details when id changes
  useEffect(() => {
    if (id) {
      async function fetchProfileDetails() {
        // Only show loading if no existing profile
        if (!selectedProfile) {
          setIsProfileLoading(true);
        }
        
        try {
          const profileRes = await getViewProfiles(id);
          console.log("👁️ Profile View Response:", profileRes);
          if (profileRes?.success) {
            setSelectedProfile(profileRes.data);
          }
        } catch (error) {
          console.error("Error fetching profile details:", error);
        } finally {
          setIsProfileLoading(false);
        }
      }
      fetchProfileDetails();
    } else {
      setSelectedProfile(null);
      setIsProfileLoading(false);
    }
  }, [id]);

  const matchProfiles = profiles.slice(0, 6);

  // Helper function to format time
  const formatActivityTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Helper to get activity description from notification type
  const getActivityDescription = (type, message) => {
    const typeMap = {
      'request_sent': 'sent you a request',
      'request_received': 'received your request',
      'request_accepted': 'accepted your request',
      'request_rejected': 'declined your request',
      'profile_view': 'viewed your profile',
      'like': 'liked your profile',
      'admin_message': 'sent you a message',
      'profile_approved': 'Your profile was approved',
      'profile_rejected': 'Your profile needs attention',
      'welcome': 'Welcome to the platform'
    };
    return typeMap[type] || message;
  };

  /* ✅ 1️⃣ Profile Details View (if a profile is selected) */
  if (id) {
    if (isProfileLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#C8A227] mx-auto mb-4" />
            <p className="text-gray-600">Loading profile details...</p>
          </div>
        </div>
      );
    }

    if (!selectedProfile) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">Profile not found</p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-4 bg-[#C8A227] hover:bg-[#B49520] text-white"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6 md:space-y-8">
        {/* 🔙 Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2 text-[#C8A227] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm hover:opacity-80 transition"
        >
          <ChevronLeft size={20} className="text-[#C8A227]" />
          Back
        </button>

        {/* 🧾 Profile Card Section */}
        <div className="bg-white rounded-[20px] p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-start gap-4 md:gap-6 mt-12 md:mt-0">
          {/* 🖼️ Profile Image */}
          <div className="relative w-24 h-24 md:w-[120px] md:h-[120px] shrink-0 overflow-visible mx-auto md:mx-0">
            <img
              src={
                user?.closerPhotoUrl ||
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
          <div className="flex-1 space-y-3 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-2">
              <h2 className="text-xl md:text-2xl font-semibold">
                {selectedProfile?.firstName} {selectedProfile?.lastName}
              </h2>
              {(() => {
                const customId = selectedProfile?.customId || selectedProfile?.userId || selectedProfile?.id;
                if (!customId) return null;
                return (
                  <span className="inline-flex items-center rounded-full px-3 py-[4px] text-[12px] font-medium border bg-[#f9f5ed] text-[#c8a227] border-[#e9d8a6]">
                    ID: {String(customId)}
                  </span>
                );
              })()}
              <Badge className="bg-[#C8A2271A] text-[#C8A227] border border-[#C8A22733] rounded-full px-2 py-0.5 flex items-center">
                <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain" />
              </Badge>
              {selectedProfile?.scoreDetail?.score && (
                <Badge className="bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">
                  {selectedProfile.scoreDetail.score}% Match
                </Badge>
              )}
            </div>

            <p className="text-gray-700 text-sm md:text-base">
              {selectedProfile?.age} years • {selectedProfile?.personal?.city} • {selectedProfile?.professional?.Occupation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <p>
                <strong>Height:</strong> {selectedProfile?.personal?.height || "—"}
              </p>
              <p>
                <strong>Religion:</strong> {selectedProfile?.personal?.religion || "—"}
              </p>
              <p>
                <strong>Education:</strong> {selectedProfile?.education?.HighestEducation || "—"}
              </p>
              <p>
                <strong>Community:</strong> {selectedProfile?.personal?.subCaste || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 👤 Personal Details */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Gender:</strong> {selectedProfile?.gender || "—"}
            </p>
            <p>
              <strong>Marital Status:</strong> {selectedProfile?.personal?.marriedStatus || "—"}
            </p>
            <p>
              <strong>Diet:</strong> {selectedProfile?.healthAndLifestyle?.diet || "—"}
            </p>
            <p>
              <strong>Weight:</strong> {selectedProfile?.personal?.weight || "—"}
            </p>
            <p>
              <strong>Birth Place:</strong> {selectedProfile?.personal?.birthPlace || "—"}
            </p>
            <p>
              <strong>Nationality:</strong> {selectedProfile?.personal?.nationality || "—"}
            </p>
            <p>
              <strong>Astrological Sign:</strong> {selectedProfile?.personal?.astrologicalSign || "—"}
            </p>
            <p>
              <strong>Dosh:</strong> {selectedProfile?.personal?.dosh || "—"}
            </p>
          </div>
        </div>

        {/* 💼 Professional Details */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Professional Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Organization:</strong> {selectedProfile?.professional?.OrganizationName || "—"}
            </p>
            <p>
              <strong>Employment Status:</strong> {selectedProfile?.professional?.EmploymentStatus || "—"}
            </p>
            <p>
              <strong>Annual Income:</strong> {selectedProfile?.professional?.AnnualIncome || "—"}
            </p>
            <p>
              <strong>Occupation:</strong> {selectedProfile?.professional?.Occupation || "—"}
            </p>
          </div>
        </div>

        {/* 🎓 Education Details */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Education Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Highest Education:</strong> {selectedProfile?.education?.HighestEducation || "—"}
            </p>
            <p>
              <strong>Field of Study:</strong> {selectedProfile?.education?.FieldOfStudy || "—"}
            </p>
            <p>
              <strong>University:</strong> {selectedProfile?.education?.University || "—"}
            </p>
            <p>
              <strong>Country:</strong> {selectedProfile?.education?.CountryOfEducation || "—"}
            </p>
          </div>
        </div>

        {/* 👨‍👩‍👧 Family Details */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Family Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Has Children:</strong> {selectedProfile?.family?.hasChildren ? "Yes" : "No"}
            </p>
            <p>
              <strong>Number of Children:</strong> {selectedProfile?.family?.numberOfChildren || "0"}
            </p>
            <p>
              <strong>Children Living With You:</strong> {selectedProfile?.family?.isChildrenLivingWithYou ? "Yes" : "No"}
            </p>
            <p>
              <strong>Legally Separated:</strong> {selectedProfile?.family?.isLegallySeparated ? "Yes" : "No"}
            </p>
          </div>
        </div>

        {/* 💪 Health & Lifestyle */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Health & Lifestyle</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Alcohol:</strong> {selectedProfile?.healthAndLifestyle?.isAlcoholic || "—"}
            </p>
            <p>
              <strong>Tobacco:</strong> {selectedProfile?.healthAndLifestyle?.isTobaccoUser || "—"}
            </p>
            <p>
              <strong>Tattoos:</strong> {selectedProfile?.healthAndLifestyle?.isHaveTattoos || "—"}
            </p>
            <p>
              <strong>Diet:</strong> {selectedProfile?.healthAndLifestyle?.diet || "—"}
            </p>
          </div>
        </div>

        {/* 🎯 Compatibility Reasons */}
        {selectedProfile?.scoreDetail?.reasons && selectedProfile.scoreDetail.reasons.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">Why This Match?</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              {selectedProfile.scoreDetail.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 🧩 Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button
            variant="outline"
            className="border-[#C8A227] text-[#C8A227] hover:bg-[#C8A227] hover:text-white"
            onClick={async () => { try { await onAddToCompare?.(selectedProfile?.id || selectedProfile, selectedProfile); } catch (e) { console.warn('Add to compare failed', e); } }}
          >
            Add to Compare
          </Button>
          {sentProfileIds.includes(String(selectedProfile?.userId || selectedProfile?.id)) ? (
            <Button
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              onClick={() => {
                // TODO: Implement withdraw request functionality
                console.log('Withdraw request for:', selectedProfile?.userId || selectedProfile?.id);
              }}
            >
              Withdraw Request
            </Button>
          ) : (
            <Button
              className="bg-[#C8A227] hover:bg-[#B49520] text-white"
              onClick={() => onSendRequest?.(selectedProfile)}
            >
              Send Request
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ✅ 2️⃣ Dashboard Overview (Default View) */
  // Only show full loading screen if there's no data at all
  if (isLoading && !user && matchedProfiles.length === 0) {
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
      {/* 🧑‍💼 Profile Overview */}
      <div className="bg-white rounded-[20px] p-4 md:p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          {/* Profile Image */}
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
                e.target.src = "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80";
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
              className="hidden"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) {
                  document.getElementById("dashboard-photo").src =
                    URL.createObjectURL(f);
                }
              }}
            />
          </div>

          {/* Profile Info */}
          <div className="flex flex-col text-center md:text-left">
            <div className="flex flex-col md:flex-col items-center md:items-start">
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <h2 className="text-xl md:text-2xl font-semibold">
                {user?.firstName || "User"} {user?.lastName || ""}
              </h2>
              {(() => {
                const customId = user?.customId || user?.userId || user?.id;
                if (!customId) return null;
                return (
                  <span className="inline-flex items-center rounded-full px-3 py-[4px] text-[12px] font-medium border bg-[#f9f5ed] text-[#c8a227] border-[#e9d8a6]">
                    ID: {String(customId)}
                  </span>
                );
              })()}
              {user?.isVerified && (
                <Badge className="bg-[#C8A2271A] text-[#C8A227] border border-[#C8A22733] rounded-full px-2 py-0.5 flex items-center">
                  <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain" />
                </Badge>
              )}
              </div>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                {user?.age || "N/A"} years • {user?.city || "N/A"} • {user?.occupation || "N/A"}
              </p>
            </div>

            <div className="flex items-center justify-center md:justify-start mt-3 mb-4">
              <span className="text-sm px-4 py-2 bg-[#f9f5ed] rounded-full border border-[#C8A22733]">
                 Account: {user?.accountType || "Basic"}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/edit-profile')}
                className="w-full sm:w-auto rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200 text-sm"
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200 text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button className="w-full sm:w-auto bg-[#C8A227] hover:bg-[#B49520] text-white rounded-[12px] flex items-center justify-center gap-2 text-sm">
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

      {/* ❤️ Matches For You */}
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
              .filter(match => !sentProfileIds.includes(String(match.user.userId)))
              .sort((a, b) => {
                // Sort by creation date (newest first)
                const dateA = a.user?.createdAt || a.user?.profileCreatedAt || null;
                const dateB = b.user?.createdAt || b.user?.profileCreatedAt || null;
                
                if (!dateA && !dateB) {
                  // If both have no date, sort by compatibility
                  return (b.scoreDetail?.score || 0) - (a.scoreDetail?.score || 0);
                }
                if (!dateA) return 1; // a goes to end
                if (!dateB) return -1; // b goes to end
                // Both have dates, sort newest first
                return new Date(dateB) - new Date(dateA);
              })
              .slice(0, 8)
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
                profession={match.user.occupation}
                image={match.user.closerPhoto?.url}
                compatibility={match.scoreDetail?.score}
                status={match.user.connectionStatus || null}
                variant="browse"
                onView={() => navigate(`/userdashboard/profile/${match.user.userId}`)}
                onSendRequest={onSendRequest}
                onAddToCompare={onAddToCompare}
                onRemoveCompare={(id) => {
                  const updatedCompare = compareProfiles.filter(cid => String(cid) !== String(id));
                  // Assuming there's a state setter or callback to update compareProfiles
                }}
                isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(match.user.userId || match.user.id || match.user._id)) : false}
                isShortlisted={match.user.isFavorite || (Array.isArray(shortlistedIds) && shortlistedIds.some(sid => String(sid) === String(match.user.userId)))}
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

      {/* 🕓 Recent Activity */}
      <div className="bg-white rounded-[20px] p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-lg">Recent Activity</h3>
        <div className="space-y-4">
          {activityLoading && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-[#C8A227]" /> Loading activity...
            </div>
          )}
          {!activityLoading && recentActivities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No recent activity yet</p>
              <p className="text-xs mt-1">Start connecting with profiles to see activity here</p>
            </div>
          )}
          {!activityLoading && recentActivities.length > 0 && (
            <>
              {recentActivities.map((activity) => (
                <div
                  key={activity._id}
                  className={`flex items-center gap-4 p-4 rounded-[12px] transition-colors ${
                    activity.isRead ? 'bg-[#F9F7F5]' : 'bg-blue-50/50'
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
                      {activity.message || getActivityDescription(activity.type, activity.message)}
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
              {totalActivityPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F9F7F5] rounded-xl p-4 border border-[#e6dec5]">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-700">
                    <span>Showing {recentActivities.length} of {activityTotal}</span>
                    <span className="hidden sm:inline">| Page {activityPage} of {totalActivityPages}</span>
                  </div>
                  <div className="flex items-center gap-2 order-3 sm:order-2">
                    <button
                      onClick={() => handleActivityPageChange(activityPage - 1)}
                      disabled={activityPage === 1 || activityLoading}
                      className={`px-3 py-1 rounded-full text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                        activityLoading && activityPage > 1
                          ? 'bg-[#d4af37] text-white border border-[#d4af37]'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-[#d4af37] hover:text-white hover:border-[#d4af37]'
                      }`}
                    >Prev</button>
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalActivityPages }).map((_, idx) => {
                        const pNum = idx + 1;
                        if (pNum === 1 || pNum === totalActivityPages || (pNum >= activityPage - 1 && pNum <= activityPage + 1)) {
                          return (
                            <button
                              key={pNum}
                              onClick={() => handleActivityPageChange(pNum)}
                              className={`w-9 h-9 rounded-full text-sm border ${pNum === activityPage ? 'bg-[#d4af37] text-white border-[#d4af37]' : 'bg-white border-gray-300 text-gray-700 hover:bg-[#f9f5ed] active:bg-[#d4af37] active:text-white active:border-[#d4af37]'}`}
                            >{pNum}</button>
                          );
                        } else if (pNum === activityPage - 2 || pNum === activityPage + 2) {
                          return <span key={pNum} className="px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => handleActivityPageChange(activityPage + 1)}
                      disabled={activityPage >= totalActivityPages || (!activityHasMore && activityPage >= totalActivityPages) || activityLoading}
                      className={`px-3 py-1 rounded-full text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                        activityLoading && activityPage < totalActivityPages
                          ? 'bg-[#d4af37] text-white border border-[#d4af37]'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-[#d4af37] hover:text-white hover:border-[#d4af37]'
                      }`}
                    >Next</button>
                  </div>
                  <div className="flex items-center gap-2 text-sm order-2 sm:order-3">
                    <span className="text-gray-600">Per Page:</span>
                    <select value={activityLimit} onChange={handleActivityLimitChange} className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                      {[10,20,50,100].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
