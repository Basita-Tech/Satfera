import React, { useState, useEffect } from "react";
import { allCountries } from "country-telephone-data";
import { useNavigate } from "react-router-dom";
import { saveUserFamilyDetails, getUserFamilyDetails, updateUserFamilyDetails } from "../../api/auth";
import toast from "react-hot-toast";

// Map allCountries for dropdown
const countryCodes = allCountries.map((c) => ({
  code: `+${c.dialCode}`,
  country: c.name,
}));


// ✅ Validate phone number (10 digits)
const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/; // only digits, exactly 10
  return phoneRegex.test(phone);
};

const FamilyDetails = ({ onNext, onPrevious }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [existingId, setExistingId] = useState(null);

  const [formData, setFormData] = useState({
    fatherName: "",
    fatherProfession: "",
    fatherPhoneCode: "+91",
    fatherPhone: "",
    fatherNative: "",
    motherName: "",
    motherProfession: "",
    motherPhoneCode: "+91",
    motherPhone: "",
    motherNative: "",
    grandFatherName: "",
    grandMotherName: "",
    nanaName: "",
    naniName: "",
    nanaNativePlace: "",
    familyType: "",
    hasSiblings: null,
    siblingCount: 0,
    siblings: [],
  });

  // ✅ Fetch existing data once
  useEffect(() => {
    const fetchFamilyDetails = async () => {
      try {
        setLoading(true);
        const res = await getUserFamilyDetails();
        console.log("📥 API family details:", res?.data);

        const data = res?.data?.data;
        if (data) {
          setExistingId(data._id || null);

          setFormData({
            fatherName: data.fatherName || "",
            fatherProfession: data.fatherOccupation || "",
            fatherPhone: data.fatherContact || "",
            fatherNative: data.fatherNativePlace || "",
            motherName: data.motherName || "",
            motherProfession: data.motherOccupation || "",
            motherPhone: data.motherContact || "",
            motherNative: "",
            grandFatherName: data.grandFatherName || "",
            grandMotherName: data.grandMotherName || "",
            nanaName: data.nanaName || "",
            naniName: data.naniName || "",
            nanaNativePlace: data.nanaNativePlace || "",
            familyType: data.familyType || "",
            hasSiblings: data.haveSibling ?? null,
            siblingCount: data.howManySiblings || 0,
            siblings: data.siblingDetails || [],
            doYouHaveChildren: data.doYouHaveChildren ?? false,
            fatherPhoneCode: "+91",
            motherPhoneCode: "+91",
          });
        }
      } catch (error) {
        console.error("❌ Fetch Family Details Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyDetails();
  }, []);


  // Capitalize first letter of each word while preserving spaces
  const formatFullName = (name) => {
    return name.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue =
      name.toLowerCase().includes("name") ||
        name.toLowerCase().includes("native") ||
        name.toLowerCase().includes("profession")
        ? formatFullName(value)
        : value;
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const handlePhoneChange = (field, value) => {
  if (field === "motherPhone" || field === "fatherPhone") {
    // remove non-digit characters (no + inside the input)
    const digitsOnly = value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, [field]: digitsOnly }));
  } else {
    // handle country code normally
    setFormData((prev) => ({ ...prev, [field]: value }));
  }
};


  const handleSiblingChange = (index, field, value) => {
    const updatedSiblings = [...formData.siblings];
    updatedSiblings[index][field] =
      field === "name" ? formatFullName(value) : value;
    setFormData((prev) => ({ ...prev, siblings: updatedSiblings }));
  };

  


 const handleSubmit = async (e) => {
  e.preventDefault();
  console.log("🧾 Raw formData before submission:", formData);
// ✅ Validate phone numbers before continuing
  if (formData.fatherPhone && !isValidPhone(formData.fatherPhone)) {
    toast.error("Please enter a valid 10-digit father's phone number.");
    return;
  }

  if (formData.motherPhone && !isValidPhone(formData.motherPhone)) {
    toast.error("Please enter a valid 10-digit mother's phone number.");
    return;
  }
  // ✅ Prepare clean submission data
  let submissionData = {
    fatherName: formData.fatherName,
    motherName: formData.motherName,
    fatherOccupation: formData.fatherProfession,
    motherOccupation: formData.motherProfession,
    fatherContact: formData.fatherPhone,
    motherContact: formData.motherPhone,
    fatherNativePlace: formData.fatherNative,
    doYouHaveChildren: formData.doYouHaveChildren,
    grandFatherName: formData.grandFatherName,
    grandMotherName: formData.grandMotherName,
    nanaName: formData.nanaName,
    naniName: formData.naniName,
    nanaNativePlace: formData.nanaNativePlace,
    familyType: formData.familyType,
  };

  // ✅ Handle siblings correctly
  if (formData.hasSiblings === true) {
    submissionData.haveSibling = true;
    submissionData.howManySiblings = formData.siblingCount || 0;
    submissionData.siblingDetails = (formData.siblings || []).filter(
      (s) => s.name?.trim() && s.relation?.trim()
    );
  } else if (formData.hasSiblings === false) {
    submissionData.haveSibling = false;
  }

  // ✅ Clean empty fields
  Object.keys(submissionData).forEach((key) => {
    if (
      submissionData[key] === "" ||
      submissionData[key] === null ||
      (Array.isArray(submissionData[key]) &&
        submissionData[key].length === 0)
    ) {
      delete submissionData[key];
    }
  });

  console.log("🚀 Final clean data being sent:", submissionData);

  try {
    setLoading(true);
    const existing = await getUserFamilyDetails();

    let res;
    if (existing?.data?.data) {
      console.log("🔁 Updating existing family details...");
      res = await updateUserFamilyDetails(submissionData);
      toast.success("✅ Family details updated successfully!");
    } else {
      console.log("🆕 Creating new family details...");
      res = await saveUserFamilyDetails(submissionData);
      toast.success("✅ Family details saved successfully!");
    }

    if (onNext) onNext("education");
  } catch (error) {
    console.error("❌ Save/Update Family Details Error:", error);

    // Handle backend "already exists" gracefully
    if (error?.response?.data?.message?.includes("already exist")) {
      toast("ℹ️ Family details already exist, updating instead...");
      try {
        const res = await updateUserFamilyDetails(submissionData);
        toast.success("✅ Family details updated successfully!");
        if (onNext) onNext("education");
      } catch (updateErr) {
        console.error("❌ Update failed:", updateErr);
        toast.error("Failed to update family details.");
      }
    } else {
      toast.error("Error saving family details.");
    }
  } finally {
    setLoading(false);
  }
};


  // ✅ Add this function here — above `return`
  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious(); // go to previous step
    } else {
      console.warn("onPrevious prop not provided");
    }
  };


  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
  <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-4 border-[#F9F7F5] transition-transform duration-300">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-black">Family Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Father Details */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Father's Details
            </h4>
            {["Name", "Profession", "Native"].map((field) => (
              <div className="flex flex-col" key={field}>
                <label className="text-sm font-medium mb-1">
                  Father's {field}
                </label>
                <input
                  type="text"
                  name={`father${field}`}
                  placeholder={`Father's ${field}`}
                  value={formData[`father${field}`]}
                  onChange={handleChange}
                  className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                />
              </div>
            ))}

            {/* Father's Phone */}
            <div className="flex flex-col w-full mb-4">
              <label className="text-sm font-medium mb-1">Father's Phone</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={formData.fatherPhoneCode}
                  onChange={(e) =>
                    handlePhoneChange("fatherPhoneCode", e.target.value)
                  }
                  className="w-24 border border-[#D4A052] rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                >
                  {countryCodes.map((c) => (
                    <option key={`${c.code}-${c.country}`} value={c.code}>
                      {c.code} {c.country}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="fatherPhone"
                  placeholder="Phone Number"
                  value={formData.fatherPhone}
                  onChange={(e) =>
                    handlePhoneChange("fatherPhone", e.target.value)
                  }
                  className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                />
              </div>
            </div>
          </div>
          {/* Mother Details */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Mother's Details
            </h4>
            {["Name", "Profession"].map((field) => (
              <div className="flex flex-col" key={field}>
                <label className="text-sm font-medium mb-1">
                  Mother's {field}
                </label>
                <input
                  type="text"
                  name={`mother${field}`}
                  placeholder={`Mother's ${field}`}
                  value={formData[`mother${field}`]}
                  onChange={handleChange}
                  className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                />
              </div>
            ))}

            {/* Mother's Phone */}
            <div className="flex flex-col w-full mb-4">
              <label className="text-sm font-medium mb-1">Mother's Phone</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={formData.motherPhoneCode}
                  onChange={(e) =>
                    handlePhoneChange("motherPhoneCode", e.target.value)
                  }
                  className="w-24 border border-[#D4A052] rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                >
                  {countryCodes.map((c) => (
                    <option key={`${c.code}-${c.country}`} value={c.code}>
                      {c.code} {c.country}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="motherPhone"
                  placeholder="Phone Number"
                  value={formData.motherPhone}
                  onChange={(e) =>
                    handlePhoneChange("motherPhone", e.target.value)
                  }
                  className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                />
              </div>
            </div>
          </div>

          {/* Grandparents */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Grand Parents
            </h4>
            {[
              { label: "Grandfather's Name", key: "grandFatherName" },
              { label: "Grandmother's Name", key: "grandMotherName" },
              { label: "Nana's Name", key: "nanaName" },
              { label: "Nani's Name", key: "naniName" },
              { label: "Nana's Native Place", key: "nanaNativePlace" },
            ].map(({ label, key }) => (
              <div className="flex flex-col" key={key}>
                <label className="text-sm font-medium mb-1">{label}</label>
                <input
                  type="text"
                  name={key}
                  placeholder={label}
                  value={formData[key]}
                  onChange={handleChange}
                  className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                />
              </div>
            ))}
          </div>

          {/* Siblings */}
          <div className="space-y-4 mt-4">
            <label className="text-sm font-medium mb-2 block">
              Do you have any siblings?
            </label>
            <div className="flex gap-4 items-center">
              {["Yes", "No"].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name="hasSiblings"
                    value={option}
                    checked={formData.hasSiblings === (option === "Yes")}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        hasSiblings: option === "Yes",
                        siblingCount: 0,
                        siblings: [],
                      }))
                    }
                    className={`appearance-none w-4 h-4 rounded-full border border-[#E4C48A] transition duration-200
            ${formData.hasSiblings === (option === "Yes")
                        ? "bg-[#D4A052] border-[#D4A052]"
                        : "border-[#E4C48A]"
                      }
            focus:outline-none`}
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>

            {formData.hasSiblings && (
              <div className="mt-3 space-y-3">
                <label className="text-sm font-medium mb-2">
                  How many siblings?
                </label>
                <select
                  value={formData.siblingCount}
                  onChange={(e) => handleSiblingCount(Number(e.target.value))}
                  className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                >
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>

                {formData.siblings.map((sibling, index) => (
                  <div
                    key={index}
                    className="border p-3 rounded-md bg-purple-50 space-y-2"
                  >
                    <div className="flex flex-col">
                      <label className="text-sm font-medium">
                        Sibling {index + 1} Name
                      </label>
                      <input
                        type="text"
                        placeholder={`Sibling ${index + 1} Name`}
                        value={sibling.name}
                        onChange={(e) =>
                          handleSiblingChange(index, "name", e.target.value)
                        }
                        className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-sm font-medium">Relation</label>
                      <select
                        value={sibling.relation}
                        onChange={(e) =>
                          handleSiblingChange(index, "relation", e.target.value)
                        }
                        className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                      >
                        <option value="">Select</option>
                        <option value="Elder Brother">Elder Brother</option>
                        <option value="Younger Brother">Younger Brother</option>
                        <option value="Elder Sister">Elder Sister</option>
                        <option value="Younger Sister">Younger Sister</option>
                      </select>
                    </div>

                    {[
                      "Elder Brother",
                      "Younger Brother",
                      "Elder Sister",
                      "Younger Sister",
                    ].includes(sibling.relation) && (
                        <div className="flex flex-col">
                          <label className="text-sm font-medium">
                            Marital Status
                          </label>
                          <select
                            value={sibling.maritalStatus}
                            onChange={(e) =>
                              handleSiblingChange(
                                index,
                                "maritalStatus",
                                e.target.value
                              )
                            }
                            className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                          >
                            <option value="">Select</option>
                            <option value="Married">Married</option>
                            <option value="Unmarried">Unmarried</option>
                          </select>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Family Type */}
          <div className="flex flex-col mt-2">
            <label className="text-sm font-medium mb-1">Family Type</label>
            <div className="flex gap-6 items-center">
              {["Joint", "Nuclear"].map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name="familyType"
                    value={type}
                    checked={formData.familyType === type}
                    onChange={handleChange}
                    className={`appearance-none w-4 h-4 rounded-full border border-[#E4C48A] transition duration-200
            ${formData.familyType === type
                        ? "bg-[#D4A052] border-[#D4A052]"
                        : "border-[#E4C48A]"
                      }
          focus:outline-none`}
                  />
                  <span className="text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>



          <div className="pt-6 flex justify-between items-center gap-4">
            {/* Previous Button */}
            <button
              type="button"
              onClick={handlePrevious}
              className="w-full sm:w-1/2 py-3 rounded-xl font-medium bg-[#EEEAE6] text-gray-800 hover:bg-[#E4C48A] hover:text-white transition-all duration-300 shadow-sm"
            >
              Previous
            </button>

            {/* Save & Next Button */}
            <button
              type="submit"
              className="w-full sm:w-1/2 py-3 rounded-xl font-medium bg-[#D4A052] text-white hover:bg-[#C18E47] transition-all duration-300 shadow-sm"
            >
              Save & Next
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default FamilyDetails;
