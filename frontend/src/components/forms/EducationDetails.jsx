import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getNames } from "country-list";
import CreatableSelect from "react-select/creatable";
import CustomSelect from "../ui/CustomSelect";
import {
  getEducationalDetails,
  saveEducationalDetails,
  updateEducationalDetails,
} from "../../api/auth";
import toast from "react-hot-toast";

const EducationDetails = ({ onNext, onPrevious }) => {
  const countries = useMemo(() => getNames(), []);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    highestEducation: "",
    fieldOfStudy: null,

    universityName: "",
    countryOfEducation: "",
    otherCountry: "",
  });
  const [errors, setErrors] = useState({});

  // Basic sanitization: trim, collapse spaces, remove dangerous characters, limit length
  const sanitize = (val, max = 120) => {
    if (val === null || val === undefined) return "";
    let s = String(val).replace(/[\x00-\x1F\x7F]/g, ""); // control chars
    s = s.replace(/[<>`]/g, ""); // strip markup/meta
    s = s.replace(/\s+/g, " ").trim(); // collapse whitespace
    if (s.length > max) s = s.slice(0, max);
    return s;
  };

  // Live sanitization used while typing: keep spaces/backspace behavior natural
  const sanitizeLive = (val, max = 120) => {
    if (val === null || val === undefined) return "";
    let s = String(val).replace(/[\x00-\x1F\x7F]/g, ""); // remove control chars
    s = s.replace(/[<>`]/g, ""); // strip markup/meta
    if (s.length > max) s = s.slice(0, max);
    return s;
  };

  const capitalizeFirst = (val) => {
    if (!val) return "";
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

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
            universityName: res.data.University || "",
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
  }, []);

  const qualificationLevels = useMemo(
    () => [
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
    ],
    []
  );

  // Organized education options by qualification level
  const educationOptionsByLevel = useMemo(
    () => ({
      "High School": [
        "Higher Secondary School / High School",
        "Science Stream",
        "Commerce Stream",
        "Arts Stream",
      ],
      "Less Than High School": [
        "Primary School",
        "Middle School",
      ],
      "Undergraduate": [
        "Aeronautical Engineering",
        "B.Arch. - Bachelor of Architecture",
        "BCA - Bachelor of Computer Applications",
        "B.E. - Bachelor of Engineering",
        "B.Plan - Bachelor of Planning",
        "B.Sc. IT/CS - Bachelor of Science in IT/Computer Science",
        "B.S. Eng. - Bachelor of Science in Engineering",
        "B.Tech. - Bachelor of Technology",
        "Other Bachelor's Degree in Engineering / Computers",
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
        "BBA - Bachelor of Business Administration",
        "BFM - Bachelor of Financial Management",
        "BHM - Bachelor of Hotel Management",
        "BHA - Bachelor of Hospital Administration",
        "Other Bachelor's Degree in Management",
        "BAMS - Bachelor of Ayurvedic Medicine and Surgery",
        "BDS - Bachelor of Dental Surgery",
        "BHMS - Bachelor of Homeopathic Medicine and Surgery",
        "BSMS - Bachelor of Siddha Medicine and Surgery",
        "BUMS - Bachelor of Unani Medicine and Surgery",
        "BVSc - Bachelor of Veterinary Science",
        "MBBS - Bachelor of Medicine, Bachelor of Surgery",
        "BPharm - Bachelor of Pharmacy",
        "BPT - Bachelor of Physiotherapy",
        "B.Sc. Nursing - Bachelor of Science in Nursing",
        "Other Bachelor's Degree in Pharmacy / Nursing or Health Sciences",
        "BGL - Bachelor of General Laws",
        "BL - Bachelor of Laws",
        "LLB - Bachelor of Legislative Law",
        "Other Bachelor's Degree in Legal",
      ],
      "Bachelors": [
        "Aeronautical Engineering",
        "B.Arch. - Bachelor of Architecture",
        "BCA - Bachelor of Computer Applications",
        "B.E. - Bachelor of Engineering",
        "B.Plan - Bachelor of Planning",
        "B.Sc. IT/CS - Bachelor of Science in IT/Computer Science",
        "B.S. Eng. - Bachelor of Science in Engineering",
        "B.Tech. - Bachelor of Technology",
        "Other Bachelor's Degree in Engineering / Computers",
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
        "BBA - Bachelor of Business Administration",
        "BFM - Bachelor of Financial Management",
        "BHM - Bachelor of Hotel Management",
        "BHA - Bachelor of Hospital Administration",
        "Other Bachelor's Degree in Management",
        "BAMS - Bachelor of Ayurvedic Medicine and Surgery",
        "BDS - Bachelor of Dental Surgery",
        "BHMS - Bachelor of Homeopathic Medicine and Surgery",
        "BSMS - Bachelor of Siddha Medicine and Surgery",
        "BUMS - Bachelor of Unani Medicine and Surgery",
        "BVSc - Bachelor of Veterinary Science",
        "MBBS - Bachelor of Medicine, Bachelor of Surgery",
        "BPharm - Bachelor of Pharmacy",
        "BPT - Bachelor of Physiotherapy",
        "B.Sc. Nursing - Bachelor of Science in Nursing",
        "Other Bachelor's Degree in Pharmacy / Nursing or Health Sciences",
        "BGL - Bachelor of General Laws",
        "BL - Bachelor of Laws",
        "LLB - Bachelor of Legislative Law",
        "Other Bachelor's Degree in Legal",
      ],
      "Honours Degree": [
        "B.Arch. (Hons) - Bachelor of Architecture with Honours",
        "B.E. (Hons) - Bachelor of Engineering with Honours",
        "B.Tech. (Hons) - Bachelor of Technology with Honours",
        "B.Sc. (Hons) - Bachelor of Science with Honours",
        "B.A. (Hons) - Bachelor of Arts with Honours",
        "B.Com. (Hons) - Bachelor of Commerce with Honours",
        "Other Honours Degree",
      ],
      "Associates Degree": [
        "Associates in Arts",
        "Associates in Science",
        "Associates in Applied Science",
        "Associates in Business",
        "Associates in Engineering",
        "Other Associates Degree",
      ],
      "Masters": [
        "M.Arch. - Master of Architecture",
        "MCA - Master of Computer Applications",
        "M.E. - Master of Engineering",
        "M.Sc. IT/CS - Master of Science in IT/Computer Science",
        "M.S. Eng. - Master of Science in Engineering",
        "M.Tech. - Master of Technology",
        "Other Master's Degree in Engineering / Computers",
        "M.A. - Master of Arts",
        "M.Com. - Master of Commerce",
        "M.Ed. - Master of Education",
        "MFA - Master of Fine Arts",
        "MLIS - Master of Library and Information Science",
        "M.Sc. - Master of Science",
        "M.S.W. - Master of Social Work",
        "M.Phil. - Master of Philosophy",
        "Other Master's Degree in Arts / Science / Commerce",
        "MBA - Master of Business Administration",
        "MFM - Master of Financial Management",
        "MHM - Master of Hotel Management",
        "MHRM - Master of Human Resource Management",
        "MHA - Master of Hospital Administration",
        "Other Master's Degree in Management",
        "MDS - Master of Dental Surgery",
        "MS - Master of Surgery",
        "MVSc - Master of Veterinary Science",
        "MCh - Master of Chirurgiae",
        "MPharm - Master of Pharmacy",
        "MPT - Master of Physiotherapy",
        "M.Sc. Nursing - Master of Science in Nursing",
        "Other Master's Degree in Pharmacy / Nursing or Health Sciences",
        "LLM - Master of Laws",
        "ML - Master of Legal Studies",
        "Other Master's Degree in Legal",
        "CA - Chartered Accountant",
        "CFA - Chartered Financial Analyst",
        "CS - Company Secretary",
        "ICWA - Cost And Works Accountant",
      ],
      "Doctorate": [
        "Ph.D. - Doctor of Philosophy",
        "DM - Doctor of Medicine",
        "DNB - Diplomate of National Board",
        "FNB - Fellow of National Board",
        "D.Sc. - Doctor of Science",
        "Ed.D. - Doctor of Education",
        "DBA - Doctor of Business Administration",
        "D.Litt. - Doctor of Literature",
        "LL.D. - Doctor of Laws",
        "Postdoctoral Fellow",
      ],
      "Diploma": [
        "Diploma in Engineering",
        "Diploma in Computer Applications",
        "Diploma in Management",
        "Diploma in Nursing",
        "Diploma in Pharmacy",
        "Diploma in Education",
        "Polytechnic Diploma",
        "PGDCA - Post Graduate Diploma in Computer Applications",
        "PGDM - Post Graduate Diploma in Management",
        "Advanced Diploma",
        "Other Diplomas",
      ],
      "Trade School": [
        "Electrician",
        "Plumber",
        "Carpenter",
        "Mechanic",
        "Welder",
        "Other Trade Certification",
      ],
    }),
    []
  );

  // Additional professional qualifications that can apply to master's and above
  const professionalQualifications = useMemo(
    () => [],
    []
  );

  // Get filtered and formatted education options based on highest qualification
  const educationOptionsFormatted = useMemo(() => {
    let options = [];
    
    // Levels that qualify for professional certifications
    const professionalQualifiedLevels = ["Bachelors", "Honours Degree", "Masters", "Doctorate", "Undergraduate"];
    
    if (!formData.highestEducation) {
      // If no qualification selected, show all options
      const allOptions = Object.values(educationOptionsByLevel).flat();
      options = [...new Set([...allOptions, ...professionalQualifications])];
    } else {
      // Get options for the selected qualification level
      const levelOptions = educationOptionsByLevel[formData.highestEducation] || [];
      
      // Only include professional qualifications for Bachelor's and above
      if (professionalQualifiedLevels.includes(formData.highestEducation)) {
        options = [...levelOptions, ...professionalQualifications];
      } else {
        options = levelOptions;
      }
    }
    
    // Format the options
    return options.map((opt) => ({
      label: opt.replace(/\b\w/g, (c) => c.toUpperCase()),
      value: opt.replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [formData.highestEducation, educationOptionsByLevel, professionalQualifications]);

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      console.warn("onPrevious prop not provided");
    }
  };

  const capitalizeWords = (str) =>
    str.replace(/\b\w/g, (char) => char.toUpperCase());

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    // Do NOT auto-capitalize or collapse spaces while typing to avoid cursor/backspace issues
    let formattedValue = sanitizeLive(value);
    // Capitalize first letter for text inputs except country selector
    if (name !== "countryOfEducation") {
      formattedValue = capitalizeFirst(formattedValue);
    }
    
    // If highest education changes, clear field of study
    if (name === "highestEducation") {
      setFormData((prev) => ({ 
        ...prev, 
        [name]: formattedValue,
        fieldOfStudy: null // Clear field of study when qualification level changes
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    }

    // Clear error for this field when it becomes valid
    const isEmpty = (v) => !v || (typeof v === "string" && v.trim() === "");
    const shouldClear = !isEmpty(formattedValue);
    setErrors((prev) => {
      const next = { ...prev };
      if (shouldClear) delete next[name];
      // If switching away from "Other" country, also clear otherCountry error
      if (name === "countryOfEducation" && formattedValue !== "Other") {
        delete next.otherCountry;
      }
      // If highest education changes, also clear fieldOfStudy error
      if (name === "highestEducation") {
        delete next.fieldOfStudy;
      }
      return next;
    });
  }, []);

  const handleFieldOfStudyChange = useCallback((newValue) => {
    const sanitized = newValue
      ? {
          label: sanitize(newValue.label),
          value: sanitize(newValue.value),
        }
      : null;
    setFormData((prev) => ({ ...prev, fieldOfStudy: sanitized }));
    setErrors((prev) => ({ ...prev, fieldOfStudy: undefined }));
  }, []);

  const handleNext = async (e) => {
    e.preventDefault();
    // Validate required fields before submitting
    const newErrors = {};
    const isEmpty = (v) => !v || (typeof v === "string" && v.trim() === "");
    if (isEmpty(formData.schoolName)) newErrors.schoolName = "School name is required";
    if (isEmpty(formData.highestEducation)) newErrors.highestEducation = "Highest qualification is required";
    if (!formData.fieldOfStudy || isEmpty(formData.fieldOfStudy.value)) newErrors.fieldOfStudy = "Field of study is required";
    if (isEmpty(formData.universityName)) newErrors.universityName = "University/College name is required";
    if (isEmpty(formData.countryOfEducation)) newErrors.countryOfEducation = "Country of education is required";
    if (formData.countryOfEducation === "Other" && isEmpty(formData.otherCountry)) newErrors.otherCountry = "Please specify your country";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      const normalize = (val) => {
        if (val === undefined || val === null) return "";
        if (typeof val === "object") {
          const v = val.value || val.label || val.text || val.name || "";
          return sanitize(v);
        }
        // Apply capitalization and full sanitize only at submit time
        const capped = capitalizeWords(val);
        return sanitize(capped);
      };

      const submissionData = {
        SchoolName: normalize(formData.schoolName),
        HighestEducation: normalize(formData.highestEducation),
        FieldOfStudy: normalize(formData.fieldOfStudy),
        University: normalize(formData.universityName),
        CountryOfEducation: normalize(formData.countryOfEducation),
        OtherCountry: normalize(formData.otherCountry),
      };

      const existing = await getEducationalDetails();
      let res;

      if (existing?.data?.data) {
        res = await updateEducationalDetails(submissionData);
        toast.success(" Education details updated successfully!");
      } else {
        res = await saveEducationalDetails(submissionData);
        toast.success("✅ Education details saved successfully!");
      }

      if (onNext) onNext("education");
    } catch (error) {
      console.error("❌ Failed to save/update education details:", error);
      const msg =
        error?.response?.data?.message ||
        "Failed to save or update education details.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition";

  const getInputClass = (field) =>
    `${inputClass} ${errors[field] ? "border-red-500 focus:ring-red-300 focus:border-red-500" : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"}`;

  return (
    <div className="min-h-screen w-91 w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-4 border-[#F9F7F5] transition-transform duration-300">
        <h2 className="text-2xl font-bold text-[#131313] text-center mb-6">
          Education Details
        </h2>

        <form onSubmit={handleNext} className="space-y-6">
          {/* School Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              School Name
            </label>
            <input
              type="text"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleChange}
              placeholder="Enter your school name"
              className={getInputClass("schoolName")}
            />
            {errors.schoolName && (
              <p className="text-red-500 text-sm mt-1">{errors.schoolName}</p>
            )}
          </div>

          {/* Highest Qualification */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Highest Qualification
            </label>
            <CustomSelect
              name="highestEducation"
              value={formData.highestEducation}
              onChange={handleChange}
              options={qualificationLevels}
              placeholder="Select your qualification"
              className={getInputClass("highestEducation")}
            />
            {errors.highestEducation && (
              <p className="text-red-500 text-sm mt-1">{errors.highestEducation}</p>
            )}
          </div>

          {/* Field of Study */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Field of Study</label>
            <CreatableSelect
              key={formData.highestEducation || 'no-qualification'}
              isClearable
              options={educationOptionsFormatted}
              value={formData.fieldOfStudy}
              onChange={(newValue, actionMeta) => {
                const formatted =
                  newValue && newValue.value
                    ? {
                        label: newValue.label.replace(/\b\w/g, (c) =>
                          c.toUpperCase()
                        ),
                        value: newValue.value.replace(/\b\w/g, (c) =>
                          c.toUpperCase()
                        ),
                      }
                    : null;
                handleFieldOfStudyChange(formatted);

                if (actionMeta.action === "select-option") {
                  document.activeElement.blur();
                }
              }}
              placeholder={formData.highestEducation ? "Select or type field of study" : "Please select highest qualification first"}
              isDisabled={!formData.highestEducation}
              classNamePrefix="react-select"
              components={{
                IndicatorSeparator: () => null,
              }}
              styles={{
                control: (base, state) => {
                  let borderColor = "#d1d5db";
                  if (errors.fieldOfStudy) borderColor = "red";
                  else if (formData.fieldOfStudy && formData.fieldOfStudy.value)
                    borderColor = "#D4A052";
                  else if (state.isFocused) borderColor = "#E4C48A";

                  return {
                    ...base,
                    minHeight: "3rem",
                    borderRadius: "0.5rem",
                    borderColor,
                    boxShadow: "none",
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
            <label className="block text-sm font-medium mb-1">
              University / College Name
            </label>
            <input
              type="text"
              name="universityName"
              value={formData.universityName}
              onChange={handleChange}
              placeholder="Enter university name"
              className={getInputClass("universityName")}
            />
            {errors.universityName && (
              <p className="text-red-500 text-sm mt-1">{errors.universityName}</p>
            )}
          </div>

          {/* Country of Education */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Country of Education
            </label>
            <CustomSelect
              name="countryOfEducation"
              value={formData.countryOfEducation}
              onChange={handleChange}
              options={[...countries, "Other"]}
              placeholder="Select your country"
               className={getInputClass("countryOfEducation")}
            />
            {errors.countryOfEducation && (
              <p className="text-red-500 text-sm mt-1">{errors.countryOfEducation}</p>
            )}

            {formData.countryOfEducation === "Other" && (
              <>
                <input
                  type="text"
                  name="otherCountry"
                  value={formData.otherCountry}
                  onChange={handleChange}
                  placeholder="Please specify your country"
                  className={`${getInputClass("otherCountry")} mt-2`}
                />
                {errors.otherCountry && (
                  <p className="text-red-500 text-sm mt-1">{errors.otherCountry}</p>
                )}
              </>
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
};
export default EducationDetails;
