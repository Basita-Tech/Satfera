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
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
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

  const decidePlacement = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const estimatedListHeight = Math.min(60 * 3, 240); // approx; 3 items or max 240px
    setDropUp(spaceBelow < estimatedListHeight);
  };

  useEffect(() => {
    if (open) {
      decidePlacement();
    }
  }, [open, options.length]);

  useEffect(() => {
    const onResize = () => {
      if (open) decidePlacement();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  const themeBase = 'w-full rounded-md p-2.5 sm:p-3 text-sm transition box-border bg-white';
  const borderBase = 'border border-[#D4A052] focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A]';
  const triggerClasses = `${themeBase} ${borderBase} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        name={name}
        disabled={disabled}
        className={triggerClasses}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between">
          <span className={displayLabel ? 'text-current' : 'text-gray-400'}>
            {displayLabel || placeholder}
          </span>
          <svg className="h-4 w-4 text-gray-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {open && (
        <div
          className={`absolute z-[9999] ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} w-full rounded-md border border-[#D4A052] bg-white shadow-lg`}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightIndex(0);
              }}
              placeholder="Type to search..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A]"
              onClick={(e) => e.stopPropagation()}
              autoCapitalize={preserveCase ? "none" : "sentences"}
            />
          </div>

          <ul
            role="listbox"
            tabIndex={-1}
            className="max-h-48 overflow-auto focus:outline-none"
          >
            {/* Placeholder option */}
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
        </div>
      )}
    </div>
  );
}
