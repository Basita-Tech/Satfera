import React, { useState, useMemo, useEffect } from "react";
import { ProfileCard } from "../../ProfileCard";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getMatches } from "../../../api/auth";
import { Button } from "../../ui/button";

export function Browse({
  profiles,
  onViewProfile,
  onSendRequest,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles,
  shortlistedIds,
  onToggleShortlist,
  sentProfileIds = [],
}) {

  // Local state for recommendations (from matches API)
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [errorMatches, setErrorMatches] = useState(null);

  // Search state (debounced)
  const [searchInput, setSearchInput] = useState("");
  const [searchName, setSearchName] = useState("");
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All Profiles");
  const [filterRange, setFilterRange] = useState("all");
  // Profession dropdown
  const [openProfession, setOpenProfession] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState("All Professions");
  const [professionFilter, setProfessionFilter] = useState("all");
  

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 12; // or whatever your backend supports
  const [recommendedProfiles, setRecommendedProfiles] = useState([]);
  const [totalProfiles, setTotalProfiles] = useState(0);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    setErrorMatches(null);
    try {
      const res = await getMatches({ page: currentPage, limit: profilesPerPage });
      if (res?.success && Array.isArray(res?.data)) {
        const mapped = res.data.map((match, idx) => {
          const user = match.user || match;
          const scoreDetail = match.scoreDetail;
          const compatibilityScore = scoreDetail?.score || user?.compatibility || 0;
          return {
            id: user.userId || user.id || user._id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
            age: user.age,
            city: user.city,
            state: user.state,
            country: user.country,
            profession: user.profession || user.occupation || user.professional?.Occupation,
            religion: user.religion,
            caste: user.subCaste,
            education: user.education?.HighestEducation,
            image: user.closerPhoto?.url || '',
            compatibility: compatibilityScore,
            status: null,
            scoreDetail: scoreDetail || null,
            createdAt: (() => {
              const raw =
                user?.createdAt ||
                user?.profileCreatedAt ||
                match?.createdAt ||
                user?.createdDate ||
                user?.updatedAt ||
                null;
              if (!raw) return null;
              const d = new Date(raw);
              return isNaN(d.getTime()) ? null : d.toISOString();
            })(),
          };
        });
        setRecommendedProfiles(mapped);
        setTotalProfiles(res.pagination?.total || res.total || 0);
      } else {
        setRecommendedProfiles([]);
        setTotalProfiles(0);
      }
    } catch (err) {
      setErrorMatches(err.message || "Failed to load recommendations");
      setRecommendedProfiles([]);
      setTotalProfiles(0);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [currentPage]);

  // Server-side pagination: totalProfiles from backend, current page already fetched
  const totalPages = Math.max(1, Math.ceil(totalProfiles / profilesPerPage));

  // Debug logging
  useEffect(() => {
    console.log('📊 [Browse Pagination]', {
      totalProfiles,
      totalPages,
      currentPage,
      profilesPerPage,
      recommendedProfilesCount: recommendedProfiles.length
    });
  }, [totalProfiles, totalPages, currentPage, recommendedProfiles.length]);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRange, searchName, professionFilter]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="mb-2 m-0 text-2xl md:text-3xl lg:text-4xl font-bold text-black">Recommendations</h2>
          </div>

          {/* Right side controls: Filter dropdown */}
          <div className="flex w-full md:w-auto gap-3">
            {/* Time Filter Dropdown */}
            <div className="relative flex-1 md:w-64">
  <button
    onClick={() => setOpenFilter(!openFilter)}
    className="
      w-full h-11 px-4 flex items-center justify-between
      rounded-[12px] border-[1.5px] border-[#c8a227]
      bg-white text-gray-800 font-medium text-sm
      hover:bg-[#f9f5ed] transition-all duration-200
      shadow-sm
    "
  >
    <span>{selectedFilter}</span>

    <svg
      className={`w-5 h-5 text-[#c8a227] transition-transform duration-200 ${
        openFilter ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  </button>

  {openFilter && (
    <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-[12px] shadow-lg z-50 overflow-hidden">
      {[
        { label: "All Profiles", value: "all" },
        { label: "This Week", value: "week" },
        { label: "This Month", value: "month" },
      ].map((item, idx) => (
        <div
          key={item.value}
          onClick={() => {
            setSelectedFilter(item.label);
            setOpenFilter(false);
            setFilterRange(item.value);
          }}
          className={`
            px-4 py-3 cursor-pointer flex justify-between items-center
            hover:bg-[#f9f5ed] text-gray-700 transition-colors
            ${idx !== 0 ? "border-t border-gray-100" : ""}
          `}
        >
          <span className="text-sm font-medium">{item.label}</span>

          {selectedFilter === item.label && (
            <svg
              className="w-5 h-5 text-[#c8a227]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      ))}
    </div>
  )}
            </div>
          </div>

</div>
        {/* Loading / Error States */}
        {loadingMatches && (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto" />
            <p className="mt-4 text-gray-600">Loading recommendations...</p>
          </div>
        )}
        {!loadingMatches && errorMatches && (
          <div className="py-12 text-center text-red-600 font-medium">
            Failed to load recommendations.
          </div>
        )}

        {!loadingMatches && !errorMatches && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {recommendedProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                {...profile}
                variant="browse"
                onView={onViewProfile}
                onSendRequest={onSendRequest}
                onAddToCompare={onAddToCompare}
                onRemoveCompare={onRemoveCompare}
                isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false}
                isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid) => String(sid) === String(profile.id)) : false}
                onToggleShortlist={onToggleShortlist}
              />
            ))}
            {recommendedProfiles.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-600">
                No recommendations found.
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loadingMatches && totalProfiles > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  backgroundColor: 'white',
                  borderColor: '#d1d5db',
                  color: '#374151'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.backgroundColor = '#C8A227';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = '#C8A227';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border shadow-sm h-8 px-3"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Page Numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // Show first, last, current, and adjacent pages
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        style={{
                          backgroundColor: isActive ? '#C8A227' : 'white',
                          color: isActive ? 'white' : '#374151',
                          borderColor: isActive ? '#C8A227' : '#d1d5db'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = '#f9f5ed';
                            e.currentTarget.style.borderColor = '#C8A227';
                          } else {
                            e.currentTarget.style.backgroundColor = '#B49520';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          } else {
                            e.currentTarget.style.backgroundColor = '#C8A227';
                          }
                        }}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border shadow-sm w-10 h-10"
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                style={{
                  backgroundColor: 'white',
                  borderColor: '#d1d5db',
                  color: '#374151'
                }}
                onMouseEnter={(e) => {
                  if (currentPage < totalPages) {
                    e.currentTarget.style.backgroundColor = '#C8A227';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = '#C8A227';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage < totalPages) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border shadow-sm h-8 px-3"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Total: {totalProfiles} profiles
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
