import React, { useState, useContext, useEffect } from "react";
import { Search, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import NotificationDropdown from "./NotificationDropdown";
import { AuthContextr } from "./context/AuthContext";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { getUserProfileDetails } from "../api/auth";
export function Navigation({
  activePage,
  onNavigate
}) {
  React.useEffect(() => {
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = '';
    };
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [logoHighlighted, setLogoHighlighted] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      try {
        const res = await getUserProfileDetails();
        if (isMounted && res?.success) {
          setProfileUser(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };
    fetchUserProfile();
    return () => {
      isMounted = false;
    };
  }, []);
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      if (searchQuery.match(/^[a-f0-9]{24}$/i)) {
        navigate(`/dashboard/profile/${searchQuery.trim()}`);
        setSearchQuery("");
        setShowResults(false);
        return;
      }
      const {
        searchProfiles
      } = await import("../api/auth");
      const rawTerm = searchQuery.trim();
     
      const cleanedIdCandidate = rawTerm.replace(/^id[:\s-]*/i, "").replace(/\s+/g, "").replace(/[^A-Za-z0-9-]/g, "");
      const isCustomId = /^[A-Za-z]{1,6}-?\d{2,8}$/i.test(cleanedIdCandidate);
      const searchTerm = isCustomId ? cleanedIdCandidate.toUpperCase() : rawTerm;
      const response = await searchProfiles({
        name: !isCustomId ? searchTerm : "",
        customId: isCustomId ? searchTerm : "",
        page: 1,
        limit: 10
      });
      if (response?.success) {
        const listings = Array.isArray(response.data?.listings) ? response.data.listings : Array.isArray(response.data) ? response.data : [];
        if (listings.length > 0) {
          const mappedResults = listings.map((item, index) => {
            return {
              userId: item.user?.userId || item.userId,
              firstName: item.user?.firstName || item.firstName,
              lastName: item.user?.lastName || item.lastName,
              age: item.user?.age || item.age,
              city: item.user?.city || item.city,
              image: item.user?.closerPhoto?.url || item.image,
              name: (item.user?.firstName || item.firstName || "") + " " + (item.user?.lastName || item.lastName || ""),
              customId: item.user?.customId || item.customId
            };
          });
          setSearchResults(mappedResults);
          setShowResults(true);
        } else {
          console.warn("🔍 Navigation - No results found");
          setSearchResults([]);
          setShowResults(true);
        }
      } else {
        console.warn("🔍 Navigation - No results or invalid response");
        setSearchResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  };
  const menuItems = [{
    label: "Dashboard",
    key: "dashboard"
  }, {
    label: "New Profiles",
    key: "newprofiles"
  }, {
    label: "Requests",
    key: "requests"
  }, {
    label: "Approved",
    key: "approved"
  }, {
    label: "Shortlisted",
    key: "shortlisted"
  }, {
    label: "Compare",
    key: "compare"
  }];
  const {
    logout,
    user
  } = useContext(AuthContextr);
  const handleNavigation = async key => {
    if (key === "logout") {
      setLogoutConfirmOpen(true);
      setMobileMenuOpen(false);
      return;
    }
    try {
      onNavigate?.(key);
    } catch (err) {
      console.warn("Navigation: onNavigate threw", err);
    }
    const target = key === "dashboard" ? "/dashboard" : `/dashboard/${key}`;
    try {
      navigate(target);
    } catch (e) {
      console.warn("Navigation: navigate failed", e);
    }
    setMobileMenuOpen(false);
  };
  return <nav className="sticky top-0 z-[100] bg-white border-b border-[#D4A052]/30 shadow-sm">
      <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4">
        <div className="flex items-center justify-between w-full">
          {}
          <div className="flex-shrink-0">
            <a href="/" className="select-none cursor-pointer">
              <img src="/logo.png" alt="Logo" onClick={() => setLogoHighlighted(v => !v)} className={`${logoHighlighted ? "border-2 border-[#FFD700] shadow-[0_0_10px_#FFD700]" : ""} h-[65px] sm:h-[58px] w-auto object-contain md:h-[65px] lg:h-[75px] rounded-lg transition`} />
            </a>
          </div>

          {}
          <div className="hidden lg:flex items-center justify-center flex-1">
            {menuItems.map(item => <button key={item.key} onClick={() => handleNavigation(item.key)} className={`flex-1 max-w-[160px] px-2 py-2 text-[0.95rem] rounded-lg transition-all whitespace-nowrap
                  ${activePage === item.key ? "text-[#D4A052] font-bold border-b-2 border-[#D4A052] -mb-[2px]" : "text-[#800000] hover:text-[#D4A052] hover:underline hover:decoration-[#D4A052]"}
                `}>
                {item.label}
              </button>)}
          </div>

          {}
          <div className="hidden lg:block">
            <div className="relative w-[180px] md:w-[200px] lg:w-[220px] xl:w-[260px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7b3b3b]/60 pointer-events-none z-10" />
              <input type="text" placeholder="Search by ID or Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => {
              if (e.key === "Enter") {
                handleSearch();
              } else if (e.key === "Escape") {
                setShowResults(false);
                setSearchQuery("");
              }
            }} onFocus={() => {
              if (searchResults.length > 0) setShowResults(true);
            }} onBlur={() => {
              setTimeout(() => setShowResults(false), 200);
            }} style={{
              paddingLeft: "44px",
              paddingRight: "16px"
            }} className="w-full h-10 bg-white border border-[#D4A052]/30 rounded-[12px]
                     text-sm text-[#222] placeholder:text-[#7b3b3b]/60 shadow-sm
                     caret-[#D4A052]
                     focus:border-[#D4A052] focus:ring-2 focus:ring-[#D4A052]/20 focus:outline-none
                     transition-all" />

              {}
              {showResults && <div className="absolute top-full mt-2 w-full bg-white rounded-[12px] shadow-lg border border-[#D4A052]/20 max-h-[400px] overflow-y-auto z-50">
                  {isSearching ? <div className="p-4 text-center text-sm text-gray-500">
                      Searching...
                    </div> : searchResults.length > 0 ? <div className="py-2">
                      {searchResults.slice(0, 10).map(result => {
                  const userId = result?.userId;
                  const name = `${result?.firstName || ""} ${result?.lastName || ""}`.trim() || "Unknown";
                  const age = result?.age;
                  const city = result?.city;
                  const image = result?.image;
                  return <button key={userId} onClick={() => {
                    navigate(`/dashboard/profile/${userId}`);
                    setShowResults(false);
                    setSearchQuery("");
                  }} className="w-full px-4 py-3 hover:bg-[#D4A052]/10 transition-colors text-left flex items-center gap-3">
                            {image ? <img src={image} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={e => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling.style.display = "flex";
                    }} /> : null}
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center" style={{
                      display: image ? "none" : "flex"
                    }}>
                              <span className="text-xs text-gray-500 font-medium">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {name}
                                {age ? `, ${age}` : ""}
                              </p>
                              {city && <p className="text-xs text-gray-500 truncate">
                                  {city}
                                </p>}
                            </div>
                          </button>;
                })}
                    </div> : <div className="p-4 text-center text-sm text-gray-500">
                      No results found
                    </div>}
                </div>}
            </div>
          </div>

          {}

          <div className="flex items-center flex-shrink-0 gap-2 lg:gap-4 pr-3 lg:pr-6 min-w-[56px] max-w-full overflow-visible">
            {}
            <div className="p-0 m-0 flex items-center justify-center min-w-[44px] min-h-[44px] overflow-visible" style={{
            marginRight: '8px'
          }}>
              <NotificationDropdown onViewAll={() => handleNavigation("notifications")} />
            </div>

            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center rounded-full border-2 border-[#e5e7eb] bg-white p-0.5 hover:border-[#C8A227] hover:shadow-md transition-all duration-200" aria-label="Open user menu" type="button">
                    <Avatar className="size-10 lg:size-9 xl:size-8 ring-2 ring-white">
                      <AvatarImage 
                        src={profileUser?.closerPhotoUrl || profileUser?.closerPhoto?.url || profileUser?.profilePhoto?.url || user?.closerPhotoUrl || "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80"} 
                        alt={`${profileUser?.firstName || user?.firstName || "User"}`} 
                        className="object-cover w-full h-full rounded-full"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-[#C8A227] to-[#D4A052] text-white font-bold text-base">
                        {(profileUser?.firstName?.charAt(0) || user?.firstName?.charAt(0) || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-56 p-1 border border-[#e5e7eb] rounded-[12px] shadow-lg z-[110]">
                  <div className="px-3 py-2 border-b border-[#e5e7eb]">
                    <p className="text-sm font-semibold text-[#111] capitalize line-clamp-1">{profileUser?.firstName || user?.firstName || ""} {profileUser?.lastName || user?.lastName || ""}</p>
                    <p className="text-xs text-gray-500 truncate">{profileUser?.email || user?.email || ""}</p>
                  </div>
                  <div className="py-1">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="rounded-lg px-3 py-2 text-sm font-medium text-[#4b3f33] hover:bg-[#f9f5ed] cursor-pointer">
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation("logout")} className="rounded-lg px-3 py-2 text-sm font-medium text-[#b91c1c] hover:bg-red-50 cursor-pointer">
                      Logout
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {}
            <div className="block lg:hidden z-50">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="p-2 hover:bg-[#D4A052]/10 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Open Menu" type="button">
                    <Menu className="w-6 h-6 text-[#800000]" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px] !p-0">
                  <div className="h-14 bg-gradient-to-r from-[#C8A167] to-[#D4A052] relative z-[1] flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="size-10 ring-1 ring-white/50 flex-shrink-0">
                        <AvatarImage 
                          src={profileUser?.closerPhotoUrl || profileUser?.closerPhoto?.url || user?.closerPhotoUrl || "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=400&q=80"} 
                          alt={`${profileUser?.firstName || user?.firstName || "User"}`}
                          className="object-cover rounded-full"
                        />
                        <AvatarFallback className="bg-white/20 text-white font-bold text-sm">
                          {(profileUser?.firstName?.charAt(0) || user?.firstName?.charAt(0) || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-xs truncate">
                          {profileUser?.firstName || user?.firstName || ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-4 pb-6 px-4 overflow-y-auto bg-white" style={{
                  height: 'calc(100vh - 56px)'
                }}>
                    {}
                    <div className="mb-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => {
                        if (e.key === "Enter") {
                          handleSearch();
                          setMobileMenuOpen(false);
                        } else if (e.key === "Escape") {
                          setShowResults(false);
                          setSearchQuery("");
                        }
                      }} style={{
                        paddingLeft: "32px",
                        paddingRight: "10px",
                        backgroundColor: "#ffffff",
                        border: '1px solid #e5e7eb'
                      }} className="w-full h-9 !bg-white rounded-lg text-xs text-[#222] placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 focus:outline-none transition-all" />
                      </div>
                    </div>

                    <div className="border-t border-gray-200"></div>

                    {menuItems.map(item => <button key={item.key} onClick={() => handleNavigation(item.key)} className={`px-4 py-3 rounded-lg font-medium transition-all text-left flex items-center justify-between
                        ${activePage === item.key ? "bg-[#f9f5ed] text-[#C8A227] border-l-4 border-[#C8A227]" : "bg-transparent text-[#4b3f33] hover:bg-gray-50"}`}>
                        <span>{item.label}</span>
                        {activePage === item.key && <span className="text-[#C8A227]">●</span>}
                      </button>)}

                    <div className="border-t border-gray-200 my-3"></div>
                    <button onClick={() => navigate("/dashboard/settings")} className="w-full text-left px-4 py-3 rounded-lg bg-[#f9f5ed] hover:bg-[#f0ead8] transition-all font-medium text-[#4b3f33] flex items-center gap-2">
                      <span>⚙️</span> Settings
                    </button>
                    <button onClick={() => handleNavigation("logout")} className="w-full text-left px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 transition-all font-medium text-[#b91c1c] flex items-center gap-2">
                      <span>🚪</span> Logout
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-[22px] p-0 gap-0 bg-white">
          <DialogHeader className="bg-gradient-to-br from-[#C8A227] via-[#D4A052] to-[#E4C48A] px-6 py-5 text-center text-white relative overflow-hidden rounded-t-[22px]">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-white text-xl">Confirm Logout</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-6 bg-white">
            <DialogDescription className="text-center text-base mb-6 text-gray-700">
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </DialogDescription>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)} className="w-full sm:w-1/2 rounded-[12px] border-gray-300 hover:bg-gray-50">
                Cancel
              </Button>
              <Button onClick={async () => {
              setLogoutConfirmOpen(false);
              try {
                await logout();
                navigate("/login");
              } catch (error) {
                console.error("Logout error:", error);
              }
            }} className="w-full sm:w-1/2 bg-[#C8A227] hover:bg-[#D4A052] text-white rounded-[12px]">
                Yes, Logout
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </nav>;
}