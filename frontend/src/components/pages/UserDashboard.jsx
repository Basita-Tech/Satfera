import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Outlet, useLocation } from "react-router-dom";
import { Navigation } from "../Navigation";
import { Dashboard } from "./profiles/Dashboard";
import { Requests } from "./profiles/Requests";
import { ApprovedProfiles } from "./profiles/ApprovedProfiles";
import { ProfileDetails } from "./profiles/ProfileDetails";
import { Browse } from "./profiles/Browse";
import NewProfiles from "./profiles/NewProfiles";
import { Shortlisted } from "./profiles/Shortlisted";
import { ComparePage } from "./profiles/ComparePage";
import { EditProfile } from "./profiles/EditProfile";


// 🧠 Base profiles — used across dashboard
const initialProfiles = [
  {
    id: 1,
    name: "Aarohi Verma",
    age: 25,
    height: "5'6\"",
    weight: 55,
    city: "Mumbai",
    country: "India",
    profession: "Interior Designer",
    religion: "Hindu",
    caste: "Brahmin",
    education: "High School",
    diet: "Vegetarian",
    smoking: "No",
    drinking: "No",
    familyType: "Nuclear",
    image:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=800&q=80",
    compatibility: "92",
    status: "Accepted",
    type: "sent",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    id: 2,
    name: "Priya Sharma",
    age: 26,
    height: "5'4\"",
    weight: 52,
    city: "Delhi",
    country: "India",
    profession: "Software Engineer",
    religion: "Hindu",
    education: "Postgraduate",
    caste: "Khatri",
    diet: "Non-Vegetarian",
    smoking: "No",
    drinking: "Occasionally",
    familyType: "Joint",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    compatibility: "89",
    status: "Pending",
    type: "sent",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
  },
  {
    id: 3,
    name: "Divya Patel",
    age: 27,
    height: "5'5\"",
    weight: 58,
    city: "Ahmedabad",
    country: "India",
    profession: "Fashion Stylist",
    religion: "Hindu",
    education: "Doctorate",
    caste: "Patel",
    diet: "Vegetarian",
    smoking: "No",
    drinking: "No",
    familyType: "Nuclear",
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80",
    compatibility: "85",
    status: "rejected",
    type: "sent",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
  },
  {
    id: 4,
    name: "Sneha Reddy",
    age: 24,
    height: "5'3\"",
    weight: 50,
    city: "Hyderabad",
    country: "India",
    profession: "Doctor",
    education: "Graduate",
    religion: "Hindu",
    caste: "Reddy",
    diet: "Non-Vegetarian",
    smoking: "No",
    drinking: "No",
    familyType: "Joint",
    image:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=800&q=80",
    compatibility: "94",
    status: "Accepted",
    type: "sent",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  },
];

