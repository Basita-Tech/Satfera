import React, { useState } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

export function Navigation({ activePage, onNavigate }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

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

    const handleNavigation = (key) => {
        console.log("Navigation: requested ->", key);
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
        <nav className="sticky top-0 z-50 bg-white border-b border-[#D4A052]/30 shadow-sm">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-3 md:py-4">
                <div className="flex items-center justify-between gap-3 md:gap-6 lg:gap-8">
                    {/* Logo */}
                    <button
                        onClick={() => handleNavigation("dashboard")}
                        className="flex-shrink-0 select-none cursor-pointer"
                    >
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-[58px] w-auto object-contain md:h-[65px] lg:h-[75px]"

                        />
                    </button>


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
                    <Input
                        type="text"
                        placeholder="Search..."
                        className="w-[220px] pl-7 pr-3 h-7 bg-white border border-[#8c8b86] rounded-[8px]
             text-xs text-[#7b3b3b] placeholder:text-[#7b3b3b]/60 shadow-sm
             caret-[#D4A052]
             focus:border-[#D4A052] focus:ring-1 focus:ring-[#D4A052]/50 focus:outline-none"
                    />



                    {/* Right Section */}
                    <div className="flex items-center gap-2 md:gap-3 lg:gap-4 flex-shrink-0">
                        {/* Notifications */}
                        <button className="relative p-2 hover:bg-[#D4A052]/10 rounded-full transition-colors">
                            <Bell className="w-4 h-4 md:w-5 md:h-5 text-[#800000]" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        {/* Avatar */}
                        {/* Uncomment if you want profile avatar */}
                        {/* <Avatar className="w-8 h-8 md:w-10 md:h-10 cursor-pointer border-2 border-[#D4A052]">
              <AvatarImage src="https://images.unsplash.com/photo-1649433658557-54cf58577c68?w=100" />
              <AvatarFallback className="bg-[#D4A052] text-white text-xs md:text-sm">
                RS
              </AvatarFallback>
            </Avatar> */}

                        {/* Logout (Desktop) */}
                        {/* <button
              onClick={() => onNavigate("logout")}
              className="hidden lg:block text-sm text-[#800000]/70 hover:text-red-600 transition-colors"
            >
              Logout
            </button> */}

                        {/* Mobile Menu */}
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <button className="lg:hidden p-2 hover:bg-[#D4A052]/10 rounded-lg transition-colors">
                                    <Menu className="w-5 h-5 text-[#800000]" />
                                </button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="w-[280px] sm:w-[320px] bg-[#ebe9e6]"
                            >
                                <div className="flex flex-col gap-2 mt-8">
                                        {menuItems.map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => handleNavigation(item.key)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all
      ${activePage === item.key
                                                    ? " text-[#800000]" // ← this adds a gold background when active
                                                    : "bg-transparent text-[#800000] hover:bg-[#D4A052]/20 hover:text-[#800000]"

                                                }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}

                                    <div className="border-t border-[#D4A052]/30 my-2"></div>
                                    <button
                                        onClick={() => handleNavigation("logout")}
                                        className="w-full text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    );
}
