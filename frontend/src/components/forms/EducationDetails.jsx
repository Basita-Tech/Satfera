import React, { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNames } from "country-list";
import CreatableSelect from "react-select/creatable";
import { getEducationalDetails,saveEducationalDetails,updateEducationalDetails } from "../../api/auth";

const EducationDetails = ({onNext,onPrevious}) => {
  const navigate = useNavigate();
  const countries = getNames();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    highestEducation: "",
    fieldOfStudy: null, // stores { label, value } from react-select
    
    universityName: "",
    countryOfEducation: "",
    otherCountry: ""
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = (await getEducationalDetails()).data;

      if (res?.data) {
        setFormData({
  schoolName: res.data.SchoolName || "",
  highestEducation: res.data.HighestEducation || "",
  fieldOfStudy: res.data.FieldOfStudy
    ? { label: res.data.FieldOfStudy, value: res.data.FieldOfStudy }
    : null,
  universityName: res.data.University || "", // ✅ match backend key
  countryOfEducation: res.data.CountryOfEducation || "",
  otherCountry: res.data.OtherCountry || "",
});
      }
    } catch (error) {
      console.error("Failed to load education details:", error);
    } finally {
      setLoading(false);
    }
  };
  fetchDetails();
}, []); // ✅ empty dependency array



  
  const qualificationLevels = [
    "High School",
    "Undergraduate",
    "Associates Degree",
    "Bachelors",
    "Honours Degree",
    "Masters",
    "Doctorate",
    "Diploma",
    "Trade School",
    "Less Than High School",
  ];

  const educationOptions = [
    // Bachelor's - Engineering / Computer Science
    "Aeronautical Engineering",
    "B.Arch. - Bachelor of Architecture",
    "BCA - Bachelor of Computer Applications",
    "B.E. - Bachelor of Engineering",
    "B.Plan - Bachelor of Planning",
    "B.Sc. IT/CS - Bachelor of Science in IT/Computer Science",
    "B.S. Eng. - Bachelor of Science in Engineering",
    "B.Tech. - Bachelor of Technology",
    "Other Bachelor's Degree in Engineering / Computers",

    // Master's - Engineering / Computer Science
    "M.Arch. - Master of Architecture",
    "MCA - Master of Computer Applications",
    "M.E. - Master of Engineering",
    "M.Sc. IT/CS - Master of Science in IT/Computer Science",
    "M.S. Eng. - Master of Science in Engineering",
    "M.Tech. - Master of Technology",
    "PGDCA - Post Graduate Diploma in Computer Applications",
    "Other Master's Degree in Engineering / Computers",

    // Bachelor's - Arts / Science / Commerce
    "Aviation Degree",
    "B.A. - Bachelor of Arts",
    "B.Com. - Bachelor of Commerce",
    "B.Ed. - Bachelor of Education",
    "BFA - Bachelor of Fine Arts",
    "BFT - Bachelor of Fashion Technology",
    "BLIS - Bachelor of Library and Information Science",
    "B.M.M. - Bachelor of Mass Media",
    "B.Sc. - Bachelor of Science",
    "B.S.W. - Bachelor of Social Work",
    "B.Phil. - Bachelor of Philosophy",
    "Other Bachelor's Degree in Arts / Science / Commerce",

    // Master's - Arts / Science / Commerce
    "M.A. - Master of Arts",
    "M.Com. - Master of Commerce",
    "M.Ed. - Master of Education",
    "MFA - Master of Fine Arts",
    "MLIS - Master of Library and Information Science",
    "M.Sc. - Master of Science",
    "M.S.W. - Master of Social Work",
    "M.Phil. - Master of Philosophy",
    "Other Master's Degree in Arts / Science / Commerce",

    // Bachelor's - Management
    "BBA - Bachelor of Business Administration",
    "BFM - Bachelor of Financial Management",
    "BHM - Bachelor of Hotel Management",
    "BHA - Bachelor of Hospital Administration",
    "Other Bachelor's Degree in Management",

    // Master's - Management
    "MBA - Master of Business Administration",
    "MFM - Master of Financial Management",
    "MHM - Master of Hotel Management",
    "MHRM - Master of Human Resource Management",
    "PGDM - Post Graduate Diploma in Management",
    "MHA - Master of Hospital Administration",
    "Other Master's Degree in Management",

    // Bachelor's - Medicine - General / Dental / Surgeon
    "BAMS - Bachelor of Ayurvedic Medicine and Surgery",
    "BDS - Bachelor of Dental Surgery",
    "BHMS - Bachelor of Homeopathic Medicine and Surgery",
    "BSMS - Bachelor of Siddha Medicine and Surgery",
    "BUMS - Bachelor of Unani Medicine and Surgery",
    "BVSc - Bachelor of Veterinary Science",
    "MBBS - Bachelor of Medicine, Bachelor of Surgery",

    // Master's - Medicine - General / Dental / Surgeon
    "MDS - Master of Dental Surgery",
    "Doctor of Medicine / Master of Surgery",
    "MVSc - Master of Veterinary Science",
    "MCh - Master of Chirurgiae",
    "DNB - Diplomate of National Board",

    // Bachelor's - Pharmacy / Nursing
    "BPharm - Bachelor of Pharmacy",
    "BPT - Bachelor of Physiotherapy",
    "B.Sc. Nursing - Bachelor of Science in Nursing",
    "Other Bachelor's Degree in Pharmacy / Nursing or Health Sciences",

    // Master's - Pharmacy / Nursing
    "MPharm - Master of Pharmacy",
    "MPT - Master of Physiotherapy",
    "Other Master's Degree in Pharmacy / Nursing or Health Sciences",

    // Bachelor's - Legal
    "BGL - Bachelor of General Laws",
    "BL - Bachelor of Laws",
    "LLB - Bachelor of Legislative Law",
    "Other Bachelor's Degree in Legal",

    // Master's - Legal
    "LLM - Master of Laws",
    "ML - Master of Legal Studies",
    "Other Master's Degree in Legal",

    // Finance - ICWAI / CA / CS/ CFA
    "CA - Chartered Accountant",
    "CFA - Chartered Financial Analyst",
    "CS - Company Secretary",
    "ICWA - Cost and Works Accountant",
    "Other Degree / Qualification in Finance",

    // Civil Services
    "IAS - Indian Administrative Service",
    "IPS - Indian Police Service",
    "IRS - Indian Revenue Service",
    "IES - Indian Engineering Services",
    "IFS - Indian Foreign Service",
    "Other Civil Services",

    // Doctorates
    "Ph.D. - Doctor of Philosophy",
    "DM - Doctor of Medicine",
    "Postdoctoral Fellow",
    "FNB - Fellow of National Board",

    // Diploma / Polytechnic
    "Diploma",
    "Polytechnic",
    "Other Diplomas",

    // Higher Secondary / Secondary
    "Higher Secondary School / High School",
  ];

