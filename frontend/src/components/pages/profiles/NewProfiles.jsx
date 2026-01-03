import React, { useState, useMemo, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import { Label } from "../../ui/label";
import { Slider } from "../../ui/slider";
import { Search, RotateCcw } from "lucide-react";
import { ProfileCard } from "../../ProfileCard";
import { getAllProfiles, searchProfiles } from "../../../api/auth";
import { useCompare } from "../../context/CompareContext";
import { getNames } from "country-list";
import { allCastes, JOB_TITLES, INDIAN_CITIES } from "../../../lib/constant";
import CustomSelect from "../../ui/CustomSelect";
const RELIGIONS = ["Hindu", "Jain"];
const COUNTRIES = getNames();
const QUALIFICATION_LEVELS = ["High School", "Undergraduate", "Associates Degree", "Bachelors", "Honours Degree", "Masters", "Doctorate", "Diploma", "Trade School", "Less Than High School"];
const HEIGHT_SLIDER_MIN = 122;
const HEIGHT_SLIDER_MAX = 193;
const DEFAULT_HEIGHT_RANGE = [HEIGHT_SLIDER_MIN, HEIGHT_SLIDER_MAX];
const DEFAULT_WEIGHT_RANGE = [40, 120];
const DEFAULT_AGE_RANGE = [18, 60];
const parseHeightToCm = value => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const str = String(value).toLowerCase();
  const cmMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*cm/);
  if (cmMatch) return Number(cmMatch[1]);
  const ftInMatch = str.match(/([0-9]+)\s*(?:ft|')\s*([0-9]{1,2})?\s*(?:in|"|")?/);
  if (ftInMatch) {
    const feet = Number(ftInMatch[1]) || 0;
    const inches = Number(ftInMatch[2]) || 0;
    return Math.round(feet * 30.48 + inches * 2.54);
  }
  const anyNumber = str.match(/([0-9]+(?:\.[0-9]+)?)/);
  return anyNumber ? Number(anyNumber[1]) : null;
};
const parseWeightToKg = value => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const str = String(value).toLowerCase();
  const kgMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*kg/);
  if (kgMatch) return Number(kgMatch[1]);
  const anyNumber = str.match(/([0-9]+(?:\.[0-9]+)?)/);
  return anyNumber ? Number(anyNumber[1]) : null;
};
const hasActiveFilters = filters => {
  return filters.searchName && filters.searchName.length > 0 || filters.selectedReligion !== "all" || filters.selectedCaste !== "all" || filters.selectedCity !== "" || filters.selectedProfession !== "" || filters.selectedCountry !== "all" || filters.selectedEducation !== "all" || filters.newProfileDuration !== "all" || filters.ageRange[0] !== DEFAULT_AGE_RANGE[0] || filters.ageRange[1] !== DEFAULT_AGE_RANGE[1] || filters.heightRange[0] !== DEFAULT_HEIGHT_RANGE[0] || filters.heightRange[1] !== DEFAULT_HEIGHT_RANGE[1] || filters.weightRange[0] !== DEFAULT_WEIGHT_RANGE[0] || filters.weightRange[1] !== DEFAULT_WEIGHT_RANGE[1];
};
export default function NewProfiles({
  onSendRequest,
  shortlistedIds = [],
  onToggleShortlist,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles = [],
  sentProfileIds = []
}) {
  const [pendingFilters, setPendingFilters] = useState({
    searchInput: "",
    searchName: "",
    selectedReligion: "all",
    selectedCaste: "all",
    selectedCity: "",
    selectedProfession: "",
    selectedCountry: "all",
    selectedEducation: "all",
    newProfileDuration: "all",
    ageRange: [...DEFAULT_AGE_RANGE],
    heightRange: [...DEFAULT_HEIGHT_RANGE],
    weightRange: [...DEFAULT_WEIGHT_RANGE]
  });
  const [appliedFilters, setAppliedFilters] = useState({
    searchName: "",
    selectedReligion: "all",
    selectedCaste: "all",
    selectedCity: "",
    selectedProfession: "",
    selectedCountry: "all",
    selectedEducation: "all",
    newProfileDuration: "all",
    ageRange: [...DEFAULT_AGE_RANGE],
    heightRange: [...DEFAULT_HEIGHT_RANGE],
    weightRange: [...DEFAULT_WEIGHT_RANGE]
  });
  const [allProfiles, setAllProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [errorProfiles, setErrorProfiles] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const pageSize = 12;
  const {
    addToCompare: ctxAddToCompare,
    removeFromCompare: ctxRemoveFromCompare
  } = useCompare();
  const casteOptions = useMemo(() => {
    const selectedRel = pendingFilters.selectedReligion;
    if (selectedRel === "all") return allCastes;
    if (selectedRel === "Hindu") {
      return allCastes.filter(c => !c.toLowerCase().includes("jain"));
    }
    if (selectedRel?.toLowerCase().includes("jain")) {
      return ["Jain-Digambar", "Jain-Swetamber", "Jain-Vanta"];
    }
    return allCastes;
  }, [pendingFilters.selectedReligion]);
  const updatePendingFilter = (key, value) => {
    setPendingFilters(prev => ({
      ...prev,
      [key]: value
    }));
    if (key === "selectedReligion" && value !== pendingFilters.selectedReligion) {
      setPendingFilters(prev => ({
        ...prev,
        selectedCaste: "all"
      }));
    }
  };
  const handleSubmit = async (e, pageNum = 1) => {
    e?.preventDefault?.();
    setPage(pageNum);
    setAppliedFilters(pendingFilters);
    setErrorProfiles(null);
    setLoadingProfiles(true);
    try {
      let response;
      const isFiltered = hasActiveFilters(pendingFilters);
      if (isFiltered) {
        const backendFilters = {
          page: pageNum,
          limit: pageSize
        };
        if (pendingFilters.searchName) backendFilters.name = pendingFilters.searchName;
        if (pendingFilters.selectedReligion !== "all") backendFilters.religion = pendingFilters.selectedReligion;
        if (pendingFilters.selectedCaste !== "all") backendFilters.caste = pendingFilters.selectedCaste;
        if (pendingFilters.selectedCity) backendFilters.city = pendingFilters.selectedCity;
        if (pendingFilters.selectedProfession) backendFilters.profession = pendingFilters.selectedProfession;
        if (pendingFilters.selectedEducation !== "all") backendFilters.education = pendingFilters.selectedEducation;
        if (pendingFilters.newProfileDuration !== "all") {
          const durationMap = {
            today: "all",
            week: "last1week",
            "2weeks": "last3week",
            month: "last1month"
          };
          backendFilters.newProfile = durationMap[pendingFilters.newProfileDuration] || "all";
        }
        if (pendingFilters.ageRange[0] !== DEFAULT_AGE_RANGE[0]) backendFilters.ageFrom = pendingFilters.ageRange[0];
        if (pendingFilters.ageRange[1] !== DEFAULT_AGE_RANGE[1]) backendFilters.ageTo = pendingFilters.ageRange[1];
        if (pendingFilters.heightRange[0] !== DEFAULT_HEIGHT_RANGE[0]) backendFilters.heightFrom = pendingFilters.heightRange[0];
        if (pendingFilters.heightRange[1] !== DEFAULT_HEIGHT_RANGE[1]) backendFilters.heightTo = pendingFilters.heightRange[1];
        if (pendingFilters.weightRange[0] !== DEFAULT_WEIGHT_RANGE[0]) backendFilters.weightFrom = pendingFilters.weightRange[0];
        if (pendingFilters.weightRange[1] !== DEFAULT_WEIGHT_RANGE[1]) backendFilters.weightTo = pendingFilters.weightRange[1];
        response = await searchProfiles(backendFilters);
      } else {
        response = await getAllProfiles(pageNum, pageSize);
      }
      const dataArray = Array.isArray(response?.data) ? response.data : response?.data?.listings || [];
      const pagination = response?.pagination;
      if (response?.success && Array.isArray(dataArray)) {
        const mapped = dataArray.map(p => {
          const user = p.user || p;
          const userId = user.userId || user.id || user._id;
          if (!userId || userId === "undefined" || userId === "null") {
            return null;
          }
          return {
            id: userId,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown",
            age: user.age,
            city: user.city,
            state: user.state,
            country: user.country,
            profession: user.profession || user.occupation || user.professional?.Occupation,
            religion: user.religion,
            caste: user.subCaste,
            education: user.education?.HighestEducation,
            height: user.personal?.height || user.height,
            heightCm: parseHeightToCm(user.personal?.height || user.height),
            weight: user.personal?.weight || user.weight,
            weightKg: parseWeightToKg(user.personal?.weight || user.weight),
            diet: user.healthAndLifestyle?.diet,
            image: user.closerPhoto?.url || "",
            compatibility: 0,
            status: null,
            createdAt: user.createdAt
          };
        }).filter(Boolean);
        const isMeaningful = p => {
          if (!p || !p.id || typeof p.id !== "string" || p.id.length < 10) return false;
          return Boolean(p.image || p.city || p.age || p.profession || p.createdAt);
        };
        const filtered = mapped.filter(isMeaningful);
        setAllProfiles(filtered);
        if (pagination) {
          setTotalProfiles(pagination.total || 0);
          setTotalPages(Math.ceil((pagination.total || 0) / pageSize));
        } else {
          setTotalProfiles(filtered.length);
          setTotalPages(Math.ceil(filtered.length / pageSize));
        }
      } else {
        setAllProfiles([]);
        setTotalProfiles(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("❌ [NewProfiles] Error fetching profiles:", error);
      setErrorProfiles(error.message || "Failed to load profiles");
    } finally {
      setLoadingProfiles(false);
      setInitialLoadDone(true);
    }
  };
  useEffect(() => {
    if (!initialLoadDone) {
      handleSubmit();
    }
  }, [initialLoadDone]);
  const filteredProfiles = useMemo(() => {
    const normalize = v => v ? v.toString().toLowerCase().trim() : "";
    return allProfiles.filter(p => {
      if (sentProfileIds.includes(String(p.id))) return false;
      const isShortlisted = Array.isArray(shortlistedIds) && shortlistedIds.some(sid => String(sid) === String(p.id));
      if (isShortlisted) return false;
      if (appliedFilters.newProfileDuration === "today") {
        if (!p.createdAt) return false;
        const created = new Date(p.createdAt);
        const now = new Date();
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if (diffDays > 1) return false;
      }
      const isCountryFilterActive = appliedFilters.selectedCountry !== "all" && normalize(appliedFilters.selectedCountry).length > 0;
      if (isCountryFilterActive) {
        const countryNorm = normalize(p.country || "");
        if (!countryNorm || !countryNorm.includes(normalize(appliedFilters.selectedCountry))) return false;
      }
      return true;
    });
  }, [allProfiles, appliedFilters, shortlistedIds, sentProfileIds]);

    useEffect(() => {
    if (!initialLoadDone || loadingProfiles) return;
    const pageHasProfiles = allProfiles.length > 0;
    const nothingVisible = filteredProfiles.length === 0;
    const hasMorePages = page < totalPages;
    if (pageHasProfiles && nothingVisible && hasMorePages) {
      handleSubmit(undefined, page + 1);
    }
  }, [filteredProfiles.length, allProfiles.length, page, totalPages, loadingProfiles, initialLoadDone]);
  const clearAllFilters = () => {
    setPendingFilters({
      searchInput: "",
      searchName: "",
      selectedReligion: "all",
      selectedCaste: "all",
      selectedCity: "",
      selectedProfession: "",
      selectedCountry: "all",
      selectedEducation: "all",
      newProfileDuration: "all",
      ageRange: [...DEFAULT_AGE_RANGE],
      heightRange: [...DEFAULT_HEIGHT_RANGE],
      weightRange: [...DEFAULT_WEIGHT_RANGE]
    });
  };
  const handleClearAndSubmit = () => {
    clearAllFilters();
    setTimeout(() => {
      setAppliedFilters({
        searchName: "",
        selectedReligion: "all",
        selectedCaste: "all",
        selectedCity: "",
        selectedProfession: "",
        selectedCountry: "all",
        selectedEducation: "all",
        newProfileDuration: "all",
        ageRange: [...DEFAULT_AGE_RANGE],
        heightRange: [...DEFAULT_HEIGHT_RANGE],
        weightRange: [...DEFAULT_WEIGHT_RANGE]
      });
      handleSubmit(undefined, 1);
    }, 50);
  };
  const handlePageChange = newPage => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      handleSubmit(undefined, newPage);
    }
  };
  const hasFiltersActive = hasActiveFilters(pendingFilters);
  const appliedFilterCount = hasActiveFilters(appliedFilters) ? Object.values(appliedFilters).filter(v => {
    if (Array.isArray(v)) return false;
    return v !== "all" && v !== "";
  }).length : 0;
  return <div className="flex flex-col lg:flex-row gap-4 md:gap-6 p-3 md:p-6 bg-[#faf8f3] min-h-screen">
      {}
      <aside className="w-full lg:w-80 flex-shrink-0 self-start">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-[#e6dec5] p-4 md:p-6 space-y-4 md:space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
          {}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 m-0">Filters</h3>
            {hasFiltersActive && <span className="text-xs bg-[#c8a227] text-white px-2 py-1 rounded-full">
                {appliedFilterCount} active
              </span>}
          </div>

          {}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input type="text" placeholder="Enter name..." value={pendingFilters.searchInput} onChange={e => {
              updatePendingFilter("searchInput", e.target.value);
              updatePendingFilter("searchName", e.target.value.trim());
            }} onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }} className="w-full pl-10 h-10 rounded-xl border border-[#e0d3af] focus:border-[#c8a227] focus:ring-[#c8a227]/40 outline-none" />
            </div>
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              New Profiles By
            </Label>
            <Select value={pendingFilters.newProfileDuration} onValueChange={value => updatePendingFilter("newProfileDuration", value)}>
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

          {}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                Age Range
              </Label>
              <span className="text-sm text-gray-600">
                {pendingFilters.ageRange[0]} - {pendingFilters.ageRange[1]} yrs
              </span>
            </div>
            <Slider min={18} max={60} step={1} value={pendingFilters.ageRange} onValueChange={value => updatePendingFilter("ageRange", value)} className="[&_[role=slider]]:bg-[#d4af37] [&_[role=track]]:bg-[#f1e6c7]" />
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Religion
            </Label>
            <Select value={pendingFilters.selectedReligion} onValueChange={value => updatePendingFilter("selectedReligion", value)}>
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40">
                <SelectValue placeholder="Select religion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Religions</SelectItem>
                {RELIGIONS.map(r => <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Caste</Label>
            <CustomSelect value={pendingFilters.selectedCaste === "all" ? "" : pendingFilters.selectedCaste} onChange={e => updatePendingFilter("selectedCaste", e.target.value && e.target.value.trim() ? e.target.value : "all")} options={casteOptions} placeholder="All Castes" allowCustom className="bg-transparent text-[#3a2f00] font-medium h-10 py-2 rounded-xl border focus:ring-2 focus:ring-[#c8a227]/40 hover:border-[#c8a227]" name="caste" />
          </div>

          {}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                Height (cm)
              </Label>
              <span className="text-sm text-gray-600">
                {pendingFilters.heightRange[0]} -{" "}
                {pendingFilters.heightRange[1]} cm
              </span>
            </div>
            <Slider min={HEIGHT_SLIDER_MIN} max={HEIGHT_SLIDER_MAX} step={1} value={pendingFilters.heightRange} onValueChange={value => updatePendingFilter("heightRange", value)} className="[&_[role=slider]]:bg-[#d4af37] [&_[role=track]]:bg-[#f1e6c7]" />
          </div>

          {}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                Weight (kg)
              </Label>
              <span className="text-sm text-gray-600">
                {pendingFilters.weightRange[0]} -{" "}
                {pendingFilters.weightRange[1]} kg
              </span>
            </div>
            <Slider min={40} max={120} step={1} value={pendingFilters.weightRange} onValueChange={value => updatePendingFilter("weightRange", value)} className="[&_[role=slider]]:bg-[#c8a227] [&_[role=track]]:bg-[#f1e6c7]" />
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Country</Label>
            <CustomSelect value={pendingFilters.selectedCountry === "all" ? "" : pendingFilters.selectedCountry} onChange={e => updatePendingFilter("selectedCountry", e.target.value && e.target.value.trim() ? e.target.value : "all")} options={COUNTRIES} placeholder="All Countries" allowCustom className="bg-transparent text-[#3a2f00] font-medium h-10 py-2 rounded-xl border focus:ring-2 focus:ring-[#c8a227]/40 hover:border-[#c8a227]" name="country" />
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Education
            </Label>
            <CustomSelect value={pendingFilters.selectedEducation === "all" ? "" : pendingFilters.selectedEducation} onChange={e => updatePendingFilter("selectedEducation", e.target.value && e.target.value.trim() ? e.target.value : "all")} options={QUALIFICATION_LEVELS} placeholder="All Education Levels" allowCustom className="bg-transparent text-[#3a2f00] font-medium h-10 py-2 rounded-xl border focus:ring-2 focus:ring-[#c8a227]/40 hover:border-[#c8a227]" name="education" />
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">City</Label>
            <CustomSelect value={pendingFilters.selectedCity} onChange={e => updatePendingFilter("selectedCity", e.target.value)} options={INDIAN_CITIES} placeholder="All Cities" allowCustom className="bg-transparent text-[#3a2f00] font-medium h-10 py-2 rounded-xl border focus:ring-2 focus:ring-[#c8a227]/40 hover:border-[#c8a227]" name="city" />
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Profession
            </Label>
            <CustomSelect value={pendingFilters.selectedProfession} onChange={e => updatePendingFilter("selectedProfession", e.target.value)} options={JOB_TITLES} placeholder="All Professions" allowCustom className="bg-transparent text-[#3a2f00] font-medium h-10 py-2 rounded-xl border focus:ring-2 focus:ring-[#c8a227]/40 hover:border-[#c8a227]" name="profession" />
          </div>

          {}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button type="submit" className="flex-1 bg-[#c8a227] text-white font-semibold py-2 rounded-lg hover:bg-[#b9941c] transition-colors">
              Search
            </button>
            <button type="button" onClick={handleClearAndSubmit} className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2">
              Clear All
            </button>
          </div>
        </form>
      </aside>

      {}
      <section className="flex-1">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#3a2f00]">
            New Profiles
          </h2>
          <p className="text-gray-500">
            {filteredProfiles.length > 0 ? `Showing ${filteredProfiles.length} profile${filteredProfiles.length !== 1 ? "s" : ""}` : "Recently joined members looking for their perfect match"}
          </p>
        </div>

        {}
        {loadingProfiles && <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227] mx-auto" />
            <p className="mt-4 text-gray-600">Loading profiles...</p>
          </div>}

        {}
        {!loadingProfiles && errorProfiles && <div className="py-12 text-center text-red-600 font-medium">
            {errorProfiles}
          </div>}

        {}
        {!loadingProfiles && !errorProfiles && <>
            {filteredProfiles.length === 0 ? <div className="text-center mt-10 p-8 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-600 text-lg mb-2">No profiles found</p>
                <p className="text-gray-500 text-sm">
                  {!initialLoadDone ? "Loading profiles..." : "Try adjusting your filter criteria"}
                </p>
              </div> : <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mt-4 auto-rows-fr">
                  {filteredProfiles.map(profile => <ProfileCard key={profile.id} {...profile} variant="newprofiles" isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some(sid => String(sid) === String(profile.id)) : false} onToggleShortlist={onToggleShortlist} onSendRequest={onSendRequest} onAddToCompare={onAddToCompare || ctxAddToCompare} onRemoveCompare={onRemoveCompare || ctxRemoveFromCompare} isInCompare={Array.isArray(compareProfiles) ? compareProfiles.map(String).includes(String(profile.id || profile._id || profile.userId)) : false} profile={profile} />)}
                </div>

                {}
                {filteredProfiles.length > 0 && totalPages > 1 && <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-[#e6dec5]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-700">
                      <span>
                        Showing {(page - 1) * pageSize + 1}-
                        {Math.min(page * pageSize, totalProfiles)} of{" "}
                        {totalProfiles}
                      </span>
                      <span className="hidden sm:inline">
                        | Page {page} of {totalPages}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 order-3 sm:order-2">
                      <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="px-3 py-1 rounded-full text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-[#d4af37] hover:text-white hover:border-[#d4af37]">
                        Prev
                      </button>

                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({
                  length: totalPages
                }).map((_, idx) => {
                  const pNum = idx + 1;
                  if (pNum === 1 || pNum === totalPages || pNum >= page - 1 && pNum <= page + 1) {
                    return <button key={pNum} onClick={() => handlePageChange(pNum)} className={`rounded-full text-sm border transition-all ${pNum === page ? "bg-[#c8a227] text-white border-[#c8a227]" : "bg-white border-gray-300 text-gray-700 hover:bg-[#f9f5ed]"}`}>
                                {pNum}
                              </button>;
                  } else if (pNum === page - 2 || pNum === page + 2) {
                    return <span key={pNum} className="px-1 text-gray-400">
                                ...
                              </span>;
                  }
                  return null;
                })}
                      </div>

                      <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1 rounded-full text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-[#c8a227] hover:text-white hover:border-[#c8a227]">
                        Next
                      </button>
                    </div>
                  </div>}
              </>}
          </>}
      </section>
    </div>;
}