import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { getNames, getCode } from "country-list";
import CreatableSelect from "react-select/creatable";
import CustomSelect from "../ui/CustomSelect";
import {
  getOnboardingStatus,
  getUserPersonal,
  saveUserPersonal,
  updateUserPersonal,
} from "../../api/auth";
import toast from "react-hot-toast";
import {
  nationalities,
  visaCategories,
  allCastes,
  doshOptions,
  weightOptions,
  heightOptions,
} from "@/lib/constant";

const COUNTRIES = getNames();

const COUNTRIES_WITH_CODES = COUNTRIES.map((name) => ({
  name,
  code: getCode(name),
}));

const ZODIAC_SIGNS = [
  "Aries (Mesh)",
  "Taurus (Vrishabh)",
  "Gemini (Mithun)",
  "Cancer (Kark)",
  "Leo (Singh)",
  "Virgo (Kanya)",
  "Libra (Tula)",
  "Scorpio (Vrishchik)",
  "Sagittarius (Dhanu)",
  "Capricorn (Makar)",
  "Aquarius (Kumbh)",
  "Pisces (Meen)",
];

const RELIGIONS = ["Hindu", "Jain"];

const LEGAL_STATUSES = [
  "Never Married",
  "Divorced",
  "Widowed",
  "Separated",
  "Awaiting Divorce",
];

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0")
);

const HEIGHT_SELECT_OPTIONS = heightOptions.map((h) => ({
  label: h,
  value: h,
}));
const WEIGHT_SELECT_OPTIONS = weightOptions.map((w) => ({
  label: w,
  value: w,
}));

