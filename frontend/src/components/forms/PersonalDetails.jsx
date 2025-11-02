import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNames, getCode } from "country-list";
import CreatableSelect from "react-select/creatable";
import { getOnboardingStatus, getUserPersonal, saveUserPersonal, updateUserPersonal } from "../../api/auth";
// import "./PersonalDetails.css";

const PersonalDetails = ({ onNext, onPrevious }) => {
  const navigate = useNavigate();
  // Inside your component
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
    interCommunity: "", // keep only one
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

  const [dosh, setDosh] = useState("");
  const [castOptions, setCastOptions] = useState([]);
  const [manualEntry, setManualEntry] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [isLegallySeparated, setIsLegallySeparated] = useState("");
  const [separatedSince, setSeparationYear] = useState("");
  const [manualSeparationEntry, setManualSeparationEntry] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");

  const [showDivorceFields, setShowDivorceFields] = useState(false);
  const [showChildrenFields, setShowChildrenFields] = useState(false);


  useEffect(() => {
    let filtered = [];

    if (formData.religion === "Hindu") {
      filtered = allCastes.filter((c) => !c.toLowerCase().includes("jain"));
    } else if (
      formData.religion?.toLowerCase().includes("jain")
    ) {
      // Show only two fixed options when any Jain religion is selected
      filtered = ["Jain - Digambar", "Jain - Shwetambar"];
    } else {
      filtered = allCastes;
    }

    setCastOptions(filtered);
  }, [formData.religion]);


  useEffect(() => {
    const fetchPersonal = async () => {
      try {
        setLoading(true);
        const res = await getUserPersonal();
        if (res?.data) {
          const data = res.data?.data || {};

          const dateObj = data.dateOfBirth ? new Date(data.dateOfBirth) : null;

          // Parse time
          let birthHour = "", birthMinute = "";
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
            // Normalize incoming height/weight whether the API returns an object or a string
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
            birthCity: data.birthPlace || "",
            birthState: data.birthState || "",
            visaCategory: data.visaType || "",
            residingCountry: data.residingCountry || "",
            legalStatus: data.marriedStatus || "",
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
            divorceStatus: data.divorceStatus
          };

          setFormData((prev) => ({ ...prev, ...mapped }));

          // Show/hide sections based on loaded data
          setShowDivorceFields(!!data.divorceStatus);
          setShowChildrenFields(data.isHaveChildren === true);

          // Set separation-related states so the UI displays correctly
          // Prefer explicit `isYouLegallySeparated` returned by API, fallback to older `isLegallySeparated` or presence of separatedSince
          const apiYouSeparated =
            data.isYouLegallySeparated !== undefined
              ? data.isYouLegallySeparated
              : data.isLegallySeparated !== undefined
                ? data.isLegallySeparated
                : !!data.separatedSince;

          setIsLegallySeparated(apiYouSeparated === true ? "Yes" : apiYouSeparated === false ? "No" : "");
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


  const pincodeMapping = {
    110001: { city: "New Delhi", state: "Delhi" },
    400001: { city: "Mumbai", state: "Maharashtra" },
    560001: { city: "Bengaluru", state: "Karnataka" },
    700001: { city: "Kolkata", state: "West Bengal" },
    600001: { city: "Chennai", state: "Tamil Nadu" },
  };



  // Get all country names
  const countries = getNames(); // ["Afghanistan", "Albania", "Algeria", ...]

  // Or get an array of objects with name + code
  const countriesWithCodes = getNames().map((name) => ({
    name,
    code: getCode(name),
  }));

  const zodiacSigns = [
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
  const validateBirthState = () => {
    if (!formData.birthState) {
      setErrors((prev) => ({ ...prev, birthState: "Please select a state" }));
    } else {
      setErrors((prev) => ({ ...prev, birthState: "" }));
    }
  };
  const handleLegalStatusChange = (value) => {
    setFormData({
      ...formData,
      legalStatus: value,
    });
    setErrors({ ...errors, legalStatus: "" }); // clear red error
  };

  const religions = [
    "Hindu",
    "Jain"


  ];

  const nationalities = [
    "Afghan",
    "Albanian",
    "Algerian",
    "American",
    "Andorran",
    "Angolan",
    "Anguillan",
    "Citizen of Antigua and Barbuda",
    "Argentine",
    "Armenian",
    "Australian",
    "Austrian",
    "Azerbaijani",
    "Bahamian",
    "Bahraini",
    "Bangladeshi",
    "Barbadian",
    "Belarusian",
    "Belgian",
    "Belizean",
    "Beninese",
    "Bermudian",
    "Bhutanese",
    "Bolivian",
    "Citizen of Bosnia and Herzegovina",
    "Botswanan",
    "Brazilian",
    "British",
    "British Virgin Islander",
    "Bruneian",
    "Bulgarian",
    "Burkinan",
    "Burmese",
    "Burundian",
    "Cambodian",
    "Cameroonian",
    "Canadian",
    "Cape Verdean",
    "Cayman Islander",
    "Central African",
    "Chadian",
    "Chilean",
    "Chinese",
    "Colombian",
    "Comoran",
    "Congolese (Congo)",
    "Congolese (DRC)",
    "Cook Islander",
    "Costa Rican",
    "Croatian",
    "Cuban",
    "Cymraes",
    "Cymro",
    "Cypriot",
    "Czech",
    "Danish",
    "Djiboutian",
    "Dominican",
    "Citizen of the Dominican Republic",
    "Dutch",
    "East Timorese",
    "Ecuadorean",
    "Egyptian",
    "Emirati",
    "English",
    "Equatorial Guinean",
    "Eritrean",
    "Estonian",
    "Ethiopian",
    "Faroese",
    "Fijian",
    "Filipino",
    "Finnish",
    "French",
    "Gabonese",
    "Gambian",
    "Georgian",
    "German",
    "Ghanaian",
    "Gibraltarian",
    "Greek",
    "Greenlandic",
    "Grenadian",
    "Guamanian",
    "Guatemalan",
    "Citizen of Guinea-Bissau",
    "Guinean",
    "Guyanese",
    "Haitian",
    "Honduran",
    "Hong Konger",
    "Hungarian",
    "Icelandic",
    "Indian",
    "Indonesian",
    "Iranian",
    "Iraqi",
    "Irish",
    "Israeli",
    "Italian",
    "Ivorian",
    "Jamaican",
    "Japanese",
    "Jordanian",
    "Kazakh",
    "Kenyan",
    "Kittitian",
    "Citizen of Kiribati",
    "Kosovan",
    "Kuwaiti",
    "Kyrgyz",
    "Lao",
    "Latvian",
    "Lebanese",
    "Liberian",
    "Libyan",
    "Liechtenstein citizen",
    "Lithuanian",
    "Luxembourger",
    "Macanese",
    "Macedonian",
    "Malagasy",
    "Malawian",
    "Malaysian",
    "Maldivian",
    "Malian",
    "Maltese",
    "Marshallese",
    "Martiniquais",
    "Mauritanian",
    "Mauritian",
    "Mexican",
    "Micronesian",
    "Moldovan",
    "Monegasque",
    "Mongolian",
    "Montenegrin",
    "Montserratian",
    "Moroccan",
    "Mosotho",
    "Mozambican",
    "Namibian",
    "Nauruan",
    "Nepalese",
    "New Zealander",
    "Nicaraguan",
    "Nigerian",
    "Nigerien",
    "Niuean",
    "North Korean",
    "Northern Irish",
    "Norwegian",
    "Omani",
    "Pakistani",
    "Palauan",
    "Palestinian",
    "Panamanian",
    "Papua New Guinean",
    "Paraguayan",
    "Peruvian",
    "Pitcairn Islander",
    "Polish",
    "Portuguese",
    "Prydeinig",
    "Puerto Rican",
    "Qatari",
    "Romanian",
    "Russian",
    "Rwandan",
    "Salvadorean",
    "Sammarinese",
    "Samoan",
    "Sao Tomean",
    "Saudi Arabian",
    "Scottish",
    "Senegalese",
    "Serbian",
    "Citizen of Seychelles",
    "Sierra Leonean",
    "Singaporean",
    "Slovak",
    "Slovenian",
    "Solomon Islander",
    "Somali",
    "South African",
    "South Korean",
    "South Sudanese",
    "Spanish",
    "Sri Lankan",
    "St Helenian",
    "St Lucian",
    "Stateless",
    "Sudanese",
    "Surinamese",
    "Swazi",
    "Swedish",
    "Swiss",
    "Syrian",
    "Taiwanese",
    "Tajik",
    "Tanzanian",
    "Thai",
    "Togolese",
    "Tongan",
    "Trinidadian",
    "Tristanian",
    "Tunisian",
    "Turkish",
    "Turkmen",
    "Turks and Caicos Islander",
    "Tuvaluan",
    "Ugandan",
    "Ukrainian",
    "Uruguayan",
    "Uzbek",
    "Vatican citizen",
    "Citizen of Vanuatu",
    "Venezuelan",
    "Vietnamese",
    "Vincentian",
    "Wallisian",
    "Welsh",
    "Yemeni",
    "Zambian",
    "Zimbabwean",
  ];

  const visaCategories = [
    "Citizen",
    "Student",
    "Concurrent",
    "Work Visa",
    "Permanent Resident(PR)",
    "Visitor",
    "Business Visa",
    "Green Card",
  ];

  const allCastes = [
    "Patel-Desai",
    "Patel-Kadva",
    "Patel-Leva",
    "Patel",
    "Brahmin-Audichya",
    "Brahmin",
    "Jain-Digambar",
    "Jain-Swetamber",
    "Jain-Vanta",
    "Vaishnav-Vania",
  ];

  // Required fields
  const requiredFields = [
    "birthCity",
    "birthState",
    "height",
    "weight",
    "rashi",
    "religion",
    "nationality",
    "street1",
    "pincode",
    "city",
    "state",
    "legalStatus",
    "interCommunity"  // Adding marry to other community as required
  ];
  const doshOptions = [
    "No Dosh",
    "Manglik",
    "Sarpa Dosh",
    "Kala Sarpa Dosh",
    "Rahu Dosh",
    "Kethu Dosh",
    "Kalathra Dosh",
  ];

  // Friendly labels for error messages
  const fieldLabels = {
    birthCity: "Birth City",
    birthState: "Birth State",
    height: "Height",
    weight: "Weight",
    rashi: "Rashi",
    religion: "Religion",
    nationality: "Nationality",
    street1: "Street Address 1",
    pincode: "Pincode",
    city: "City",
    state: "State",
    legalStatus: "Legal Status",
    interCommunity: "Marry to other community"  // Adding label for error message
  };

  const weightOptions = [
    "40 kg / 88 lbs",
    "41 kg / 90 lbs",
    "42 kg / 93 lbs",
    "43 kg / 95 lbs",
    "44 kg / 97 lbs",
    "45 kg / 99 lbs",
    "46 kg / 101 lbs",
    "47 kg / 104 lbs",
    "48 kg / 106 lbs",
    "49 kg / 108 lbs",
    "50 kg / 110 lbs",
    "51 kg / 112 lbs",
    "52 kg / 115 lbs",
    "53 kg / 117 lbs",
    "54 kg / 119 lbs",
    "55 kg / 121 lbs",
    "56 kg / 123 lbs",
    "57 kg / 126 lbs",
    "58 kg / 128 lbs",
    "59 kg / 130 lbs",
    "60 kg / 132 lbs",
    "61 kg / 134 lbs",
    "62 kg / 137 lbs",
    "63 kg / 139 lbs",
    "64 kg / 141 lbs",
    "65 kg / 143 lbs",
    "66 kg / 146 lbs",
    "67 kg / 148 lbs",
    "68 kg / 150 lbs",
    "69 kg / 152 lbs",
    "70 kg / 154 lbs",
    "71 kg / 157 lbs",
    "72 kg / 159 lbs",
    "73 kg / 161 lbs",
    "74 kg / 163 lbs",
    "75 kg / 165 lbs",
    "76 kg / 168 lbs",
    "77 kg / 170 lbs",
    "78 kg / 172 lbs",
    "79 kg / 174 lbs",
    "80 kg / 176 lbs",
    "81 kg / 179 lbs",
    "82 kg / 181 lbs",
    "83 kg / 183 lbs",
    "84 kg / 185 lbs",
    "85 kg / 187 lbs",
    "86 kg / 190 lbs",
    "87 kg / 192 lbs",
    "88 kg / 194 lbs",
    "89 kg / 196 lbs",
    "90 kg / 198 lbs",
    "91 kg / 201 lbs",
    "92 kg / 203 lbs",
    "93 kg / 205 lbs",
    "94 kg / 207 lbs",
    "95 kg / 209 lbs",
    "96 kg / 212 lbs",
    "97 kg / 214 lbs",
    "98 kg / 216 lbs",
    "99 kg / 218 lbs",
    "100 kg / 220 lbs",
  ];
  const heightOptions = [
    "4'0\" / 122 cm",
    "4'1\" / 124 cm",
    "4'2\" / 127 cm",
    "4'3\" / 130 cm",
    "4'4\" / 132 cm",
    "4'5\" / 135 cm",
    "4'6\" / 137 cm",
    "4'7\" / 140 cm",
    "4'8\" / 142 cm",
    "4'9\" / 145 cm",
    "4'10\" / 147 cm",
    "4'11\" / 150 cm",
    "5'0\" / 152 cm",
    "5'1\" / 155 cm",
    "5'2\" / 157 cm",
    "5'3\" / 160 cm",
    "5'4\" / 163 cm",
    "5'5\" / 165 cm",
    "5'6\" / 168 cm",
    "5'7\" / 170 cm",
    "5'8\" / 173 cm",
    "5'9\" / 175 cm",
    "5'10\" / 178 cm",
    "5'11\" / 180 cm",
    "6'0\" / 183 cm",
    "6'1\" / 185 cm",
    "6'2\" / 188 cm",
    "6'3\" / 191 cm",
    "6'4\" / 193 cm",
  ];

  // Generic handler for height/weight
  const handleSelectChange = (field, selected) => {
    setFormData((prev) => ({
      ...prev,
      [field]: selected ? selected.value : "",
    }));

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  // ✅ Unified React Select Styles (No Glow + Gold Theme)
  const customSelectStyles = (error, value) => ({
    control: (base, state) => {
      let borderColor = "#d1d5db"; // default gray
      if (error) borderColor = "red";
      else if (value && value.value) borderColor = "#D4A052"; // solid gold when selected
      else if (state.isFocused) borderColor = "#E4C48A"; // light gold on focus

      return {
        ...base,
        minHeight: "3rem",
        borderRadius: "0.5rem",
        borderColor,
        boxShadow: "none", // ✅ disables glow
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


  const legalStatuses = [
    "Never Married",
    "Divorced",
    "Widowed",
    "Separated",
    "Awaiting Divorce",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    const capitalizeFields = [
      "birthCity",
      "birthState",
      "residingCity",
      "residingState",
      "street1",
      "street2",
      "middleName",
      // "residingCountry",
    ];

    let newValue = value;

    if (capitalizeFields.includes(name) && value.length > 0) {
      newValue = value
        .split(" ") // split on one or more spaces
        .map(
          (word) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // ✅ Remove error immediately if value is not empty
    setErrors((prev) => {
      const updated = { ...prev };
      if (newValue.trim() !== "" && updated[name]) {
        delete updated[name];
      }
      return updated;
    });
  };

  const handleHourInput = (e) => {
    const val = e.target.value;
    // Allow only numbers and max 2 digits
    if (/^\d{0,2}$/.test(val)) {
      setFormData({ ...formData, birthHour: val });
      if (val.length === 2) {
        minuteRef.current.focus(); // Auto move to minute input
      }
    }
  };

  const handleMinuteInput = (e) => {
    const val = e.target.value;
    if (/^\d{0,2}$/.test(val)) {
      setFormData({ ...formData, birthMinute: val });
    }
  };



  const handleLegalStatus = (e) => {
    const status = e.target.value;

    // Update form data and clear children fields when marital status changes
    setFormData((prev) => ({
      ...prev,
      legalStatus: status,
      hasChildren: "",
      numChildren: "",
      livingWith: "",
    }));

    // Clear error immediately when user selects a value
    setErrors((prev) => {
      const updated = { ...prev };
      if (status) delete updated.legalStatus;
      return updated;
    });

    // ✅ Show "Do you have children?" only if status is selected AND not "Never Married"
    setShowChildrenFields(status && status !== "Never Married");

    // ✅ Show divorce fields only for "Divorced" or "Awaiting Divorce"
    setShowDivorceFields(status === "Divorced" || status === "Awaiting Divorce");

    // ✅ Reset separation-related fields if not "Separated"
    if (status !== "Separated") {
      setIsLegallySeparated("");
      setSeparationYear("");
      setManualSeparationEntry(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    // Birth Place
    if (!formData.birthCity) newErrors.birthCity = "Birth city is required";
    if (!formData.birthState) newErrors.birthState = "Birth state is required";

    // Height & Weight
    if (!formData.height) newErrors.height = "Height is required";
    if (!formData.weight) newErrors.weight = "Weight is required";

    // Astrological
    if (!formData.rashi) newErrors.rashi = "Rashi is required";
    if (!formData.dosh) newErrors.dosh = "Dosh is required";

    // Religion & Caste
    if (!formData.religion) newErrors.religion = "Religion is required";
    if (!formData.caste) newErrors.caste = "Caste is required";

    // Intercommunity
    if (!formData.interCommunity)
      newErrors.interCommunity = "Please select an option";

    // Address
    if (!formData.street1) newErrors.street1 = "Street Address 1 is required";
    if (!formData.pincode) newErrors.pincode = "Pincode is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";

    // Nationality
    if (!formData.nationality)
      newErrors.nationality = "Nationality is required";

    // Marital Status
    if (!formData.legalStatus)
      newErrors.legalStatus = "Marital status is required";

    // Conditional Divorce / Children Fields
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

    // Residing in India
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
        isYourHome: true,
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
      // Useful debug: log payload before sending
      console.log("📤 Saving personal details payload:", payload);
      setLoading(true);

      const personalStep = await getOnboardingStatus();
      let res;

      // onboarding API returns { success, data: { completedSteps: [...] } }
      const alreadyCompleted =
        Array.isArray(personalStep?.data?.data?.completedSteps) &&
        personalStep.data.data.completedSteps.includes("personal");

      if (alreadyCompleted) {
        res = await updateUserPersonal(payload);
      } else {
        res = await saveUserPersonal(payload);
      }

      // Normalize success check across different response shapes
      const isSuccess = !!(
        res?.success ||
        res?.data?.success ||
        res?.data?.data ||
        res?.status === 200 ||
        res?.status === 201
      );

      if (!isSuccess) {
        const serverMessage = res?.message || res?.data?.message || "Failed to save personal details.";
        console.error("❌ Save returned unsuccessful response:", res);
        // If server returned field errors, map them to the form
        const fieldErrors = res?.data?.errors || res?.errors || null;
        if (fieldErrors && typeof fieldErrors === "object") {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        alert(`❌ ${serverMessage}`);
        return false;
      }

      // Success
      alert(alreadyCompleted ? "✅ Personal details updated successfully!" : "✅ Personal details saved successfully!");

      // Optionally refresh data
      try {
        await getUserPersonal();
      } catch (refreshErr) {
        console.warn("Failed to refresh personal data after save:", refreshErr);
      }

      return true;
    } catch (err) {
      console.error("❌ Error saving/updating personal details:", err);

      // Map server-side validation errors to form fields when available
      const serverData = err?.response?.data || {};
      if (serverData?.errors && typeof serverData.errors === "object") {
        setErrors((prev) => ({ ...prev, ...serverData.errors }));
      }

      const msg = serverData?.message || err?.message || "Failed to save personal details.";
      alert(`❌ ${msg}`);
      return false;
    } finally {
      setLoading(false);
    }
  };



  const handleSaveNext = async (e) => {
    e.preventDefault();
    const success = await handleSavePersonalDetails();
    if (success && onNext) onNext("family"); // ✅ move only if successful
  };

  // if (loading) return <p>Loading...</p>;

  const handlePrevious = () => navigate("/signup");

  // Generate hour and minute options
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

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
              <input
                name="birthHour"
                value={formData.birthHour}
                onChange={handleHourInput}
                placeholder="HH"
                maxLength={2}
                className={`capitalize w-full p-3 rounded-md border border-[#E4C48A] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
              {errors.birthHour && (
                <p className="text-xs text-red-500 mt-1">{errors.birthHour}</p>
              )}
              <input
                name="birthMinute"
                value={formData.birthMinute}
                onChange={handleMinuteInput}
                placeholder="MM"
                maxLength={2}
                ref={minuteRef}
                className={`capitalize w-full p-3 rounded-md border border-[#E4C48A] text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
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
                  className={`capitalize w-full p-3 rounded-md border ${errors.birthCity ? "border-red-500" : "border-[#E4C48A]"
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
                  className={`capitalize w-full p-3 rounded-md border ${errors.birthState ? "border-red-500" : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />
                {errors.birthState && (
                  <p className="text-red-500 text-xs mt-1">{errors.birthState}</p>
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
                options={heightOptions.map((h) => ({
                  label: h,
                  value: h,
                }))}
                value={
                  formData.height
                    ? { label: formData.height, value: formData.height }
                    : null
                }
                onChange={(selected, actionMeta) => {
                  handleSelectChange("height", selected);
                  // ✅ Remove focus glow immediately after selection
                  if (actionMeta.action === "select-option") {
                    document.activeElement.blur();
                  }
                }}
                placeholder="Select or type height"
                className="w-full text-sm"
                classNamePrefix="react-select"
                components={{
                  IndicatorSeparator: () => null, // ✅ Removes the small slash line
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
                options={weightOptions.map((w) => ({
                  label: w,
                  value: w,
                }))}
                value={
                  formData.weight
                    ? { label: formData.weight, value: formData.weight }
                    : null
                }
                onChange={(selected, actionMeta) => {
                  handleSelectChange("weight", selected);
                  // ✅ Remove focus glow immediately after selection
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
              <select
                name="rashi"
                value={formData.rashi}
                onChange={handleChange}
                className={`capitalize w-full p-3 rounded-md border ${errors.rashi ? "border-red-500" : "border-[#E4C48A]"
                  } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              >
                <option value="">Select Rashi</option>
                {zodiacSigns.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              {errors.rashi && (
                <p className="text-xs text-red-500 mt-1">{errors.rashi}</p>
              )}
            </div>

            {/* Dosh */}
            <div>
              <label className="block text-sm font-medium mb-1">Dosh</label>
              <select
                name="dosh"
                value={formData.dosh}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    dosh: e.target.value, // correct for normal select
                  });
                  setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.dosh; // clear error on selection
                    return updated;
                  });
                }}
                className={`capitalize w-full p-3 rounded-md border ${errors.dosh ? "border-red-500" : "border-[#E4C48A]"
                  } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              >
                <option value="">Select Type of Dosh</option>
                {doshOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.dosh && (
                <p className="text-xs text-red-500 mt-1">{errors.dosh}</p>
              )}
            </div>


            {/* Religion */}
            <div>
              <label className="block text-sm font-medium mb-1">Religion</label>
              <select
                name="religion"
                value={formData.religion}
                onChange={handleChange}
                className={`capitalize w-full p-3 rounded-md border ${errors.religion ? "border-red-500" : "border-[#E4C48A]"
                  } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              >
                <option value="">Select Religion</option>
                {religions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {errors.religion && (
                <p className="text-xs text-red-500 mt-1">{errors.religion}</p>
              )}
            </div>

            {/* Caste */}
            <div>
              <label className="block text-sm font-medium mb-1">Caste</label>
              <select
                name="caste"
                value={formData.caste}
                onChange={handleChange}
                className={`capitalize w-full p-3 rounded-md border ${errors.caste ? "border-red-500" : "border-[#E4C48A]"
                  } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              >
                <option value="">Select Caste</option>
                {castOptions.length > 0 ? (
                  castOptions.map((caste) => (
                    <option key={caste} value={caste}>
                      {caste}
                    </option>
                  ))
                ) : (
                  <option disabled>No caste options available</option>
                )}
              </select>
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
                        interCommunity: ""
                      }));
                    }}
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.interCommunity === "Yes"
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
                        interCommunity: ""
                      }));
                    }}
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.interCommunity === "No"
                        ? "bg-[#E4C48A] border-[#E4C48A]"
                        : "border-gray-300"
                      }
          focus:ring-1 focus:ring-[#E4C48A]`}
                  />
                  <span className="text-gray-700 text-sm">No</span>
                </label>
              </div>
              {errors.interCommunity && (
                <p className="text-xs text-red-500 mt-2">{errors.interCommunity}</p>
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
                <label className="text-sm font-medium">Street Address 1</label>
                <input
                  name="street1"
                  value={formData.street1}
                  placeholder="Enter address line 1"
                  onChange={(e) => {
                    // Update form data
                    setFormData({ ...formData, street1: e.target.value });

                    // Remove error as soon as user types
                    setErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.street1;
                      return updated;
                    });
                  }}
                  className={`capitalize w-full p-3 rounded-md border ${errors.street1 ? "border-red-500" : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />
              </div>

              {/* Street Address 2 */}
              <div>
                <label className="text-sm font-medium">Street Address 2</label>
                <input
                  name="street2"
                  value={formData.street2}
                  onChange={handleChange}
                  placeholder="Enter address line 2"
                  className={`capitalize w-full p-3 rounded-md border ${errors.street2 ? "border-red-500" : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />
                {errors.street1 && (
                  <p className="text-xs text-red-500 mt-1">{errors.street1}</p>
                )}
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
                  className={`capitalize w-full p-3 rounded-md border ${errors.pincode ? "border-red-500" : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />

                {(errors.pincode || errorMsg) && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.pincode || errorMsg}
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
                    className={`capitalize w-full p-3 rounded-md border ${errors.city ? "border-red-500" : "border-[#E4C48A]"
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
                    className={`capitalize w-full p-3 rounded-md border ${errors.state ? "border-red-500" : "border-[#E4C48A]"
                      } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                  />
                  {errors.state && (
                    <p className="text-xs text-red-500 mt-1">{errors.state}</p>
                  )}
                </div>
              </div>
            </div>
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
                    onChange={() => setFormData((prev) => ({ ...prev, ownHouse: "Yes" }))}
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.ownHouse === "Yes"
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
                    onChange={() => setFormData((prev) => ({ ...prev, ownHouse: "No" }))}
                    className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.ownHouse === "No"
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
              <select
                name="legalStatus"
                value={formData.legalStatus}
                onChange={handleLegalStatus}
                className={`capitalize w-full p-3 rounded-md border ${errors.legalStatus ? "border-red-500" : "border-[#E4C48A]"
                  } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              >
                <option value="">Select Status</option>
                {legalStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
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
                <select
                  name="divorceStatus"
                  value={formData.divorceStatus}
                  onChange={handleChange}
                  className={`capitalize w-full p-3 rounded-md border ${errors.divorceStatus ? "border-red-500" : "border-[#E4C48A]"
                    } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                >
                  <option value="">Select Divorce Status</option>
                  <option value="filed">Filed Papers</option>
                  <option value="process">In Process</option>
                  <option value="court">In Court</option>
                  <option value="divorced">Divorced</option>
                </select>
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
                    <select
                      name="numChildren"
                      value={formData.numChildren}
                      onChange={handleChange}
                      className={`capitalize w-full p-3 rounded-md border ${errors.numChildren
                        ? "border-red-500"
                        : "border-[#E4C48A]"
                        } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                    >
                      <option value="">Number of Children</option>
                      {[...Array(10)].map((_, i) => (
                        <option key={i + 1}>{i + 1}</option>
                      ))}
                    </select>

                    <select
                      name="livingWith"
                      value={formData.livingWith}
                      onChange={handleChange}
                      className={`capitalize w-full p-3 rounded-md border ${errors.livingWith
                        ? "border-red-500"
                        : "border-[#E4C48A]"
                        } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                    >
                      <option value="">Living with you?</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
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
            <select
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className={`capitalize w-full p-3 rounded-md border ${errors.nationality ? "border-red-500" : "border-[#E4C48A]"
                } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
            >
              <option value="">Select Nationality</option>
              {nationalities.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
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
                    setFormData({
                      ...formData,
                      residingInIndia: "yes",
                      residingCountry: "India",
                      visaCategory: "",
                    });

                    setErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.residingInIndia;
                      return updated;
                    });
                  }}
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.residingInIndia === "yes"
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
                    setFormData({
                      ...formData,
                      residingInIndia: "no",
                      residingCountry: "no",
                      visaCategory: "",
                    });

                    // Remove red error immediately
                    setErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.residingInIndia;
                      return updated;
                    });
                  }}
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200
          ${formData.residingInIndia === "no"
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
                  <select
                    name="residingCountry"
                    value={formData.residingCountry}
                    onChange={handleChange}
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
                    className={`capitalize w-full p-3 rounded-md border ${errors.residingCountry
                      ? "border-red-500"
                      : "border-[#E4C48A]"
                      } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                  >
                    <option value="">Select Country</option>
                    {countries
                      .filter((c) => c !== "India")
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
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
                  <select
                    name="visaCategory"
                    value={formData.visaCategory}
                    onChange={handleChange}
                    onBlur={() => {
                      if (!formData.visaCategory) {
                        setErrors({
                          ...errors,
                          visaCategory: "Please select a visa category",
                        });
                      } else {
                        setErrors({ ...errors, visaCategory: "" });
                      }
                    }}
                    className={`capitalize w-full p-3 rounded-md border ${errors.visaCategories
                      ? "border-red-500"
                      : "border-[#E4C48A]"
                      } text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                  >
                    <option value="">Select Visa Category</option>
                    {visaCategories.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
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
