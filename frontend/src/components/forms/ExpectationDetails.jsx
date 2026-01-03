import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getUserExpectations, saveUserExpectations, updateUserExpectations } from "../../api/auth";
import Select from "react-select";
import CustomSelect from "../ui/CustomSelect";
import NoKeyboardInput from "../ui/NoKeyboardInput";
import toast from "react-hot-toast";
import { getAllCountriesWithCodes, getAllStatesWithCodes } from "../../lib/locationUtils";
const sortAlpha = list => [...list].sort((a, b) => a.localeCompare(b, undefined, {
  sensitivity: "base"
}));
const sortAlphaWithPinned = (list, pinned = []) => {
  const pinnedSet = new Set(pinned);
  const pinnedItems = list.filter(item => pinnedSet.has(item));
  const rest = list.filter(item => !pinnedSet.has(item));
  return [...pinnedItems, ...sortAlpha(rest)];
};
const isAnyOrNoPreference = val => {
  if (val === null || val === undefined) return false;
  const candidates = Array.isArray(val) ? val : [val];
  return candidates.some(item => {
    const lower = String(item?.value || item?.label || item).toLowerCase().trim();
    return lower === "any" || lower === "no preference";
  });
};
const ExpectationDetails = ({
  onNext,
  onPrevious
}) => {
  const [formData, setFormData] = useState({
    partnerLocation: "",
    partnerStateOrCountry: [],
    openToPartnerHabits: "",
    partnerEducation: [],
    partnerDiet: [],
    partnerCommunity: [],
    profession: [],
    maritalStatus: [],
    preferredAgeFrom: "",
    preferredAgeTo: ""
  });
  const [errors, setErrors] = useState({});
  const maritalStatuses = sortAlphaWithPinned(["Any", "Never Married", "Divorced", "Widowed", "Separated", "Awaiting Divorce"], ["Any"]);
  const professionOptions = sortAlphaWithPinned(["Any", "Private Sector", "Government", "Business", "Self-Employed", "Not Working", "Student"], ["Any"]);
  const castOptions = sortAlphaWithPinned(["Patel-Desai", "Patel-Kadva", "Patel-Leva", "Patel", "Brahmin-Audichya", "Brahmin", "Jain-Digambar", "Jain-Swetamber", "Jain-Vanta", "Vaishnav-Vania", "No preference"], ["No preference"]);
  const inputClass = "w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition";
  const ageOptions = useMemo(() => Array.from({
    length: 23
  }, (_, i) => 18 + i), []);
  const countryOptions = useMemo(() => {
    const countries = getAllCountriesWithCodes();
    return [{
      value: "Any",
      label: "Any"
    }, ...countries.map(c => ({
      value: c.name,
      label: c.name
    }))];
  }, []);
  const stateOptions = useMemo(() => {
    const states = getAllStatesWithCodes("IN");
    return [{
      value: "Any",
      label: "Any"
    }, ...states.map(s => ({
      value: s.name,
      label: s.name
    }))];
  }, []);
  const handleChange = useCallback((field, value) => {
    if (field === "preferredAgeFrom" || field === "preferredAgeTo") {
      let num = Number(value);
      if (Number.isNaN(num)) num = "";else {
        if (num < 18) num = 18;
        if (num > 40) num = 40;
      }
      value = num === "" ? "" : String(num);
    }
    const shouldClearError = Array.isArray(value) && value.length > 0 || typeof value === "string" && value.trim() !== "" || value && typeof value === "object" && Object.keys(value).length > 0;
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === "partnerLocation" ? {
        partnerStateOrCountry: value === "No preference" ? [{
          value: "Any",
          label: "Any"
        }] : []
      } : {})
    }));
    if (shouldClearError) {
      setErrors(prev => {
        const newErrors = {
          ...prev
        };
        delete newErrors[field];
        if (field === "partnerLocation") {
          delete newErrors.partnerStateOrCountry;
        }
        return newErrors;
      });
    }
  }, []);
  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ["preferredAgeFrom", "preferredAgeTo", "maritalStatus", "partnerLocation", "partnerCommunity", "partnerDiet", "partnerEducation", "profession"];
    requiredFields.forEach(key => {
      const value = formData[key];
      if (Array.isArray(value) ? value.length === 0 : !value) newErrors[key] = "This field is required";
    });
    if (formData.partnerLocation === "India" || formData.partnerLocation === "Abroad") {
      if (!Array.isArray(formData.partnerStateOrCountry) || formData.partnerStateOrCountry.length === 0) {
        newErrors.partnerStateOrCountry = "This field is required";
      }
    }
    const fromAge = Number(formData.preferredAgeFrom);
    const toAge = Number(formData.preferredAgeTo);
    if (isNaN(fromAge)) newErrors.preferredAgeFrom = "Preferred Age From is required";
    if (isNaN(toAge)) newErrors.preferredAgeTo = "Preferred Age To is required";
    if (!isNaN(fromAge) && (fromAge < 18 || fromAge > 40)) newErrors.preferredAgeFrom = "Age must be between 18 and 40";
    if (!isNaN(toAge) && (toAge < 18 || toAge > 40)) newErrors.preferredAgeTo = "Age must be between 18 and 40";
    if (!isNaN(fromAge) && !isNaN(toAge) && fromAge > toAge) newErrors.preferredAgeTo = "To age must be greater than From age";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleNext = async e => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill all required fields.");
      return;
    }
    const mapHabits = val => {
      if (!val) return val;
      const v = String(val).toLowerCase();
      if (v === "occasional" || v === "occasionally") return "occasionally";
      return v;
    };
    const payload = {
      age: {
        from: Number(formData.preferredAgeFrom) || 18,
        to: Number(formData.preferredAgeTo) || 40
      },
      maritalStatus: formData.maritalStatus.map(x => x.value),
      isConsumeAlcoholic: mapHabits(formData.openToPartnerHabits),
      educationLevel: formData.partnerEducation.map(x => x.value),
      community: formData.partnerCommunity.map(x => x.value),
      diet: formData.partnerDiet?.map(x => x.value) || [],
      profession: formData.profession.map(x => x.value)
    };
    if (formData.partnerLocation === "India") {
      payload.livingInCountry = "India";
      payload.livingInState = formData.partnerStateOrCountry.map(x => x.value);
    } else if (formData.partnerLocation === "Abroad") {
      payload.livingInCountry = formData.partnerStateOrCountry.map(x => x.value);
      payload.livingInState = [];
    } else {
      payload.livingInCountry = ["Any"];
      payload.livingInState = ["Any"];
    }
    try {
      const existing = await getUserExpectations();
      if (existing?.data) {
        await updateUserExpectations(payload);
        toast.success(" Expectations updated successfully!");
      } else {
        await saveUserExpectations(payload);
        toast.success("Expectations saved successfully!");
      }
      const updated = await getUserExpectations();
      if (updated?.data?.data) {
        const data = updated.data.data;
        const determinePartnerLocation = (livingInCountry, livingInState) => {
          const hasStates = livingInState && Array.isArray(livingInState) && livingInState.length > 0;
          if (hasStates) return "India";
          if (!livingInCountry || isAnyOrNoPreference(livingInCountry) || isAnyOrNoPreference(livingInState)) {
            return "No preference";
          }
          if (typeof livingInCountry === "string") {
            if (livingInCountry === "India") return "India";
            return "Abroad";
          }
          if (Array.isArray(livingInCountry)) {
            const countryValues = livingInCountry.map(c => c.value || c);
            const hasOnlyAny = countryValues.length === 0 || countryValues.every(c => isAnyOrNoPreference(c));
            if (hasOnlyAny) return "No preference";
            if (countryValues.length === 1 && countryValues[0] === "India") {
              return "India";
            }
            if (countryValues.length > 0) {
              return "Abroad";
            }
          }
          return "No preference";
        };
        const mapHabitDisplay = val => {
          if (!val) return "";
          if (String(val).toLowerCase() === "yes") return "Yes";
          if (String(val).toLowerCase() === "no") return "No";
          if (String(val).toLowerCase() === "occasionally") return "Occasional";
          return String(val);
        };
        const partnerLocation = determinePartnerLocation(data.livingInCountry, data.livingInState);
        setFormData(prev => ({
          ...prev,
          partnerLocation,
          partnerStateOrCountry: partnerLocation === "India" ? data.livingInState?.map(s => ({
            value: s.value || s,
            label: s.value || s
          })) || [] : partnerLocation === "Abroad" ? data.livingInCountry?.map(c => ({
            value: c.value || c.label || c,
            label: c.value || c.label || c
          })) || [] : [{
            value: "Any",
            label: "Any"
          }],
          openToPartnerHabits: mapHabitDisplay(data.isConsumeAlcoholic),
          preferredAgeFrom: data.age?.from !== undefined && data.age?.from !== null ? String(data.age.from) : "",
          preferredAgeTo: data.age?.to !== undefined && data.age?.to !== null ? String(data.age.to) : "",
          profession: data.profession?.map(e => ({
            value: e,
            label: e
          })) || [],
          maritalStatus: data.maritalStatus?.map(e => ({
            value: e,
            label: e
          })) || [],
          partnerDiet: data.diet?.map(e => ({
            value: e,
            label: e
          })) || []
        }));
      }
      onNext?.("expectation");
    } catch (err) {
      console.error("❌ Save failed", err);
    }
  };
  useEffect(() => {
    let mounted = true;
    getUserExpectations().then(res => {
      if (!mounted) return;
      const data = res?.data?.data || null;
      if (!data) return;
      const partnerLocation = (() => {
        const hasStates = data.livingInState && Array.isArray(data.livingInState) && data.livingInState.length > 0;
        if (hasStates) return "India";
        if (!data.livingInCountry || isAnyOrNoPreference(data.livingInCountry) || isAnyOrNoPreference(data.livingInState)) {
          return "No preference";
        }
        if (typeof data.livingInCountry === "string") {
          if (data.livingInCountry === "India") return "India";
          return "Abroad";
        }
        if (Array.isArray(data.livingInCountry)) {
          const countryValues = data.livingInCountry.map(c => c.value || c);
          const hasOnlyAny = countryValues.length === 0 || countryValues.every(c => isAnyOrNoPreference(c));
          if (hasOnlyAny) return "No preference";
          if (countryValues.length === 1 && countryValues[0] === "India") {
            return "India";
          }
          if (countryValues.length > 0) {
            return "Abroad";
          }
        }
        return "No preference";
      })();
      const mapHabitsDisplay = val => {
        if (!val) return "";
        if (val === "yes") return "Yes";
        if (val === "no") return "No";
        if (val === "occasionally") return "Occasional";
        return String(val);
      };
      setFormData(prev => ({
        ...prev,
        partnerLocation,
        partnerStateOrCountry: partnerLocation === "India" ? data.livingInState?.map(s => ({
          value: s,
          label: s
        })) || [] : partnerLocation === "Abroad" ? data.livingInCountry?.map(c => ({
          value: c.value || c,
          label: c.label || c
        })) || [] : [{
          value: "Any",
          label: "Any"
        }],
        openToPartnerHabits: mapHabitsDisplay(data.isConsumeAlcoholic),
        partnerEducation: data.educationLevel?.map(e => ({
          value: e,
          label: e
        })) || [],
        partnerCommunity: data.community?.map(e => ({
          value: e,
          label: e
        })) || [],
        profession: data.profession?.map(e => ({
          value: e,
          label: e
        })) || [],
        maritalStatus: data.maritalStatus?.map(e => ({
          value: e,
          label: e
        })) || [],
        preferredAgeFrom: data.age?.from !== undefined && data.age?.from !== null ? String(data.age.from) : "",
        preferredAgeTo: data.age?.to !== undefined && data.age?.to !== null ? String(data.age.to) : "",
        partnerDiet: data.diet?.map(e => ({
          value: e,
          label: e
        })) || []
      }));
    }).catch(err => {
      if (err?.response?.status === 404) return;
      console.error("Failed to load expectations", err);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-4 border-[#F9F7F5] transition-transform duration-300">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-black">Expectations</h2>
        </div>

        <form className="space-y-4" onSubmit={handleNext}>
          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              Where would you prefer your partner to be based?
            </label>
            <CustomSelect name="partnerLocation" value={formData.partnerLocation} onChange={e => handleChange("partnerLocation", e.target.value)} options={["India", "Abroad", "No preference"]} placeholder="Select" className={inputClass} />
            {errors.partnerLocation && <p className="text-red-500 text-sm mt-1">
                {errors.partnerLocation}
              </p>}
          </div>

          {}
          {formData.partnerLocation === "Abroad" && <div className="mt-6">
              <label className="block text-sm font-medium mb-1">
                Select Countries
              </label>

              <div className="w-full">
                <Select menuPlacement="auto" menuPosition="fixed" isMulti name="partnerStateOrCountry" options={countryOptions} value={formData.partnerStateOrCountry} onChange={selectedOptions => {
              if (selectedOptions?.some(opt => opt.value === "Any")) {
                handleChange("partnerStateOrCountry", [{
                  value: "Any",
                  label: "Any"
                }]);
              } else {
                handleChange("partnerStateOrCountry", selectedOptions || []);
              }
            }} placeholder="Search and select countries" classNamePrefix="react-select" components={{
              IndicatorSeparator: () => null
            }} styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? "#D4A052" : "#d1d5db",
                boxShadow: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#fff",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#D4A052"
                }
              }),
              valueContainer: base => ({
                ...base,
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap"
              }),
              input: base => ({
                ...base,
                margin: 0,
                padding: 0
              }),
              multiValue: base => ({
                ...base,
                backgroundColor: "#F9F7F5",
                borderRadius: "0.5rem",
                padding: "0 6px"
              }),
              multiValueLabel: base => ({
                ...base,
                color: "#111827",
                fontSize: "0.875rem"
              }),
              multiValueRemove: base => ({
                ...base,
                color: "#6b7280",
                ":hover": {
                  backgroundColor: "#D4A052",
                  color: "white"
                }
              }),
              menu: base => ({
                ...base,
                zIndex: 9999,
                borderRadius: "0.75rem"
              })
            }} />
              </div>

              {errors.partnerStateOrCountry && <p className="text-red-500 text-sm mt-1">
                  {errors.partnerStateOrCountry}
                </p>}
            </div>}

          {formData.partnerLocation === "India" && <div className="mt-6">
              <label className="block text-sm font-medium mb-1">
                Select States
              </label>

              <div className="w-full">
                <Select menuPlacement="auto" menuPosition="fixed" isMulti name="partnerStateOrCountry" options={stateOptions} value={formData.partnerStateOrCountry} onChange={selectedOptions => {
              if (selectedOptions?.some(opt => opt.value === "Any")) {
                handleChange("partnerStateOrCountry", [{
                  value: "Any",
                  label: "Any"
                }]);
              } else {
                handleChange("partnerStateOrCountry", selectedOptions || []);
              }
            }} placeholder="Search and select states" classNamePrefix="react-select" components={{
              IndicatorSeparator: () => null
            }} styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? "#D4A052" : "#d1d5db",
                boxShadow: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#fff",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#D4A052"
                }
              }),
              valueContainer: base => ({
                ...base,
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap"
              }),
              input: base => ({
                ...base,
                margin: 0,
                padding: 0
              }),
              multiValue: base => ({
                ...base,
                backgroundColor: "#F9F7F5",
                borderRadius: "0.5rem",
                padding: "0 6px"
              }),
              multiValueLabel: base => ({
                ...base,
                color: "#111827",
                fontSize: "0.875rem"
              }),
              multiValueRemove: base => ({
                ...base,
                color: "#6b7280",
                ":hover": {
                  backgroundColor: "#D4A052",
                  color: "white"
                }
              }),
              menu: base => ({
                ...base,
                zIndex: 9999,
                borderRadius: "0.75rem"
              })
            }} />
              </div>

              {errors.partnerStateOrCountry && <p className="text-red-500 text-sm mt-1">
                  {errors.partnerStateOrCountry}
                </p>}
            </div>}

          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              Would you be open to a partner who consumes alcohol, tobacco, or
              has other habits?
            </label>
            <CustomSelect name="openToPartnerHabits" value={formData.openToPartnerHabits} onChange={e => handleChange("openToPartnerHabits", e.target.value)} options={["Yes", "No", "Occasional"]} placeholder="Select" className={inputClass} />
            {errors.openToPartnerHabits && <p className="text-red-500 text-sm mt-1">
                {errors.openToPartnerHabits}
              </p>}
          </div>

          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              What is your preferred education level for your partner?
            </label>

            <div className="w-full">
              <Select menuPlacement="auto" menuPosition="fixed" isMulti isSearchable={false} name="partnerEducation" options={[{
              value: "Any",
              label: "Any"
            }, {
              value: "High School",
              label: "High School"
            }, {
              value: "Undergraduate",
              label: "Undergraduate"
            }, {
              value: "Associates Degree",
              label: "Associates Degree"
            }, {
              value: "Bachelors",
              label: "Bachelors"
            }, {
              value: "Honours Degree",
              label: "Honours Degree"
            }, {
              value: "Masters",
              label: "Masters"
            }, {
              value: "Doctorate",
              label: "Doctorate"
            }, {
              value: "Diploma",
              label: "Diploma"
            }, {
              value: "Trade School",
              label: "Trade School"
            }, {
              value: "Less Than High School",
              label: "Less Than High School"
            }]} value={formData.partnerEducation} onChange={selectedOptions => {
              if (selectedOptions?.some(opt => opt.value === "Any")) {
                handleChange("partnerEducation", [{
                  value: "Any",
                  label: "Any"
                }]);
              } else {
                handleChange("partnerEducation", selectedOptions || []);
              }
            }} placeholder="Select" classNamePrefix="react-select" components={{
              IndicatorSeparator: () => null,
              Input: NoKeyboardInput
            }} styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? "#D4A052" : "#d1d5db",
                boxShadow: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#fff",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#D4A052"
                }
              }),
              valueContainer: base => ({
                ...base,
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap"
              }),
              multiValue: base => ({
                ...base,
                backgroundColor: "#F9F7F5",
                borderRadius: "0.5rem",
                padding: "0 6px"
              }),
              multiValueLabel: base => ({
                ...base,
                color: "#111827",
                fontSize: "0.875rem"
              }),
              multiValueRemove: base => ({
                ...base,
                color: "#6b7280",
                ":hover": {
                  backgroundColor: "#D4A052",
                  color: "white"
                }
              }),
              menu: base => ({
                ...base,
                zIndex: 9999,
                borderRadius: "0.75rem"
              })
            }} />
            </div>

            {errors.partnerEducation && <p className="text-red-500 text-sm mt-1">
                {errors.partnerEducation}
              </p>}
          </div>

          {}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-1">
              Community / Caste
            </label>

            <div className="w-full">
              <Select menuPlacement="auto" menuPosition="fixed" isMulti isSearchable={false} name="partnerCommunity" options={[{
              value: "Any",
              label: "Any"
            }, ...castOptions.map(caste => ({
              value: caste,
              label: caste
            }))]} value={formData.partnerCommunity} onChange={selectedOptions => {
              if (selectedOptions?.some(opt => opt.value === "Any")) {
                handleChange("partnerCommunity", [{
                  value: "Any",
                  label: "Any"
                }]);
              } else {
                handleChange("partnerCommunity", selectedOptions || []);
              }
            }} placeholder="Select one or multiple" classNamePrefix="react-select" components={{
              IndicatorSeparator: () => null,
              Input: NoKeyboardInput
            }} styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? "#D4A052" : "#d1d5db",
                boxShadow: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#fff",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#D4A052"
                }
              }),
              valueContainer: base => ({
                ...base,
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap"
              }),
              input: base => ({
                ...base,
                margin: 0,
                padding: 0
              }),
              multiValue: base => ({
                ...base,
                backgroundColor: "#F9F7F5",
                borderRadius: "0.5rem",
                padding: "0 6px"
              }),
              multiValueLabel: base => ({
                ...base,
                color: "#111827",
                fontSize: "0.875rem"
              }),
              multiValueRemove: base => ({
                ...base,
                color: "#6b7280",
                ":hover": {
                  backgroundColor: "#D4A052",
                  color: "white"
                }
              }),
              menu: base => ({
                ...base,
                zIndex: 9999,
                borderRadius: "0.75rem"
              })
            }} />
            </div>

            {errors.partnerCommunity && <p className="text-red-500 text-sm mt-1">
                {errors.partnerCommunity}
              </p>}
          </div>

          {}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-1">
              What is your preferred diet for your partner?
            </label>

            <div className="w-full">
              <Select menuPlacement="auto" menuPosition="fixed" isMulti isSearchable={false} name="partnerDiet" options={[{
              value: "Any",
              label: "Any"
            }, {
              value: "Vegetarian",
              label: "Vegetarian"
            }, {
              value: "Non-Vegetarian",
              label: "Non-Vegetarian"
            }, {
              value: "Eggetarian",
              label: "Eggetarian"
            }, {
              value: "Jain",
              label: "Jain"
            }, {
              value: "Swaminarayan",
              label: "Swaminarayan"
            }, {
              value: "Veg & Non-Veg",
              label: "Veg & Non-veg"
            }]} value={formData.partnerDiet} onChange={selectedOptions => {
              const selectedValues = selectedOptions?.map(opt => opt.value) || [];
              if (selectedValues.includes("Any") || selectedValues.includes("No preference")) {
                handleChange("partnerDiet", [{
                  value: selectedValues.includes("Any") ? "Any" : "No preference",
                  label: selectedValues.includes("Any") ? "Any" : "No preference"
                }]);
              } else {
                handleChange("partnerDiet", selectedOptions || []);
              }
            }} placeholder="Select" classNamePrefix="react-select" components={{
              IndicatorSeparator: () => null,
              Input: NoKeyboardInput
            }} styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? "#D4A052" : "#d1d5db",
                boxShadow: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#fff",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#D4A052"
                }
              }),
              valueContainer: base => ({
                ...base,
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap"
              }),
              input: base => ({
                ...base,
                margin: 0,
                padding: 0
              }),
              multiValue: base => ({
                ...base,
                backgroundColor: "#F9F7F5",
                borderRadius: "0.5rem",
                padding: "0 6px"
              }),
              multiValueLabel: base => ({
                ...base,
                color: "#111827",
                fontSize: "0.875rem"
              }),
              multiValueRemove: base => ({
                ...base,
                color: "#6b7280",
                ":hover": {
                  backgroundColor: "#D4A052",
                  color: "white"
                }
              }),
              menu: base => ({
                ...base,
                zIndex: 9999,
                borderRadius: "0.75rem"
              })
            }} />
            </div>

            {errors.partnerDiet && <p className="text-red-500 text-sm mt-1">{errors.partnerDiet}</p>}
          </div>

          {}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-1">
              Profession / Occupation
            </label>

            <div className="w-full">
              <Select menuPlacement="auto" menuPosition="fixed" isMulti isSearchable={false} name="profession" options={professionOptions.map(profession => ({
              value: profession,
              label: profession
            }))} value={formData.profession} onChange={selectedOptions => {
              if (selectedOptions?.some(opt => opt.value === "Any")) {
                handleChange("profession", [{
                  value: "Any",
                  label: "Any"
                }]);
              } else {
                handleChange("profession", selectedOptions || []);
              }
            }} placeholder="Select one or multiple" classNamePrefix="react-select" components={{
              IndicatorSeparator: () => null,
              Input: NoKeyboardInput
            }} styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? "#D4A052" : "#d1d5db",
                boxShadow: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#fff",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#D4A052"
                }
              }),
              valueContainer: base => ({
                ...base,
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap"
              }),
              input: base => ({
                ...base,
                margin: 0,
                padding: 0
              }),
              multiValue: base => ({
                ...base,
                backgroundColor: "#F9F7F5",
                borderRadius: "0.5rem",
                padding: "0 6px"
              }),
              multiValueLabel: base => ({
                ...base,
                color: "#111827",
                fontSize: "0.875rem"
              }),
              multiValueRemove: base => ({
                ...base,
                color: "#6b7280",
                ":hover": {
                  backgroundColor: "#D4A052",
                  color: "white"
                }
              }),
              menu: base => ({
                ...base,
                zIndex: 9999,
                borderRadius: "0.75rem"
              })
            }} />
            </div>

            {errors.profession && <p className="text-red-500 text-sm mt-1">{errors.profession}</p>}
          </div>

          {}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-1">
              Legal / Marital Status
            </label>

            <div className="w-full">
              <Select menuPlacement="auto" menuPosition="fixed" isMulti isSearchable={false} name="maritalStatus" options={maritalStatuses.map(status => ({
              value: status,
              label: status
            }))} value={formData.maritalStatus} onChange={selectedOptions => {
              if (selectedOptions?.some(opt => opt.value === "Any")) {
                handleChange("maritalStatus", [{
                  value: "Any",
                  label: "Any"
                }]);
              } else {
                handleChange("maritalStatus", selectedOptions || []);
              }
            }} placeholder="Select one or multiple" classNamePrefix="react-select" components={{
              IndicatorSeparator: () => null,
              Input: NoKeyboardInput
            }} styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? "#D4A052" : "#d1d5db",
                boxShadow: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#fff",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#D4A052"
                }
              }),
              valueContainer: base => ({
                ...base,
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap"
              }),
              input: base => ({
                ...base,
                margin: 0,
                padding: 0
              }),
              multiValue: base => ({
                ...base,
                backgroundColor: "#F9F7F5",
                borderRadius: "0.5rem",
                padding: "0 6px"
              }),
              multiValueLabel: base => ({
                ...base,
                color: "#111827",
                fontSize: "0.875rem"
              }),
              multiValueRemove: base => ({
                ...base,
                color: "#6b7280",
                ":hover": {
                  backgroundColor: "#D4A052",
                  color: "white"
                }
              }),
              menu: base => ({
                ...base,
                zIndex: 9999,
                borderRadius: "0.75rem"
              })
            }} />
            </div>

            {errors.maritalStatus && <p className="text-red-500 text-sm mt-1">
                {errors.maritalStatus}
              </p>}
          </div>

          {}
          <div className="flex flex-col mb-4">
            <label className="block text-sm font-medium mb-2">
              Preferred Age
            </label>

            <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
              {}
              <CustomSelect name="preferredAgeFrom" value={formData.preferredAgeFrom} onChange={e => handleChange("preferredAgeFrom", e.target.value)} options={ageOptions.map(age => String(age))} placeholder="From" className="" usePortal={true} />

              <span className="text-sm font-medium text-center">to</span>

              {}
              <CustomSelect name="preferredAgeTo" value={formData.preferredAgeTo} onChange={e => handleChange("preferredAgeTo", e.target.value)} options={ageOptions.filter(age => !formData.preferredAgeFrom || age >= Number(formData.preferredAgeFrom)).map(age => String(age))} placeholder="To" className="" usePortal={true} />
            </div>

            {}
            {errors.preferredAgeFrom && <p className="text-red-500 text-sm mt-1">
                {errors.preferredAgeFrom}
              </p>}
            {errors.preferredAgeTo && <p className="text-red-500 text-sm mt-1">
                {errors.preferredAgeTo}
              </p>}
          </div>

          {}
          <div className="pt-6 flex justify-between items-center gap-4  ">
            <button type="button" onClick={() => onPrevious && onPrevious()} className="w-full sm:w-1/2 bg-white text-[#D4A052] border border-[#D4A052] py-3 rounded-xl font-semibold hover:bg-[#FDF8EF] transition">
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
export default ExpectationDetails;