const handlePrevious = () => {
    if (onPrevious) {
      onPrevious(); // ✅ go back one step
    } else {
      console.warn("onPrevious prop not provided");
    }
  };
  

 
  // Capitalize helper
  const capitalizeWords = (str) =>
    str.replace(/\b\w/g, (char) => char.toUpperCase());

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue =
      name === "countryOfEducation"
        ? value
        : capitalizeWords(value);
    setFormData({ ...formData, [name]: formattedValue });
  };


  const handleFieldOfStudyChange = (newValue) => {
    setFormData({ ...formData, fieldOfStudy: newValue });
    setErrors((prev) => ({ ...prev, fieldOfStudy: undefined }));
  };

 const handleNext = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // ✅ Universal cleanup — always returns string
    const normalize = (val) => {
      if (val === undefined || val === null) return "";
      if (typeof val === "object") {
        // unwrap possible select object structures
        return (
          val.value ||
          val.label ||
          val.text ||
          val.name ||
          ""
        );
      }
      return String(val);
    };

    const submissionData = {
      SchoolName: normalize(formData.schoolName),
      HighestEducation: normalize(formData.highestEducation),
      FieldOfStudy: normalize(formData.fieldOfStudy),
      University: normalize(formData.universityName),
      CountryOfEducation: normalize(formData.countryOfEducation),
      OtherCountry: normalize(formData.otherCountry),
    };

    console.log("🧾 FINAL submissionData BEFORE API:", submissionData);

    // ✅ Sanity check — log types
    Object.entries(submissionData).forEach(([k, v]) => {
      console.log(`${k}:`, v, "| Type:", typeof v);
    });

    const existing = await getEducationalDetails();
    let res;

    if (existing?.data?.data) {
      res = await updateEducationalDetails(submissionData);
      console.log("✅ Education details updated:", res?.data);
      alert("✅ Education details updated successfully!");
    } else {
      res = await saveEducationalDetails(submissionData);
      console.log("✅ Education details saved:", res?.data);
      alert("✅ Education details saved successfully!");
    }

    if (onNext) onNext("education");
  } catch (error) {
    console.error("❌ Failed to save/update education details:", error);
    const msg =
      error?.response?.data?.message ||
      "Failed to save or update education details.";
    alert(`❌ ${msg}`);
  } finally {
    setLoading(false);
  }
};


