import React, { useState, useMemo, useEffect } from "react";
import { ProfileCard } from "../../ProfileCard"
import { Search } from "lucide-react";

export function Browse({
  profiles,
  onViewProfile,
  onSendRequest,
  onAddToCompare,
  onRemoveCompare,
  compareProfiles,
  shortlistedIds,
  onToggleShortlist,
}) {
  // Search state (debounced)
  const [searchInput, setSearchInput] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterRange, setFilterRange] = useState("all"); 
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All Profiles");


  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchName(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filter and sort profiles
  const filteredProfiles = useMemo(() => {
    const now = new Date();
    
    // Step 1: Filter by date range
    let filtered = [...profiles];
    
    if (filterRange === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      filtered = filtered.filter((p) => {
        // If createdAt exists, use it; otherwise show all profiles
        if (!p.createdAt) return true;
        const created = new Date(p.createdAt);
        return created >= weekAgo;
      });
    } else if (filterRange === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      filtered = filtered.filter((p) => {
        if (!p.createdAt) return true;
        const created = new Date(p.createdAt);
        return created >= monthAgo;
      });
    }
    // filterRange === "all" shows everything
    
    // Step 2: Sort by compatibility
    filtered = filtered
      .filter((p) => p.compatibility !== undefined)
      .sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0));
    
    // Step 3: Filter by search text
    if (searchName) {
      const normalize = (v) => (v ? v.toString().toLowerCase().trim() : "");
      const query = normalize(searchName);
      const tokens = query.split(/\s+/).filter(Boolean);

      filtered = filtered.filter((p) => {
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

        return tokens.every((tkn) => {
          if (/^\d+$/.test(tkn)) {
            const n = Number(tkn);
            if (p.age && Number(p.age) === n) return true;
            if (p.height && Number(p.height) === n) return true;
            if (p.weight && Number(p.weight) === n) return true;
            if (p.id && Number(p.id) === n) return true;
          }
          return searchable.includes(tkn);
        });
      });
    }
    
    return filtered;
  }, [profiles, filterRange, searchName]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="mb-2 m-0 text-3xl md:text-4xl font-bold text-black">Recommendations</h2>
            <p className="text-muted-foreground m-0">
              Your best matches based on compatibility scores
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="relative w-full md:w-64">
            {/* Filter Button */}
            <button
              onClick={() => setOpenFilter(!openFilter)}
              className="w-full h-11 px-4 flex items-center justify-between 
                       rounded-[12px] border-[1.5px] border-[#c8a227] bg-white 
                       text-gray-800 font-medium text-sm
                       hover:bg-[#f9f5ed] transition-all duration-200 shadow-sm"
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

            {/* Dropdown Options */}
            {openFilter && (
              <div className="absolute mt-2 w-full bg-white border border-gray-200 
                            rounded-[12px] shadow-lg z-50 overflow-hidden">
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
                    className={`px-4 py-3 cursor-pointer flex justify-between items-center 
                             hover:bg-[#f9f5ed] text-gray-700 transition-colors
                             ${idx !== 0 ? 'border-t border-gray-100' : ''}`}
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
        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              {...profile}
              variant="browse"
              onView={onViewProfile}
              onSendRequest={onSendRequest}
              onAddToCompare={onAddToCompare}
              onRemoveCompare={onRemoveCompare}
              isInCompare={compareProfiles.includes(profile.id)}
              isShortlisted={Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(profile.id)) : false}
              onToggleShortlist={onToggleShortlist}
            />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 pt-4">
          {[1, 2, 3, 4, 5].map((page) => (
            <button
              key={page}
              className={`w-10 h-10 rounded-[8px] transition-all ${
                page === 1
                  ? "bg-gold text-white"
                  : "border border-border-subtle hover:border-gold hover:text-gold"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
