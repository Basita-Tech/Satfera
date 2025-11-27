
import React, { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../ui/select";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Slider } from "../../ui/slider";
import { Search } from "lucide-react";
import { ProfileCard } from "../../ProfileCard";
import { getAllProfiles } from "../../../api/auth";
import { useCompare } from "../../context/CompareContext";
import { getNames } from "country-list";
import { allCastes } from "../../../lib/constant";

// Form-validated constants (matching PersonalDetails & EducationDetails)
const RELIGIONS = ["Hindu", "Jain"];
const COUNTRIES = getNames();
const QUALIFICATION_LEVELS = [
  "High School",
  "Undergraduate",
  "Associates Degree",
  "Bachelors",
  "Honours Degree",
  "Masters",
  "Doctorate",
  "Diploma",
  "Trade School",
  "Less Than High School",
];

export default function NewProfiles({ profiles = [], onSendRequest, shortlistedIds = [], onToggleShortlist, onAddToCompare, onRemoveCompare, compareProfiles = [], sentProfileIds = [] }) {
  // Local state for fetched profiles
  const [allProfiles, setAllProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [errorProfiles, setErrorProfiles] = useState(null);
  // Pagination state (frontend pagination after sorting)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // `searchInput` updates immediately from the input; `searchName` is debounced
  const [searchInput, setSearchInput] = useState("");
  const [searchName, setSearchName] = useState("");
  const [selectedReligion, setSelectedReligion] = useState("all");
  const [selectedCaste, setSelectedCaste] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedEducation, setSelectedEducation] = useState("all");
  const [newProfileDuration, setNewProfileDuration] = useState("all");
  const [ageRange, setAgeRange] = useState([18, 40]);
  const [heightRange, setHeightRange] = useState([150, 204]);
  const [weightRange, setWeightRange] = useState([40, 120]);

  // Reset caste when religion changes (to maintain valid selection)
  useEffect(() => {
    if (selectedReligion !== "all") {
      const validCastes = selectedReligion === "Hindu" 
        ? allCastes.filter((c) => !c.toLowerCase().includes("jain"))
        : selectedReligion?.toLowerCase().includes("jain")
        ? ["Jain-Digambar", "Jain-Swetamber", "Jain-Vanta"]
        : allCastes;
      if (selectedCaste !== "all" && !validCastes.includes(selectedCaste)) {
        setSelectedCaste("all");
      }
    }
  }, [selectedReligion, selectedCaste]);

  // Fetch all profiles from backend (with search if query provided)
  useEffect(() => {
    async function fetchAllProfiles() {
      try {
        setLoadingProfiles(true);
        let response;
        
        // If there's a search query, use search API, otherwise use getAllProfiles
        if (searchName && searchName.length > 0) {
          const { searchProfiles } = await import('../../../api/auth');
          response = await searchProfiles(searchName);
          console.log("🆕 [NewProfiles] Search API Response:", response);
        } else {
          // Fetch large batch to enable frontend sorting across all profiles
          response = await getAllProfiles(1, 1000);
          console.log("🆕 [NewProfiles] GetAll API Response:", response);
        }
        
        if (response?.success && Array.isArray(response?.data)) {
          const mapped = response.data.map((p) => {
            const user = p.user || p;
            const scoreDetail = p.scoreDetail;
            const compatibilityScore = scoreDetail?.score || 0;
            
            return {
              id: user.userId || user.id || user._id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
              age: user.age,
              city: user.city,
              state: user.state,
              country: user.country,
              profession: user.occupation || user.professional?.Occupation,
              religion: user.religion,
              caste: user.subCaste,
              education: user.education?.HighestEducation,
              height: user.personal?.height || user.height,
              weight: user.personal?.weight || user.weight,
              diet: user.healthAndLifestyle?.diet,
              image: user.closerPhoto?.url || '',
              compatibility: compatibilityScore,
              status: null,
              createdAt: user.createdAt,
              scoreDetail: scoreDetail || null,
            };
          });
          
          // Filter out placeholder/test profiles: require an id and at least one meaningful field
          const isMeaningful = (p) => {
            if (!p || !p.id) return false;
            return Boolean(p.image || p.city || p.age || p.profession || p.createdAt);
          };
          const filtered = mapped.filter(isMeaningful);
          setAllProfiles(filtered);
          console.log("✅ [NewProfiles] Mapped profiles:", mapped.length, "-> meaningful:", filtered.length, "| Oldest:", filtered[filtered.length-1]?.createdAt, "| Newest:", filtered[0]?.createdAt);
          if (response.pagination) {
            setTotal(response.pagination.total || mapped.length);
            setHasMore(response.pagination.hasMore || (response.pagination.page * response.pagination.limit < response.pagination.total));
          } else {
            setTotal(mapped.length);
            setHasMore(false);
          }
        } else {
          console.warn("⚠️ [NewProfiles] API returned no data");
          setAllProfiles([]);
          setTotal(0);
          setHasMore(false);
        }
      } catch (error) {
        console.error("❌ [NewProfiles] Error fetching profiles:", error);
        setErrorProfiles(error.message || 'Failed to load profiles');
      } finally {
        setLoadingProfiles(false);
      }
    }
    
    fetchAllProfiles();
  }, [searchName]); // Re-fetch when search query changes

  // Shortlist state is managed by parent `UserDashboard`; use provided props
  // `shortlistedIds` is expected to be an array of ids and `onToggleShortlist` toggles them

  // Debounce search input to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchName(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Use backend profiles instead of prop profiles
  const sourceProfiles = allProfiles.length > 0 ? allProfiles : profiles;

  const filteredProfiles = useMemo(() => {
    const normalize = (v) => (v ? v.toString().toLowerCase().trim() : "");

    const query = normalize(searchName);
    const tokens = query === "" ? [] : query.split(/\s+/).filter(Boolean);

    // Filter out shortlisted profiles and apply other filters
    const filtered = sourceProfiles.filter((p) => {
      // Filter out profiles that have been sent connection requests
      if (sentProfileIds.includes(String(p.id))) {
        return false;
      }
      // Exclude profiles that are already shortlisted
      const isAlreadyShortlisted = Array.isArray(shortlistedIds) && 
        shortlistedIds.some((sid) => String(sid) === String(p.id));
      if (isAlreadyShortlisted) {
        return false;
      }

      // Filter by newProfileDuration
      if (newProfileDuration !== "all") {
        if (!p.createdAt) {
          return false;
        }
        const created = new Date(p.createdAt);
        const now = new Date();
        let diffDays = (now - created) / (1000 * 60 * 60 * 24);
        
        if (newProfileDuration === "today" && diffDays > 1) return false;
        if (newProfileDuration === "week" && diffDays > 7) return false;
        if (newProfileDuration === "2weeks" && diffDays > 14) return false;
        if (newProfileDuration === "month" && diffDays > 31) return false;
      }

      // Continue with other filters
      // 🔍 Combined text search (matches name, profession, city, religion, caste, education, country)
      const searchable = [
        p.name,
        p.profession,
        p.city,
        p.religion,
        p.caste,
        p.education,
        p.country,
        p.location,
        p.description,
      ]
        .filter(Boolean)
        .map(normalize)
        .join(" ");

      const matchSearch =
        tokens.length === 0 ||
        tokens.every((tkn) => {
          // numeric tokens can match age/height/weight/id
          if (/^\d+$/.test(tkn)) {
            const n = Number(tkn);
            if (p.age && Number(p.age) === n) return true;
            if (p.height && Number(p.height) === n) return true;
            if (p.weight && Number(p.weight) === n) return true;
            if (p.id && Number(p.id) === n) return true;
          }
          return searchable.includes(tkn);
        });

      const matchReligion =
        selectedReligion === "all" || normalize(p.religion) === normalize(selectedReligion);

      const matchCaste =
        selectedCaste === "all" || normalize(p.caste) === normalize(selectedCaste);

      const matchCity = selectedCity === "" || normalize(p.city).includes(normalize(selectedCity));

      const matchProfession = selectedProfession === "" || normalize(p.profession).includes(normalize(selectedProfession));

      const matchCountry =
        selectedCountry === "all" || normalize(p.country || p.location || "") === normalize(selectedCountry);

      const matchEducation =
        selectedEducation === "all" || normalize(p.education || "") === normalize(selectedEducation);

      const matchAge = !p.age || (p.age >= ageRange[0] && p.age <= ageRange[1]);

      // Height may be stored as a string like 5'6"; if not numeric, treat as auto-match
      let matchHeight;
      if (!p.height) {
        matchHeight = true;
      } else if (typeof p.height === 'number') {
        matchHeight = p.height >= heightRange[0] && p.height <= heightRange[1];
      } else {
        // Attempt to parse feet/inches to cm; if parse fails, allow
        const ftInMatch = String(p.height).match(/(\d+)'(\d+)?/);
        if (ftInMatch) {
          const feet = parseInt(ftInMatch[1], 10);
          const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
          const cm = Math.round((feet * 12 + inches) * 2.54);
          matchHeight = cm >= heightRange[0] && cm <= heightRange[1];
        } else {
          matchHeight = true;
        }
      }

      const matchWeight = !p.weight || (p.weight >= weightRange[0] && p.weight <= weightRange[1]);

      return (
        matchSearch &&
        matchReligion &&
        matchCaste &&
        matchCity &&
        matchProfession &&
        matchCountry &&
        matchEducation &&
        matchAge &&
        matchHeight &&
        matchWeight
      );
    });
    
    const sorted = filtered.sort((a, b) => {
      // Sort by creation date: newest first
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    console.log(`🔍 Filter: ${newProfileDuration} | Total: ${sourceProfiles.length} → Filtered: ${sorted.length}`);
    return sorted;
  }, [
    sourceProfiles,
    shortlistedIds,
    searchName,
    selectedReligion,
    selectedCaste,
    selectedCity,
    selectedProfession,
    selectedCountry,
    selectedEducation,
    newProfileDuration,
    ageRange,
    heightRange,
    weightRange,
    sentProfileIds,
  ]);

  // Frontend pagination: slice the filtered/sorted results
  const paginatedProfiles = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredProfiles.slice(startIndex, endIndex);
  }, [filteredProfiles, page, limit]);

  // Update total and pagination state based on filtered results
  useEffect(() => {
    setTotal(filteredProfiles.length);
    // If current page exceeds available pages after filtering, reset to page 1
    const maxPage = Math.max(1, Math.ceil(filteredProfiles.length / limit));
    if (page > maxPage) {
      setPage(1);
    }
  }, [filteredProfiles.length, limit, page]);

  // Reset to page 1 when time filter changes
  useEffect(() => {
    setPage(1);
  }, [newProfileDuration]);

  // --- Active filter tags ---
  const activeFilters = [
    selectedReligion !== "all" && { label: selectedReligion },
    selectedCaste !== "all" && { label: selectedCaste },
    selectedCountry !== "all" && { label: selectedCountry },
    selectedEducation !== "all" && { label: selectedEducation },
    selectedCity && { label: selectedCity },
    selectedProfession && { label: selectedProfession },
  ].filter(Boolean);

  // --- Clear all filters ---
  const clearAllFilters = () => {
    setSearchInput("");
    setSearchName("");
    setSelectedReligion("all");
    setSelectedCaste("all");
    setSelectedCity("");
    setSelectedProfession("");
    setSelectedCountry("all");
    setSelectedEducation("all");
    setAgeRange([18, 40]);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10) || 10;
    setLimit(newLimit);
    setPage(1);
  };

  // Form-validated option lists (replaces dynamic profile-derived data for consistency)
  const religionOptions = RELIGIONS;
  const countryOptions = COUNTRIES;
  const educationOptions = QUALIFICATION_LEVELS;
  const { addToCompare: ctxAddToCompare, removeFromCompare: ctxRemoveFromCompare } = useCompare();
  
  // Caste options depend on selected religion (matches PersonalDetails logic)
  const casteOptions = useMemo(() => {
    if (selectedReligion === "all") return allCastes;
    if (selectedReligion === "Hindu") {
      return allCastes.filter((c) => !c.toLowerCase().includes("jain"));
    }
    if (selectedReligion?.toLowerCase().includes("jain")) {
      return ["Jain-Digambar", "Jain-Swetamber", "Jain-Vanta"];
    }
    return allCastes;
  }, [selectedReligion]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 p-3 md:p-6 bg-[#faf8f3] min-h-screen">
      {/* Sidebar Filters */}
      <aside className="w-full lg:w-80 flex-shrink-0 self-start">
        <div className="bg-white rounded-2xl shadow-md border border-[#e6dec5] p-4 md:p-6 space-y-4 md:space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 m-0">Filters</h3>
            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-500 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            {/* Search Icon */}
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>

            {/* Input Field */}
            <input
              type="text"
              placeholder="Enter name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchName(searchInput.trim());
              }}
              className="w-full pl-10 pr-24 h-10 rounded-xl border border-[#e0d3af] focus:border-[#d4af37] focus:ring-[#d4af37]/40 outline-none"
            />

            {/* Search Button */}
            <button
              onClick={() => setSearchName(searchInput.trim())}
              aria-label="Search profiles"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#d4af37] text-white text-sm font-semibold w-24 h-9 rounded-lg hover:bg-[#b9941c] transition-colors flex items-center justify-center"
            >
              Search
            </button>
          </div>


          {/* New Profiles By */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              New Profiles By
            </Label>
            <Select
              value={newProfileDuration}
              onValueChange={setNewProfileDuration}
            >
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                <SelectItem value="today">Today's New Profiles</SelectItem>
                <SelectItem value="week">Last 1 Week</SelectItem>
                <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                <SelectItem value="month">Last 1 Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                Age Range
              </Label>
              <span className="text-sm text-gray-600">
                {ageRange[0]} - {ageRange[1]} yrs
              </span>
            </div>
            <Slider
              min={18}
              max={60}
              step={1}
              value={ageRange}
              onValueChange={setAgeRange}
              className="[&_[role=slider]]:bg-[#d4af37] [&_[role=track]]:bg-[#f1e6c7]"
            />
          </div>

          {/* Religion (dynamic from profile data) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Religion</Label>
            <Select value={selectedReligion} onValueChange={setSelectedReligion}>
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select religion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Religions</SelectItem>
                {religionOptions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Caste (dynamic) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Caste</Label>
            <Select value={selectedCaste} onValueChange={setSelectedCaste}>
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select caste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Castes</SelectItem>
                {casteOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* Height */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Height (cm)</Label>
              <span className="text-sm text-gray-600">
                {heightRange[0]} - {heightRange[1]} cm
              </span>
            </div>
            <Slider
              min={150}
              max={204}
              step={1}
              value={heightRange}
              onValueChange={setHeightRange}
              className="[&_[role=slider]]:bg-[#d4af37] [&_[role=track]]:bg-[#f1e6c7]"
            />
          </div>

          {/* Weight */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Weight (kg)</Label>
              <span className="text-sm text-gray-600">
                {weightRange[0]} - {weightRange[1]} kg
              </span>
            </div>
            <Slider
              min={40}
              max={120}
              step={1}
              value={weightRange}
              onValueChange={setWeightRange}
              className="[&_[role=slider]]:bg-[#c8a227] [&_[role=track]]:bg-[#f1e6c7]"
            />
          </div>


          {/* Country (dynamic) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countryOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Education (dynamic) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Education</Label>
            <Select value={selectedEducation} onValueChange={setSelectedEducation}>
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select education" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Education Levels</SelectItem>
                {educationOptions.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">City</Label>
            <Input
              placeholder="Enter city..."
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded-xl border-[#e0d3af] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30"
            />
          </div>

          {/* Profession */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Profession
            </Label>
            <Input
              placeholder="Enter profession..."
              value={selectedProfession}
              onChange={(e) => setSelectedProfession(e.target.value)}
              className="rounded-xl border-[#e0d3af] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30"
            />
          </div>
        </div>
      </aside>

      {/* Profiles Section */}
      <section className="flex-1">
        <div>
          <h2 className="text-2xl font-semibold text-[#3a2f00]">New Profiles</h2>
          <p className="text-gray-500">
            Recently joined members looking for their perfect match
          </p>

          {/* (Pagination summary removed; consolidated into bottom controls) */}
        </div>

        {/* Loading State */}
        {loadingProfiles && (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto" />
            <p className="mt-4 text-gray-600">Loading new profiles...</p>
          </div>
        )}

        {/* Error State */}
        {!loadingProfiles && errorProfiles && (
          <div className="py-12 text-center text-red-600 font-medium">
            Failed to load profiles. Please try again.
          </div>
        )}

        {/* Profiles Grid */}
        {!loadingProfiles && !errorProfiles && (
          <>
            {filteredProfiles.length === 0 ? (
              <div className="text-center mt-10 p-8 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-600 text-lg mb-2">No profiles found</p>
                <p className="text-gray-500 text-sm">
                  {newProfileDuration === "today" && "No profiles created today. Try selecting a longer time period."}
                  {newProfileDuration === "week" && "No profiles created in the last week. Try selecting a longer time period."}
                  {newProfileDuration === "2weeks" && "No profiles created in the last 2 weeks. Try selecting a longer time period."}
                  {newProfileDuration === "month" && "No profiles created in the last month. Try selecting 'All Profiles'."}
                  {newProfileDuration === "all" && "No profiles match your current filters. Try adjusting your filter criteria."}
                </p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mt-4">
                {paginatedProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    {...profile}
                    variant="newprofiles"
                    isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(profile.id)) : false}
                    onToggleShortlist={onToggleShortlist}
                    onSendRequest={onSendRequest}
                    onAddToCompare={onAddToCompare || ctxAddToCompare}
                    onRemoveCompare={onRemoveCompare || ctxRemoveFromCompare}
                    isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false}
                    profile={profile}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-[#e6dec5]">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-700">
                    <span>Showing {((page-1) * limit) + 1}-{Math.min(page * limit, total)} of {total}</span>
                    <span className="hidden sm:inline">| Page {page} of {totalPages}</span>
                  </div>
                  <div className="flex items-center gap-2 order-3 sm:order-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1 || loadingProfiles}
                      className={`px-3 py-1 rounded-full text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                        loadingProfiles && page > 1
                          ? 'bg-[#d4af37] text-white border border-[#d4af37]'
                          : 'bg-white border border-gray-300 text-gray-700 hover:!bg-[#d4af37] hover:!text-white hover:!border-[#d4af37]'
                      }`}
                    >Prev</button>
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pNum = idx + 1;
                        if (pNum === 1 || pNum === totalPages || (pNum >= page - 1 && pNum <= page + 1)) {
                          return (
                            <button
                              key={pNum}
                              onClick={() => handlePageChange(pNum)}
                              className={`w-9 h-9 rounded-full text-sm border ${pNum === page ? 'bg-[#c8a227] text-white border-[#c8a227]' : 'bg-white border-gray-300 text-gray-700 hover:bg-[#f9f5ed] active:bg-[#d4af37] active:text-white active:border-[#d4af37]'}`}
                            >{pNum}</button>
                          );
                        } else if (pNum === page - 2 || pNum === page + 2) {
                          return <span key={pNum} className="px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages || (!hasMore && page >= totalPages) || loadingProfiles}
                      className={`px-3 py-1 rounded-full text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                        loadingProfiles && page < totalPages
                          ? 'bg-[#c8a227] text-white border border-[#c8a227]'
                          : 'bg-white border border-gray-300 text-gray-700 hover:!bg-[#c8a227] hover:!text-white hover:!border-[#d4af37]'
                      }`}
                    >Next</button>
                  </div>
                  <div className="flex items-center gap-2 text-sm order-2 sm:order-3">
                    <span className="text-gray-600">Per Page:</span>
                    <select value={limit} onChange={handleLimitChange} className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                      {[10,20,50,100].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              )}
              </>
            )}
          </>
        )}
      </section>

    </div>
  );
}