const inputClass =
  "w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition";

  return (
  <div className="min-h-screen w-91 w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
    <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-4 border-[#F9F7F5] transition-transform duration-300">
      <h2 className="text-2xl font-bold text-[#131313] text-center mb-6">
        Education Details
      </h2>

      <form onSubmit={handleNext} className="space-y-6">
        {/* School Name */}
        <div>
          <label className="block text-sm font-medium mb-1">School Name</label>
          <input
            type="text"
            name="schoolName"
            value={formData.schoolName}
            onChange={handleChange}
            placeholder="Enter your school name"
            className={inputClass}
          />
        </div>

        {/* Highest Qualification */}
        <div>
          <label className="block text-sm font-medium mb-1">Highest Qualification</label>
          <select
            name="highestEducation"
            value={formData.highestEducation}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select your qualification</option>
            {qualificationLevels.map((level, idx) => (
              <option key={idx} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Field of Study */}
<div className="flex flex-col">
  <label className="text-sm font-medium mb-1">Field of Study</label>
  <CreatableSelect
    isClearable
    options={educationOptions.map((opt) => ({
      label: opt.replace(/\b\w/g, (c) => c.toUpperCase()),
      value: opt.replace(/\b\w/g, (c) => c.toUpperCase()),
    }))}
    value={formData.fieldOfStudy}
    onChange={(newValue, actionMeta) => {
      const formatted =
        newValue && newValue.value
          ? {
              label: newValue.label.replace(/\b\w/g, (c) => c.toUpperCase()),
              value: newValue.value.replace(/\b\w/g, (c) => c.toUpperCase()),
            }
          : null;
      handleFieldOfStudyChange(formatted);

      // ✅ Remove focus immediately after selecting
      if (actionMeta.action === "select-option") {
        document.activeElement.blur();
      }
    }}
    placeholder="Select or type field of study"
    classNamePrefix="react-select"
    components={{
      IndicatorSeparator: () => null, // Removes the small slash line
    }}
    styles={{
      control: (base, state) => {
        let borderColor = "#d1d5db"; // default gray
        if (errors.fieldOfStudy) borderColor = "red";
        else if (formData.fieldOfStudy && formData.fieldOfStudy.value)
          borderColor = "#D4A052"; // solid gold when selected
        else if (state.isFocused) borderColor = "#E4C48A"; // light gold on focus

        return {
          ...base,
          minHeight: "3rem",
          borderRadius: "0.5rem",
          borderColor,
          boxShadow: "none", // ✅ Disable default glow completely
          "&:hover": { borderColor },
          transition: "all 0.2s",
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

  {errors.fieldOfStudy && (
    <p className="text-red-500 text-sm mt-1">{errors.fieldOfStudy}</p>
  )}
</div>

        {/* University */}
        <div>
          <label className="block text-sm font-medium mb-1">University / College Name</label>
          <input
            type="text"
            name="universityName"
            value={formData.universityName}
            onChange={handleChange}
            placeholder="Enter university name"
            className={inputClass}
          />
        </div>

        {/* Country of Education */}
        <div>
          <label className="block text-sm font-medium mb-1">Country of Education</label>
          <select
            name="countryOfEducation"
            value={formData.countryOfEducation}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select your country</option>
            {countries.map((country, idx) => (
              <option key={idx} value={country}>{country}</option>
            ))}
            <option value="Other">Other</option>
          </select>

          {formData.countryOfEducation === "Other" && (
            <input
              type="text"
              name="otherCountry"
              value={formData.otherCountry}
              onChange={handleChange}
              placeholder="Please specify your country"
              className={`${inputClass} mt-2`}
            />
          )}
        </div>

        {/* ✅ Buttons */}
          <div className="pt-6 flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={handlePrevious}
              className="w-full sm:w-1/2 bg-white text-[#D4A052] border border-[#D4A052] py-3 rounded-xl font-semibold hover:bg-[#FDF8EF] transition"
            >
              Previous
            </button>

            <button
              type="submit"
              className="w-full sm:w-1/2 bg-[#D4A052] text-white py-3 rounded-xl font-semibold hover:bg-[#E4C48A] transition"
            >
              Save & Next
            </button>
          </div>
      </form>
    </div>
  </div>
);

}
export default EducationDetails;
