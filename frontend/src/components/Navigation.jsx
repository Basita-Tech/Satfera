import React, { useState, useContext } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import NotificationDropdown from "./NotificationDropdown";
import { AuthContextr } from "./context/AuthContext";
import toast from "react-hot-toast";

export function Navigation({ activePage, onNavigate }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const navigate = useNavigate();

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            // If it looks like an ID (24 char hex), navigate directly
            if (searchQuery.match(/^[a-f0-9]{24}$/i)) {
                navigate(`/dashboard/profile/${searchQuery.trim()}`);
                setSearchQuery('');
                setShowResults(false);
                return;
            }
            
            // Otherwise search by name
            const { searchProfiles } = await import('../api/auth');
            const response = await searchProfiles(searchQuery);
            
            console.log('🔍 Navigation - Search response:', response);
            console.log('🔍 Navigation - Response success:', response?.success);
            console.log('🔍 Navigation - Response data:', response?.data);
            console.log('🔍 Navigation - Is data array?:', Array.isArray(response?.data));
            
            if (response?.success && Array.isArray(response.data)) {
                console.log('🔍 Navigation - Processing', response.data.length, 'results');
                // Map the data to extract user objects from the wrapper
                const mappedResults = response.data.map((item, index) => {
                    console.log(`🔍 Navigation - Item ${index}:`, item);
                    return {
                        userId: item.user?.userId || item.userId,
                        firstName: item.user?.firstName || item.firstName,
                        lastName: item.user?.lastName || item.lastName,
                        age: item.user?.age || item.age,
                        city: item.user?.city || item.city,
                        image: item.user?.closerPhoto?.url || item.image
                    };
                });
                console.log('🔍 Navigation - Mapped results:', mappedResults);
                setSearchResults(mappedResults);
                setShowResults(true);
            } else {
                console.warn('🔍 Navigation - No results or invalid response');
                setSearchResults([]);
                setShowResults(true);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
            setShowResults(true);
        } finally {
            setIsSearching(false);
        }
    };

    const menuItems = [
        { label: "Dashboard", key: "dashboard" },
        { label: "Recommendations", key: "browse" },
        { label: "New Profiles", key: "newprofiles" },
        { label: "Requests", key: "requests" },
        { label: "Approved", key: "approved" },
        { label: "Shortlisted", key: "shortlisted" },
        { label: "Compare", key: "compare" },
        { label: "Settings", key: "settings" },
    ];

    const { logout } = useContext(AuthContextr);

    const handleNavigation = async (key) => {
        console.log("Navigation: requested ->", key);
        
        // Handle logout specially
        if (key === "logout") {
            try {
                await logout();
                toast.success("Logged out successfully");
                navigate("/login");
            } catch (error) {
                console.error("Logout error:", error);
                toast.error("Logout failed");
            }
            setMobileMenuOpen(false);
            return;
        }
        
        try {
            onNavigate?.(key);
        } catch (err) {
            console.warn("Navigation: onNavigate threw", err);
        }
        // update the URL to keep routing in sync
        const target = key === "dashboard" ? "/dashboard" : `/dashboard/${key}`;
        try {
            navigate(target);
        } catch (e) {
            console.warn('Navigation: navigate failed', e);
        }
        setMobileMenuOpen(false);
    };

    return (
        <nav className="sticky top-0 z-[100] bg-white border-b border-[#D4A052]/30 shadow-sm">
            <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-4">
                <div className="flex items-center justify-between w-full">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <button
                            onClick={() => handleNavigation("dashboard")}
                            className="select-none cursor-pointer"
                        >
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="h-[45px] sm:h-[58px] w-auto object-contain md:h-[65px] lg:h-[75px]"
                            />
                        </button>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center justify-center flex-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => handleNavigation(item.key)}
                                className={`flex-1 max-w-[160px] px-2 py-1.5 text-[0.875rem] rounded-lg transition-all whitespace-nowrap ${activePage === item.key
                                    ? "text-[#D4A052] border-b-2 border-[#D4A052] -mb-[2px]"
                                    : "text-[#800000] hover:text-[#D4A052]  hover:border-b-2 hover:border-[#D4A052]"
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Search - Desktop and Mobile */}
                    <div className="hidden md:block">
                        <div className="relative w-[200px] md:w-[240px] lg:w-[280px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7b3b3b]/60 pointer-events-none z-10" />
                            <input
                                type="text"
                                placeholder="Search by ID or Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch();
                                    } else if (e.key === 'Escape') {
                                        setShowResults(false);
                                        setSearchQuery('');
                                    }
                                }}
                                onFocus={() => {
                                    if (searchResults.length > 0) setShowResults(true);
                                }}
                                onBlur={() => {
                                    setTimeout(() => setShowResults(false), 200);
                                }}
                                style={{ paddingLeft: '44px', paddingRight: '16px' }}
                                className="w-full h-10 bg-white border border-[#D4A052]/30 rounded-[12px]
                     text-sm text-[#222] placeholder:text-[#7b3b3b]/60 shadow-sm
                     caret-[#D4A052]
                     focus:border-[#D4A052] focus:ring-2 focus:ring-[#D4A052]/20 focus:outline-none
                     transition-all"
                            />
                            
                            {/* Search Results Dropdown */}
                            {showResults && (
                                <div className="absolute top-full mt-2 w-full bg-white rounded-[12px] shadow-lg border border-[#D4A052]/20 max-h-[400px] overflow-y-auto z-50">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            Searching...
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="py-2">
                                            {searchResults.slice(0, 10).map((result) => {
                                                const userId = result?.userId;
                                                const name = `${result?.firstName || ''} ${result?.lastName || ''}`.trim() || 'Unknown';
                                                const age = result?.age;
                                                const city = result?.city;
                                                const image = result?.image;
                                                
                                                return (
                                                    <button
                                                        key={userId}
                                                        onClick={() => {
                                                            navigate(`/dashboard/profile/${userId}`);
                                                            setShowResults(false);
                                                            setSearchQuery('');
                                                        }}
                                                        className="w-full px-4 py-3 hover:bg-[#D4A052]/10 transition-colors text-left flex items-center gap-3"
                                                    >
                                                        {image ? (
                                                            <img 
                                                                src={image} 
                                                                alt={name}
                                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div 
                                                            className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center"
                                                            style={{ display: image ? 'none' : 'flex' }}
                                                        >
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                {name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {name}{age ? `, ${age}` : ''}
                                                            </p>
                                                            {city && (
                                                                <p className="text-xs text-gray-500 truncate">{city}</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            No results found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Section - Icons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Notification Bell */}
                        <div className="block">
                            <NotificationDropdown onViewAll={() => handleNavigation("notifications")} />
                        </div>

                        {/* Mobile Menu Hamburger */}
                        <div className="block lg:hidden">
                            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <button 
                                        className="p-2 hover:bg-[#D4A052]/10 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" 
                                        aria-label="Open Menu"
                                        type="button"
                                    >
                                        <Menu className="w-6 h-6 text-[#800000]" />
                                    </button>
                                </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="w-[280px] sm:w-[320px] bg-[#ebe9e6]"
                            >
                                <div className="flex flex-col gap-3 pt-16 pb-6 px-2 overflow-y-auto max-h-[calc(100vh-40px)]">
                                        {/* Mobile Search */}
                                        <div className="mb-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b3b3b]/60 pointer-events-none z-10" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by ID or Name..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSearch();
                                                            setMobileMenuOpen(false);
                                                        } else if (e.key === 'Escape') {
                                                            setShowResults(false);
                                                            setSearchQuery('');
                                                        }
                                                    }}
                                                    style={{ paddingLeft: '36px', paddingRight: '12px' }}
                                                    className="w-full h-10 bg-white border border-[#D4A052]/30 rounded-[12px]
                                                        text-sm text-[#222] placeholder:text-[#7b3b3b]/60 shadow-sm
                                                        caret-[#D4A052]
                                                        focus:border-[#D4A052] focus:ring-2 focus:ring-[#D4A052]/20 focus:outline-none
                                                        transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-[#D4A052]/30 mb-2"></div>

                                        {menuItems.map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => handleNavigation(item.key)}
                                            className={`px-4 py-3 rounded-lg font-medium transition-all text-left
      ${activePage === item.key
                                                    ? "bg-[#D4A052]/20 text-[#800000]"
                                                    : "bg-transparent text-[#800000] hover:bg-[#D4A052]/20 hover:text-[#800000]"
                                                }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}

                                    <div className="border-t border-[#D4A052]/30 my-3"></div>
                                    <button
                                        onClick={() => handleNavigation("logout")}
                                        className="w-full text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all font-medium"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
