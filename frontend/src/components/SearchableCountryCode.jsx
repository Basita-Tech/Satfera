import { useState } from "react";
import { useRef, useEffect } from "react";

const SearchableCountryCode = ({ value, onChange, error, countryCodes }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const filteredList = countryCodes.filter((c) => {
    const searchLower = search.toLowerCase();
    const countryMatch = c.country.toLowerCase().includes(searchLower);
    const codeMatch = c.code.includes(search);
    const aliasMatch = Array.isArray(c.aliases)
      ? c.aliases.some((alias) => alias.toLowerCase().includes(searchLower))
      : false;
    return countryMatch || codeMatch || aliasMatch;
  });

  return (
    <div className="relative w-full sm:w-32 md:w-40" ref={dropdownRef}>
      <div
        className={`rounded-lg border ${
          error ? "border-red-500" : "border-[#b3b2ae]"
        } p-3 text-sm cursor-pointer bg-white flex items-center justify-between`}
        onClick={() => setOpen(!open)}
      >
        <span>{value ? value : "Select code"}</span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-[#b7b5b3] rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
          <input
            type="text"
            className="w-full border-b p-2 text-sm outline-none"
            placeholder="Search country or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filteredList.map((c, i) => (
            <div
              key={i}
             className="p-2 text-sm hover:bg-[rgb(156,189,235)]"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
                setSearch("");
              }}
            >
              {c.code} {c.country}
            </div>
          ))}
          {filteredList.length === 0 && (
            <div className="p-2 text-gray-500 text-sm">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableCountryCode;
