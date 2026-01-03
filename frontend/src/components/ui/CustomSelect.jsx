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
  forcesMobileUI = false
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(() => {
    if (forcesMobileUI) return true;
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 600;
  });
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  useEffect(() => {
    const handleResize = () => {
      if (forcesMobileUI) {
        setIsMobile(true);
      } else {
        setIsMobile(window.innerWidth <= 600);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [forcesMobileUI]);
  const displayLabel = useMemo(() => {
    if (value === undefined || value === null || value === '') return '';
    return value;
  }, [value]);
  const suppressKeyboard = isMobile && options.length <= 15;
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
    return !options.some(opt => opt.toLowerCase() === lower);
  }, [allowCustom, searchTerm, options]);
  useEffect(() => {
    const onDocClick = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightIndex(-1);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);
  const handleKeyDown = e => {
    if (disabled) return;
    if (e.key === 'Tab') {
      setOpen(false);
      setHighlightIndex(-1);
      setSearchTerm('');
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex(Math.max(0, filteredOptions.findIndex(o => o === value)));
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
        setHighlightIndex(idx => {
          const maxIndex = filteredOptions.length - 1 + (customAvailable ? 1 : 0);
          const next = Math.min((idx < 0 ? -1 : idx) + 1, maxIndex);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(idx => {
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
          onChange && onChange({
            target: {
              name,
              value: sel
            }
          });
          setOpen(false);
          setSearchTerm('');
          setHighlightIndex(-1);
        } else if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
          const sel = filteredOptions[highlightIndex];
          onChange && onChange({
            target: {
              name,
              value: sel
            }
          });
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
  const borderBase = 'border transition-colors duration-200';
  const borderColor = 'border-[#D4A052] focus:border-[#D4A052] focus:ring-1 focus:ring-[#D4A052] focus:outline-none';
  const openStyle = open ? 'ring-1 ring-[#D4A052]' : '';
  const triggerClasses = `${themeBase} ${borderBase} ${borderColor} ${openStyle} ${className} pr-10 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`;
  const handleInputChange = e => {
    const newSearchTerm = e.target.value;
    if (newSearchTerm === '' && value) {
      onChange && onChange({
        target: {
          name,
          value: ''
        }
      });
    }
    setSearchTerm(newSearchTerm);
    setHighlightIndex(0);
    if (!open) {
      setOpen(true);
    }
  };
  const handleInputKeyDown = e => {
    handleKeyDown(e);
  };
  const handleInputClick = e => {
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
        if (!suppressKeyboard && searchInputRef.current) {
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      } else {
        setSearchTerm('');
        setHighlightIndex(0);
      }
    }
  };
  const displayValue = open ? searchTerm !== '' ? searchTerm : displayLabel : displayLabel;
  return <div ref={containerRef} className="relative w-full">
      {suppressKeyboard ? <button type="button" disabled={disabled} onClick={() => {
      if (!disabled) {
        setOpen(!open);
        setSearchTerm('');
        setHighlightIndex(0);
        updatePosition();
      }
    }} onTouchStart={e => {
      e.preventDefault();
    }} onFocus={e => {
      e.preventDefault();
    }} onMouseDown={e => {
      e.preventDefault();
    }} className={`${themeBase} ${borderBase} ${borderColor} ${open ? 'ring-1 ring-[#D4A052]' : ''} ${className} pr-10 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} text-left`} aria-haspopup="listbox" aria-expanded={open}>
          {displayLabel || placeholder}
        </button> : <input ref={searchInputRef} type="text" name={name} disabled={disabled} className={triggerClasses} value={displayValue} onChange={handleInputChange} onFocus={() => {}} onMouseDown={e => {
      if (suppressKeyboard && !disabled) {
        e.preventDefault();
      }
    }} onKeyDown={handleInputKeyDown} onClick={handleInputClick} onBlur={() => {
      setOpen(false);
      setHighlightIndex(-1);
      setSearchTerm('');
    }} placeholder={placeholder} aria-haspopup="listbox" aria-expanded={open} autoCapitalize={preserveCase ? "none" : "sentences"} />}
      {}
      <svg className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {open && <ul tabIndex={-1} className={`max-h-48 overflow-auto focus:outline-none p-0 m-0 list-none absolute left-0 right-0 bg-white border border-gray-300 rounded-md z-10 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-1'}`} role="listbox">
          {placeholder && !searchTerm && <li role="option" aria-selected={value === ''} className={`px-3 py-2 text-sm cursor-pointer ${value === '' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onMouseEnter={() => setHighlightIndex(-1)} onMouseDown={e => {
        e.preventDefault();
        onChange && onChange({
          target: {
            name,
            value: ''
          }
        });
        setOpen(false);
        setSearchTerm('');
        setHighlightIndex(-1);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }}>
              {placeholder}
            </li>}
          {filteredOptions.length === 0 && !customAvailable ? <li className="px-3 py-2 text-sm text-gray-500 italic">No results found</li> : filteredOptions.map((opt, idx) => {
        const selected = opt === value;
        const highlighted = idx === highlightIndex;
        return <li key={opt} role="option" aria-selected={selected} className={`px-3 py-2 text-sm cursor-pointer ${selected ? 'bg-blue-600 text-white' : highlighted ? 'bg-gray-100' : 'text-gray-700 hover:bg-gray-50'}`} onMouseEnter={() => setHighlightIndex(idx)} onMouseDown={e => {
          e.preventDefault();
          onChange && onChange({
            target: {
              name,
              value: opt
            }
          });
          setOpen(false);
          setSearchTerm('');
          setHighlightIndex(-1);
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }}>
                  {opt}
                </li>;
      })}
          {customAvailable && <li role="option" aria-selected={false} className={`px-3 py-2 text-sm cursor-pointer ${highlightIndex === filteredOptions.length ? 'bg-gray-100' : 'text-gray-700 hover:bg-gray-50'}`} onMouseEnter={() => setHighlightIndex(filteredOptions.length)} onMouseDown={e => {
        e.preventDefault();
        let sel = searchTerm.trim();
        if (preserveCase) {
          sel = sel.charAt(0).toUpperCase() + sel.slice(1);
        }
        onChange && onChange({
          target: {
            name,
            value: sel
          }
        });
        setOpen(false);
        setSearchTerm('');
        setHighlightIndex(-1);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }}>
              Use "{searchTerm.trim()}"
            </li>}
        </ul>}
    </div>;
}