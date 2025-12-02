import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Heart, MapPin, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { JOB_TITLES } from "../lib/constant";
import { INDIAN_CITIES } from "../lib/constant";

const NewProfile = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, hasMore: false });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [professionFilter, setProfessionFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  console.log('INDIAN_CITIES loaded:', INDIAN_CITIES?.length, 'cities');

  // Fetch profiles from API (uses current pagination.page)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ""; // ensure env variable is set

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      // Hitting backend with page & limit
      const response = await fetch(`${API_BASE_URL}/api/profiles?page=${pagination.page}&limit=${pagination.limit}`);
      const data = await response.json();
      console.log('[NewProfile] Fetched:', { page: pagination.page, limit: pagination.limit, rawPagination: data.pagination, count: data.data?.length });

      if (data.success) {
        setProfiles(data.data);
        // Merge incoming pagination (fallbacks if backend returns different shape)
        setPagination((prev) => ({
          ...prev,
          page: data.pagination?.page ?? prev.page,
          limit: data.pagination?.limit ?? prev.limit,
          total: data.pagination?.total ?? data.total ?? prev.total,
          hasMore: data.pagination?.hasMore ?? (data.pagination?.page * data.pagination?.limit < (data.pagination?.total ?? 0))
        }));
        
        // Initialize favorites from the data
        const favSet = new Set();
        data.data.forEach((profile) => {
          if (profile.user.isFavorite) {
            favSet.add(profile.user.userId);
          }
        });
        setFavorites(favSet);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
      setError("Failed to load profiles. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  // Initial + page change fetch
  useEffect(() => {
    fetchProfiles();
  }, [pagination.page]);

  // Handle page change
  const handlePageChange = (newPage) => {
    const maxPage = Math.ceil(pagination.total / pagination.limit) || 1;
    if (newPage >= 1 && newPage <= maxPage && newPage !== pagination.page) {
      // Optimistically update page so UI responds even if backend still returns same data
      setPagination((prev) => ({ ...prev, page: newPage }));
      console.log('[NewProfile] Page change requested ->', newPage);
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10) || 10;
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 })); // reset to first page
  };

  // Normalize a profile's profession for filtering/display
  const getProfession = (p) => {
    try {
      return (
        p?.user?.occupation ||
        p?.user?.professional?.Occupation ||
        p?.professional?.Occupation ||
        p?.occupation ||
        ""
      );
    } catch {
      return "";
    }
  };

  // Derived visible list with profession and city filters
  const visibleProfiles = useMemo(() => {
    let filtered = profiles;
    
    if (professionFilter) {
      const needle = professionFilter.toLowerCase();
      filtered = filtered.filter((p) => String(getProfession(p)).toLowerCase().includes(needle));
    }
    
    if (cityFilter) {
      const cityNeedle = cityFilter.toLowerCase();
      filtered = filtered.filter((p) => String(p?.city || '').toLowerCase().includes(cityNeedle));
    }
    
    return filtered;
  }, [profiles, professionFilter, cityFilter]);

  // Toggle favorite
  const toggleFavorite = async (userId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(userId)) {
      newFavorites.delete(userId);
    } else {
      newFavorites.add(userId);
    }
    setFavorites(newFavorites);

    try {
      // Replace with your actual API endpoint
      await fetch(`/api/profiles/${userId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newFavorites.has(userId) }),
      });
    } catch (error) {
      console.error("Error updating favorite:", error);
      // Revert on error
      setFavorites(favorites);
    }
  };

  // Handle view profile
  const handleViewProfile = (userId) => {
    navigate(`/dashboard/profile/${userId}`);
  };

  const totalPages = useMemo(() => Math.ceil((pagination.total || 0) / (pagination.limit || 1)) || 1, [pagination.total, pagination.limit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fefdfb] via-[#fef9f0] to-[#fef5e7] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Discover Profiles
          </h1>
          <div className="mt-4 sticky top-20 z-30 bg-white/80 backdrop-blur-sm rounded-md p-3 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Per Page:</span>
              <select
                value={pagination.limit}
                onChange={handleLimitChange}
                className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]"
              >
                {[10, 20, 30, 50].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Profession:</span>
              <select
                value={professionFilter}
                onChange={(e) => setProfessionFilter(e.target.value)}
                className="min-w-[220px] border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]"
              >
                <option value="">All</option>
                {JOB_TITLES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">City:</span>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="min-w-[220px] border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]"
              >
                <option value="">All Cities</option>
                {INDIAN_CITIES && Array.isArray(INDIAN_CITIES) ? (
                  INDIAN_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))
                ) : (
                  <option disabled>Cities loading...</option>
                )}
              </select>
            </div>
            <div className="text-xs text-gray-500">
              Total Pages: {totalPages}
            </div>
            {error && (
              <div className="text-xs text-red-600 flex items-center gap-2">
                <span>{error}</span>
                <Button variant="outline" size="xs" onClick={() => fetchProfiles()}>Retry</Button>
              </div>
            )}
          </div>
          {/* Debug Panel (remove in production) */}
          <div className="mt-4 bg-white/70 border border-gray-200 rounded-md p-3 text-xs text-gray-700 space-y-1">
            <div className="font-semibold">Debug Pagination State</div>
            <div>page: {pagination.page} | limit: {pagination.limit} | total: {pagination.total} | hasMore: {String(pagination.hasMore)}</div>
            <div>computed totalPages: {totalPages}</div>
            <div>profiles length: {profiles.length}</div>
            <div>Next disabled? {String(pagination.page >= totalPages || (!pagination.hasMore && pagination.page >= totalPages))}</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a227]"></div>
          </div>
        )}

        {/* Profiles Grid */}
        <AnimatePresence mode="wait">
          {!loading && (
            <motion.div
              key={pagination.page}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
            >
              {visibleProfiles.map((profile, index) => (
                <ProfileCard
                  key={profile.user.userId}
                  profile={profile}
                  profession={getProfession(profile)}
                  isFavorite={favorites.has(profile.user.userId)}
                  onToggleFavorite={toggleFavorite}
                  onViewProfile={handleViewProfile}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && visibleProfiles.length === 0 && (
          <div className="text-center py-20">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No profiles found
            </h3>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && profiles.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  // Show first, last, current, and adjacent pages
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                  ) {
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        className={`w-10 h-10 rounded-full ${
                          pagination.page === pageNum
                            ? "bg-[#c8a227] hover:bg-[#b39120]"
                            : ""
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  } else if (
                    pageNum === pagination.page - 2 ||
                    pageNum === pagination.page + 2
                  ) {
                    return <span key={pageNum} className="px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages || (!pagination.hasMore && pagination.page >= totalPages)}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Total: {pagination.total} profiles
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Individual Profile Card Component
const ProfileCard = ({ profile, profession, isFavorite, onToggleFavorite, onViewProfile, index }) => {
  const { user, scoreDetail } = profile;
  const hasPhoto = user.closerPhoto?.url;
  const location = [user.city, user.state, user.country]
    .filter(Boolean)
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
    >
      {/* Image Section */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {hasPhoto ? (
          <img
            src={user.closerPhoto.url}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.classList.add("flex", "items-center", "justify-center");
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-20 h-20 text-gray-400" />
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(user.userId);
          }}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 
          hover:bg-white transition-all duration-200 shadow-lg z-10"
        >
          <Heart
            className={`w-5 h-5 transition-all ${
              isFavorite
                ? "fill-red-500 text-red-500"
                : "text-gray-600 hover:text-red-500"
            }`}
          />
        </button>

        {/* Score Badge (if available) */}
        {scoreDetail.score > 0 && (
          <div className="absolute top-3 left-3 bg-[#c8a227] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            {scoreDetail.score}% Match
          </div>
        )}

        {/* Status Badge */}
        {user.status && (
          <div className="absolute bottom-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
            {user.status}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Name and Age */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            {user.firstName} {user.lastName}
            {user.age && <span className="text-gray-500 font-normal">, {user.age}</span>}
          </h3>

          {/* Location */}
          {location && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Profession tag */}
        {profession && (
          <div className="mb-3">
            <span className="bg-[#fef9f0] text-[#c8a227] text-xs font-medium px-3 py-1 rounded-full border border-[#c8a227]/20">
              {profession}
            </span>
          </div>
        )}

        {/* Religion and Caste */}
        {(user.religion || user.subCaste) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {user.religion && (
              <span className="bg-[#fef9f0] text-[#c8a227] text-xs font-medium px-3 py-1 rounded-full border border-[#c8a227]/20">
                {user.religion}
              </span>
            )}
            {user.subCaste && (
              <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200">
                {user.subCaste}
              </span>
            )}
          </div>
        )}

        {/* Score Reasons */}
        {scoreDetail.reasons?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Match reasons:</p>
            <div className="flex flex-wrap gap-1">
              {scoreDetail.reasons.slice(0, 3).map((reason, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full"
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* View Profile Button */}
        <Button
          onClick={() => onViewProfile(user.userId)}
          className="w-full bg-[#c8a227] hover:bg-[#b39120] text-white rounded-full font-medium 
          transition-all duration-200 shadow-md hover:shadow-lg"
        >
          View Profile
        </Button>
      </div>
    </motion.div>
  );
};

export default NewProfile;
