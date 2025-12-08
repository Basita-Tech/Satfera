import React, { useState, useEffect } from 'react';
import { Country, State, City } from 'country-state-city';
import { searchCountries, searchStates, searchCities, hasCitiesData } from '../../lib/locationUtils';

/**
 * LocationSelect Component - Searchable dropdown for Country/State/City selection
 * Uses react-country-state-city library for real data
 */
export default function LocationSelect({
  type = 'country',
  value,
  onChange,
  placeholder = 'Select',
  className = '',
  disabled = false,
  name,
  countryCode,
  stateCode,
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState([]);
  const containerRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  // Get options based on type
  useEffect(() => {
    try {
      let data = [];
      if (type === 'country') {
        data = Country.getAllCountries().map(c => ({
          name: c.name,
          code: c.isoCode
        }));
      } else if (type === 'state' && countryCode) {
        data = State.getStatesOfCountry(countryCode).map(s => ({
          name: s.name,
          code: s.isoCode
        }));
      } else if (type === 'city' && countryCode && stateCode) {
        try {
          const hasCities = hasCitiesData(countryCode, stateCode);
          if (!hasCities) {
            console.warn(`No city data available for ${countryCode}-${stateCode}`);
          }
          const cities = City.getCitiesOfState(countryCode, stateCode);
          data = (cities || []).map(c => ({
            name: c.name
          }));
        } catch (cityError) {
          console.error(`Error loading cities for ${countryCode}-${stateCode}:`, cityError);
          data = [];
        }
      }
      setOptions(data);
    } catch (error) {
      console.error('LocationSelect error:', error);
      setOptions([]);
    }
  }, [type, countryCode, stateCode]);

  const displayLabel = value || '';

  // Use enhanced search for all types
  let filteredOptions;
  if (searchTerm.trim()) {
    if (type === 'country') {
      filteredOptions = searchCountries(searchTerm);
    } else if (type === 'state' && countryCode) {
      filteredOptions = searchStates(countryCode, searchTerm);
    } else if (type === 'city' && countryCode && stateCode) {
      filteredOptions = searchCities(countryCode, stateCode, searchTerm);
    } else {
      filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
  } else {
    filteredOptions = options;
  }

  const customAvailable = type === 'city'
    && !!searchTerm.trim()
    && !filteredOptions.some((opt) => opt.name.toLowerCase() === searchTerm.trim().toLowerCase());

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightIndex(-1);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex(Math.max(0, filteredOptions.findIndex((o) => o === value)));
      return;
    }
    if (open) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setHighlightIndex(-1);
        setSearchTerm('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((idx) => {
          const maxIndex = filteredOptions.length - 1 + (customAvailable ? 1 : 0);
          return Math.min((idx < 0 ? -1 : idx) + 1, maxIndex);
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((idx) => {
          const start = customAvailable ? filteredOptions.length : filteredOptions.length - 1;
          return Math.max((idx < 0 ? start : idx) - 1, 0);
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const customIndex = filteredOptions.length;
        const trimmed = searchTerm.trim();
        if (customAvailable && (highlightIndex === customIndex || filteredOptions.length === 0 || highlightIndex < 0)) {
          onChange && onChange({ target: { name, value: trimmed } });
          setOpen(false);
          setSearchTerm('');
          setHighlightIndex(-1);
        } else if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
          const sel = filteredOptions[highlightIndex];
          onChange && onChange({ target: { name, value: sel.name, code: sel.code } });
          setOpen(false);
          setSearchTerm('');
          setHighlightIndex(-1);
        }
      }
    }
  };

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const estimatedListHeight = Math.min(Math.max((options.length || 0) * 40, 160), 300);
    const needsFlipUp = spaceBelow < estimatedListHeight + 20 && spaceAbove > estimatedListHeight + 20;

    setDropUp(needsFlipUp);
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [open]);

  const themeBase = 'w-full rounded-md p-2.5 sm:p-3 text-sm transition box-border bg-white';
  const borderBase = 'border border-[#D4A052] focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A]';
  const triggerClasses = `${themeBase} ${borderBase} ${className} pr-10 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`;

  const handleInputChange = (e) => {
    const newSearchTerm = e.target.value;
    
    if (newSearchTerm === '' && value) {
      onChange && onChange({ target: { name, value: '' } });
    }
    setSearchTerm(newSearchTerm);
    setHighlightIndex(0);
    if (!open) {
      setOpen(true);
    }
  };

  const handleInputKeyDown = (e) => {
    handleKeyDown(e);
  };

  const handleInputClick = () => {
    if (!disabled) {
      if (!open) {
        setOpen(true);
        setSearchTerm('');
        setHighlightIndex(0);
        updatePosition();
      } else {
        
        setSearchTerm('');
        setHighlightIndex(0);
      }
    }
  };

  
  const displayValue = open ? (searchTerm !== '' ? searchTerm : displayLabel) : displayLabel;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={searchInputRef}
        type="text"
        name={name}
        disabled={disabled}
        className={triggerClasses}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (!disabled) {
            setOpen(true);
            setSearchTerm('');
          }
        }}
        onBlur={() => {
          // Clear search term when leaving the field, but give dropdown time to process selection
          setTimeout(() => {
            setSearchTerm('');
          }, 100);
        }}
        onKeyDown={handleInputKeyDown}
        onClick={handleInputClick}
        placeholder={placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      {/* Dropdown Arrow Icon */}
      <svg
        className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none transition-transform duration-200 ${
          open ? 'rotate-180' : ''
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>

      {open && (
        <div className={`absolute w-full z-50 rounded-md border border-[#D4A052] bg-white shadow-lg ${
          dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          <ul
            role="listbox"
            tabIndex={-1}
            className="max-h-48 overflow-auto focus:outline-none p-0 m-0 list-none"
          >
            {placeholder && !searchTerm && (
              <li
                role="option"
                aria-selected={value === ''}
                className={`px-3 py-2 text-sm cursor-pointer ${value === '' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                onMouseEnter={() => setHighlightIndex(-1)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange && onChange({ target: { name, value: '' } });
                  setOpen(false);
                  setSearchTerm('');
                  setHighlightIndex(-1);
                }}
              >
                {placeholder}
              </li>
            )}
            {filteredOptions.length === 0 && !customAvailable ? (
              <li className="px-3 py-2 text-sm text-gray-500 italic">
                {type === 'city' && countryCode && stateCode 
                  ? 'No cities available for this state' 
                  : 'No results found'}
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const selected = opt.name === value;
                const highlighted = idx === highlightIndex;
                return (
                  <li
                    key={opt.name}
                    role="option"
                    aria-selected={selected}
                    className={`px-3 py-2 text-sm cursor-pointer ${selected ? 'bg-blue-600 text-white' : highlighted ? 'bg-gray-100' : 'text-gray-700 hover:bg-gray-50'}`}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const eventObj = { target: { name, value: opt.name } };
                      // Pass code as additional property for state/city selections
                      if (opt.code) {
                        eventObj.target.code = opt.code;
                      }
                      onChange && onChange(eventObj);
                      setOpen(false);
                      setSearchTerm('');
                      setHighlightIndex(-1);
                    }}
                  >
                    {opt.name}
                  </li>
                );
              })
            )}
            {customAvailable && (
              <li
                role="option"
                aria-selected={false}
                className={`px-3 py-2 text-sm cursor-pointer ${highlightIndex === filteredOptions.length ? 'bg-gray-100' : 'text-gray-700 hover:bg-gray-50'}`}
                onMouseEnter={() => setHighlightIndex(filteredOptions.length)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const trimmed = searchTerm.trim();
                  onChange && onChange({ target: { name, value: trimmed } });
                  setOpen(false);
                  setSearchTerm('');
                  setHighlightIndex(-1);
                }}
              >
                Use "{searchTerm.trim()}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
