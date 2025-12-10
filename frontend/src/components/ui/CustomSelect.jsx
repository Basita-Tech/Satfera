import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  className = '',
  disabled = false,
  name,
  allowCustom = false,
  preserveCase = false,
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const displayLabel = useMemo(() => {
    if (value === undefined || value === null || value === '') return '';
    return value;
  }, [value]);

  const suppressKeyboard = options.length <= 15;

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const customAvailable = useMemo(() => {
    if (!allowCustom) return false;
    const term = searchTerm.trim();
    if (!term) return false;
    const lower = term.toLowerCase();
    return !options.some((opt) => opt.toLowerCase() === lower);
  }, [allowCustom, searchTerm, options]);

  useEffect(() => {
    const onDocClick = (e) => {
      // Close if clicking outside the container
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightIndex(-1);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Remove auto-focus effect: input should only focus on manual tap
  // useEffect(() => {
  //   if (open && searchInputRef.current) {
  //     setTimeout(() => searchInputRef.current?.focus(), 50);
  //   }
  // }, [open]);

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
          const next = Math.min((idx < 0 ? -1 : idx) + 1, maxIndex);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((idx) => {
          const start = customAvailable ? filteredOptions.length : filteredOptions.length - 1;
          const prev = Math.max((idx < 0 ? start : idx) - 1, 0);
          return prev;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const customIndex = filteredOptions.length;
        if (customAvailable && (highlightIndex === customIndex || filteredOptions.length === 0 || highlightIndex < 0)) {
          let sel = searchTerm.trim();
          if (preserveCase) {
            sel = sel.charAt(0).toUpperCase() + sel.slice(1);
          }
          onChange && onChange({ target: { name, value: sel } });
          setOpen(false);
          setSearchTerm('');
          setHighlightIndex(-1);
        } else if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
          const sel = filteredOptions[highlightIndex];
          onChange && onChange({ target: { name, value: sel } });
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
    
    // Estimate list height based on options count
    const estimatedListHeight = Math.min(Math.max((options.length || 0) * 40, 160), 300);
    
    // Check if we need to flip above: not enough space below AND enough space above
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
  const borderBase = 'border focus:outline-none focus:ring-1 transition-colors duration-200';
  const borderColor = open ? 'border-[#D4A052] ring-1 ring-[#D4A052]' : 'border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]';
  const triggerClasses = `${themeBase} ${borderBase} ${borderColor} ${className} pr-10 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`;

  const handleInputChange = (e) => {
    const newSearchTerm = e.target.value;
    // If user manually clears the field, also clear the selection
    if (newSearchTerm === '' && value) {
      onChange && onChange({ target: { name, value: '' } });
    }
    setSearchTerm(newSearchTerm);
    setHighlightIndex(0);
    // Always open dropdown when typing
    if (!open) {
      setOpen(true);
    }
  };

  const handleInputKeyDown = (e) => {
    handleKeyDown(e);
  };

  const handleInputClick = (e) => {
    if (!disabled) {
      if (suppressKeyboard) {
        e.preventDefault();
        searchInputRef.current?.blur();
      }
      if (!open) {
        setOpen(true);
        setSearchTerm('');
        setHighlightIndex(0);
        updatePosition();
      } else {
        // If already open, clear search term to show all options
        setSearchTerm('');
        setHighlightIndex(0);
      }
    }
  };

  // Keep showing the selected value when open unless the user has typed a search term
  const displayValue = open ? (searchTerm !== '' ? searchTerm : displayLabel) : displayLabel;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={searchInputRef}
        type="text"
        name={name}
        disabled={disabled}
        readOnly={suppressKeyboard}
        inputMode={suppressKeyboard ? 'none' : undefined}
        className={triggerClasses}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={(e) => {
          if (!disabled) {
            if (suppressKeyboard) {
              e.preventDefault();
              e.target.blur();
              return;
            }
            setOpen(true);
            setSearchTerm('');
          }
        }}
        onTouchStart={(e) => {
          if (suppressKeyboard && !disabled) {
            e.preventDefault();
            searchInputRef.current?.blur();
            setOpen(!open);
            updatePosition();
          }
        }}
        onMouseDown={(e) => {
          if (suppressKeyboard && !disabled) {
            e.preventDefault();
          }
        }}
        onKeyDown={handleInputKeyDown}
        onClick={handleInputClick}
        placeholder={placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        autoCapitalize={preserveCase ? "none" : "sentences"}
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
        <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {open && (
        <ul
          tabIndex={-1}
          className={`max-h-48 overflow-auto focus:outline-none p-0 m-0 list-none absolute left-0 right-0 bg-white border border-gray-300 rounded-md z-10 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-1'}`}
          role="listbox"
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
            <li className="px-3 py-2 text-sm text-gray-500 italic">No results found</li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const selected = opt === value;
              const highlighted = idx === highlightIndex;
              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={selected}
                  className={`px-3 py-2 text-sm cursor-pointer ${selected ? 'bg-blue-600 text-white' : highlighted ? 'bg-gray-100' : 'text-gray-700 hover:bg-gray-50'}`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange && onChange({ target: { name, value: opt } });
                    setOpen(false);
                    setSearchTerm('');
                    setHighlightIndex(-1);
                  }}
                >
                  {opt}
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
                let sel = searchTerm.trim();
                if (preserveCase) {
                  sel = sel.charAt(0).toUpperCase() + sel.slice(1);
                }
                onChange && onChange({ target: { name, value: sel } });
                setOpen(false);
                setSearchTerm('');
                setHighlightIndex(-1);
              }}
            >
              Use "{searchTerm.trim()}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
