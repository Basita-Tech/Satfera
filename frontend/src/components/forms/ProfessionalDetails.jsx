import React, { useState, useEffect, useCallback, useMemo } from "react";
import CustomSelect from "../ui/CustomSelect";
import { getUserProfession, saveUserProfession, updateUserProfession } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { JOB_TITLES, EMPLOYMENT_OPTIONS, INCOME_OPTIONS } from "@/lib/constant";

const ProfessionDetails = ({
  onNext,
  onPrevious
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    employmentStatus: "",
    occupation: null,
    companyName: "",
    annualIncome: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const capitalizeWords = str => {
    if (!str) return "";
    return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };
  
  const handleChange = useCallback(e => {
    const {
      name
    } = e.target;
    let {
      value
    } = e.target;
    if (name === "companyName" && value) {
      // Capitalize first letter of each word
      value = value.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (value && value.toString().trim() !== "") {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
    if (name === "employmentStatus") {
      setFormData(prev => ({
        ...prev,
        employmentStatus: value,
        occupation: null,
        companyName: "",
        annualIncome: ""
      }));
      setErrors(prev => ({
        ...prev,
        occupation: "",
        companyName: "",
        annualIncome: "",
        employmentStatus: ""
      }));
    }
  }, []);
  const handleSelectChange = (name, selected) => {
    setFormData(prev => ({
      ...prev,
      [name]: selected ? {
        value: capitalizeWords(selected.value),
        label: capitalizeWords(selected.label)
      } : null
    }));
    setErrors(prev => ({
      ...prev,
      [name]: ""
    }));
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.employmentStatus) newErrors.employmentStatus = "Employment status is required.";
    if (formData.employmentStatus && formData.employmentStatus !== "Not Working" && formData.employmentStatus !== "Student") {
      if (!formData.occupation) newErrors.occupation = "Occupation / Job title is required.";
      if (!formData.companyName) newErrors.companyName = "Company / Organization name is required.";
      if (!formData.annualIncome) newErrors.annualIncome = "Annual income is required.";
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
  const handleNext = async e => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill all required fields.");
      return;
    }
    const mapToBackendEmployment = val => {
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
      AnnualIncome: formData.annualIncome
    };
    try {
      const existing = await getUserProfession();
      if (existing?.data?.data) {
        const res = await updateUserProfession(payload);
        toast.success(" Profession details updated successfully!");
      } else {
        const res = await saveUserProfession(payload);
        toast.success(" Profession details saved successfully!");
      }
      if (onNext) {
        onNext("profession");
      } else {
        navigate("/next-step");
      }
    } catch (err) {
      console.error("❌ Failed to save profession details", err);
      const msg = err?.response?.data?.message || "Failed to save profession details.";
      setErrors(prev => ({
        ...prev,
        submit: msg
      }));
      toast.error(`❌ ${msg}`);
    }
  };
  useEffect(() => {
    let mounted = true;
    getUserProfession().then(res => {
      if (!mounted) return;
      const data = res?.data?.data || null;
      if (!data) return;
      const mapFromBackendEmployment = val => {
        if (!val) return "";
        const v = String(val).toLowerCase();
        if (v === "private sector") return "Private Sector";
        if (v === "government") return "Government";
        if (v === "business") return "Business";
        if (v === "self-employed" || v === "self employed") return "Self-Employed";
        if (v === "unemployed") return "Not Working";
        if (v === "student") return "Student";
        return val;
      };
      const rawEmployment = data.EmploymentStatus;
      const normalizedEmployment = rawEmployment ? mapFromBackendEmployment(String(rawEmployment).toLowerCase()) : "";
      setFormData(prev => ({
        ...prev,
        employmentStatus: normalizedEmployment,
        occupation: data.Occupation ? {
          label: data.Occupation,
          value: data.Occupation
        } : null,
        companyName: data.OrganizationName || "",
        annualIncome: data.AnnualIncome || ""
      }));
    }).catch(err => {
      if (err?.response?.status === 404) return;
      console.error("Failed to load profession details", err);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const isDisabled = formData.employmentStatus === "Not Working" || formData.employmentStatus === "Student";
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>;
  return <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-4 border-[#F9F7F5] hover:scale-[1.02] transition-transform duration-300">
        {}
        <h2 className="text-2xl font-bold text-[#1f1e1d] text-center mb-8">
          Professional Details
        </h2>

        <form onSubmit={handleNext} className="space-y-6">
          {}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Employment Status <RequiredMark />
            </label>
            <CustomSelect name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} options={EMPLOYMENT_OPTIONS} placeholder="Select Employment Status" className={`w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition ${errors.employmentStatus ? "border-red-500 focus:ring-red-400 focus:border-red-400" : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"}`} />

            {}
            {errors.employmentStatus && <p className="text-red-500 text-sm mt-1">
                {errors.employmentStatus}
              </p>}
          </div>

          {}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Occupation / Job Title <RequiredMark />
            </label>
            <CustomSelect
              name="occupation"
              value={formData.occupation ? formData.occupation.value || formData.occupation : ""}
              onChange={(e) => {
                const val = e.target.value;
                handleSelectChange("occupation", val ? { value: val, label: val } : null);
              }}
              options={JOB_TITLES}
              placeholder="Search or type job title..."
              allowCustom={true}
              disabled={isDisabled}
              className={`w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition ${
                isDisabled
                  ? "bg-gray-100 cursor-not-allowed border-gray-300"
                  : errors.occupation
                  ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                  : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"
              }`}
            />
            {errors.occupation && <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>}
          </div>

          {}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Company / Organization Name <RequiredMark />
            </label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} disabled={isDisabled} placeholder="Enter company or organization name" className={`w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition ${isDisabled ? "bg-gray-100 cursor-not-allowed border-gray-300" : errors.companyName ? "border-red-500 focus:ring-red-400 focus:border-red-400" : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"}`} />
            {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
          </div>

          {}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Annual Income <RequiredMark /></label>
            <CustomSelect name="annualIncome" value={isDisabled ? formData.employmentStatus === "Not Working" ? "Not Working" : "Student" : formData.annualIncome} onChange={handleChange} disabled={isDisabled} options={INCOME_OPTIONS} placeholder="Select Annual Income" className={`w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition ${isDisabled ? "bg-gray-100 cursor-not-allowed border-gray-300" : errors.annualIncome ? "border-red-500 focus:ring-red-400 focus:border-red-400" : "border-[#D4A052] focus:ring-[#E4C48A] focus:border-[#E4C48A]"}`} />
            {errors.annualIncome && <p className="text-red-500 text-sm mt-1">{errors.annualIncome}</p>}
          </div>

          {}
          <div className="pt-6 flex  justify-between items-center gap-4">
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
export default ProfessionDetails;