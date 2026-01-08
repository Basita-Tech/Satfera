import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getNames, getCode } from "country-list";
import CustomSelect from "../ui/CustomSelect";
import LocationSelect from "../ui/LocationSelect";
import { getOnboardingStatus, getUserPersonal, saveUserPersonal, updateUserPersonal } from "../../api/auth";
import { getCountryCode, getStateCode, getAllCountries } from "../../lib/locationUtils";
import toast from "react-hot-toast";
import { nationalities, visaCategories, allCastes, doshOptions, weightOptions, heightOptions } from "@/lib/constant";
const sortAlpha = list => [...list].sort((a, b) => a.localeCompare(b, undefined, {
  sensitivity: "base"
}));
const COUNTRIES = getAllCountries();
const ZODIAC_SIGNS = sortAlpha(["Aries (Mesh)", "Taurus (Vrishabh)", "Gemini (Mithun)", "Cancer (Kark)", "Leo (Singh)", "Virgo (Kanya)", "Libra (Tula)", "Scorpio (Vrishchik)", "Sagittarius (Dhanu)", "Capricorn (Makar)", "Aquarius (Kumbh)", "Pisces (Meen)"]);
const RELIGIONS = sortAlpha(["Hindu", "Jain"]);
const LEGAL_STATUSES = sortAlpha(["Never Married", "Divorced", "Widowed", "Separated", "Awaiting Divorce"]);
const SORTED_CASTES = sortAlpha(allCastes);
const SORTED_NATIONALITIES = sortAlpha(nationalities);
const SORTED_VISA_CATEGORIES = sortAlpha(visaCategories);
const SORTED_DOSH_OPTIONS = ["No Dosh", ...sortAlpha(doshOptions.filter(d => d !== "No Dosh"))];
const HOURS = Array.from({
  length: 24
}, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({
  length: 60
}, (_, i) => i.toString().padStart(2, "0"));
const HEIGHT_SELECT_OPTIONS = heightOptions.map(h => ({
  label: h,
  value: h
}));
const WEIGHT_SELECT_OPTIONS = weightOptions.map(w => ({
  label: w,
  value: w
}));
const PersonalDetails = ({
  onNext,
  onPrevious
}) => {
  const navigate = useNavigate();
  const minuteRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dobYear: "",
    dobMonth: "",
    dobDay: "",
    birthHour: "",
    birthMinute: "",
    height: "",
    weight: "",
    dosh: "",
    interCommunity: "",
    rashi: "",
    religion: "",
    caste: "",
    nationality: "",
    country: "",
    residingInIndia: "",
    residingCountry: "",
    visaCategory: "",
    street1: "",
    street2: "",
    pincode: "",
    city: "",
    state: "",
    ownHouse: "",
    birthCity: "",
    birthState: "",
    legalStatus: "",
    divorceStatus: "",
    hasChildren: "",
    numChildren: "",
    livingWith: "",
    separatedSince: "",
    maritalStatus: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    pincode: "",
    city: "",
    state: "",
    maritalStatus: ""
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [isLegallySeparated, setIsLegallySeparated] = useState("");
  const [separatedSince, setSeparationYear] = useState("");
  const [manualSeparationEntry, setManualSeparationEntry] = useState(false);
  const [showDivorceFields, setShowDivorceFields] = useState(false);
  const [showChildrenFields, setShowChildrenFields] = useState(false);
  const [birthCountryCode, setBirthCountryCode] = useState(null);
  const [birthStateCode, setBirthStateCode] = useState(null);
  const [residingCountryCode, setResidingCountryCode] = useState(null);
  const handleHourInput = useCallback(e => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) value = value.slice(0, 2);
    setFormData(prev => ({
      ...prev,
      birthHour: value
    }));
    if (value.length === 2) minuteRef.current?.focus();
    if (value !== "" && (+value < 0 || +value > 23)) {
      setErrors(prev => ({
        ...prev,
        birthHour: "Hour must be between 00â€“23"
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        birthHour: ""
      }));
    }
  }, []);
  const handleMinuteInput = useCallback(e => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) value = value.slice(0, 2);
    setFormData(prev => ({
      ...prev,
      birthMinute: value
    }));
    if (value !== "" && (+value < 0 || +value > 59)) {
      setErrors(prev => ({
        ...prev,
        birthMinute: "Minute must be between 00â€“59"
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        birthMinute: ""
      }));
    }
  }, []);
  const handleHourBlur = useCallback(() => {
    if (formData.birthHour === "") return;
    if (formData.birthHour.length !== 2) {
      setErrors(prev => ({
        ...prev,
        birthHour: "Hour must be two digits (00–23)"
      }));
      return;
    }
    let num = Number(formData.birthHour);
    if (Number.isNaN(num) || num < 0 || num > 23) {
      setErrors(prev => ({
        ...prev,
        birthHour: "Hour must be between 00–23"
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      birthHour: formData.birthHour
    }));
    setErrors(prev => ({
      ...prev,
      birthHour: ""
    }));
  }, [formData.birthHour]);
  const handleMinuteBlur = useCallback(() => {
    if (formData.birthMinute === "") return;
    let num = Number(formData.birthMinute);
    if (Number.isNaN(num)) {
      setFormData(prev => ({
        ...prev,
        birthMinute: ""
      }));
      setErrors(prev => ({
        ...prev,
        birthMinute: "Minute must be between 00â€“59"
      }));
      return;
    }
    num = Math.min(Math.max(num, 0), 59);
    const padded = num.toString().padStart(2, "0");
    setFormData(prev => ({
      ...prev,
      birthMinute: padded
    }));
  }, [formData.birthMinute]);
  const castOptions = useMemo(() => {
    if (formData.religion === "Hindu") {
      return SORTED_CASTES.filter(c => !c.toLowerCase().includes("jain"));
    }
    if (formData.religion?.toLowerCase().includes("jain")) {
      return ["Jain - Digambar", "Jain - Shwetambar"];
    }
    return SORTED_CASTES;
  }, [formData.religion]);
  useEffect(() => {
    const fetchPersonal = async () => {
      try {
        setLoading(true);
        const res = await getUserPersonal();
        if (res?.data) {
          const data = res.data?.data || {};
          const dateObj = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
          let birthHour = "",
            birthMinute = "";
          if (data.timeOfBirth) {
            const parts = data.timeOfBirth.split(":");
            birthHour = parts[0] || "";
            birthMinute = parts[1] || "";
          }
          const mapped = {
            firstName: data.firstName || "",
            middleName: data.middleName || "",
            lastName: data.lastName || "",
            dobDay: dateObj ? dateObj.getDate().toString().padStart(2, "0") : "",
            dobMonth: dateObj ? (dateObj.getMonth() + 1).toString().padStart(2, "0") : "",
            dobYear: dateObj ? dateObj.getFullYear().toString() : "",
            birthHour,
            birthMinute,
            height: data.height ? typeof data.height === "object" ? data.height.text || data.height.value || "" : String(data.height) : "",
            weight: data.weight ? typeof data.weight === "object" ? data.weight.text || data.weight.value || "" : String(data.weight) : "",
            rashi: data.astrologicalSign || "",
            dosh: data.dosh || "",
            religion: data.religion || "",
            caste: data.subCaste || "",
            nationality: data.nationality || "",
            street1: data.full_address?.street1 || "",
            street2: data.full_address?.street2 || "",
            pincode: data.full_address?.zipCode || "",
            city: data.full_address?.city || "",
            state: data.full_address?.state || "",
            ownHouse: typeof data.full_address?.isYourHome === "boolean" ? data.full_address.isYourHome ? "Yes" : "No" : "",
            birthCity: data.birthPlace || "",
            birthState: data.birthState || "",
            visaCategory: data.visaType || "",
            residingCountry: data.residingCountry || "",
            legalStatus: data.marriedStatus || "",
            divorceStatus: data.divorceStatus || "",
            interCommunity: data.marryToOtherReligion === true ? "Yes" : data.marryToOtherReligion === false ? "No" : "",
            hasChildren: data.isHaveChildren === true ? "Yes" : data.isHaveChildren === false ? "No" : "",
            numChildren: data.numberOfChildren ? String(data.numberOfChildren) : "",
            livingWith: data.isChildrenLivingWithYou === true ? "With Me" : data.isChildrenLivingWithYou === false ? "No" : "",
            residingInIndia: typeof data.isResidentOfIndia === "boolean" ? data.isResidentOfIndia ? "yes" : "no" : ""
          };
          setFormData(prev => ({
            ...prev,
            ...mapped
          }));
          const status = data.marriedStatus || "";
          setShowChildrenFields(status && status !== "Never Married");
          setShowDivorceFields(status === "Divorced" || status === "Awaiting Divorce");
          let separated = "";
          if (data.isYouLegallySeparated === true) separated = "Yes";else if (data.isYouLegallySeparated === false && data.separatedSince) separated = "No";else if (data.isLegallySeparated === true) separated = "Yes";else if (data.isLegallySeparated === false && data.separatedSince) separated = "No";else if (data.separatedSince) separated = "Yes";
          setIsLegallySeparated(separated);
          setSeparationYear(data.separatedSince ? String(data.separatedSince) : "");
        }
      } catch (err) {
        console.error("Failed to fetch personal details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonal();
  }, []);
  const validateBirthState = () => {
    if (!formData.birthState) {
      setErrors(prev => ({
        ...prev,
        birthState: "Please select a state"
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        birthState: ""
      }));
    }
  };
  const handleLegalStatusChange = useCallback(value => {
    setFormData(prev => ({
      ...prev,
      legalStatus: value
    }));
    setErrors(prev => ({
      ...prev,
      legalStatus: ""
    }));
  }, []);
  const handleSelectChange = useCallback((field, selected) => {
    setFormData(prev => ({
      ...prev,
      [field]: selected ? selected.value : ""
    }));
    setErrors(prev => {
      const updated = {
        ...prev
      };
      delete updated[field];
      return updated;
    });
  }, []);
  const customSelectStyles = (error, value) => ({
    control: (base, state) => {
      let borderColor = "#d1d5db";
      if (error) borderColor = "red";else if (value && value.value) borderColor = "#D4A052";else if (state.isFocused) borderColor = "#D4A052";
      return {
        ...base,
        minHeight: "3rem",
        borderRadius: "0.5rem",
        borderColor,
        boxShadow: "none",
        "&:hover": {
          borderColor
        },
        transition: "all 0.2s"
      };
    },
    valueContainer: base => ({
      ...base,
      padding: "0 0.75rem",
      height: "3rem",
      display: "flex",
      alignItems: "center"
    }),
    input: base => ({
      ...base,
      margin: 0,
      padding: 0
    }),
    indicatorsContainer: base => ({
      ...base,
      height: "3rem"
    }),
    placeholder: base => ({
      ...base,
      margin: 0
    }),
    menu: base => ({
      ...base,
      maxHeight: "280px",
      overflowY: "auto",
      zIndex: 9999
    }),
    menuList: base => ({
      ...base,
      maxHeight: "280px",
      overflowY: "auto",
      paddingTop: 0,
      paddingBottom: 0
    }),
    menuPortal: base => ({
      ...base,
      zIndex: 9999
    })
  });
  const handleChange = useCallback(e => {
    const {
      name,
      value
    } = e.target;
    const capitalizeEveryWordFields = ["birthCity", "birthState", "residingCity", "residingState", "middleName", "city", "state", "residingCountry"];
    const capitalizeFirstLetterOnlyFields = ["street1", "street2"];
    let newValue = value;
    
    if (name === "pincode") {
      newValue = value.replace(/\D/g, "").slice(0, 6);
    } else if (capitalizeEveryWordFields.includes(name) && value.length > 0) {
      newValue = value.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    } else if (capitalizeFirstLetterOnlyFields.includes(name) && value.length > 0) {
      newValue = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    setErrors(prev => {
      const updated = {
        ...prev
      };
      if (newValue.trim() !== "" && updated[name]) {
        delete updated[name];
      }
      return updated;
    });
  }, []);
  const handleLegalStatus = useCallback(e => {
    const status = e.target.value;
    setFormData(prev => ({
      ...prev,
      legalStatus: status,
      hasChildren: "",
      numChildren: "",
      livingWith: "",
      divorceStatus: ""
    }));
    setErrors(prev => {
      const updated = {
        ...prev
      };
      if (status) delete updated.legalStatus;
      return updated;
    });
    setShowChildrenFields(status && status !== "Never Married");
    setShowDivorceFields(status === "Divorced" || status === "Awaiting Divorce");
    if (status !== "Separated") {
      setIsLegallySeparated("");
      setSeparationYear("");
      setManualSeparationEntry(false);
    }
  }, []);
  const inputClass = "w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-1 transition";
  const getInputClass = field => `${inputClass} ${errors[field] ? "border-red-500 focus:ring-red-300 focus:border-red-500" : "border-[#D4A052] focus:ring-[#D4A052] focus:border-[#D4A052]"}`;
  const validate = () => {
    const newErrors = {};
    if (!formData.birthCity) newErrors.birthCity = "Birth city is required";
    if (!formData.birthState) newErrors.birthState = "Birth state is required";
    if (!formData.height) newErrors.height = "Height is required";
    if (!formData.weight) newErrors.weight = "Weight is required";
    if (!formData.rashi) newErrors.rashi = "Rashi is required";
    if (!formData.dosh) newErrors.dosh = "Dosh is required";
    if (!formData.religion) newErrors.religion = "Religion is required";
    if (!formData.caste) newErrors.caste = "Caste is required";
    if (!formData.interCommunity) newErrors.interCommunity = "Please select an option";
    if (!formData.street1) newErrors.street1 = "Street Address 1 is required";
    if (!formData.pincode) {
      newErrors.pincode = "Pincode is required";
    } else if (formData.pincode.length !== 6) {
      newErrors.pincode = "Pincode must be exactly 6 digits";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must contain only numbers";
    }
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.nationality) newErrors.nationality = "Nationality is required";
    if (!formData.legalStatus) newErrors.legalStatus = "Marital status is required";
    if (showDivorceFields && !formData.divorceStatus) {
      newErrors.divorceStatus = "Divorce status is required";
    }
    if (showChildrenFields && !formData.hasChildren) {
      newErrors.hasChildren = "Please select if you have children";
    }
    if (showChildrenFields && formData.hasChildren === "Yes" && !formData.numChildren) {
      newErrors.numChildren = "Number of children is required";
    }
    if (showChildrenFields && formData.hasChildren === "Yes" && !formData.livingWith) {
      newErrors.livingWith = "Please select living arrangement";
    }
    if (formData.legalStatus === "Separated" && isLegallySeparated === "Yes" && !separatedSince) {
      newErrors.separatedSince = "Separation year is required";
    }
    if (!formData.residingInIndia) newErrors.residingInIndia = "Please select an option";
    if (formData.residingInIndia === "no") {
      if (!formData.residingCountry) newErrors.residingCountry = "Residing country is required";
      if (!formData.visaCategory) newErrors.visaCategory = "Visa category is required";
    }
    const hour = formData.birthHour?.toString() || "";
    const minute = formData.birthMinute?.toString() || "";
    const anyTimeEntered = hour !== "" || minute !== "";
    if (anyTimeEntered) {
      if (!hour || hour.length !== 2) {
        newErrors.birthHour = newErrors.birthHour || "Hour (HH) is required";
      } else if (+hour < 0 || +hour > 23) {
        newErrors.birthHour = "Hour must be between 00â€“23";
      }
      if (!minute || minute.length !== 2) {
        newErrors.birthMinute = newErrors.birthMinute || "Minute (MM) is required";
      } else if (+minute < 0 || +minute > 59) {
        newErrors.birthMinute = "Minute must be between 00â€“59";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSavePersonalDetails = async () => {
    if (!validate()) return false;
    const extractNumber = value => {
      if (!value) return null;
      const str = typeof value === "object" ? value.text || "" : value;
      const cmMatch = str.match(/(\d+)\s*cm/i);
      if (cmMatch) return parseInt(cmMatch[1]);
      const match = str.match(/\d+/g);
      return match ? parseInt(match[match.length - 1]) : null;
    };
    const timeOfBirth = formData.birthHour && formData.birthMinute ? `${formData.birthHour}:${formData.birthMinute}` : "";
    const payload = {
      timeOfBirth: timeOfBirth,
      birthPlace: formData.birthCity,
      birthState: formData.birthState,
      height: formData.height || null,
      weight: formData.weight || null,
      astrologicalSign: formData.rashi,
      dosh: formData.dosh,
      religion: formData.religion,
      subCaste: formData.caste,
      marryToOtherReligion: formData.interCommunity === "Yes",
      nationality: formData.nationality,
      full_address: {
        street1: formData.street1,
        street2: formData.street2,
        city: formData.city,
        state: formData.state,
        zipCode: formData.pincode,
        isYourHome: formData.ownHouse === "Yes"
      },
      marriedStatus: formData.legalStatus,
      isResidentOfIndia: formData.residingInIndia === "yes",
      residingCountry: formData.residingCountry || "India",
      visaType: formData.visaCategory || "N/A"
    };
    if (formData.legalStatus !== "Never Married") {
      payload.divorceStatus = formData.divorceStatus || null;
      payload.isHaveChildren = formData.hasChildren === "Yes";
      payload.numberOfChildren = parseInt(formData.numChildren) || 0;
      payload.isChildrenLivingWithYou = formData.livingWith === "With Me";
    }
    if (formData.legalStatus === "Separated") {
      payload.isLegallySeparated = formData.legalStatus === "Separated";
      payload.isYouLegallySeparated = isLegallySeparated === "Yes";
      payload.separatedSince = separatedSince || null;
    }
    try {
      setLoading(true);
      const personalStep = await getOnboardingStatus();
      let res;
      const alreadyCompleted = Array.isArray(personalStep?.data?.data?.completedSteps) && personalStep.data.data.completedSteps.includes("personal");
      if (alreadyCompleted) {
        res = await updateUserPersonal(payload);
      } else {
        res = await saveUserPersonal(payload);
      }
      const isSuccess = !!(res?.success || res?.data?.success || res?.data?.data || res?.status === 200 || res?.status === 201);
      if (!isSuccess) {
        const serverMessage = res?.message || res?.data?.message || "Failed to save personal details.";
        console.error("âŒ Save returned unsuccessful response:", res);
        const fieldErrors = res?.data?.errors || res?.errors || null;
        if (fieldErrors && typeof fieldErrors === "object") {
          setErrors(prev => ({
            ...prev,
            ...fieldErrors
          }));
        }
        toast.error(`âŒ ${serverMessage}`);
        return false;
      }
      toast.success(alreadyCompleted ? " Personal details updated successfully!" : " Personal details saved successfully!");
      try {
        await getUserPersonal();
      } catch (refreshErr) {
        console.warn("Failed to refresh personal data after save:", refreshErr);
      }
      return true;
    } catch (err) {
      console.error("âŒ Error saving/updating personal details:", err);
      const serverData = err?.response?.data || {};
      if (serverData?.errors && typeof serverData.errors === "object") {
        setErrors(prev => ({
          ...prev,
          ...serverData.errors
        }));
      }
      const msg = serverData?.message || err?.message || "Failed to save personal details.";
      toast.error(`Error: ${msg}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  const handleSaveNext = async e => {
    e.preventDefault();
    const valid = validate();
    if (!valid) {
      toast.error("Please fill all required fields.");
      return;
    }
    const success = await handleSavePersonalDetails();
    if (success && onNext) onNext("family");
  };
  const handlePrevious = () => navigate("/signup");
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>;
  return <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-4 border-[#F9F7F5] transition-transform duration-300 hover:scale-[1.02]">
        {}
        <h2 className="text-2xl font-bold text-[#1f1e1d] text-center mb-8">
          Personal Details
        </h2>

        <form onSubmit={handleSaveNext} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">First Name <RequiredMark /></label>
              <input readOnly value={formData.firstName} className="capitalize w-full p-3 rounded-md border border-[#D4A052] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A052] focus:border-[#D4A052] transition" style={{
              backgroundColor: '#EEEAE6'
            }} />
            </div>
            <div>
              <label className="text-sm font-medium">Middle Name</label>
              <input readOnly value={formData.middleName} className="capitalize w-full p-3 rounded-md border border-[#D4A052] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A052] focus:border-[#D4A052] transition" style={{
              backgroundColor: '#EEEAE6'
            }} />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name <RequiredMark /></label>
              <input readOnly value={formData.lastName} className="capitalize w-full p-3 rounded-md border border-[#D4A052] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A052] focus:border-[#D4A052] transition" style={{
              backgroundColor: '#EEEAE6'
            }} />
            </div>
          </div>

          {}
          <div>
            <label className="text-sm font-medium">
              Date of Birth (DD / MM / YYYY) <RequiredMark />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
              <input readOnly value={formData.dobDay} className="capitalize w-full p-3 rounded-md border border-[#D4A052] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A052] focus:border-[#D4A052] transition" style={{
              backgroundColor: '#EEEAE6'
            }} />
              <input readOnly value={formData.dobMonth} className="capitalize w-full p-3 rounded-md border border-[#D4A052] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A052] focus:border-[#D4A052] transition" style={{
              backgroundColor: '#EEEAE6'
            }} />
              <input readOnly value={formData.dobYear} className="capitalize w-full p-3 rounded-md border border-[#D4A052] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A052] focus:border-[#D4A052] transition" style={{
              backgroundColor: '#EEEAE6'
            }} />
            </div>
          </div>

          <div>
              <label className="text-sm font-medium">
                Time of Birth (24-hour, HH : MM)
              </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {}
              <input type="text" name="birthHour" value={formData.birthHour} onChange={handleHourInput} onBlur={handleHourBlur} placeholder="HH (00-23)" maxLength={2} className={getInputClass("birthHour")} />

              {}
              <input type="text" name="birthMinute" value={formData.birthMinute} onChange={handleMinuteInput} onBlur={handleMinuteBlur} placeholder="MM (00-59)" maxLength={2} ref={minuteRef} className={getInputClass("birthMinute")} />
            </div>
            
            {}
            <div className="space-y-1 mt-2">
              {errors.birthHour && <p className="text-red-500 text-sm">{errors.birthHour}</p>}
              {errors.birthMinute && <p className="text-red-500 text-sm">{errors.birthMinute}</p>}
            </div>
          </div>
          {}
          <div>
            <label className="block text-sm font-medium mb-1">Birth Place <RequiredMark /></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Birth State <RequiredMark />
                </label>
                <LocationSelect type="state" name="birthState" value={formData.birthState} onChange={e => {
                handleChange(e);
                setFormData(prev => ({
                  ...prev,
                  birthCity: ""
                }));
                const code = e.target.code || getStateCode("IN", e.target.value);
                setBirthStateCode(code);
              }} countryCode="IN" placeholder="Select state" className={getInputClass("birthState")} />
                {errors.birthState && <p className="text-red-500 text-sm mt-1">
                    {errors.birthState}
                  </p>}
              </div>

              {}
              <div>
                <label className=" block text-sm font-medium mb-1">City <RequiredMark /></label>
                <LocationSelect type="city" name="birthCity" value={formData.birthCity} onChange={e => {
                handleChange(e);
              }} countryCode="IN" stateCode={birthStateCode} placeholder="Select city" className={getInputClass("birthCity")} />
                {errors.birthCity && <p className="text-red-500 text-sm mt-1">
                    {errors.birthCity}
                  </p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {}
            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-1">Height <RequiredMark /></label>
              <CustomSelect
                name="height"
                value={formData.height}
                onChange={handleChange}
                options={heightOptions}
                placeholder="Select height"
                forcesMobileUI={true}
                className={getInputClass("height")}
              />
              {errors.height && <p className="text-red-500 text-sm mt-1">{errors.height}</p>}
            </div>

            {}
            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-1">Weight <RequiredMark /></label>
              <CustomSelect
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                options={weightOptions}
                placeholder="Select weight"
                forcesMobileUI={true}
                className={getInputClass("weight")}
              />
              {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
            </div>
          </div>

          {}
          <div className="space-y-6">
            {}
            <div>
              <label className="block text-sm font-medium mb-1">
                Astrological Sign (Rashi) <RequiredMark />
              </label>
              <CustomSelect name="rashi" value={formData.rashi} onChange={handleChange} options={ZODIAC_SIGNS} placeholder="Select Rashi" className={getInputClass("rashi")} />
              {errors.rashi && <p className="text-red-500 text-sm mt-1">{errors.rashi}</p>}
            </div>

            {}
            <div>
              <label className="block text-sm font-medium mb-1">Dosh <RequiredMark /></label>
              <CustomSelect name="dosh" value={formData.dosh} onChange={e => {
              setFormData(prev => ({
                ...prev,
                dosh: e.target.value
              }));
              setErrors(prev => {
                const updated = {
                  ...prev
                };
                delete updated.dosh;
                return updated;
              });
            }} options={SORTED_DOSH_OPTIONS} placeholder="Select Type of Dosh" className={getInputClass("dosh")} />
              {errors.dosh && <p className="text-red-500 text-sm mt-1">{errors.dosh}</p>}
            </div>

            {}
            <div>
              <label className="block text-sm font-medium mb-1">Religion <RequiredMark /></label>
              <CustomSelect name="religion" value={formData.religion} onChange={e => {
              handleChange(e);
              setFormData(prev => ({
                ...prev,
                caste: ""
              }));
            }} options={RELIGIONS} placeholder="Select Religion" className={getInputClass("religion")} />
              {errors.religion && <p className="text-red-500 text-sm mt-1">{errors.religion}</p>}
            </div>

            {}
            <div>
              <label className="block text-sm font-medium mb-1">Caste <RequiredMark /></label>
              <CustomSelect name="caste" value={formData.caste} onChange={handleChange} options={castOptions.length > 0 ? castOptions : []} placeholder="Select Caste" className={getInputClass("caste")} disabled={castOptions.length === 0} />
              {errors.caste && <p className="text-red-500 text-sm mt-1">{errors.caste}</p>}
            </div>

            {}
            <div>
              <label className="block text-sm font-medium mb-2">
                Willing to marry from other community?
              </label>
              <div className="flex items-center gap-6">
                {}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="interCommunity" value="Yes" checked={formData.interCommunity === "Yes"} onChange={() => {
                  setFormData(prev => ({
                    ...prev,
                    interCommunity: "Yes"
                  }));
                  setErrors(prev => ({
                    ...prev,
                    interCommunity: ""
                  }));
                }} className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.interCommunity === "Yes" ? "bg-[#D4A052] border-[#D4A052]" : "border-gray-300"}
          focus:ring-1 focus:ring-[#D4A052]`} />
                  <span className="text-gray-700 text-sm">Yes</span>
                </label>
                {}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="interCommunity" value="No" checked={formData.interCommunity === "No"} onChange={() => {
                  setFormData(prev => ({
                    ...prev,
                    interCommunity: "No"
                  }));
                  setErrors(prev => ({
                    ...prev,
                    interCommunity: ""
                  }));
                }} className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.interCommunity === "No" ? "bg-[#D4A052] border-[#D4A052]" : "border-gray-300"}
          focus:ring-1 focus:ring-[#D4A052]`} />
                  <span className="text-gray-700 text-sm">No</span>
                </label>
              </div>
              {errors.interCommunity && <p className="text-red-500 text-sm mt-2">
                  {errors.interCommunity}
                </p>}
            </div>

            {}
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Address
              </label>

              <div className="space-y-4">
                {}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Street Address 1 <RequiredMark />
                  </label>
                  <input name="street1" value={formData.street1} placeholder="Enter address line 1" onChange={handleChange} className={getInputClass("street1")} />
                  {errors.street1 && <p className="text-red-500 text-sm mt-1">
                      {errors.street1}
                    </p>}
                </div>

                {}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Street Address 2
                  </label>
                  <input name="street2" value={formData.street2} onChange={handleChange} placeholder="Enter address line 2" className={getInputClass("street2")} />
                  {errors.street2 && <p className="text-red-500 text-sm mt-1">
                      {errors.street2}
                    </p>}
                </div>

                {}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {}
                  <div>
                    <label className="block text-sm font-medium mb-1">State <RequiredMark /></label>
                    <LocationSelect type="state" name="state" value={formData.state} onChange={e => {
                    handleChange(e);
                    setFormData(prev => ({
                      ...prev,
                      city: ""
                    }));
                  }} countryCode="IN" placeholder="Select state" className={getInputClass("state")} />
                    {errors.state && <p className="text-red-500 text-sm mt-1">
                        {errors.state}
                      </p>}
                  </div>

                  {}
                  <div>
                    <label className="block text-sm font-medium mb-1">City <RequiredMark /></label>
                    <LocationSelect type="city" name="city" value={formData.city} onChange={handleChange} countryCode="IN" stateCode={getStateCode("IN", formData.state) || ""} placeholder="Select city" className={getInputClass("city")} />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                </div>
              </div>
            </div>

            {}
            <div>
              <label className="block text-sm font-medium mb-1">Pincode <RequiredMark /></label>
              <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Enter pincode" maxLength={6} className={getInputClass("pincode")} />

              {(errors.pincode || errorMsg) && <p className="text-red-500 text-sm mt-1">
                  {errors.pincode || errorMsg}
                </p>}
            </div>

            {}
            <div>
              <label className="block text-sm font-medium mb-2">
                Is this your own house? <RequiredMark />
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ownHouse" value="Yes" checked={formData.ownHouse === "Yes"} onChange={() => setFormData(prev => ({
                  ...prev,
                  ownHouse: "Yes"
                }))} className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.ownHouse === "Yes" ? "bg-[#D4A052] border-[#D4A052]" : "border-gray-300"}
          focus:ring-1 focus:ring-[#D4A052]`} />
                  <span className="text-gray-700 text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ownHouse" value="No" checked={formData.ownHouse === "No"} onChange={() => setFormData(prev => ({
                  ...prev,
                  ownHouse: "No"
                }))} className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.ownHouse === "No" ? "bg-[#D4A052] border-[#D4A052]" : "border-gray-300"}
          focus:ring-1 focus:ring-[#D4A052]`} />
                  <span className="text-gray-700 text-sm">No</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {}
            <div>
              <label className="block text-sm font-medium mb-1">
                Marital Status <RequiredMark />
              </label>
              <CustomSelect name="legalStatus" value={formData.legalStatus} onChange={handleLegalStatus} options={LEGAL_STATUSES} placeholder="Select Status" className={getInputClass("legalStatus")} />
              {errors.legalStatus && <p className="text-red-500 text-sm mt-1">
                  {errors.legalStatus}
                </p>}
            </div>

            {}
            {showDivorceFields && <div className="bg-[#FFF7E6] border border-[#D4A052] rounded-lg p-4">
                <label className="block text-sm font-medium mb-1 text-black">
                  Divorce Status
                </label>
                <CustomSelect name="divorceStatus" value={formData.divorceStatus} onChange={handleChange} options={['filed', 'process', 'court', 'divorced']} placeholder="Select Divorce Status" className={errors.divorceStatus ? "border-red-500" : ""} />
              </div>}

            {}
            {showChildrenFields && <div className="bg-[#FFF7E6] border border-[#D4A052] rounded-lg p-4">
                <label className="block text-sm font-medium mb-2 text-black">
                  Do you have children?
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map(option => <label key={option} className="flex items-center gap-2">
                      <input type="radio" name="hasChildren" value={option} checked={formData.hasChildren === option} onChange={handleChange} className="peer hidden" />
                      <span className="w-4 h-4 rounded-full border border-[#D4A052] peer-checked:bg-[#D4A052] peer-checked:border-[#D4A052] transition-all"></span>
                      <span className="text-sm">{option}</span>
                    </label>)}
                </div>

                {formData.hasChildren === "Yes" && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <CustomSelect name="numChildren" value={formData.numChildren} onChange={handleChange} options={[...Array(10)].map((_, i) => String(i + 1))} placeholder="Number of Children" className={errors.numChildren ? "border-red-500" : ""} />

                    <CustomSelect name="livingWith" value={formData.livingWith} onChange={handleChange} options={['Yes', 'No']} placeholder="Living with you?" className={errors.livingWith ? "border-red-500" : ""} />
                  </div>}
              </div>}

            {}
            {formData.legalStatus === "Separated" && <div className="bg-[#FFF7E6] border border-[#D4A052] rounded-lg p-4 space-y-3">
                <label className="block text-sm font-medium text-black">
                  Are you legally separated?
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map(option => <label key={option} className="flex items-center gap-2">
                      <input type="radio" name="legallySeparated" value={option} checked={isLegallySeparated === option} onChange={() => {
                  setIsLegallySeparated(option);
                  if (option === "No") setSeparationYear("");
                }} className="peer hidden" />
                      <span className="w-4 h-4 rounded-full border border-[#D4A052] peer-checked:bg-[#D4A052] peer-checked:border-[#D4A052] transition-all"></span>
                      <span className="text-sm">{option}</span>
                    </label>)}
                </div>

                {}
                {isLegallySeparated === "Yes" && <div className="mt-2">
                    <label className="block text-sm font-medium mb-2 text-black">
                      Since when are you separated?
                    </label>
                    <div className="flex gap-4 overflow-x-auto py-2">
                      {Array.from({
                  length: 50
                }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <label key={year} className="flex items-center gap-1 flex-shrink-0">
                            <input type="radio" name="separatedSince" value={year} checked={separatedSince === year.toString()} onChange={e => setSeparationYear(e.target.value)} className="peer hidden" />
                            <span className="w-4 h-4 rounded-full border border-[#D4A052] peer-checked:bg-[#D4A052] peer-checked:border-[#D4A052] transition-all"></span>
                            <span className="text-sm">{year}</span>
                          </label>;
                })}
                    </div>
                    {errors.separatedSince && <p className="text-xs text-red-500 mt-1">
                        {errors.separatedSince}
                      </p>}
                  </div>}
              </div>}
          </div>

          {}
          <div>
            <label className="block text-sm font-medium mb-1">
              Nationality <RequiredMark />
            </label>
            <CustomSelect name="nationality" value={formData.nationality} onChange={handleChange} options={SORTED_NATIONALITIES} placeholder="Select Nationality" className={getInputClass("nationality")} />
            {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality}</p>}
          </div>

          {}
          <div>
            <label className="block text-sm font-medium mb-2">
              Currently Residing in India? <RequiredMark />
            </label>

            <div className="flex items-center gap-6">
              {}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="residingInIndia" value="yes" checked={formData.residingInIndia === "yes"} onChange={() => {
                setFormData(prev => ({
                  ...prev,
                  residingInIndia: "yes",
                  residingCountry: "India",
                  visaCategory: ""
                }));
                setErrors(prev => {
                  const updated = {
                    ...prev
                  };
                  delete updated.residingInIndia;
                  return updated;
                });
              }} className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.residingInIndia === "yes" ? "bg-[#D4A052] border-[#D4A052]" : "border-gray-300"}
          focus:ring-1 focus:ring-[#D4A052]`} />
                <span className="text-gray-700 text-sm">Yes</span>
              </label>

              {}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="residingInIndia" value="no" checked={formData.residingInIndia === "no"} onChange={() => {
                setFormData(prev => ({
                  ...prev,
                  residingInIndia: "no",
                  residingCountry: "",
                  visaCategory: ""
                }));
                setErrors(prev => {
                  const updated = {
                    ...prev
                  };
                  delete updated.residingInIndia;
                  return updated;
                });
              }} className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.residingInIndia === "no" ? "bg-[#D4A052] border-[#D4A052]" : "border-gray-300"}
          focus:outline-none focus:ring-2 focus:ring-[#D4A052] focus:ring-offset-1`} />
                <span className="text-gray-700 text-sm">No</span>
              </label>
            </div>

            {}
            {errors.residingInIndia && <p className="text-red-500 text-sm mt-1">
                {errors.residingInIndia}
              </p>}

            {}
            {formData.residingInIndia === "no" && <div className="mt-4 space-y-4 transition-all duration-300">
                {}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Residing In Which Country
                  </label>
                  <LocationSelect type="country" name="residingCountry" value={formData.residingCountry} onChange={e => {
                handleChange(e);
                const code = getCountryCode(e.target.value);
                setResidingCountryCode(code);
              }} placeholder="Select Country" className={`w-full ${errors.residingCountry ? "border-red-500" : ""}`} />
                  {errors.residingCountry && <p className="text-red-500 text-sm mt-1">
                      {errors.residingCountry}
                    </p>}
                </div>

                {}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Visa Category
                  </label>
                  <CustomSelect name="visaCategory" value={formData.visaCategory} onChange={e => {
                handleChange(e);
                if (!e.target.value) {
                  setErrors({
                    ...errors,
                    visaCategory: "Please select a visa category"
                  });
                } else {
                  setErrors({
                    ...errors,
                    visaCategory: ""
                  });
                }
              }} options={SORTED_VISA_CATEGORIES} placeholder="Select Visa Category" className={`capitalize ${errors.visaCategory ? "border-red-500" : ""}`} />
                  {errors.visaCategory && <p className="text-red-500 text-sm mt-1">
                      {errors.visaCategory}
                    </p>}
                </div>
              </div>}
          </div>

          {}
          <div className="pt-6 flex justify-between items-center gap-4">
            <button type="button" onClick={handlePrevious} className="w-full sm:w-1/2 bg-white text-[#D4A052] border border-[#D4A052] py-3 rounded-xl font-semibold hover:bg-[#FDF8EF] transition">
              Previous
            </button>

            <button type="submit" className="w-full sm:w-1/2 bg-[#D4A052] text-white py-3 rounded-xl font-semibold hover:bg-[#D4A052] transition">
              Save & Next
            </button>
          </div>
        </form>
      </div>
    </div>;
};
export default PersonalDetails;