export function UserDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const location = useLocation();

  // ✅ Profiles split: sent & received
  const [profiles, setProfiles] = useState({
    sent: initialProfiles,
    received: [
      {
        id: 101,
        name: "Aarav Mehta",
        age: 28,
        height: "5'10\"",
        weight: 75,
        city: "Pune",
        country: "India",
        education: "Diploma",
        profession: "Architect",
        religion: "Hindu",
        caste: "Brahmin",
        diet: "Vegetarian",
        smoking: "No",
        drinking: "Occasionally",
        familyType: "Nuclear",
        image: "https://randomuser.me/api/portraits/men/22.jpg",
        compatibility: "88",
        status: "New Request",
        type: "received",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
    ],
  });

  const [compareProfiles, setCompareProfiles] = useState([]);
  const [shortlistedIds, setShortlistedIds] = useState(() => {
    try {
      const raw = localStorage.getItem("shortlisted_profiles") || "[]";
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((s) => String(s)) : [];
    } catch {
      return [];
    }
  });

  // ✅ Simulate new request
  const simulateNewRequest = () => {
    const newRequest = {
      id: Date.now(),
      name: "Rohan Gupta",
      age: 29,
      city: "Bangalore",
      country: "India",
      religion: "Hindu",
      profession: "Marketing Manager",
      image: "https://randomuser.me/api/portraits/men/55.jpg",
      status: "Pending",
      type: "received",
    };

    setProfiles((prev) => {
      const alreadyExists = prev.received.some((p) => p.name === newRequest.name);
      if (alreadyExists) return prev;
      return { ...prev, received: [newRequest, ...prev.received] };
    });
  };

  // ✅ Simulate another user accepting your sent request
  const simulateOtherUserAccept = () => {
    setProfiles((prev) => {
      const pendingSent = prev.sent.filter((p) => p.status === "Pending");
      if (pendingSent.length === 0) return prev;

      const randomProfile =
        pendingSent[Math.floor(Math.random() * pendingSent.length)];

      const updatedSent = prev.sent.map((p) =>
        p.id === randomProfile.id ? { ...p, status: "Accepted" } : p
      );

      console.log(`${randomProfile.name} accepted your request!`);
      return { ...prev, sent: updatedSent };
    });
  };

  useEffect(() => {
    simulateNewRequest();
    setActivePage("dashboard");

    const newReqInterval = setInterval(simulateNewRequest, 15000);
    const acceptInterval = setInterval(simulateOtherUserAccept, 20000);

    return () => {
      clearInterval(newReqInterval);
      clearInterval(acceptInterval);
    };
  }, []);

  // sync activePage with the current URL path so routing and state stay consistent
  useEffect(() => {
    try {
      // location.pathname like /userdashboard or /userdashboard/shortlisted or /dashboard/newprofiles
      const prefixes = ["/userdashboard", "/dashboard"];
      let path = location.pathname || "";
      for (const prefix of prefixes) {
        if (path.startsWith(prefix)) {
          path = path.slice(prefix.length);
          break;
        }
      }
      if (path.startsWith("/")) path = path.slice(1);
      const first = path.split("/")[0];
      const page = first && first.length > 0 ? first : "dashboard";
      // only update if changed
      if (page !== activePage) setActivePage(page);
    } catch (e) {
      // ignore
    }
  }, [location.pathname]);

  // Debug: log whenever activePage changes to trace navigation
  useEffect(() => {
    // console.log("UserDashboard: activePage ->", activePage);
  }, [activePage]);

  // ✅ Handle accept / reject / withdraw
  const handleAccept = (payload) => {
    // payload can be either a profile object or an id
    const idToAccept = typeof payload === "number" ? payload : payload?.id;
    const idKey = String(idToAccept);

    setProfiles((prev) => {
      // find the full profile object from received or sent
      const found = prev.received.find((p) => String(p.id) === idKey) || prev.sent.find((p) => String(p.id) === idKey) || { id: idToAccept };

      // Mark the profile as Accepted inside `received` so the Received counts update
      const updatedReceived = prev.received.map((p) =>
        String(p.id) === idKey ? { ...p, status: "Accepted" } : p
      );

      // Ensure sent contains the accepted profile (but don't remove from received)
      const alreadyInSent = prev.sent.some((p) => String(p.id) === idKey);
      const updatedSent = alreadyInSent
        ? prev.sent.map((p) => (String(p.id) === idKey ? { ...p, status: "Accepted", type: "sent" } : p))
        : [{ ...found, status: "Accepted", type: "sent" }, ...prev.sent];

      return { ...prev, sent: updatedSent, received: updatedReceived };
    });

    // Do not navigate away — keep user on Requests so they see the Received counts update
    const name = typeof payload === "object" ? payload.name : undefined;
    alert(`Accepted request${name ? ` from ${name}` : ""}`);
  };

  const handleReject = (payload) => {
    const idToReject = typeof payload === "number" ? payload : payload?.id;
    const idRejectKey = String(idToReject);
    setProfiles((prev) => {
      const updatedReceived = prev.received.map((p) =>
        String(p.id) === idRejectKey ? { ...p, status: "rejected" } : p
      );
      return { ...prev, received: updatedReceived };
    });
    const name = typeof payload === "object" ? payload.name : undefined;
    alert(`Rejected request${name ? ` from ${name}` : ""}`);
  };

  const handleWithdraw = (id) => {
    const idKey = String(id);
    setProfiles((prev) => {
      // If the profile isn't in sent, no change
      if (!prev.sent.some((p) => String(p.id) === idKey)) return prev;

      const updatedSent = prev.sent.map((p) =>
        String(p.id) === idKey ? { ...p, status: "Withdrawn" } : p
      );
      return { ...prev, sent: updatedSent };
    });
    alert(`Request withdrawn for profile ID: ${id}`);
  };

  // ✅ Compare & shortlist
  const handleAddToCompare = (id) => {
    const idStr = String(id);
    setCompareProfiles((prev) => {
      const prevStr = prev.map((p) => String(p));
      if (prevStr.includes(idStr)) return prev;
      if (prevStr.length >= 5) {
        alert("You can compare up to 5 profiles only.");
        return prev;
      }
      return [...prev, idStr];
    });
  };
  const handleRemoveCompare = (id) => {
    const idStr = String(id);
    setCompareProfiles((prev) => prev.filter((pid) => String(pid) !== idStr));
  };
  const handleToggleShortlist = (id) => {
    const idStr = String(id);
    setShortlistedIds((prev) => {
      const isAlready = prev.some((sid) => String(sid) === idStr);
      const next = isAlready ? prev.filter((sid) => String(sid) !== idStr) : [...prev, idStr];

      if (!isAlready) {
        // Ensure the profile exists in our in-memory lists so Shortlisted can display it.
        setProfiles((prevProfiles) => {
          const existsInSent = prevProfiles.sent.some((p) => String(p.id) === idStr);
          const existsInReceived = prevProfiles.received.some((p) => String(p.id) === idStr);
          if (existsInSent || existsInReceived) return prevProfiles;

          // Add a lightweight placeholder profile so it appears in the Shortlisted view.
          const placeholder = {
            id: Number.isFinite(Number(id)) ? Number(id) : id,
            name: "Shortlisted Profile",
            age: null,
            city: "",
            country: "",
            profession: "",
            religion: "",
            education: "",
            image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
            compatibility: "0",
            status: "Pending",
            type: "sent",
          };

          return { ...prevProfiles, sent: [placeholder, ...prevProfiles.sent] };
        });

        // Navigate to shortlisted page (activePage) so UI updates immediately
        setActivePage("shortlisted");
      }

      return next;
    });
  };

  // ✅ Send request: add profile to `sent` if not already present and navigate to Requests
  const handleSendRequest = (id) => {
    setProfiles((prev) => {
      const all = [...prev.sent, ...prev.received];
      const profile = all.find((p) => p.id === id) || { id };
      // If already in sent, don't duplicate
      if (prev.sent.some((p) => p.id === id)) return prev;
      const newSent = [{ ...profile, status: "Pending", type: "sent" }, ...prev.sent];
      return { ...prev, sent: newSent };
    });
    setActivePage("requests");
    alert("Request sent");
  };

  // Persist shortlisted IDs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("shortlisted_profiles", JSON.stringify(shortlistedIds));
    } catch { }
  }, [shortlistedIds]);

  return (
    <div className="min-h-screen bg-[#f9f5ed] flex flex-col">

      {/* TOP NAV */}
      <Navigation activePage={activePage} onNavigate={setActivePage} />

      {/* debug banner removed */}

      {/* MAIN CONTENT BASED ON activePage */}
      <div className="flex-1">
        <Routes>
          <Route index element={
            <Dashboard
              profiles={[...profiles.sent, ...profiles.received]}
              onNavigate={setActivePage}
              onSendRequest={handleSendRequest}
              onAddToCompare={handleAddToCompare}
              onRemoveCompare={handleRemoveCompare}
              compareProfiles={compareProfiles}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
            />
          } />
          <Route path="compare" element={
            <ComparePage
              profiles={[...profiles.sent, ...profiles.received]}
              selectedProfiles={compareProfiles
                .map((cid) => ([...profiles.sent, ...profiles.received].find((p) => String(p.id) === String(cid))))
                .filter(Boolean)
              }
              onRemoveFromCompare={handleRemoveCompare}
              onSendRequest={handleSendRequest}
              onNavigateBack={() => navigate('/dashboard/browse')}
              onAddToCompare={handleAddToCompare}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              onViewProfile={(id) => navigate(`/dashboard/profile/${id}`)}
            />
          } />
          <Route path="edit-profile" element={
            <EditProfile
              onNavigateBack={() => navigate('/dashboard')}
            />
          } />
          <Route path="profile/:id" element={
            <ProfileDetails
              profiles={[...profiles.sent, ...profiles.received]}
              onNavigate={setActivePage}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              compareProfiles={compareProfiles}
              onAddToCompare={handleAddToCompare}
              onRemoveCompare={handleRemoveCompare}
              onSendRequest={handleSendRequest}
              onWithdraw={handleWithdraw}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          } />
        </Routes>

        {!location.pathname.includes('/profile/') && !location.pathname.includes('/compare') && !location.pathname.includes('/edit-profile') && activePage === "requests" && (
          <Requests
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={(profile) =>
              navigate(`/dashboard/profile/${profile.id}`)
            }
            onWithdraw={handleWithdraw}
            onAccept={handleAccept}
            onReject={handleReject}
            onChat={(profile) => navigate(`/dashboard/profile/${profile.id}`)}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}

        {!location.pathname.includes('/profile/') && activePage === "approved" && (
          <ApprovedProfiles
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={(profile) =>
              navigate(`/dashboard/profile/${profile.id}`)
            }
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}

        {!location.pathname.includes('/profile/') && activePage === "browse" && (
          <Browse
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={(profile) =>
              navigate(`/dashboard/profile/${profile.id}`)
            }
            onSendRequest={handleSendRequest}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}

        {!location.pathname.includes('/profile/') && activePage === "newprofiles" && (
          <NewProfiles
            profiles={[...profiles.sent, ...profiles.received]}
            onViewProfile={(profile) =>
              navigate(`/dashboard/profile/${profile.id}`)
            }
            onSendRequest={handleSendRequest}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}

        {!location.pathname.includes('/profile/') && activePage === "shortlisted" && (
          <Shortlisted
            profiles={[
              ...profiles.sent,
              ...profiles.received,
            ].filter((p) => Array.isArray(shortlistedIds) ? shortlistedIds.some((sid)=>String(sid)===String(p.id)) : false)}
            onViewProfile={(profile) =>
              navigate(`/dashboard/profile/${profile.id}`)
            }
            onSendRequest={handleSendRequest}
            onAddToCompare={handleAddToCompare}
            onRemoveCompare={handleRemoveCompare}
            compareProfiles={compareProfiles}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
          />
        )}
      </div>

      <Outlet />
    </div>
  );
}