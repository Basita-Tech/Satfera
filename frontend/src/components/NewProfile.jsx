import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Heart, MapPin, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { JOB_TITLES } from "../lib/constant";
import LocationSelect from "./ui/LocationSelect";
import { State, City } from "country-state-city";
import { searchProfiles } from "../api/auth";
const RELIGIONS = ["Hindu", "Jain"];
const CASTES = ["Patel-Desai", "Patel-Kadva", "Patel-Leva", "Patel", "Brahmin-Audichya", "Brahmin", "Jain-Digambar", "Jain-Swetamber", "Jain-Vanta", "Vaishnav-Vania"];
const NEW_PROFILE_DURATIONS = [{
  value: "all",
  label: "All Time"
}, {
  value: "today",
  label: "Today"
}, {
  value: "last_1_week",
  label: "Last Week"
}, {
  value: "last_3_weeks",
  label: "Last 3 Weeks"
}, {
  value: "last_1_month",
  label: "Last Month"
}];
const NewProfile = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [shouldFetch, setShouldFetch] = useState(true);
  const indianCities = useMemo(() => {
    try {
      const states = State.getStatesOfCountry("IN");
      const cities = new Set();
      states.forEach(state => {
        try {
          const stateCities = City.getCitiesOfState("IN", state.isoCode);
          stateCities.forEach(city => cities.add(city.name));
        } catch (e) {}
      });
      return Array.from(cities).sort();
    } catch (error) {
      console.error("Error loading Indian cities:", error);
      return [];
    }
  }, []);
  const [filters, setFilters] = useState({
    name: "",
    newProfile: "all",
    ageFrom: "",
    ageTo: "",
    heightFrom: "",
    heightTo: "",
    weightFrom: "",
    weightTo: "",
    religion: "",
    caste: "",
    city: "",
    profession: "",
    education: ""
  });
  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (filters.name) apiFilters.name = filters.name;
      if (filters.newProfile && filters.newProfile !== "all") apiFilters.newProfile = filters.newProfile;
      if (filters.ageFrom) apiFilters.ageFrom = parseInt(filters.ageFrom);
      if (filters.ageTo) apiFilters.ageTo = parseInt(filters.ageTo);
      if (filters.heightFrom) apiFilters.heightFrom = parseInt(filters.heightFrom);
      if (filters.heightTo) apiFilters.heightTo = parseInt(filters.heightTo);
      if (filters.weightFrom) apiFilters.weightFrom = parseInt(filters.weightFrom);
      if (filters.weightTo) apiFilters.weightTo = parseInt(filters.weightTo);
      if (filters.religion) apiFilters.religion = filters.religion;
      if (filters.caste) apiFilters.caste = filters.caste;
      if (filters.city) apiFilters.city = filters.city;
      if (filters.profession) apiFilters.profession = filters.profession;
      if (filters.education) apiFilters.education = filters.education;
      const data = await searchProfiles(apiFilters);
      if (data.success) {
        const listings = data.data?.listings || [];
        setProfiles(listings);
        const backendPagination = data.data?.pagination || {};
        setPagination({
          page: backendPagination.page || pagination.page,
          limit: backendPagination.limit || pagination.limit,
          total: backendPagination.total || 0,
          hasMore: backendPagination.hasMore || false
        });
        const favSet = new Set();
        listings.forEach(profile => {
          if (profile.user?.isFavorite) {
            favSet.add(profile.user.userId);
          }
        });
        setFavorites(favSet);
      } else {
        setError(data.message || "Failed to load profiles");
        setProfiles([]);
      }
    } catch (error) {
      console.error("[NewProfile] Error fetching profiles:", error);
      setError("Failed to load profiles. Please retry.");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (shouldFetch) {
      fetchProfiles();
      setShouldFetch(false);
    }
  }, [shouldFetch, pagination.page, pagination.limit, filters]);
  useEffect(() => {
    setShouldFetch(true);
  }, [pagination.page, pagination.limit]);
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({
        ...prev,
        page: 1
      }));
    } else {
      setShouldFetch(true);
    }
  }, [filters.name, filters.newProfile, filters.ageFrom, filters.ageTo, filters.heightFrom, filters.heightTo, filters.weightFrom, filters.weightTo, filters.religion, filters.caste, filters.city, filters.profession, filters.education]);
  const handlePageChange = newPage => {
    const maxPage = Math.ceil(pagination.total / pagination.limit) || 1;
    if (newPage >= 1 && newPage <= maxPage && newPage !== pagination.page) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };
  const handleLimitChange = e => {
    const newLimit = parseInt(e.target.value, 10) || 10;
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1
    }));
  };
  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [field]: value
      };
      return newFilters;
    });
  };
  const resetFilters = () => {
    setFilters({
      name: "",
      newProfile: "all",
      ageFrom: "",
      ageTo: "",
      heightFrom: "",
      heightTo: "",
      weightFrom: "",
      weightTo: "",
      religion: "",
      caste: "",
      city: "",
      profession: "",
      education: ""
    });
  };
  const getProfession = p => {
    try {
      return p?.user?.occupation || p?.user?.professional?.Occupation || p?.professional?.Occupation || p?.occupation || "";
    } catch {
      return "";
    }
  };
  const toggleFavorite = async userId => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(userId)) {
      newFavorites.delete(userId);
    } else {
      newFavorites.add(userId);
    }
    setFavorites(newFavorites);
    try {
      await fetch(`/api/profiles/${userId}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isFavorite: newFavorites.has(userId)
        })
      });
    } catch (error) {
      console.error("Error updating favorite:", error);
      setFavorites(favorites);
    }
  };
  const handleViewProfile = userId => {
    navigate(`/dashboard/profile/${userId}`);
  };
  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
  return <div className="min-h-screen bg-gradient-to-br from-[#fefdfb] via-[#fef9f0] to-[#fef5e7] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Discover New Profiles
          </h1>

          {}
          <div className="mt-4 sticky top-20 z-30 bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 space-y-4">
            {}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-sm text-gray-600 whitespace-nowrap">Name:</span>
                <input type="text" value={filters.name} onChange={e => handleFilterChange('name', e.target.value)} placeholder="Search by name..." className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Duration:</span>
                <select value={filters.newProfile} onChange={e => handleFilterChange('newProfile', e.target.value)} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]">
                  {NEW_PROFILE_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>

            {}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Age:</span>
                <input type="number" value={filters.ageFrom} onChange={e => handleFilterChange('ageFrom', e.target.value)} placeholder="From" min="18" max="100" className="w-20 border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
                <span className="text-sm text-gray-400">to</span>
                <input type="number" value={filters.ageTo} onChange={e => handleFilterChange('ageTo', e.target.value)} placeholder="To" min="18" max="100" className="w-20 border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Height (cm):</span>
                <input type="number" value={filters.heightFrom} onChange={e => handleFilterChange('heightFrom', e.target.value)} placeholder="From" min="120" max="250" className="w-20 border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
                <span className="text-sm text-gray-400">to</span>
                <input type="number" value={filters.heightTo} onChange={e => handleFilterChange('heightTo', e.target.value)} placeholder="To" min="120" max="250" className="w-20 border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Weight (kg):</span>
                <input type="number" value={filters.weightFrom} onChange={e => handleFilterChange('weightFrom', e.target.value)} placeholder="From" min="30" max="200" className="w-20 border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
                <span className="text-sm text-gray-400">to</span>
                <input type="number" value={filters.weightTo} onChange={e => handleFilterChange('weightTo', e.target.value)} placeholder="To" min="30" max="200" className="w-20 border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
              </div>
            </div>

            {}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Religion:</span>
                <select value={filters.religion} onChange={e => handleFilterChange('religion', e.target.value)} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]">
                  <option value="">All</option>
                  {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Caste:</span>
                <select value={filters.caste} onChange={e => handleFilterChange('caste', e.target.value)} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]">
                  <option value="">All</option>
                  {CASTES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">City:</span>
                <div className="min-w-[160px]">
                  <LocationSelect type="city" name="city" value={filters.city} onChange={e => handleFilterChange('city', e.target.value)} countryCode="IN" stateCode="MH" placeholder="All Cities" className="border rounded-md px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Profession:</span>
                <select value={filters.profession} onChange={e => handleFilterChange('profession', e.target.value)} className="min-w-[180px] border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]">
                  <option value="">All</option>
                  {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Education:</span>
                <input type="text" value={filters.education} onChange={e => handleFilterChange('education', e.target.value)} placeholder="e.g., HighSchool, Engineering" className="min-w-[180px] border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]" />
              </div>
            </div>

            {}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Per Page:</span>
                  <select value={pagination.limit} onChange={handleLimitChange} className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a227]">
                    {[10, 20, 30, 50].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <Button onClick={resetFilters} variant="outline" size="sm" className="text-xs">
                  Reset Filters
                </Button>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>Total: {pagination.total} profiles</span>
                <span>•</span>
                <span>Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}</span>
              </div>
              {error && <div className="w-full text-xs text-red-600 flex items-center gap-2">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={() => fetchProfiles()}>Retry</Button>
                </div>}
            </div>
          </div>
        </div>

        {}
        {loading && <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a227]"></div>
          </div>}

        {}
        <AnimatePresence mode="wait">
          {!loading && <motion.div key={pagination.page} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} transition={{
          duration: 0.3
        }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {profiles.map((profile, index) => <ProfileCard key={profile.user.userId} profile={profile} profession={getProfession(profile)} isFavorite={favorites.has(profile.user.userId)} onToggleFavorite={toggleFavorite} onViewProfile={handleViewProfile} index={index} />)}
            </motion.div>}
        </AnimatePresence>

        {}
        {!loading && profiles.length === 0 && <div className="text-center py-20">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No profiles found
            </h3>
            <p className="text-gray-500">Try adjusting your search criteria or reset filters</p>
          </div>}

        {}
        {!loading && profiles.length > 0 && <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} variant="outline" size="sm" className="rounded-full">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              {}
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              if (pageNum === 1 || pageNum === totalPages || pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1) {
                return <Button key={pageNum} onClick={() => handlePageChange(pageNum)} variant={pagination.page === pageNum ? "default" : "outline"} size="sm" className={`w-10 h-10 rounded-full ${pagination.page === pageNum ? "bg-[#c8a227] hover:bg-[#b39120]" : ""}`}>
                        {pageNum}
                      </Button>;
              } else if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                return <span key={pageNum} className="px-1">...</span>;
              }
              return null;
            })}
              </div>

              <Button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= totalPages || !pagination.hasMore && pagination.page >= totalPages} variant="outline" size="sm" className="rounded-full">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Total: {pagination.total} profiles
            </div>
          </div>}
      </div>
    </div>;
};
const ProfileCard = ({
  profile,
  profession,
  isFavorite,
  onToggleFavorite,
  onViewProfile,
  index
}) => {
  const {
    user,
    scoreDetail
  } = profile;
  const hasPhoto = user.closerPhoto?.url;
  const location = [user.city, user.state, user.country].filter(Boolean).join(", ");
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    delay: index * 0.05
  }} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {hasPhoto ? <img src={user.closerPhoto.url} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={e => {
        e.target.style.display = "none";
        e.target.parentElement.classList.add("flex", "items-center", "justify-center");
      }} /> : <div className="w-full h-full flex items-center justify-center">
            <User className="w-20 h-20 text-gray-400" />
          </div>}

        {}
        <button onClick={e => {
        e.stopPropagation();
        onToggleFavorite(user.userId);
      }} className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 
          hover:bg-white transition-all duration-200 shadow-lg z-10">
          <Heart className={`w-5 h-5 transition-all ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-600 hover:text-red-500"}`} />
        </button>

        {}
        {scoreDetail.score > 0 && <div className="absolute top-3 left-3 bg-[#c8a227] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            {scoreDetail.score}% Match
          </div>}

        {}
        {user.status && <div className="absolute bottom-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
            {user.status}
          </div>}
      </div>

      {}
      <div className="p-4">
        {}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            {user.firstName} {user.lastName}
            {user.age && <span className="text-gray-500 font-normal">, {user.age}</span>}
          </h3>

          {}
          {location && <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>}
        </div>

        {}
        {profession && <div className="mb-3">
            <span className="bg-[#fef9f0] text-[#c8a227] text-xs font-medium px-3 py-1 rounded-full border border-[#c8a227]/20">
              {profession}
            </span>
          </div>}

        {}
        {(user.height || user.weight) && <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-600">
            {user.height && <span className="flex items-center gap-1">
                <span className="font-medium">Height:</span> {user.height}
              </span>}
            {user.weight && <span className="flex items-center gap-1">
                <span className="font-medium">Weight:</span> {user.weight}
              </span>}
          </div>}

        {}
        {(user.religion || user.subCaste) && <div className="flex flex-wrap gap-2 mb-4">
            {user.religion && <span className="bg-[#fef9f0] text-[#c8a227] text-xs font-medium px-3 py-1 rounded-full border border-[#c8a227]/20">
                {user.religion}
              </span>}
            {user.subCaste && <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200">
                {user.subCaste}
              </span>}
          </div>}

        {}
        {scoreDetail.reasons?.length > 0 && <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Match reasons:</p>
            <div className="flex flex-wrap gap-1">
              {scoreDetail.reasons.slice(0, 3).map((reason, idx) => <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                  {reason}
                </span>)}
            </div>
          </div>}

        {}
        <Button onClick={() => onViewProfile(user.userId)} className="w-full bg-[#c8a227] hover:bg-[#b39120] text-white rounded-full font-medium 
          transition-all duration-200 shadow-md hover:shadow-lg">
          View Profile
        </Button>
      </div>
    </motion.div>;
};
export default NewProfile;