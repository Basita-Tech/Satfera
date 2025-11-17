
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

export default function NewProfiles({ profiles = [], onSendRequest, shortlistedIds = [], onToggleShortlist, onAddToCompare, onRemoveCompare, compareProfiles = [] }) {
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

  // Shortlist state is managed by parent `UserDashboard`; use provided props
  // `shortlistedIds` is expected to be an array of ids and `onToggleShortlist` toggles them


  // Debounce search input to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchName(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filteredProfiles = useMemo(() => {
    const normalize = (v) => (v ? v.toString().toLowerCase().trim() : "");

    const query = normalize(searchName);
    const tokens = query === "" ? [] : query.split(/\s+/).filter(Boolean);

    return profiles.filter((p) => {
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
        selectedReligion === "all" || !p.religion || normalize(p.religion).includes(normalize(selectedReligion));


      const matchCaste =
        selectedCaste === "all" || normalize(p.caste) === normalize(selectedCaste);

      const matchCity = selectedCity === "" || normalize(p.city).includes(normalize(selectedCity));

      const matchProfession = selectedProfession === "" || normalize(p.profession).includes(normalize(selectedProfession));

      const matchCountry =
        selectedCountry === "all" || normalize(p.country || p.location || "").includes(normalize(selectedCountry));

      const matchEducation =
        selectedEducation === "all" || normalize(p.education || "").includes(normalize(selectedEducation.replace(/[_-]/g, " ")));

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
  }, [
    profiles,
    searchName,
    selectedReligion,
    selectedCaste,
    selectedCity,
    selectedProfession,
    selectedCountry,
    selectedEducation,
    ageRange,
    heightRange,
    weightRange,
  ]);

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

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-[#faf8f3] min-h-screen">
      {/* Sidebar Filters */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-md border border-[#e6dec5] p-6 space-y-6 sticky top-8">
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

          {/* Religion */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Religion</Label>
            <Select
              value={selectedReligion}
              onValueChange={setSelectedReligion}
            >
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select religion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Religions</SelectItem>
                <SelectItem value="Hindu">Hindu</SelectItem>
                <SelectItem value="Muslim">Muslim</SelectItem>
                <SelectItem value="Christian">Christian</SelectItem>
                <SelectItem value="Sikh">Sikh</SelectItem>
                <SelectItem value="Jain">Jain</SelectItem>
                <SelectItem value="Buddhist">Buddhist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caste */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Caste</Label>
            <Select value={selectedCaste} onValueChange={setSelectedCaste}>
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select caste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Castes</SelectItem>
                <SelectItem value="Brahmin">Brahmin</SelectItem>
                <SelectItem value="Patel">Patel</SelectItem>
                <SelectItem value="Agarwal">Agarwal</SelectItem>
                <SelectItem value="Rajput">Rajput</SelectItem>
                <SelectItem value="Iyer">Iyer</SelectItem>
                <SelectItem value="Jat">Jat</SelectItem>
                <SelectItem value="Reddy">Reddy</SelectItem>
                <SelectItem value="Maratha">Maratha</SelectItem>
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


          {/* Country */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Country</Label>
            <Select
              value={selectedCountry}
              onValueChange={setSelectedCountry}
            >
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="UAE">UAE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Education */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Education
            </Label>
            <Select
              value={selectedEducation}
              onValueChange={setSelectedEducation}
            >
              <SelectTrigger className="rounded-xl bg-transparent text-[#3a2f00] font-medium border focus:ring-2 focus:ring-[#d4af37]/40 hover:border-[#d4af37]">
                <SelectValue placeholder="Select education" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Education Levels</SelectItem>
                <SelectItem value="Graduate">Graduate</SelectItem>
                <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                <SelectItem value="Doctorate">Doctorate</SelectItem>
                <SelectItem value="Diploma">Diploma</SelectItem>
                <SelectItem value="High School">High School</SelectItem>
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

          {/* Matches Found Count */}
          <div className="mt-1">
            <p className="text-gray-500 text-lg font-medium">
              Matches Found{" "}
              <span className="text-[#d4af37] font-semibold">
                {filteredProfiles.length}
              </span>
            </p>
          </div>
        </div>

        {/* Profiles Grid */}
        {filteredProfiles.length === 0 ? (
          <p className="text-gray-600 mt-10 text-center">
            No profiles found matching your filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {filteredProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                {...profile}
                variant="newprofiles"
                isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(profile.id)) : false}
                onToggleShortlist={onToggleShortlist}
                onSendRequest={onSendRequest}
                onAddToCompare={onAddToCompare}
                onRemoveCompare={onRemoveCompare}
                isInCompare={Array.isArray(compareProfiles) ? compareProfiles.includes(profile.id) : false}
                profile={profile}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
