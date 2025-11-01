import React, { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { getUserProfession, saveUserProfession, updateUserProfession } from "../../api/auth";
import { useNavigate } from "react-router-dom";

const ProfessionDetails = ({ onNext, onPrevious }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    employmentStatus: "",
    occupation: null,
    companyName: "",
    annualIncome: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  // Your job titles
  const jobTitles = [
    "Marketing Specialist",
    "Marketing Manager",
    "Marketing Director",
    "Graphic Designer",
    "Marketing Research Analyst",
    "Marketing Communications Manager",
    "Marketing Consultant",
    "Product Manager",
    "Public Relations",
    "Social Media Assistant",
    "Brand Manager",
    "SEO Manager",
    "Content Marketing Manager",
    "Copywriter",
    "Media Buyer",
    "Digital Marketing Manager",
    "eCommerce Marketing Specialist",
    "Brand Strategist",
    "Vice President of Marketing",
    "Media Relations Coordinator",
    "Administrative Assistant",
    "Receptionist",
    "Office Manager",
    "Auditing Clerk",
    "Bookkeeper",
    "Account Executive",
    "Branch Manager",
    "Business Manager",
    "Quality Control Coordinator",
    "Administrative Manager",
    "Chief Executive Officer",
    "Business Analyst",
    "Risk Manager",
    "Human Resources",
    "Office Assistant",
    "Secretary",
    "Office Clerk",
    "File Clerk",
    "Account Collector",
    "Administrative Specialist",
    "Executive Assistant",
    "Program Administrator",
    "Program Manager",
    "Administrative Analyst",
    "Data Entry",
    "Chief Operating Officer",
    "Chief Financial Officer",
    "Chief Information Officer",
    "Chief Technology Officer",
    "Chief Marketing Officer",
    "Chief Human Resources Officer",
    "Chief Data Officer",
    "CPO—Chief Product Officer",
    "Chief Customer Officer",
    "Team Leader",
    "Manager",
    "Assistant Manager",
    "Executive",
    "Director",
    "Coordinator",
    "Administrator",
    "Controller",
    "Officer",
    "Organizer",
    "Supervisor",
    "Superintendent",
    "Head",
    "Overseer",
    "Chief",
    "Foreman",
    "Principal",
    "President",
    "Lead",
    "Computer Scientist",
    "IT Professional",
    "UX Designer & UI Developer",
    "SQL Developer",
    "Web Designer",
    "Web Developer",
    "Help Desk Worker/Desktop Support",
    "Software Engineer",
    "DevOps Engineer",
    "Computer Programmer",
    "Network Administrator",
    "Information Security Analyst",
    "Artificial Intelligence Engineer",
    "Cloud Architect",
    "IT Manager",
    "Technical Specialist",
    "Application Developer",
    "Virtual Assistant",
    "Customer Service",
    "Customer Support",
    "Concierge",
    "Help Desk",
    "Customer Service Manager",
    "Technical Support Specialist",
    "Account Representative",
    "Client Service Specialist",
    "Customer Care Associate",
    "Operations Manager",
    "Operations Assistant",
    "Operations Coordinator",
    "Operations Analyst",
    "Operations Director",
    "Vice President of Operations",
    "Operations Professional",
    "Scrum Master",
    "Continuous Improvement Lead",
    "Continuous Improvement Consultant",
    "Credit Authorizer",
    "Benefits Manager",
    "Credit Counselor",
    "Accountant",
    "Accounting Analyst",
    "Accounting Director",
    "Accounts Payable/Receivable Clerk",
    "Auditor",
    "Budget Analyst",
    "Financial Analyst",
    "Finance Manager",
    "Economist",
    "Payroll Manager",
    "Payroll Clerk",
    "Financial Planner",
    "Financial Services Representative",
    "Finance Director",
    "Commercial Loan Officer",
    "Engineer",
    "Mechanical Engineer",
    "Civil Engineer",
    "Electrical Engineer",
    "Assistant Engineer",
    "Chemical Engineer",
    "Chief Engineer",
    "Drafter",
    "Engineering Technician",
    "Geological Engineer",
    "Biological Engineer",
    "Maintenance Engineer",
    "Mining Engineer",
    "Nuclear Engineer",
    "Petroleum Engineer",
    "Plant Engineer",
    "Production Engineer",
    "Quality Engineer",
    "Safety Engineer",
    "Chief People Officer",
    "VP of Miscellaneous Stuff",
    "Chief Robot Whisperer",
    "Director of First Impressions",
    "Culture Operations Manager",
    "Director of Ethical Hacking",
    "Software Ninjaneer",
    "Director of Bean Counting",
    "Digital Overlord",
    "Director of Storytelling",
    "Researcher",
    "Research Assistant",
    "Data Analyst",
    "Biostatistician",
    "Title Researcher",
    "Market Researcher",
    "Title Analyst",
    "Medical Researcher",
    "Mentor",
    "Tutor/Online Tutor",
    "Teacher",
    "Teaching Assistant",
    "Substitute Teacher",
    "Preschool Teacher",
    "Test Scorer",
    "Online ESL Instructor",
    "Professor",
    "Assistant Professor",
    "Artist",
    "Interior Designer",
    "Video Editor",
    "Video or Film Producer",
    "Playwright",
    "Musician",
    "Novelist/Writer",
    "Computer Animator",
    "Photographer",
    "Camera Operator",
    "Sound Engineer",
    "Motion Picture Director",
    "Actor",
    "Music Producer",
    "Director of Photography",
    "Nurse",
    "Travel Nurse",
    "Nurse Practitioner",
    "Doctor",
    "Caregiver",
    "CNA",
    "Physical Therapist",
    "Pharmacist",
    "Pharmacy Assistant",
    "Medical Administrator",
    "Medical Laboratory Tech",
    "Physical Therapy Assistant",
    "Massage Therapy",
    "Dental Hygienist",
    "Orderly",
    "Personal Trainer",
    "Phlebotomist",
    "Medical Transcriptionist",
    "Telework Nurse/Doctor",
    "Reiki Practitioner",
    "Housekeeper",
    "Flight Attendant",
    "Travel Agent",
    "Hotel Front Door Greeter",
    "Bellhop",
    "Cruise Director",
    "Entertainment Specialist",
    "Hotel Manager",
    "Front Desk Associate",
    "Front Desk Manager",
    "Group Sales",
    "Event Planner",
    "Porter",
    "Spa Manager",
    "Wedding Coordinator",
    "Cruise Ship Attendant",
    "Casino Host",
    "Hotel Receptionist",
    "Reservationist",
    "Events Manager",
    "Meeting Planner",
    "Lodging Manager",
    "Director of Maintenance",
    "Valet",
    "Waiter/Waitress",
    "Server",
    "Chef",
    "Fast Food Worker",
    "Barista",
    "Line Cook",
    "Cafeteria Worker",
    "Restaurant Manager",
    "Wait Staff Manager",
    "Bus Person",
    "Restaurant Chain Executive",
    "Political Scientist",
    "Chemist",
    "Conservation Scientist",
    "Sociologist",
    "Biologist",
    "Geologist",
    "Physicist",
    "Astronomer",
    "Atmospheric Scientist",
    "Molecular Scientist",
    "Call Center Representative",
    "Telemarketer",
    "Telephone Operator",
    "Phone Survey Conductor",
    "Dispatcher for Trucks or Taxis",
    "Customer Support Representative",
    "Over the Phone Interpreter",
    "Phone Sales Specialist",
    "Mortgage Loan Processor",
    "Counselor",
    "Mental Health Counselor",
    "Addiction Counselor",
    "School Counselor",
    "Speech Pathologist",
    "Guidance Counselor",
    "Social Worker",
    "Therapist",
    "Life Coach",
    "Couples Counselor",
    "Beautician",
    "Hair Stylist",
    "Nail Technician",
    "Cosmetologist",
    "Salon Manager",
    "Makeup Artist",
    "Esthetician",
    "Skin Care Specialist",
    "Manicurist",
    "Barber",
    "Journalist",
    "Copy Editor",
    "Editor/Proofreader",
    "Content Creator",
    "Speechwriter",
    "Communications Director",
    "Screenwriter",
    "Technical Writer",
    "Columnist",
    "Public Relations Specialist",
    "Proposal Writer",
    "Content Strategist",
    "Grant Writer",
    "Video Game Writer",
    "Translator",
    "Film Critic",
    "Travel Writer",
    "Social Media Specialist",
    "Ghostwriter",
    "Delivery Driver",
    "School Bus Driver",
    "Truck Driver",
    "Tow Truck Operator",
    "UPS Driver",
    "Mail Carrier",
    "Recyclables Collector",
    "Courier",
    "Bus Driver",
    "Cab Driver",
    "Archivist",
    "Actuary",
    "Architect",
    "Personal Assistant",
    "Entrepreneur",
    "Security Guard",
    "Mechanic",
    "Recruiter",
    "Mathematician",
    "Locksmith",
    "Management Consultant",
    "Shelf Stocker",
    "Caretaker or House Sitter",
    "Library Assistant",
    "HVAC Technician",
    "Attorney",
    "Paralegal",
    "Bank Teller",
    "Parking Attendant",
    "Machinery Operator",
    "Manufacturing Assembler",
    "Funeral Attendant",
    "Assistant Golf Professional",
    "Yoga Instructor",
  ];

  // Convert jobTitles to { label, value } format
  const jobOptions = jobTitles.map((job) => ({ label: job, value: job }));

  const employmentOptions = [
    "Private Sector",
    "Government",
    "Business",
    "Self-Employed",
    "Not Working",
    "Student",
  ];

  const incomeOptions = [
    "₹1 – 5 Lakh",
    "₹5 – 10 Lakh",
    "₹10 – 15 Lakh",
    "₹15 – 20 Lakh",
    "₹20 – 25 Lakh",
    "₹25 – 30 Lakh",
    "₹30 – 35 Lakh",
    "₹35 – 40 Lakh",
    "₹40 – 45 Lakh",
    "₹45 – 50 Lakh",
    "₹50 – 55 Lakh",
    "₹55 – 60 Lakh",
    "₹60 – 65 Lakh",
    "₹65 – 70 Lakh",
    "₹70 – 75 Lakh",
    "₹75 – 80 Lakh",
    "₹80 – 85 Lakh",
    "₹85 – 90 Lakh",
    "₹90 – 95 Lakh",
    "₹95 Lakh – ₹1 Crore",
    "More than ₹1 Crore",
  ];

  const capitalizeWords = (str) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Always update the selected field
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for the field when user types/selects a value
    if (value && value.toString().trim() !== "") {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    //  Special handling when employmentStatus changes
    if (name === "employmentStatus") {
      if (value === "Student" || value === "Not Working") {
        // Reset other fields when Student or Not Working
        setFormData({
          employmentStatus: value,
          occupation: null,
          companyName: "",
          annualIncome: "",
        });
        // clear any dependent errors
        setErrors((prev) => ({ ...prev, occupation: "", companyName: "", annualIncome: "", employmentStatus: "" }));
      } else {
        // Reset dependent fields when switching back to employed/self-employed
        setFormData({
          employmentStatus: value,
          occupation: null,
          companyName: "",
          annualIncome: "",
        });
        // clear employmentStatus error (and keep others cleared until user fills them)
        setErrors((prev) => ({ ...prev, employmentStatus: "" }));
      }
    }
  };

  const handleSelectChange = (name, selected) => {
    setFormData((prev) => ({
      ...prev,
      [name]: selected
        ? {
          value: capitalizeWords(selected.value),
          label: capitalizeWords(selected.label),
        }
        : null,
    }));

    // Clear any existing error for that field
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employmentStatus)
      newErrors.employmentStatus = "Employment status is required.";

    if (
      formData.employmentStatus &&
      formData.employmentStatus !== "Not Working" &&
      formData.employmentStatus !== "Student"
    ) {
      if (!formData.occupation)
        newErrors.occupation = "Occupation / Job title is required.";
      if (!formData.companyName)
        newErrors.companyName = "Company / Organization name is required.";
      if (!formData.annualIncome)
        newErrors.annualIncome = "Annual income is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      console.warn("onPrevious prop not provided");
    }
  };

  const handleNext = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const mapToBackendEmployment = (val) => {
      if (!val) return val;
      const v = String(val).toLowerCase();
      if (v === "private sector") return "Private Sector";
      if (v === "government") return "Government";
      if (v === "business") return "Business";
      if (v === "self-employed" || v === "self employed") return "Self-Employed";
      if (v === "not working") return "Unemployed";
      if (v === "student") return "Student";
      return val;
    };

   const payload = {
  EmploymentStatus: mapToBackendEmployment(formData.employmentStatus)?.toLowerCase() || null,
  Occupation: formData.occupation ? formData.occupation.value : null,
  OrganizationName: formData.companyName,
  AnnualIncome: formData.annualIncome,
};

    try {
      
      // 🔹 Always create new record

      const existing = await getUserProfession();

      if(existing?.data?.data){
        const res = await updateUserProfession(payload);
        console.log("✅ Profession updated:", res);
        alert("✅ Profession details updated successfully!");
      }
      else {
        const res = await saveUserProfession(payload);
        console.log("✅ Profession saved:", res);
        alert("✅ Profession details saved successfully!");
      }

      // ✅ Navigate to next step
      if (onNext) {
        onNext("profession");
      } else {
        navigate("/next-step");
      }
    } catch (err) {
      console.error("❌ Failed to save profession details", err);
      const msg =
        err?.response?.data?.message || "Failed to save profession details.";
      setErrors((prev) => ({ ...prev, submit: msg }));
      alert(`❌ ${msg}`);
    }
  };

  useEffect(() => {
    let mounted = true;
    getUserProfession()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data || null;
        if (!data) return;

        const mapFromBackendEmployment = (val) => {
          if (!val) return "";
          const v = String(val).toLowerCase();
          if (v === "private sector") return "Private Sector";
          if (v === "government") return "Government";
          if (v === "business") return "Business";
          if (v === "self-employed" || v === "self employed")
            return "Self-Employed";
          if (v === "unemployed") return "Not Working";
          if (v === "student") return "Student";
          return val;
        };

        setFormData((prev) => ({
          ...prev,
          employmentStatus:
            mapFromBackendEmployment(data.EmploymentStatus.toLowerCase()) || "",
          occupation: data.Occupation
            ? { label: data.Occupation, value: data.Occupation }
            : null,
          companyName: data.OrganizationName || "",
          annualIncome: data.AnnualIncome || "",
        }));
      })
      .catch((err) => {
        if (err?.response?.status === 404) return; // no record yet
        console.error("Failed to load profession details", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isDisabled =
    formData.employmentStatus === "Not Working" ||
    formData.employmentStatus === "Student";

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-10 px-4">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-8 border-t-4 border-[#F9F7F5] hover:scale-[1.02] transition-transform duration-300">
        {/* Header */}
        <h2 className="text-2xl font-bold text-[#1f1e1d] text-center mb-8">
          Professional Details
        </h2>

        <form onSubmit={handleNext} className="space-y-6">
          {/* Employment Status */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Employment Status
            </label>
            <select
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleChange}
              className={`w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition ${errors.employmentStatus
                  ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                  : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"
                }`}
            >
              <option value="">Select Employment Status</option>
              {employmentOptions.map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {/* ✅ Show red error message when validation fails */}
            {errors.employmentStatus && (
              <p className="text-red-500 text-sm mt-1">
                {errors.employmentStatus}
              </p>
            )}
          </div>

          {/* Occupation / Job Title */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Occupation / Job Title
            </label>
            <CreatableSelect
              isDisabled={isDisabled}
              isClearable
              options={jobOptions}
              value={formData.occupation}
              onChange={(selected) => handleSelectChange("occupation", selected)}
              placeholder="Select or type job title"
              classNamePrefix="react-select"
              components={{
                IndicatorSeparator: () => null, // ✅ Removes the small slash line
              }}
              styles={{
                control: (base, state) => {
                  let borderColor = "#d1d5db"; // default gray
                  if (errors.occupation) borderColor = "red";
                  else if (state.isFocused) borderColor = "#E4C48A"; // light gold on focus

                  return {
                    ...base,
                    minHeight: "3rem",
                    borderRadius: "0.5rem",
                    borderColor,
                    boxShadow: state.isFocused ? `0 0 0 1px ${borderColor}` : "none",
                    "&:hover": { borderColor },
                  };
                },
                valueContainer: (base) => ({
                  ...base,
                  padding: "0 0.75rem",
                  height: "3rem",
                  display: "flex",
                  alignItems: "center",
                }),
                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                indicatorsContainer: (base) => ({ ...base, height: "3rem" }),
                placeholder: (base) => ({ ...base, margin: 0 }),
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              }}
              menuPlacement="top"
              menuPosition="absolute"
            />
            {errors.occupation && (
              <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
            )}
          </div>

          {/* Company or Organization Name */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Company / Organization Name
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              disabled={isDisabled}
              placeholder="Enter company or organization name"
                className={`w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition ${
                  isDisabled
                    ? "bg-gray-100 cursor-not-allowed border-gray-300"
                    : errors.companyName
                    ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                    : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"
                }`}
            />
              {errors.companyName && (
                <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
              )}
          </div>


          {/* Annual Income */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Annual Income</label>
            <select
              name="annualIncome"
              value={
                isDisabled
                  ? formData.employmentStatus === "Not Working"
                    ? "Not Working"
                    : "Student"
                  : formData.annualIncome
              }
              onChange={handleChange}
              disabled={isDisabled}
                className={`w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition ${
                  isDisabled
                    ? "bg-gray-100 cursor-not-allowed border-gray-300"
                    : errors.annualIncome
                    ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                    : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"
                }`}
            >
              <option value="">Select Annual Income</option>
              {incomeOptions.map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
              {errors.annualIncome && (
                <p className="text-red-500 text-sm mt-1">{errors.annualIncome}</p>
              )}
          </div>

          {/* ✅ Buttons */}
          <div className="pt-6 flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={handlePrevious}
              className="w-1/2 bg-white text-[#D4A052] border border-[#D4A052] py-3 rounded-xl font-semibold hover:bg-[#FDF8EF] transition"
            >
              Previous
            </button>

            <button
              type="submit"
              className="w-1/2 bg-[#D4A052] text-white py-3 rounded-xl font-semibold hover:bg-[#E4C48A] transition"
            >
              Save & Next
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ProfessionDetails;
