import React, { useState, useEffect, useCallback } from "react";
import CustomSelect from "../ui/CustomSelect";
import {
  getUserHealth,
  saveUserHealth,
  updateUserHealth,
} from "../../api/auth";
import toast from "react-hot-toast";

const HealthLifestyle = ({ onNext, onPrevious }) => {
  const [formData, setFormData] = useState({
    alcohol: "",
    tobacco: "",
    tattoos: "",
    diet: "",
    hiv: "",
    tb: "",
    medicalHistory: "",
    medicalHistoryDetails: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    const requiredFields = [
      "alcohol",
      "tobacco",
      "tattoos",
      "hiv",
      "tb",
      "medicalHistory",
      "diet",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = "This field is required";
      }
    });

    if (
      formData.medicalHistory === "yes" &&
      !formData.medicalHistoryDetails.trim()
    ) {
      newErrors.medicalHistoryDetails = "Please provide details";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  useEffect(() => {
    document.body.classList.add("bg-gray-100");
    return () => document.body.classList.remove("bg-gray-100");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill all required fields.");
      return;
    }

    const payload = {
      isAlcoholic: String(formData.alcohol || ""),
      isTobaccoUser: String(formData.tobacco || ""),
      isHaveTattoos: String(formData.tattoos || ""),
      isHaveHIV: String(formData.hiv || ""),
      isPositiveInTB: String(formData.tb || ""),
      isHaveMedicalHistory: String(formData.medicalHistory || ""),
      medicalHistoryDetails: formData.medicalHistoryDetails?.trim() || "",
      diet: String(formData.diet || ""),
    };

    try {
      const existing = await getUserHealth();

      if (existing?.data?.data) {
        const res = await updateUserHealth(payload);
        toast.success(" Health details updated successfully!");
      } else {
        const res = await saveUserHealth(payload);
        toast.success(" Health details saved successfully!");
      }

      if (onNext) onNext("expectation");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    let mounted = true;
    getUserHealth()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data || null;
        if (!data) return;

        setFormData((prev) => ({
          ...prev,
          alcohol: data.isAlcoholic || "",
          tobacco: data.isTobaccoUser || "",
          tattoos: data.isHaveTattoos || "",
          hiv: data.isHaveHIV || "",
          tb: data.isPositiveInTB || "",
          medicalHistory: data.isHaveMedicalHistory || "",
          medicalHistoryDetails: data.medicalHistoryDetails || "",
          diet: data.diet || "",
        }));
      })
      .catch((err) => {
        if (err?.response?.status === 404) return;
        console.error("Failed to load health data", err);
      });

    return () => {
      mounted = false;
    };
  }, []);
  const inputClass =
    "capitalize w-full p-3 rounded-md border border-[#E4C48A] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition";

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-[2px] border-[#F9F7F5] transition-transform duration-300">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-black">Health & Lifestyle</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alcohol */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Do you consume alcohol?
            </label>
            <CustomSelect
              name="alcohol"
              value={formData.alcohol}
              onChange={(e) => handleChange("alcohol", e.target.value)}
              options={["yes", "no", "occasional"]}
              placeholder="Select"
              className={`${inputClass} ${
                errors.alcohol ? "border-red-500" : ""
              }`}
            />
            {errors.alcohol && (
              <p className="text-red-500 text-sm mt-1">{errors.alcohol}</p>
            )}
          </div>

          {/* Tobacco */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Do you use tobacco or related products?
            </label>
            <CustomSelect
              name="tobacco"
              value={formData.tobacco}
              onChange={(e) => handleChange("tobacco", e.target.value)}
              options={["yes", "no", "occasional"]}
              placeholder="Select"
              className={`${inputClass} ${
                errors.tobacco ? "border-red-500" : ""
              }`}
            />
            {errors.tobacco && (
              <p className="text-red-500 text-sm mt-1">{errors.tobacco}</p>
            )}
          </div>

          {/* Tattoos */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Do you have any visible tattoos?
            </label>
            <CustomSelect
              name="tattoos"
              value={formData.tattoos}
              onChange={(e) => handleChange("tattoos", e.target.value)}
              options={["yes", "no"]}
              placeholder="Select"
              className={`${inputClass} ${
                errors.tattoos ? "border-red-500" : ""
              }`}
            />
            {errors.tattoos && (
              <p className="text-red-500 text-sm mt-1">{errors.tattoos}</p>
            )}
          </div>

          {/* HIV */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Have you ever tested HIV positive?
            </label>
            <CustomSelect
              name="hiv"
              value={formData.hiv}
              onChange={(e) => handleChange("hiv", e.target.value)}
              options={["yes", "no"]}
              placeholder="Select"
              className={`${inputClass} ${errors.hiv ? "border-red-500" : ""}`}
            />
            {errors.hiv && (
              <p className="text-red-500 text-sm mt-1">{errors.hiv}</p>
            )}
          </div>

          {/* TB */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Have you ever tested Tuberculosis (TB) positive?
            </label>
            <CustomSelect
              name="tb"
              value={formData.tb}
              onChange={(e) => handleChange("tb", e.target.value)}
              options={["yes", "no"]}
              placeholder="Select"
              className={`${inputClass} ${errors.tb ? "border-red-500" : ""}`}
            />
            {errors.tb && (
              <p className="text-red-500 text-sm mt-1">{errors.tb}</p>
            )}
          </div>

          {/* Medical History */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Do you have any past or ongoing medical history we should be aware
              of?
            </label>
            <CustomSelect
              name="medicalHistory"
              value={formData.medicalHistory}
              onChange={(e) => handleChange("medicalHistory", e.target.value)}
              options={["yes", "no"]}
              placeholder="Select"
              className={`${inputClass} ${
                errors.medicalHistory ? "border-red-500" : ""
              }`}
            />
            {errors.medicalHistory && (
              <p className="text-red-500 text-sm mt-1">
                {errors.medicalHistory}
              </p>
            )}

            {formData.medicalHistory === "yes" && (
              <textarea
                value={formData.medicalHistoryDetails}
                onChange={(e) =>
                  handleChange("medicalHistoryDetails", e.target.value)
                }
                placeholder="Please specify in under 100 words"
                maxLength={500}
                className={`${inputClass} mt-2 capitalize`}
              />
            )}
          </div>

          {/* Diet Preference */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              What is your diet?
            </label>
            <CustomSelect
              name="diet"
              value={formData.diet}
              onChange={(e) => handleChange("diet", e.target.value)}
              options={["vegetarian", "non-vegetarian", "eggetarian", "jain", "swaminarayan", "veg & non-veg"]}
              placeholder="Select"
              className={`${inputClass} ${errors.diet ? "border-red-500" : ""}`}
            />
            {errors.diet && (
              <p className="text-red-500 text-sm mt-1">{errors.diet}</p>
            )}
          </div>

          {/* ✅ Buttons */}
          <div className="pt-6 flex  justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => onPrevious && onPrevious()}
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

export default HealthLifestyle;
