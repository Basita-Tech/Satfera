import React, { useState, useEffect } from "react";
import { getUserHealth, saveUserHealth, updateUserHealth } from "../../api/auth";

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
  // const [isEditing, setIsEditing] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      "alcohol",
      "tobacco",
      "tattoos",
      "hiv",
      "tb",
      "medicalHistory",
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
  };

  useEffect(() => {
    document.body.classList.add("bg-gray-100");
    return () => document.body.classList.remove("bg-gray-100");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const toBool = (val) => {
      if (val === "yes") return true;
      if (val === "no") return false;
      if (val === "occasional" || val === "Occasional") return true;
      return false;
    };

    const payload = {
      isAlcoholic: toBool(formData.alcohol),
      isTobaccoUser: toBool(formData.tobacco),
      isHaveTattoos: toBool(formData.tattoos),
      isHaveHIV: toBool(formData.hiv),
      isPostiviInTB: toBool(formData.tb),
      isHaveMedicalHistory: toBool(formData.medicalHistory),
      medicalHistoryDetails: formData.medicalHistoryDetails || "",
      diet: formData.diet || "",
    };

    try {
console.log("💾 Saving health data:", payload);
      // 🔹 Always create a new record

      const existing = await getUserHealth();

      if (existing?.data?.data) {
        const res = await updateUserHealth(payload);
        console.log("✅ Health data updated:", res);
        alert("✅ Health details updated successfully!");
      } else {
        const res = await saveUserHealth(payload);
        console.log("✅ Health data saved:", res);
        alert("✅ Health details saved successfully!");
      }

      // ✅ Move to next section
      if (onNext) onNext("expectation");
    } catch (err) {
      console.error("❌ Failed to save health data", err);
      const msg = err?.response?.data?.message || "Failed to save health data";
      setErrors((prev) => ({ ...prev, submit: msg }));
      alert(`❌ ${msg}`);
    }
  };

  useEffect(() => {
    let mounted = true;
    getUserHealth()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data || null;
        if (!data) return;

        const boolToSelect = (b) =>
          b === true ? "yes" : b === false ? "no" : "";

        setFormData((prev) => ({
          ...prev,
          alcohol: boolToSelect(data.isAlcoholic),
          tobacco: boolToSelect(data.isTobaccoUser),
          tattoos: boolToSelect(data.isHaveTattoos),
          hiv: boolToSelect(data.isHaveHIV),
          tb: boolToSelect(data.isPostiviInTB),
          medicalHistory: boolToSelect(data.isHaveMedicalHistory),
          medicalHistoryDetails: data.medicalHistoryDetails || "",
          diet: data.diet
        }));
      })
      .catch((err) => {
        if (err?.response?.status === 404) return; // no data yet
        console.error("Failed to load health data", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const inputClass =
    "capitalize w-full p-3 rounded-md border border-[#E4C48A] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition";

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-10 px-4">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-8 border-t-[2px] border-[#F9F7F5] transition-transform duration-300">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-black">Health & Lifestyle</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alcohol */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Do you consume alcohol?
            </label>
            <select
              value={formData.alcohol}
              onChange={(e) => handleChange("alcohol", e.target.value)}
              className={`${inputClass} ${errors.alcohol ? "border-red-500" : ""
                }`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="occasional">Occasional</option>
            </select>
            {errors.alcohol && (
              <p className="text-red-500 text-sm mt-1">{errors.alcohol}</p>
            )}
          </div>

          {/* Tobacco */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Do you use tobacco or related products?
            </label>
            <select
              value={formData.tobacco}
              onChange={(e) => handleChange("tobacco", e.target.value)}
              className={`${inputClass} ${errors.tobacco ? "border-red-500" : ""
                }`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="occasional">Occasional</option>
            </select>
            {errors.tobacco && (
              <p className="text-red-500 text-sm mt-1">{errors.tobacco}</p>
            )}
          </div>

          {/* Tattoos */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Do you have any visible tattoos?
            </label>
            <select
              value={formData.tattoos}
              onChange={(e) => handleChange("tattoos", e.target.value)}
              className={`${inputClass} ${errors.tattoos ? "border-red-500" : ""
                }`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {errors.tattoos && (
              <p className="text-red-500 text-sm mt-1">{errors.tattoos}</p>
            )}
          </div>

          {/* HIV */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Have you ever tested HIV positive?
            </label>
            <select
              value={formData.hiv}
              onChange={(e) => handleChange("hiv", e.target.value)}
              className={`${inputClass} ${errors.hiv ? "border-red-500" : ""}`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {errors.hiv && (
              <p className="text-red-500 text-sm mt-1">{errors.hiv}</p>
            )}
          </div>

          {/* TB */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Have you ever tested Tuberculosis (TB) positive?
            </label>
            <select
              value={formData.tb}
              onChange={(e) => handleChange("tb", e.target.value)}
              className={`${inputClass} ${errors.tb ? "border-red-500" : ""}`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
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
            <select
              value={formData.medicalHistory}
              onChange={(e) => handleChange("medicalHistory", e.target.value)}
              className={`${inputClass} ${errors.medicalHistory ? "border-red-500" : ""
                }`}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
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
            <select
              value={formData.diet}
              onChange={(e) => handleChange("diet", e.target.value)}
              className={`${inputClass} ${errors.diet ? "border-red-500" : ""}`}
            >
              <option value="">Select</option>
              <option value="vegetarien">Vegetarian</option>
              <option value="non-negetarian">Non-Vegetarian</option>
              <option value="eggetarian">Eggetarian</option>
              <option value="jain">Jain</option>
              <option value="swaminarayan">Swaminarayan</option>
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
            </select>
            {errors.diet && (
              <p className="text-red-500 text-sm mt-1">{errors.diet}</p>
            )}
          </div>



          {/* ✅ Buttons */}
          <div className="pt-6 flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => onPrevious && onPrevious()}
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

export default HealthLifestyle;
