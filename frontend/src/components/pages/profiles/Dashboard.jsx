import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Download, Camera, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { StatCard } from "../../StatCard";
import { ProfileCard } from "../../ProfileCard";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { getUserProfileDetails, getMatches, getUserPhotos, downloadUserPdf } from "../../../api/auth";
import usePhotoUpload from "../../../hooks/usePhotoUpload";
import toast from "react-hot-toast";
export function Dashboard({
  onNavigate,
  onSendRequest,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles = [],
  shortlistedIds = [],
  onToggleShortlist,
  sentProfileIds = []
}) {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    uploadPhotos
  } = usePhotoUpload();
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PROFILES_PER_PAGE = 12;
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingPhotos, setExistingPhotos] = useState(null);
  const recommendationsSectionRef = useRef(null);
  const mapPhotos = photosData => {
    const mappedPhotos = {};
    if (!photosData) return mappedPhotos;
    if (photosData.closerPhoto?.url) mappedPhotos.closer = photosData.closerPhoto.url;
    return mappedPhotos;
  };
  useEffect(() => {
    async function fetchDashboardData() {
      if (id) return;
      const hasExistingData = user;
      if (!hasExistingData) {
        setIsLoading(true);
      }
      try {
        const [userRes, photosRes] = await Promise.all([getUserProfileDetails(), getUserPhotos()]);
        if (userRes?.success) {
          setUser(userRes.data);
        }
        if (photosRes?.success && photosRes?.data) {
          setExistingPhotos(mapPhotos(photosRes.data));
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
    const fetchRecommendations = async () => {
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      try {
        const response = await getMatches({
          page: currentPage,
          limit: PROFILES_PER_PAGE,
          useCache: true
        });
        if (!isMounted) return;
        const data = Array.isArray(response?.data) ? response.data : [];
        const mapped = data.map(match => {
          const userData = match?.user || match || {};
          return {
            id: userData.userId || userData.id || userData._id,
            name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown",
            age: userData.age,
            city: userData.city,
            state: userData.state,
            religion: userData.religion,
            caste: userData.subCaste,
            profession: userData.profession || userData.occupation || userData.professional?.Occupation,
            image: userData.closerPhoto?.url,
            compatibility: match?.scoreDetail?.score || userData.compatibility,
            status: userData.connectionStatus || null
          };
        });
        setRecommendations(mapped);
        setTotalMatches(response?.pagination?.total ?? response?.total ?? mapped.length);
      } catch (err) {
        if (!isMounted) return;
        setRecommendationsError(err?.message || "Failed to load recommendations");
        setRecommendations([]);
        setTotalMatches(0);
      } finally {
        if (isMounted) {
          setRecommendationsLoading(false);
        }
      }
    };
    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const filteredRecommendations = useMemo(() => recommendations.filter(profile => !sentProfileIds.includes(String(profile.id))), [recommendations, sentProfileIds]);

  const totalPages = Math.max(1, Math.ceil(totalMatches / PROFILES_PER_PAGE));

  useEffect(() => {
    if (recommendationsLoading) return;
    const pageHasResults = recommendations.length > 0;
    const nothingVisible = filteredRecommendations.length === 0;
    const hasMorePages = currentPage < totalPages;
    if (pageHasResults && nothingVisible && hasMorePages) {
      setRecommendationsLoading(true);
      setCurrentPage(currentPage + 1);
    }
  }, [filteredRecommendations.length, recommendations.length, currentPage, totalPages, recommendationsLoading]);

  const handlePageChange = pageNumber => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
      if (recommendationsSectionRef.current) {
        recommendationsSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  };

  const handleViewMatches = () => {
    recommendationsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  if (isLoading && !user) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C8A227] mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>;
  }
  return <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-8">
      <div className="bg-white rounded-[20px] p-4 md:p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
            <img src={user?.closerPhotoUrl || "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80"} alt="Your Profile" id="dashboard-photo" className="w-full h-full rounded-xl border border-gray-200 shadow-sm object-cover" onError={e => {
            console.error("Image failed to load:", e.target.src);
            e.target.src = "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80";
          }} />
            <label htmlFor="dashboard-upload" className="absolute bottom-1 right-1 bg-[#C8A227] p-2 rounded-full shadow-md cursor-pointer hover:bg-[#B49520] border border-white flex items-center justify-center" title="Upload new photo">
              <Camera className="w-4 h-4 text-white" />
            </label>
            <input id="dashboard-upload" type="file" accept="image/*" capture="environment" className="hidden" onChange={async e => {
            const f = e.target.files[0];
            if (!f) return;
            const MAX_FILE_SIZE = 2 * 1024 * 1024;
            if (f.size > MAX_FILE_SIZE) {
              toast.error("File too large. Maximum allowed size is 2MB.");
              const imgElReset = document.getElementById("dashboard-photo");
              if (user?.closerPhotoUrl && imgElReset) imgElReset.src = user.closerPhotoUrl;
              e.target.value = "";
              return;
            }
            const preview = URL.createObjectURL(f);
            const imgEl = document.getElementById("dashboard-photo");
            if (imgEl) imgEl.src = preview;
            setUploading(true);
            try {
              const photosToUpload = [{
                key: "closer",
                file: f,
                photoType: "closer"
              }];
              const uploadResult = await uploadPhotos(photosToUpload, existingPhotos);
              if (uploadResult?.success) {
                const userRes = await getUserProfileDetails();
                if (userRes?.success) setUser(userRes.data);
                const photosRes = await getUserPhotos();
                if (photosRes?.success && photosRes?.data) {
                  setExistingPhotos(mapPhotos(photosRes.data));
                }
                URL.revokeObjectURL(preview);
              } else {
                toast.error(uploadResult?.errors[0].error || "Upload failed");
                if (user?.closerPhotoUrl && imgEl) imgEl.src = user.closerPhotoUrl;
              }
            } catch (err) {
              if (err?.response?.data?.message) {
                toast.error(err.response.data.message);
              } else {
                toast.error("Upload failed. Please try again.");
              }
              const imgEl2 = document.getElementById("dashboard-photo");
              if (user?.closerPhotoUrl && imgEl2) imgEl2.src = user.closerPhotoUrl;
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }} />
            {uploading && <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>}
          </div>

            <div className="flex flex-col text-center md:text-left">
            <div className="flex flex-col md:flex-col items-center md:items-start">
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <h2 className="text-xl md:text-2xl font-semibold">
                  {user?.firstName || "User"} {user?.lastName || ""}
                </h2>
                {user?.isVerified && <Badge className="bg-[#C8A2271A] text-[#C8A227] border border-[#C8A22733] rounded-full px-2 py-0.5 flex items-center">
                    <img src="/badge.png" alt="Verified" className="w-4 h-4 object-contain" />
                  </Badge>}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start mt-1">
                {(() => {
                const customId = user?.customId || user?.userId || user?.id;
                if (!customId) return null;
                return <span className="inline-flex items-center rounded-full px-3 py-[4px] text-[12px] font-medium border bg-[#f9f5ed] text-[#c8a227] border-[#e9d8a6]">
                      ID: {String(customId)}
                    </span>;
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
                const display = acct ? acct.charAt(0).toUpperCase() + acct.slice(1) : "Free";
                return display;
              })()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full">
              <Button variant="outline" onClick={() => navigate("/dashboard/edit-profile")} className="w-full sm:w-auto rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200 text-sm">
                Edit Profile
              </Button>
              <Button variant="outline" onClick={async () => {
              setDownloadingPdf(true);
              await downloadUserPdf();
              setDownloadingPdf(false);
            }} disabled={downloadingPdf} className="w-full sm:w-auto rounded-[12px] bg-[#f9f5ed] text-[#C8A227] border-[1.3px] border-[#e0c36a] font-medium hover:bg-[#C8A227] hover:text-white hover:border-[#C8A227] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
          value={Array.isArray(sentProfileIds) ? sentProfileIds.length : user?.interestSentCount ?? 0}
          onViewClick={() => onNavigate?.("requests")}
        />
        <StatCard label="Your Matches" value={totalMatches} onViewClick={handleViewMatches} />
        <StatCard label="Profile Views" value={user?.profileViewsCount ?? 0} onViewClick={() => onNavigate?.("profile-views")} />
        <StatCard
          label="Shortlisted"
          value={Array.isArray(shortlistedIds) ? shortlistedIds.length : user?.shortListedCount ?? 0}
          onViewClick={() => onNavigate?.("shortlisted")}
        />
      </div>

      <div ref={recommendationsSectionRef} className="space-y-4">
        <div className="flex items-center justify-between px-2 md:px-0">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold mb-1 text-[#4b3f33]">
              Recommendations
            </h3>
            <p className="text-muted-foreground m-0">
              Curated profiles for you
            </p>
          </div>
        </div>

        {recommendationsLoading && <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto" />
            <p className="mt-4 text-gray-600">Loading recommendations...</p>
          </div>}

        {!recommendationsLoading && recommendationsError && <div className="py-12 text-center text-red-600 font-medium">
            Failed to load recommendations.
          </div>}

        {!recommendationsLoading && !recommendationsError && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredRecommendations.map(profile => <ProfileCard key={profile.id} {...profile} variant="browse" onView={() => navigate(`/userdashboard/profile/${profile.id}`)} onSendRequest={onSendRequest} onAddToCompare={onAddToCompare} onRemoveCompare={onRemoveCompare} isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false} isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some(sid => String(sid) === String(profile.id)) : false} onToggleShortlist={onToggleShortlist} />)}
            {filteredRecommendations.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">
                No matches found. Try updating your preferences.
              </div>}
          </div>}

        {!recommendationsLoading && totalMatches > 0 && <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} style={{
            backgroundColor: "white",
            borderColor: "#d1d5db",
            color: "#374151"
          }} onMouseEnter={e => {
            if (currentPage !== 1) {
              e.currentTarget.style.backgroundColor = "#C8A227";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "#C8A227";
            }
          }} onMouseLeave={e => {
            if (currentPage !== 1) {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = "#374151";
              e.currentTarget.style.borderColor = "#d1d5db";
            }
          }} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border shadow-sm h-8 px-3">
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {Array.from({
              length: totalPages
            }, (_, i) => i + 1).map(pageNum => {
              if (pageNum === 1 || pageNum === totalPages || pageNum >= currentPage - 1 && pageNum <= currentPage + 1) {
                const isActive = pageNum === currentPage;
                return <button key={pageNum} onClick={() => handlePageChange(pageNum)} style={{
                  backgroundColor: isActive ? "#C8A227" : "white",
                  color: isActive ? "white" : "#374151",
                  borderColor: isActive ? "#C8A227" : "#d1d5db"
                }} onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "#f9f5ed";
                    e.currentTarget.style.borderColor = "#C8A227";
                  } else {
                    e.currentTarget.style.backgroundColor = "#B49520";
                  }
                }} onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "white";
                    e.currentTarget.style.borderColor = "#d1d5db";
                  } else {
                    e.currentTarget.style.backgroundColor = "#C8A227";
                  }
                }} className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border shadow-sm w-10 h-10">
                        {pageNum}
                      </button>;
              }
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return <span key={pageNum} className="px-1">...</span>;
              }
              return null;
            })}
              </div>

              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} style={{
            backgroundColor: "white",
            borderColor: "#d1d5db",
            color: "#374151"
          }} onMouseEnter={e => {
            if (currentPage < totalPages) {
              e.currentTarget.style.backgroundColor = "#C8A227";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "#C8A227";
            }
          }} onMouseLeave={e => {
            if (currentPage < totalPages) {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = "#374151";
              e.currentTarget.style.borderColor = "#d1d5db";
            }
          }} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border shadow-sm h-8 px-3">
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Total: {totalMatches} profiles
            </div>
          </div>}
      </div>

    </div>;
}