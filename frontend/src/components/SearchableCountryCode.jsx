import { useState, useRef, useEffect, useMemo, useCallback } from "react";

const SearchableCountryCode = ({ value, onChange, error, countryCodes }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState("down"); // prefer opening down, flip if no space
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const decidePlacement = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const estimatedHeight = Math.min(menuRef.current?.scrollHeight || 320, 320);

    setPlacement(spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove ? "down" : "up");
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    decidePlacement();
    window.addEventListener("resize", decidePlacement);
    window.addEventListener("scroll", decidePlacement, true);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", decidePlacement, true);
      window.removeEventListener("resize", decidePlacement);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, decidePlacement]);

  const sortedCountries = useMemo(() => {
    if (!Array.isArray(countryCodes)) return [];
    const list = [...countryCodes];
    // Keep India on top, then alphabetical by country name
    return list.sort((a, b) => {
      if (a.country === "India") return -1;
      if (b.country === "India") return 1;
      return a.country.localeCompare(b.country);
    });
  }, [countryCodes]);

  const filteredList = useMemo(() => {
    const searchLower = search.toLowerCase();
    return sortedCountries.filter((c) => {
      const countryMatch = c.country.toLowerCase().includes(searchLower);
      const codeMatch = c.code.includes(search);
      const aliasMatch = Array.isArray(c.aliases)
        ? c.aliases.some((alias) => alias.toLowerCase().includes(searchLower))
        : false;
      return countryMatch || codeMatch || aliasMatch;
    });
  }, [sortedCountries, search]);

  const displayValue = value || "Select Code";

  return (
    <div className="relative w-full sm:w-40 flex-shrink-0" ref={dropdownRef}>
      <div
        className={`w-full p-3 rounded-md border ${
          error ? "border-red-500" : "border-[#E4C48A]"
        } bg-white text-sm cursor-pointer flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
        onClick={() => setOpen((prev) => !prev)}
        ref={triggerRef}
      >
        <span className="truncate text-gray-800">{displayValue}</span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div
          ref={menuRef}
          className={`absolute z-50 left-0 w-64 bg-white border border-[#c7c4bd] rounded-md shadow-xl overflow-hidden ${
            placement === "down" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          <div className="px-3 py-2 border-b bg-[#f6f3ec] text-xs font-semibold text-gray-700 uppercase tracking-wide">
           Select  Code
          </div>

          <div className="px-3 py-2 border-b">
            <input
              type="text"
              className="w-full border border-[#e4c48a] rounded-sm px-2 py-1 text-sm outline-none focus:border-[#a58b4d]"
              placeholder="Search country or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // Only focus on user tap
            />
          </div>

          <div className="max-h-80 overflow-y-auto bg-white">
            {filteredList.map((c, i) => {
              const isActive = value === c.code;
              const baseClasses = "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition text-gray-800 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a58b4d]";
              const stateClasses = isActive
                ? "bg-[#e7f0ff] hover:bg-[#d7e6ff] font-medium"
                : "bg-white hover:bg-[#eaf3ff]";

              return (
                <button
                  type="button"
                  key={`${c.country}-${c.code}-${i}`}
                  className={`${baseClasses} ${stateClasses}`}
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="text-gray-900">{c.country.split('(')[0].trim()}</span>
                  <span className="text-gray-500">({c.code})</span>
                </button>
              );
            })}

            {filteredList.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableCountryCode;
