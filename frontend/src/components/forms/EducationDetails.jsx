import React, { useState, useEffect, useCallback, useMemo } from "react";
import CustomSelect from "../ui/CustomSelect";
import LocationSelect from "../ui/LocationSelect";
import { getEducationalDetails, saveEducationalDetails, updateEducationalDetails } from "../../api/auth";
import toast from "react-hot-toast";
import {
  QUALIFICATION_LEVELS,
  EDUCATION_OPTIONS_BY_LEVEL,
  PROFESSIONAL_QUALIFICATIONS,
  PROFESSIONAL_QUALIFIED_LEVELS
} from "@/lib/constant";

const EducationDetails = ({
  onNext,
  onPrevious
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: "",
    highestEducation: "",
    fieldOfStudy: null,
    universityName: "",
    countryOfEducation: ""
  });
  const [errors, setErrors] = useState({});
  const sanitize = (val, max = 200) => {
    if (val === null || val === undefined) return "";
    let s = String(val).replace(/[\x00-\x1F\x7F]/g, "");
    s = s.replace(/[<>`]/g, "");
    s = s.replace(/\s+/g, " ").trim();
    if (s.length > max) s = s.slice(0, max);
    return s;
  };
  const sanitizeLive = (val, max = 200) => {
    if (val === null || val === undefined) return "";
    let s = String(val).replace(/[\x00-\x1F\x7F]/g, "");
    s = s.replace(/[<>`]/g, "");
    if (s.length > max) s = s.slice(0, max);
    return s;
  };
  
  const capitalizeFirst = val => {
    if (!val) return "";
    const trimmed = val.trim();
    if (trimmed.length === 0) return val;
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
            fieldOfStudy: res.data.FieldOfStudy ? {
              label: res.data.FieldOfStudy,
              value: res.data.FieldOfStudy
            } : null,
            universityName: res.data.University || "",
            countryOfEducation: res.data.CountryOfEducation || ""
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

  const educationOptionsFormatted = useMemo(() => {
    let options = [];
    if (!formData.highestEducation) {
      const allOptions = Object.values(EDUCATION_OPTIONS_BY_LEVEL).flat();
      options = [...new Set([...allOptions, ...PROFESSIONAL_QUALIFICATIONS])];
    } else {
      const levelOptions = EDUCATION_OPTIONS_BY_LEVEL[formData.highestEducation] || [];
      if (PROFESSIONAL_QUALIFIED_LEVELS.includes(formData.highestEducation)) {
        options = [...levelOptions, ...PROFESSIONAL_QUALIFICATIONS];
      } else {
        options = levelOptions;
      }
    }
    return options.map(opt => ({
      label: opt.replace(/\b\w/g, c => c.toUpperCase()),
      value: opt.replace(/\b\w/g, c => c.toUpperCase())
    }));
  }, [formData.highestEducation]);
  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      console.warn("onPrevious prop not provided");
    }
  };
  const capitalizeWords = str => str.replace(/\b\w/g, char => char.toUpperCase());
  const handleChange = useCallback(e => {
    const {
      name,
      value
    } = e.target;
    let formattedValue = sanitizeLive(value);
    
    // Apply capitalization to text input fields (not country selects)
    if (name === "schoolName" || name === "universityName") {
      formattedValue = capitalizeFirst(formattedValue);
    }
    
    if (name === "highestEducation") {
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue,
        fieldOfStudy: null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    }
    const isEmpty = v => !v || typeof v === "string" && v.trim() === "";
    const shouldClear = !isEmpty(formattedValue);
    setErrors(prev => {
      const next = {
        ...prev
      };
      if (shouldClear) delete next[name];
      if (name === "highestEducation") {
        delete next.fieldOfStudy;
      }
      return next;
    });
  }, []);
  const handleFieldOfStudyChange = useCallback(newValue => {
    const sanitized = newValue ? {
      label: sanitize(newValue.label),
      value: sanitize(newValue.value)
    } : null;
    setFormData(prev => ({
      ...prev,
      fieldOfStudy: sanitized
    }));
    setErrors(prev => ({
      ...prev,
      fieldOfStudy: undefined
    }));
  }, []);
  const handleNext = async e => {
    e.preventDefault();
    const newErrors = {};
    const isEmpty = v => !v || typeof v === "string" && v.trim() === "";
    if (isEmpty(formData.schoolName)) newErrors.schoolName = "School name is required";
    if (isEmpty(formData.highestEducation)) newErrors.highestEducation = "Highest qualification is required";
    if (!formData.fieldOfStudy || isEmpty(formData.fieldOfStudy.value)) newErrors.fieldOfStudy = "Field of study is required";
    if (isEmpty(formData.universityName)) newErrors.universityName = "University/College name is required";
    if (isEmpty(formData.countryOfEducation)) newErrors.countryOfEducation = "Country of education is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const normalize = val => {
        if (val === undefined || val === null) return "";
        if (typeof val === "object") {
          const v = val.value || val.label || val.text || val.name || "";
          return sanitize(v);
        }
        const capped = capitalizeWords(val);
        return sanitize(capped);
      };
      const submissionData = {
        SchoolName: normalize(formData.schoolName),
        HighestEducation: normalize(formData.highestEducation),
        FieldOfStudy: normalize(formData.fieldOfStudy),
        University: normalize(formData.universityName),
        CountryOfEducation: normalize(formData.countryOfEducation)
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
      const msg = error?.response?.data?.message || "Failed to save or update education details.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
  const inputClass = "w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition";
  const getInputClass = field => `${inputClass} ${errors[field] ? "border-red-500 focus:ring-red-300 focus:border-red-500" : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"}`;
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>;
  return <div className="min-h-screen w-91 w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-4 border-[#F9F7F5] transition-transform duration-300">
        <h2 className="text-2xl font-bold text-[#131313] text-center mb-6">
          Education Details
        </h2>

        <form onSubmit={handleNext} className="space-y-6">
          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              School Name <RequiredMark />
            </label>
            <input type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="Enter your school name" className={getInputClass("schoolName")} />
            {errors.schoolName && <p className="text-red-500 text-sm mt-1">{errors.schoolName}</p>}
          </div>

          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              Highest Qualification <RequiredMark />
            </label>
            <CustomSelect name="highestEducation" value={formData.highestEducation} onChange={handleChange} options={QUALIFICATION_LEVELS} placeholder="Select your qualification" className={getInputClass("highestEducation")} />
            {errors.highestEducation && <p className="text-red-500 text-sm mt-1">{errors.highestEducation}</p>}
          </div>

          {}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Field of Study <RequiredMark /></label>
            <CustomSelect
              key={formData.highestEducation || 'no-qualification'}
              name="fieldOfStudy"
              value={formData.fieldOfStudy ? formData.fieldOfStudy.value || formData.fieldOfStudy : ""}
              onChange={(e) => {
                const val = e.target.value;
                handleFieldOfStudyChange(val ? { value: val, label: val } : null);
              }}
              options={educationOptionsFormatted.map(opt => opt.value)}
              placeholder={formData.highestEducation ? "Select or type field of study" : "Please select highest qualification first"}
              disabled={!formData.highestEducation}
              allowCustom={true}
              className={getInputClass("fieldOfStudy")}
            />
            {errors.fieldOfStudy && <p className="text-red-500 text-sm mt-1">{errors.fieldOfStudy}</p>}
          </div>

          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              University / College Name <RequiredMark />
            </label>
            <input type="text" name="universityName" value={formData.universityName} onChange={handleChange} placeholder="Enter university name" className={getInputClass("universityName")} />
            {errors.universityName && <p className="text-red-500 text-sm mt-1">{errors.universityName}</p>}
          </div>

          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              Country of Education <RequiredMark />
            </label>
            <LocationSelect type="country" name="countryOfEducation" value={formData.countryOfEducation} onChange={handleChange} placeholder="Select your country" className={getInputClass("countryOfEducation")} />
            {errors.countryOfEducation && <p className="text-red-500 text-sm mt-1">{errors.countryOfEducation}</p>}
          </div>

          {}
          <div className="pt-6 flex justify-between items-center gap-4">
            <button type="button" onClick={handlePrevious} className="w-full sm:w-1/2 bg-white text-[#D4A052] border border-[#D4A052] py-3 rounded-xl font-semibold hover:bg-[#FDF8EF] transition">
              Previous
            </button>

            <button type="submit" className="w-full sm:w-1/2 bg-[#D4A052] text-white py-3 rounded-xl font-semibold hover:bg-[#E4C48A] transition">
              Save & Next
            </button>
          </div>
        </form>
      </div>
    </div>;
};
export default EducationDetails;