const PersonalDetails = ({ onNext, onPrevious }) => {
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
    maritalStatus: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    pincode: "",
    city: "",
    state: "",
    maritalStatus: "",
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [isLegallySeparated, setIsLegallySeparated] = useState("");
  const [separatedSince, setSeparationYear] = useState("");
  const [manualSeparationEntry, setManualSeparationEntry] = useState(false);

  const [showDivorceFields, setShowDivorceFields] = useState(false);
  const [showChildrenFields, setShowChildrenFields] = useState(false);

  const handleHourInput = useCallback((e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) value = value.slice(0, 2);
    setFormData((prev) => ({ ...prev, birthHour: value }));

    if (value.length === 2) minuteRef.current?.focus();

    if (value !== "" && (+value < 0 || +value > 23)) {
      setErrors((prev) => ({
        ...prev,
        birthHour: "Hour must be between 00–23",
      }));
    } else {
      setErrors((prev) => ({ ...prev, birthHour: "" }));
    }
  }, []);

  const handleMinuteInput = useCallback((e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) value = value.slice(0, 2);
    setFormData((prev) => ({ ...prev, birthMinute: value }));

    if (value !== "" && (+value < 0 || +value > 59)) {
      setErrors((prev) => ({
        ...prev,
        birthMinute: "Minute must be between 00–59",
      }));
    } else {
      setErrors((prev) => ({ ...prev, birthMinute: "" }));
    }
  }, []);

  const castOptions = useMemo(() => {
    if (formData.religion === "Hindu") {
      return allCastes.filter((c) => !c.toLowerCase().includes("jain"));
    }
    if (formData.religion?.toLowerCase().includes("jain")) {
      return ["Jain - Digambar", "Jain - Shwetambar"];
    }
    return allCastes;
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
            dobDay: dateObj
              ? dateObj.getDate().toString().padStart(2, "0")
              : "",
            dobMonth: dateObj
              ? (dateObj.getMonth() + 1).toString().padStart(2, "0")
              : "",
            dobYear: dateObj ? dateObj.getFullYear().toString() : "",
            birthHour,
            birthMinute,

            height: data.height
              ? typeof data.height === "object"
                ? data.height.text || data.height.value || ""
                : String(data.height)
              : "",
            weight: data.weight
              ? typeof data.weight === "object"
                ? data.weight.text || data.weight.value || ""
                : String(data.weight)
              : "",

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
            ownHouse:
              typeof data.full_address?.isYourHome === "boolean"
                ? data.full_address.isYourHome
                  ? "Yes"
                  : "No"
                : "",

            birthCity: data.birthPlace || "",
            birthState: data.birthState || "",
            visaCategory: data.visaType || "",
            residingCountry: data.residingCountry || "",

            legalStatus: data.marriedStatus || "",
            divorceStatus: data.divorceStatus || "",

            interCommunity:
              data.marryToOtherReligion === true
                ? "Yes"
                : data.marryToOtherReligion === false
                ? "No"
                : "",

            hasChildren:
              data.isHaveChildren === true
                ? "Yes"
                : data.isHaveChildren === false
                ? "No"
                : "",
            numChildren: data.numberOfChildren
              ? String(data.numberOfChildren)
              : "",
            livingWith:
              data.isChildrenLivingWithYou === true
                ? "With Me"
                : data.isChildrenLivingWithYou === false
                ? "No"
                : "",

            residingInIndia:
              typeof data.isResidentOfIndia === "boolean"
                ? data.isResidentOfIndia
                  ? "yes"
                  : "no"
                : "",
          };

          setFormData((prev) => ({ ...prev, ...mapped }));

          const status = data.marriedStatus || "";
          setShowChildrenFields(status && status !== "Never Married");
          setShowDivorceFields(
            status === "Divorced" || status === "Awaiting Divorce"
          );

          let separated = "";

          if (data.isYouLegallySeparated === true) separated = "Yes";
          else if (data.isYouLegallySeparated === false && data.separatedSince)
            separated = "No";
          else if (data.isLegallySeparated === true) separated = "Yes";
          else if (data.isLegallySeparated === false && data.separatedSince)
            separated = "No";
          else if (data.separatedSince) separated = "Yes";

          setIsLegallySeparated(separated);
          setSeparationYear(
            data.separatedSince ? String(data.separatedSince) : ""
          );
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
      setErrors((prev) => ({ ...prev, birthState: "Please select a state" }));
    } else {
      setErrors((prev) => ({ ...prev, birthState: "" }));
    }
  };
  const handleLegalStatusChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, legalStatus: value }));
    setErrors((prev) => ({ ...prev, legalStatus: "" }));
  }, []);

  const handleSelectChange = useCallback((field, selected) => {
    setFormData((prev) => ({
      ...prev,
      [field]: selected ? selected.value : "",
    }));
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  const customSelectStyles = (error, value) => ({
    control: (base, state) => {
      let borderColor = "#d1d5db";
      if (error) borderColor = "red";
      else if (value && value.value) borderColor = "#D4A052";
      else if (state.isFocused) borderColor = "#E4C48A";

      return {
        ...base,
        minHeight: "3rem",
        borderRadius: "0.5rem",
        borderColor,
        boxShadow: "none",
        "&:hover": { borderColor },
        transition: "all 0.2s ease",
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
  });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    const capitalizeFields = [
      "birthCity",
      "birthState",
      "residingCity",
      "residingState",
      "street1",
      "street2",
      "middleName",
    ];

    let newValue = value;

    if (capitalizeFields.includes(name) && value.length > 0) {
      newValue = value
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    setErrors((prev) => {
      const updated = { ...prev };
      if (newValue.trim() !== "" && updated[name]) {
        delete updated[name];
      }
      return updated;
    });
  }, []);

  const handleLegalStatus = useCallback((e) => {
    const status = e.target.value;

    setFormData((prev) => ({
      ...prev,
      legalStatus: status,
      hasChildren: "",
      numChildren: "",
      livingWith: "",
      divorceStatus: "",
    }));

    setErrors((prev) => {
      const updated = { ...prev };
      if (status) delete updated.legalStatus;
      return updated;
    });

    setShowChildrenFields(status && status !== "Never Married");
    setShowDivorceFields(
      status === "Divorced" || status === "Awaiting Divorce"
    );

    if (status !== "Separated") {
      setIsLegallySeparated("");
      setSeparationYear("");
      setManualSeparationEntry(false);
    }
  }, []);

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

    if (!formData.interCommunity)
      newErrors.interCommunity = "Please select an option";

    if (!formData.street1) newErrors.street1 = "Street Address 1 is required";
    if (!formData.pincode) newErrors.pincode = "Pincode is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";

    if (!formData.nationality)
      newErrors.nationality = "Nationality is required";

    if (!formData.legalStatus)
      newErrors.legalStatus = "Marital status is required";

    if (showDivorceFields && !formData.divorceStatus) {
      newErrors.divorceStatus = "Divorce status is required";
    }

    if (showChildrenFields && !formData.hasChildren) {
      newErrors.hasChildren = "Please select if you have children";
    }

    if (
      showChildrenFields &&
      formData.hasChildren === "Yes" &&
      !formData.numChildren
    ) {
      newErrors.numChildren = "Number of children is required";
    }

    if (
      showChildrenFields &&
      formData.hasChildren === "Yes" &&
      !formData.livingWith
    ) {
      newErrors.livingWith = "Please select living arrangement";
    }

    if (
      formData.legalStatus === "Separated" &&
      isLegallySeparated === "Yes" &&
      !separatedSince
    ) {
      newErrors.separatedSince = "Separation year is required";
    }

    if (!formData.residingInIndia)
      newErrors.residingInIndia = "Please select an option";

    if (formData.residingInIndia === "no") {
      if (!formData.residingCountry)
        newErrors.residingCountry = "Residing country is required";
      if (!formData.visaCategory)
        newErrors.visaCategory = "Visa category is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSavePersonalDetails = async () => {
    if (!validate()) return false;

    const extractNumber = (value) => {
      if (!value) return null;
      const str = typeof value === "object" ? value.text || "" : value;
      const cmMatch = str.match(/(\d+)\s*cm/i);
      if (cmMatch) return parseInt(cmMatch[1]);
      const match = str.match(/\d+/g);
      return match ? parseInt(match[match.length - 1]) : null;
    };

    const timeOfBirth =
      formData.birthHour && formData.birthMinute
        ? `${formData.birthHour}:${formData.birthMinute}`
        : null;

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
        isYourHome: formData.ownHouse === "Yes",
      },
      marriedStatus: formData.legalStatus,
      isResidentOfIndia: formData.residingInIndia === "yes",
      residingCountry: formData.residingCountry || "India",
      visaType: formData.visaCategory || "N/A",
      divorceStatus: formData.divorceStatus,
      isHaveChildren: formData.hasChildren === "Yes",
      numberOfChildren: parseInt(formData.numChildren) || 0,
      isChildrenLivingWithYou: formData.livingWith === "With Me",
      isLegallySeparated: formData.legalStatus === "Separated",
      isYouLegallySeparated: isLegallySeparated === "Yes",
      separatedSince: separatedSince,
    };

    try {
      setLoading(true);

      const personalStep = await getOnboardingStatus();
      let res;

      const alreadyCompleted =
        Array.isArray(personalStep?.data?.data?.completedSteps) &&
        personalStep.data.data.completedSteps.includes("personal");

      if (alreadyCompleted) {
        res = await updateUserPersonal(payload);
      } else {
        res = await saveUserPersonal(payload);
      }

      const isSuccess = !!(
        res?.success ||
        res?.data?.success ||
        res?.data?.data ||
        res?.status === 200 ||
        res?.status === 201
      );

      if (!isSuccess) {
        const serverMessage =
          res?.message ||
          res?.data?.message ||
          "Failed to save personal details.";
        console.error("❌ Save returned unsuccessful response:", res);

        const fieldErrors = res?.data?.errors || res?.errors || null;
        if (fieldErrors && typeof fieldErrors === "object") {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        toast.error(`❌ ${serverMessage}`);
        return false;
      }

      toast.success(
        alreadyCompleted
          ? " Personal details updated successfully!"
          : " Personal details saved successfully!"
      );

      try {
        await getUserPersonal();
      } catch (refreshErr) {
        console.warn("Failed to refresh personal data after save:", refreshErr);
      }

      return true;
    } catch (err) {
      console.error("❌ Error saving/updating personal details:", err);

      const serverData = err?.response?.data || {};
      if (serverData?.errors && typeof serverData.errors === "object") {
        setErrors((prev) => ({ ...prev, ...serverData.errors }));
      }

      const msg =
        serverData?.message ||
        err?.message ||
        "Failed to save personal details.";
      toast.error(`❌ ${msg}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNext = async (e) => {
    e.preventDefault();
    const success = await handleSavePersonalDetails();
    if (success && onNext) onNext("family");
  };

  const handlePrevious = () => navigate("/signup");

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 border-t-4 border-[#F9F7F5] transition-transform duration-300 hover:scale-[1.02]">
        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-black">Personal Details</h2>
        </div>

        <form onSubmit={handleSaveNext} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <input
                readOnly
                value={formData.firstName}
                className="capitalize w-full p-3 rounded-md border border-[#E4C48A] bg-[#EEEAE6] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Middle Name</label>
              <input
                readOnly
                value={formData.middleName}
                className="capitalize w-full p-3 rounded-md border border-[#E4C48A] bg-[#EEEAE6] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <input
                readOnly
                value={formData.lastName}
                className="capitalize w-full p-3 rounded-md border border-[#E4C48A] bg-[#EEEAE6] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="text-sm font-medium">
              Date of Birth (DD / MM / YYYY)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
              <input
                readOnly
                value={formData.dobDay}
                className="capitalize w-full p-3 rounded-md border border-[#E4C48A] bg-[#EEEAE6] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
              />
              <input
                readOnly
                value={formData.dobMonth}
                className="capitalize w-full p-3 rounded-md border border-[#E4C48A] bg-[#EEEAE6] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
              />
              <input
                readOnly
                value={formData.dobYear}
                className="capitalize w-full p-3 rounded-md border border-[#E4C48A] bg-[#EEEAE6] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Time of Birth (HH : MM)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {/* Hour Input */}
              <input
                name="birthHour"
                value={formData.birthHour}
                onChange={handleHourInput}
                placeholder="HH"
                maxLength={2}
                className={`w-full p-3 rounded-md border ${
                  errors.birthHour ? "border-red-500" : "border-[#E4C48A]"
                } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
              {errors.birthHour && (
                <p className="text-xs text-red-500 mt-1">{errors.birthHour}</p>
              )}

              {/* Minute Input */}
              <input
                name="birthMinute"
                value={formData.birthMinute}
                onChange={handleMinuteInput}
                placeholder="MM"
                maxLength={2}
                ref={minuteRef}
                className={`w-full p-3 rounded-md border ${
                  errors.birthMinute ? "border-red-500" : "border-[#E4C48A]"
                } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
              {errors.birthMinute && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.birthMinute}
                </p>
              )}
            </div>
          </div>
          {/* Birth Place */}
          <div>
            <p className="text-sm font-medium">Birth Place</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
              {/* City Input */}
              <div>
                <label className="text-xs text-gray-600">City</label>
                <input
                  name="birthCity"
                  value={formData.birthCity}
                  onChange={handleChange}
                  placeholder="Enter birth city"
                  className={`capitalize w-full p-3 rounded-md border ${
                    errors.birthCity ? "border-red-500" : "border-[#E4C48A]"
                  } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />
                {errors.birthCity && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.birthCity}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-600">Birth State</label>
                <input
                  type="text"
                  name="birthState"
                  placeholder="Enter Birth State"
                  value={formData.birthState}
                  onChange={handleChange}
                  onBlur={validateBirthState}
                  className={`capitalize w-full p-3 rounded-md border ${
                    errors.birthState ? "border-red-500" : "border-[#E4C48A]"
                  } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />
                {errors.birthState && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.birthState}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Height */}
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Height</label>
              <CreatableSelect
                isClearable
                options={HEIGHT_SELECT_OPTIONS}
                value={
                  formData.height
                    ? { label: formData.height, value: formData.height }
                    : null
                }
                onChange={(selected, actionMeta) => {
                  handleSelectChange("height", selected);

                  if (actionMeta.action === "select-option") {
                    document.activeElement.blur();
                  }
                }}
                placeholder="Select or type height"
                className="w-full text-sm"
                classNamePrefix="react-select"
                components={{
                  IndicatorSeparator: () => null,
                }}
                styles={customSelectStyles(errors.height, formData.height)}
                menuPlacement="top"
                menuPosition="absolute"
              />
              {errors.height && (
                <p className="text-xs text-red-500 mt-1">{errors.height}</p>
              )}
            </div>

            {/* Weight */}
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Weight</label>
              <CreatableSelect
                isClearable
                options={WEIGHT_SELECT_OPTIONS}
                value={
                  formData.weight
                    ? { label: formData.weight, value: formData.weight }
                    : null
                }
                onChange={(selected, actionMeta) => {
                  handleSelectChange("weight", selected);

                  if (actionMeta.action === "select-option") {
                    document.activeElement.blur();
                  }
                }}
                placeholder="Select or type weight"
                className="w-full text-sm"
                classNamePrefix="react-select"
                components={{
                  IndicatorSeparator: () => null,
                }}
                styles={customSelectStyles(errors.weight, formData.weight)}
                menuPlacement="top"
                menuPosition="absolute"
              />
              {errors.weight && (
                <p className="text-xs text-red-500 mt-1">{errors.weight}</p>
              )}
            </div>
          </div>

          {/* Rashi, Religion, Caste, Dosh Section */}
          <div className="space-y-4">
            {/* Rashi */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Astrological Sign (Rashi)
              </label>
              <CustomSelect
                name="rashi"
                value={formData.rashi}
                onChange={handleChange}
                options={ZODIAC_SIGNS}
                placeholder="Select Rashi"
                className={errors.rashi ? "border-red-500" : ""}
              />
              {errors.rashi && (
                <p className="text-xs text-red-500 mt-1">{errors.rashi}</p>
              )}
            </div>

            {/* Dosh */}
            <div>
              <label className="block text-sm font-medium mb-1">Dosh</label>
              <CustomSelect
                name="dosh"
                value={formData.dosh}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, dosh: e.target.value }));
                  setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.dosh;
                    return updated;
                  });
                }}
                options={doshOptions}
                placeholder="Select Type of Dosh"
                className={errors.dosh ? "border-red-500" : ""}
              />
              {errors.dosh && (
                <p className="text-xs text-red-500 mt-1">{errors.dosh}</p>
              )}
            </div>

            {/* Religion */}
            <div>
              <label className="block text-sm font-medium mb-1">Religion</label>
              <CustomSelect
                name="religion"
                value={formData.religion}
                onChange={handleChange}
                options={RELIGIONS}
                placeholder="Select Religion"
                className={errors.religion ? "border-red-500" : ""}
              />
              {errors.religion && (
                <p className="text-xs text-red-500 mt-1">{errors.religion}</p>
              )}
            </div>

            {/* Caste */}
            <div>
              <label className="block text-sm font-medium mb-1">Caste</label>
              <CustomSelect
                name="caste"
                value={formData.caste}
                onChange={handleChange}
                options={castOptions.length > 0 ? castOptions : []}
                placeholder="Select Caste"
                className={errors.caste ? "border-red-500" : ""}
                disabled={castOptions.length === 0}
              />
              {errors.caste && (
                <p className="text-xs text-red-500 mt-1">{errors.caste}</p>
              )}
            </div>

            {/* Willing to marry from other community */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Willing to marry from other community?
              </label>
              <div className="flex items-center gap-6">
                {/* YES Option */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="interCommunity"
                    value="Yes"
                    checked={formData.interCommunity === "Yes"}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        interCommunity: "Yes",
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        interCommunity: "",
                      }));
                    }}
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${
            formData.interCommunity === "Yes"
              ? "bg-[#E4C48A] border-[#E4C48A]"
              : "border-gray-300"
          }
          focus:ring-1 focus:ring-[#E4C48A]`}
                  />
                  <span className="text-gray-700 text-sm">Yes</span>
                </label>
                {/* NO Option */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="interCommunity"
                    value="No"
                    checked={formData.interCommunity === "No"}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        interCommunity: "No",
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        interCommunity: "",
                      }));
                    }}
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${
            formData.interCommunity === "No"
              ? "bg-[#E4C48A] border-[#E4C48A]"
              : "border-gray-300"
          }
          focus:ring-1 focus:ring-[#E4C48A]`}
                  />
                  <span className="text-gray-700 text-sm">No</span>
                </label>
              </div>
              {errors.interCommunity && (
                <p className="text-xs text-red-500 mt-2">
                  {errors.interCommunity}
                </p>
              )}
            </div>

            {/* Full Address Section */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Full Address
              </h3>

              <div className="space-y-4">
                {/* Street Address 1 */}
                <div>
                  <label className="text-sm font-medium">
                    Street Address 1
                  </label>
                  <input
                    name="street1"
                    value={formData.street1}
                    placeholder="Enter address line 1"
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        street1: e.target.value,
                      }));

                      setErrors((prev) => {
                        const updated = { ...prev };
                        delete updated.street1;
                        return updated;
                      });
                    }}
                    className={`capitalize w-full p-3 rounded-md border ${
                      errors.street1 ? "border-red-500" : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                  />
                </div>

                {/* Street Address 2 */}
                <div>
                  <label className="text-sm font-medium">
                    Street Address 2
                  </label>
                  <input
                    name="street2"
                    value={formData.street2}
                    onChange={handleChange}
                    placeholder="Enter address line 2"
                    className={`capitalize w-full p-3 rounded-md border ${
                      errors.street2 ? "border-red-500" : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                  />
                  {errors.street1 && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.street1}
                    </p>
                  )}
                </div>

                {/* City & State (always editable) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* City */}
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className={`capitalize w-full p-3 rounded-md border ${
                        errors.city ? "border-red-500" : "border-[#E4C48A]"
                      } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                    />
                    {errors.city && (
                      <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <input
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                      className={`capitalize w-full p-3 rounded-md border ${
                        errors.state ? "border-red-500" : "border-[#E4C48A]"
                      } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                    />
                    {errors.state && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.state}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pincode */}
            <div>
              <label className="text-sm font-medium">Pincode</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="Enter pincode"
                maxLength={6}
                className={`capitalize w-full p-3 rounded-md border ${
                  errors.pincode ? "border-red-500" : "border-[#E4C48A]"
                } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />

              {(errors.pincode || errorMsg) && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.pincode || errorMsg}
                </p>
              )}
            </div>

            {/* Is this your own house? */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2 text-gray-800">
                Is this your own house?
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ownHouse"
                    value="Yes"
                    checked={formData.ownHouse === "Yes"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, ownHouse: "Yes" }))
                    }
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${
            formData.ownHouse === "Yes"
              ? "bg-[#E4C48A] border-[#E4C48A]"
              : "border-gray-300"
          }
          focus:ring-1 focus:ring-[#E4C48A]`}
                  />
                  <span className="text-gray-700 text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ownHouse"
                    value="No"
                    checked={formData.ownHouse === "No"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, ownHouse: "No" }))
                    }
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${
            formData.ownHouse === "No"
              ? "bg-[#E4C48A] border-[#E4C48A]"
              : "border-gray-300"
          }
          focus:ring-1 focus:ring-[#E4C48A]`}
                  />
                  <span className="text-gray-700 text-sm">No</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Marital Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Marital Status
              </label>
              <CustomSelect
                name="legalStatus"
                value={formData.legalStatus}
                onChange={handleLegalStatus}
                options={LEGAL_STATUSES}
                placeholder="Select Status"
                className={errors.legalStatus ? "border-red-500" : ""}
              />
              {errors.legalStatus && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.legalStatus}
                </p>
              )}
            </div>

            {/* Conditional Divorce Fields */}
            {showDivorceFields && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                <label className="block text-sm font-medium mb-1">
                  Divorce Status
                </label>
                <CustomSelect
                  name="divorceStatus"
                  value={formData.divorceStatus}
                  onChange={handleChange}
                  options={['filed', 'process', 'court', 'divorced']}
                  placeholder="Select Divorce Status"
                  className={errors.divorceStatus ? "border-red-500" : ""}
                />
              </div>
            )}

            {/* Children Fields */}
            {showChildrenFields && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                <label className="block text-sm font-medium mb-2">
                  Do you have children?
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="hasChildren"
                        value={option}
                        checked={formData.hasChildren === option}
                        onChange={handleChange}
                        className="peer hidden"
                      />
                      <span className="w-4 h-4 rounded-full border border-[#E4C48A] peer-checked:bg-[#E4C48A] peer-checked:border-[#E4C48A] transition-all"></span>
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>

                {formData.hasChildren === "Yes" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <CustomSelect
                      name="numChildren"
                      value={formData.numChildren}
                      onChange={handleChange}
                      options={[...Array(10)].map((_, i) => String(i + 1))}
                      placeholder="Number of Children"
                      className={errors.numChildren ? "border-red-500" : ""}
                    />

                    <CustomSelect
                      name="livingWith"
                      value={formData.livingWith}
                      onChange={handleChange}
                      options={['Yes', 'No']}
                      placeholder="Living with you?"
                      className={errors.livingWith ? "border-red-500" : ""}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Separated Status Fields */}
            {formData.legalStatus === "Separated" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <label className="block text-sm font-medium">
                  Are you legally separated?
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="legallySeparated"
                        value={option}
                        checked={isLegallySeparated === option}
                        onChange={() => {
                          setIsLegallySeparated(option);
                          if (option === "No") setSeparationYear("");
                        }}
                        className="peer hidden"
                      />
                      <span className="w-4 h-4 rounded-full border border-[#E4C48A] peer-checked:bg-[#E4C48A] peer-checked:border-[#E4C48A] transition-all"></span>
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>

                {/* Separation Year */}
                {isLegallySeparated === "Yes" && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium mb-2">
                      Since when are you separated?
                    </label>
                    <div className="flex gap-4 overflow-x-auto py-2">
                      {Array.from({ length: 50 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <label
                            key={year}
                            className="flex items-center gap-1 flex-shrink-0"
                          >
                            <input
                              type="radio"
                              name="separatedSince"
                              value={year}
                              checked={separatedSince === year.toString()}
                              onChange={(e) =>
                                setSeparationYear(e.target.value)
                              }
                              className="peer hidden"
                            />
                            <span className="w-4 h-4 rounded-full border border-[#E4C48A] peer-checked:bg-[#E4C48A] peer-checked:border-[#E4C48A] transition-all"></span>
                            <span className="text-sm">{year}</span>
                          </label>
                        );
                      })}
                    </div>
                    {errors.separatedSince && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.separatedSince}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Nationality
            </label>
            <CustomSelect
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              options={nationalities}
              placeholder="Select Nationality"
              className={errors.nationality ? "border-red-500" : ""}
            />
            {errors.nationality && (
              <p className="text-xs text-red-500 mt-1">{errors.nationality}</p>
            )}
          </div>

          {/* Currently Residing In (Toggle) */}
          {/* Currently Residing In (Light Gold Styled Radios) */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2 text-gray-800">
              Currently Residing in India?
            </label>

            <div className="flex items-center gap-6">
              {/* YES Option */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="residingInIndia"
                  value="yes"
                  checked={formData.residingInIndia === "yes"}
                  onChange={() => {
                    setFormData((prev) => ({
                      ...prev,
                      residingInIndia: "yes",
                      residingCountry: "India",
                      visaCategory: "",
                    }));

                    setErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.residingInIndia;
                      return updated;
                    });
                  }}
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${
            formData.residingInIndia === "yes"
              ? "bg-[#E4C48A] border-[#E4C48A]"
              : "border-gray-300"
          }
          focus:ring-1 focus:ring-[#E4C48A]`}
                />
                <span className="text-gray-700 text-sm">Yes</span>
              </label>

              {/* NO Option */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="residingInIndia"
                  value="no"
                  checked={formData.residingInIndia === "no"}
                  onChange={() => {
                    setFormData((prev) => ({
                      ...prev,
                      residingInIndia: "no",
                      residingCountry: "no",
                      visaCategory: "",
                    }));

                    setErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.residingInIndia;
                      return updated;
                    });
                  }}
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${
            formData.residingInIndia === "no"
              ? "bg-[#E4C48A] border-[#E4C48A]"
              : "border-gray-300"
          }
          focus:outline-none focus:ring-2 focus:ring-[#E4C48A] focus:ring-offset-1`}
                />
                <span className="text-gray-700 text-sm">No</span>
              </label>
            </div>

            {/* Error if user skips Yes/No */}
            {errors.residingInIndia && (
              <p className="text-red-500 text-sm mt-1">
                {errors.residingInIndia}
              </p>
            )}

            {/* If user selected "No" */}
            {formData.residingInIndia === "no" && (
              <div className="mt-4 space-y-4 transition-all duration-300">
                {/* Residing Country */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Residing In Which Country
                  </label>
                  <CustomSelect
                    name="residingCountry"
                    value={formData.residingCountry}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                    onBlur={() => {
                      if (!formData.residingCountry) {
                        setErrors({
                          ...errors,
                          residingCountry:
                            "Please select your residing country",
                        });
                      } else {
                        setErrors({ ...errors, residingCountry: "" });
                      }
                    }}
                    options={COUNTRIES.filter((c) => c !== "India")}
                    placeholder="Select Country"
                    className={`capitalize w-full p-3 rounded-md border ${
                      errors.residingCountry
                        ? "border-red-500"
                        : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                    usePortal={true}
                  />
                  {errors.residingCountry && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.residingCountry}
                    </p>
                  )}
                </div>

                {/* Visa Category */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Visa Category
                  </label>
                  <CustomSelect
                    name="visaCategory"
                    value={formData.visaCategory}
                    onChange={(e) => {
                      handleChange(e);
                      if (!e.target.value) {
                        setErrors({
                          ...errors,
                          visaCategory: "Please select a visa category",
                        });
                      } else {
                        setErrors({ ...errors, visaCategory: "" });
                      }
                    }}
                    options={visaCategories}
                    placeholder="Select Visa Category"
                    className={errors.visaCategories ? "border-red-500" : ""}
                  />
                  {errors.visaCategory && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.visaCategory}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ✅ Unified Button Section (Recommended) */}
          <div className="pt-6 flex justify-between items-center gap-4">
            {/* Previous Button */}
            <button
              type="button"
              onClick={handlePrevious}
              className="w-1/2 py-3 rounded-xl font-medium bg-[#EEEAE6] text-gray-800 hover:bg-[#E4C48A] hover:text-white transition-all duration-300 shadow-sm"
            >
              Previous
            </button>

            {/* Save & Next Button */}
            <button
              type="submit"
              className="w-1/2 py-3 rounded-xl font-medium bg-[#D4A052] text-white hover:bg-[#C18E47] transition-all duration-300 shadow-sm"
            >
              Save & Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalDetails;
