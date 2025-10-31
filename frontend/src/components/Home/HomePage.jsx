import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Mail, Phone } from "lucide-react";
import weddingCoupleImage from "../../assets/wedding.png";
import couple1 from "../../assets/couple1.png";
import couple2 from "../../assets/couple2.png";
import couple3 from "../../assets/couple3.png";


const colors = {
  maroon: "#800000",
  gold: "#D4A052",
  goldLight: "#E4C48A",
  beige: "#F4EEE4",
  planBg: "#F9F7F5",
  white: "#FFFFFF",
};

const featuredProfiles = [
  { id: 1, name: "Amit & Priya", age: "26 & 24 yrs", location: "Bangalore", img: couple1 },
  { id: 2, name: "Rahul & Anjali", age: "29 & 27 yrs", location: "Mumbai", img: couple2 },
  { id: 3, name: "Vikram & Neha", age: "31 & 28 yrs", location: "Delhi", img: couple3 },
];

const successStories = [
  { id: 1, name: "Rohan & Sneha", story: "Met through Satfera, now happily married!", img: "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=400&q=80" },
  { id: 2, name: "Aakash & Meera", story: "Found true love and companionship.", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80" },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-beige">
      {/* HEADER */}
      <header className="sticky top-0 z-50 shadow bg-[#ebe9e6]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap justify-between items-center">

          <div className="flex items-center mb-2 md:mb-0 bg-[#ebe9e6]">
            <img
              src="/logo.png"
              alt="Satfera Logo"
              width={220}
              height={220}
              className="mr-3 object-contain "
            />
          </div>



          {/* Navigation */}
          <nav className="flex flex-wrap items-center gap-4">
            <a href="#hero" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline">Home</a>
            <a href="#membership" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline">Membership</a>
            <a href="#success-stories" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline">Success Stories</a>
            <a href="#contact" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline">Contact</a>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 rounded-md font-semibold text-[#D4A052] border border-[#D4A052] bg-transparent hover:bg-[#D4A052] hover:text-[#800000] transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-4 py-2 rounded-md font-semibold bg-[#D4A052] text-[#800000] hover:opacity-90 transition"
            >
              Register
            </button>
          </nav>
        </div>
      </header>
      {/* HERO SECTION */}
      <section id='hero' className="relative flex items-center justify-center h-[500px] md:h-[600px] w-full overflow-hidden">
        <img
          src={weddingCoupleImage}
          alt="Wedding Couple"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/50 to-black/60"></div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Find Your Perfect Life Partner
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-8">
            Join millions of people on India's most trusted matrimony platform
          </p>

          {/* Search Form */}
          <div className="bg-[#FFFFFF] rounded-2xl shadow-2xl p-6 max-w-3xl mx-auto border border-[#E4C48A]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select className="border-2 border-[#E4C48A] rounded-md p-2 focus:outline-none focus:border-[#D4A052]">
                <option>Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              <select className="border-2 border-[#E4C48A] rounded-md p-2 focus:outline-none focus:border-[#D4A052]">
                <option>Age</option>
                <option>18-25</option>
                <option>26-30</option>
                <option>31-35</option>
                <option>36+</option>
              </select>
              <select className="border-2 border-[#E4C48A] rounded-md p-2 focus:outline-none focus:border-[#D4A052]">
                <option>Religion</option>
                <option>Hindu</option>
                <option>Muslim</option>
                <option>Christian</option>
                <option>Sikh</option>
              </select>
              <button className="bg-[#D4A052] text-[#800000] rounded-md font-semibold hover:opacity-90 transition py-2">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PROFILES */}
      <section id="featured-profiles" className="py-24 bg-[#F4EEE4]"> {/* ✅ More top/bottom spacing */}
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-[#800000] mb-14">Featured Profiles</h2>

          {/* ✅ Wider and taller profile cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {featuredProfiles.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl shadow-2xl bg-white border border-[#E4C48A] overflow-hidden hover:shadow-3xl hover:scale-[1.04] transition-transform duration-300"
              >
                {/* ✅ Bigger image box — full and edge-to-edge */}
                <div className="w-full h-96 overflow-hidden"> {/* 👈 Increased height */}
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-[#800000] text-xl">{p.name}</h3>
                  <p className="text-gray-600 text-base">
                    {p.age} | {p.location}
                  </p>
                  <button className="mt-6 w-full bg-[#D4A052] text-[#800000] py-3 rounded-md font-semibold hover:opacity-90 transition">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBERSHIP PLANS */}
      <section id="membership" className="py-20 bg-[#F9F7F5]"> {/* ✅ Beige background */}
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#800000] mb-4">Membership Plans</h2>
          <p className="text-gray-700 mb-12">
            Choose a plan that fits your needs and start connecting with your perfect match today.
          </p>

          {/* ✅ Grid layout for plan boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                title: "Basic",
                desc: "Free access to basic features. Browse profiles and send limited interest requests.",
              },
              {
                title: "Premium",
                desc: "Full access including messaging, profile highlights, and priority support.",
              },
              {
                title: "Gold",
                desc: "Includes Premium + personalized matchmaking recommendations.",
              },
              {
                title: "Platinum",
                desc: "All features + VIP support, spotlight profile, and premium visibility.",
              },
            ].map((plan, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-lg border border-[#E4C48A] p-8 hover:shadow-2xl hover:scale-[1.03] transition-transform duration-300"
              >
                <h3 className="text-2xl font-bold mb-3 text-[#800000]">{plan.title}</h3>
                <p className="text-gray-600 mb-6 text-sm">{plan.desc}</p>
                <button className="bg-[#D4A052] text-[#800000] w-full py-3 rounded-md font-semibold hover:opacity-90 transition">
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUCCESS STORIES - CARD STYLE */}
      <section id="success-stories" className="py-16 bg-[#F9F7F5 ]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#800000] mb-10">Success Stories</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {successStories.map((s) => (
              <div
                key={s.id}
                className="bg-[#F9F7F5] rounded-2xl shadow-sm border-l-4 border-[#E4C48A] flex items-center gap-6 p-6"
              >
                {/* Circular profile image */}
                <div className="w-20 h-20 flex-shrink-0">
                  <img
                    src={s.img}
                    alt={s.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>

                {/* Text content */}
                <div className="text-left">
                  <h3 className="font-semibold text-[#800000] text-lg">{s.name}</h3>
                  <p className="text-gray-600 text-sm italic">{s.story}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#F4EEE4] text-center">
        <h2 className="text-3xl font-bold text-[#800000] mb-6">
          Your Perfect Match Awaits
        </h2>
        <button
          onClick={() => navigate("/signup")}
          className="bg-[#D4A052] px-8 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition"
        >
          Register Free Now
        </button>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-[#0a0a0a] text-white py-10 text-center">
        <Heart className="w-8 h-8 mx-auto text-[#D4A052]" />
        <h3 className="text-2xl font-bold mt-2">Satfera</h3>
        <p className="text-sm text-gray-300 mt-3">© 2025 Satfera Matrimony. All rights reserved.</p>
        <div className="flex flex-col md:flex-row justify-center items-center gap-3 mt-4">
          <a href="mailto:contact@satfera.com" className="flex items-center gap-2 text-gray-200 hover:text-[#D4A052] transition">
            <Mail className="w-4 h-4" /> contact@satfera.com
          </a>
          <a href="tel:+919876543210" className="flex items-center gap-2 text-gray-200 hover:text-[#D4A052] transition">
            <Phone className="w-4 h-4" /> +91 98765 43210
          </a>
        </div>
      </footer>
    </div>
  );
}
