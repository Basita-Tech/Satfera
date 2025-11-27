import { useState, useEffect, useMemo } from 'react';
import { getNames } from 'country-list';
import axios from '../../../api/http';
import { TabsComponent } from '../../TabsComponent';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { ArrowLeft, Save } from 'lucide-react';
import {getUserPersonal,getUserFamilyDetails,getEducationalDetails,getUserProfession,getUserExpectations,getUserPhotos,getUserHealth,updateUserPersonal,updateUserFamilyDetails,updateUserExpectations,updateUserHealth,updateEducationalDetails,saveEducationalDetails,saveUserProfession,updateUserProfession,saveUserHealth,saveUserFamilyDetails,saveUserExpectations} from '../../../api/auth'
import toast from 'react-hot-toast';

export function EditProfile({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState('personal');

  // FAMILY state
  const [family, setFamily] = useState({
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
    numberOfBrothers: "",
    numberOfSisters: "",
    // removed dummy fields: familyStatus, familyLocation, aboutFamily
    hasSiblings: null,
    siblingCount: 0,
    siblings: [],
    doYouHaveChildren: false,
  });

  // EDUCATION state
  const [education, setEducation] = useState({
    // canonical education fields (match `EducationDetails.jsx`)
    schoolName: "",
    highestEducation: "",
    fieldOfStudy: "",
    universityName: "",
    countryOfEducation: "",
    otherCountry: "",
    // extras removed: occupation, companyName, annualIncome
  });

  // PROFESSION state
  const [profession, setProfession] = useState({
    employmentStatus: "",
    occupation: "",
    annualIncome: "",
    organizationName: "",
  });

  // LIFESTYLE state
  const [lifestyle, setLifestyle] = useState({
    diet: "",
    smoking: "",
    drinking: "",
    healthIssues: "",
    isHaveMedicalHistory: "",
    isHaveTattoos: "",
    isHaveHIV: "",
    isPositiveInTB: "",
  });
  const [lifestyleRaw, setLifestyleRaw] = useState(null);

  // EXPECTATIONS state (read-only view in editor)
  const [expectations, setExpectations] = useState({
    partnerLocation: "",
    partnerStateOrCountry: [],
    openToPartnerHabits: "",
    partnerEducation: [],
    partnerDiet: [],
    partnerCommunity: [],
    profession: [],
    maritalStatus: [],
    preferredAgeFrom: "",
    preferredAgeTo: "",
  });

  // PHOTOS state
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState(null);




  // countries list for Country of Education select
  const countries = useMemo(() => getNames(), []);

  const tabs = [
    { key: 'personal', label: 'Personal Details' },
    { key: 'family', label: 'Family Details' },
    { key: 'education', label: 'Educational Details' },
    {key:'profession',label:'Profession Details'},
    { key: 'lifestyle', label: 'Health & Lifestyle' },
    { key: 'expectations', label: 'Expectation Details' },
    {key:'photos', label: 'Photos' }
    
  ];

  const [personal, setPersonal] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    maritalStatus: "",
    height: "",
    weight: "",
    religion: "",
    caste: "",
    birthHour: "",
    birthMinute: "",
    birthCity: "",
    birthState: "",
    rashi: "",
    dosh: "",
    street1: "",
    street2: "",
    pincode: "",
    city: "",
    state: "",
    ownHouse: "",
    nationality: "",
    residingInIndia: "",
    residingCountry: "",
    visaCategory: "",
    hasChildren: "",
    numChildren: "",
    livingWith: "",
    divorceStatus: "",
    separatedSince: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getUserPersonal();
        const data = res?.data?.data || {};

        // Log any missing expected fields from API response to help debugging
        const checkMissingPersonalFields = (d) => {
          const expected = [
            'firstName',
            'middleName',
            'lastName',
            'dateOfBirth',
            'timeOfBirth',
            'height',
            'weight',
            'astrologicalSign',
            'dosh',
            'subCaste',
            'birthPlace',
            'birthState',
            'full_address.street1',
            'full_address.city',
            'full_address.zipCode',
            'nationality',
            'isResidentOfIndia',
            'residingCountry',
            'visaType',
            'marriedStatus',
            'isHaveChildren',
          ];

          const missing = [];
          expected.forEach((key) => {
            if (key.includes('.')) {
              const [a, b] = key.split('.');
              if (!d[a] || d[a][b] === undefined || d[a][b] === null || (typeof d[a][b] === 'string' && String(d[a][b]).trim() === '')) missing.push(key);
            } else {
              if (d[key] === undefined || d[key] === null || (typeof d[key] === 'string' && String(d[key]).trim() === '')) missing.push(key);
            }
          });

          if (missing.length) console.info('Missing personal fields from API response:', missing);
          else console.info('All expected personal fields present in API response');
        };

        if (!data || Object.keys(data).length === 0) {
          console.info('No personal data returned from API (profile may not exist yet)');
        } else {
          checkMissingPersonalFields(data);
        }

        const dob = data.dateOfBirth
          ? new Date(data.dateOfBirth).toISOString().split('T')[0]
          : "";

        let birthHour = "", birthMinute = "";
        if (data.timeOfBirth) {
          const parts = String(data.timeOfBirth).split(":");
          birthHour = parts[0] || "";
          birthMinute = parts[1] || "";
        }

        setPersonal((p) => ({
          ...p,
          firstName: data.firstName || "",
          middleName: data.middleName || "",
          lastName: data.lastName || "",
          dateOfBirth: dob,
          birthHour,
          birthMinute,
          maritalStatus: data.marriedStatus || "",
          height:
            data.height && typeof data.height === 'object'
              ? data.height.value || data.height.text || ''
              : data.height || '',
          weight:
            data.weight && typeof data.weight === 'object'
              ? data.weight.text || data.weight.value || ''
              : data.weight !== undefined && data.weight !== null
              ? String(data.weight)
              : '',
          religion: data.religion || "",
          caste: data.subCaste || "",
          
          birthCity: data.birthPlace || "",
          birthState: data.birthState || "",
          rashi: data.astrologicalSign || "",
          dosh: data.dosh || "",
          street1: data.full_address?.street1 || "",
          street2: data.full_address?.street2 || "",
          pincode: data.full_address?.zipCode || "",
          city: data.full_address?.city || "",
          state: data.full_address?.state || "",
          ownHouse: typeof data.full_address?.isYourHome === 'boolean' ? (data.full_address.isYourHome ? 'Yes' : 'No') : '',
          nationality: data.nationality || "",
          residingInIndia: typeof data.isResidentOfIndia === 'boolean' ? (data.isResidentOfIndia ? 'yes' : 'no') : '',
          residingCountry: data.residingCountry || "",
          visaCategory: data.visaType || "",
          hasChildren: data.isHaveChildren === true ? 'Yes' : data.isHaveChildren === false ? 'No' : '',
          numChildren: data.numberOfChildren ? String(data.numberOfChildren) : "",
          livingWith: data.isChildrenLivingWithYou === true ? 'With Me' : data.isChildrenLivingWithYou === false ? 'No' : '',
          divorceStatus: data.divorceStatus || "",
          separatedSince: data.separatedSince ? String(data.separatedSince) : "",
        }));
      } catch (err) {
        console.error('Failed to load personal details', err);
      }
    };

    load();
  }, []);

  // ---------------------------------------
  // PROFESSION loader (fetch on mount)
  // ---------------------------------------
  useEffect(() => {
    const loadProfession = async () => {
      try {
        const res = await getUserProfession();
        const data = res?.data?.data;
        if (!data || Object.keys(data).length === 0) {
          console.info('No profession data returned from API (profile may not exist yet)');
          return;
        }

        // map to local profession state keys
        setProfession({
          employmentStatus: data.EmploymentStatus || data.employmentStatus || "",
          occupation: data.Occupation || data.occupation || "",
          annualIncome: data.AnnualIncome || data.annualIncome || "",
          organizationName: data.OrganizationName || data.organizationName || "",
        });
        console.info('Loaded profession data keys:', Object.keys(data));
      } catch (err) {
        console.error('Failed to load profession details', err);
      }
    };

    loadProfession();
  }, []);

  // ---------------------------------------
  // FAMILY loader (fetch on mount)
  // ---------------------------------------
  useEffect(() => {
    const loadFamily = async () => {
      try {
        const res = await getUserFamilyDetails();
        const data = res?.data?.data;
        if (!data || Object.keys(data).length === 0) {
          console.info('No family data returned from API (profile may not exist yet)');
          return;
        }

        setFamily((f) => ({
          ...f,
          fatherName: data.fatherName || "",
          fatherProfession: data.fatherOccupation || "",
          fatherPhone: data.fatherContact || "",
          fatherNative: data.fatherNativePlace || "",
          motherName: data.motherName || "",
          motherProfession: data.motherOccupation || "",
          motherPhone: data.motherContact || "",
          motherNative: data.motherNativePlace || "",
          grandFatherName: data.grandFatherName || "",
          grandMotherName: data.grandMotherName || "",
          nanaName: data.nanaName || "",
          naniName: data.naniName || "",
          nanaNativePlace: data.nanaNativePlace || "",
          familyType: data.familyType || "",
          // familyStatus removed per request
          // map sibling info if available
          hasSiblings: typeof data.haveSibling === 'boolean' ? data.haveSibling : null,
          siblingCount: data.howManySiblings || 0,
          siblings: data.siblingDetails || [],
          doYouHaveChildren: data.doYouHaveChildren ?? false,
          // misc fields removed per request
        }));
      } catch (err) {
        console.error('Failed to load family details', err);
      }
    };

    loadFamily();
  }, []);

  // ---------------------------------------
  // EDUCATION loader (fetch on mount)
  // ---------------------------------------
  useEffect(() => {
    const loadEducation = async () => {
      try {
        const res = await getEducationalDetails();
        // Debug: log the full API response to inspect why CountryOfEducation may be empty
        try {
          console.info('Education API raw response:', res);
          console.info('Education API res.data:', res?.data);
        } catch (logErr) {
          console.error('Failed to log education API response', logErr);
        }
        const data = res?.data?.data;
        if (!data || Object.keys(data).length === 0) {
          console.info('No education data returned from API (profile may not exist yet)');
          return;
        }

        setEducation((e) => ({
          ...e,
          // map canonical keys returned by the education API
          schoolName: data.SchoolName || data.schoolName || "",
          highestEducation: data.HighestEducation || data.highestEducation || "",
          fieldOfStudy:
            data.FieldOfStudy && typeof data.FieldOfStudy === 'object'
              ? data.FieldOfStudy.value || data.FieldOfStudy.label || String(data.FieldOfStudy)
              : data.FieldOfStudy || data.fieldOfStudy || "",
          universityName: data.University || data.universityName || data.university || "",
          countryOfEducation:
            data.CountryOfEducation && typeof data.CountryOfEducation === 'object'
              ? data.CountryOfEducation.value || data.CountryOfEducation.label || String(data.CountryOfEducation)
              : data.CountryOfEducation || data.countryOfEducation || "",
          otherCountry: data.OtherCountry || data.otherCountry || "",
          // extras removed: occupation, companyName, annualIncome
        }));
        // Diagnostics: log keys and CountryOfEducation value to help debugging missing country
        try {
          const presentKeys = Object.keys(data || {});
          console.info('Education API returned keys:', presentKeys);
          const countryVal = data?.CountryOfEducation ?? data?.countryOfEducation;
          console.info('Education: CountryOfEducation raw value =>', countryVal);
          if (!countryVal || String(countryVal).trim() === '') {
            console.warn('Education country appears missing or empty in API response');
          }
        } catch (diagErr) {
          console.error('Education diagnostics failed', diagErr);
        }
      } catch (err) {
        console.error('Failed to load educational details', err);
      }
    };

    loadEducation();
  }, []);

  // ---------------------------------------
  // LIFESTYLE loader (fetch on mount)
  // ---------------------------------------
  useEffect(() => {
    const loadLifestyle = async () => {
      try {
        const res = await getUserHealth();
        // debug log
          console.info('Lifestyle (getUserHealth) raw response ->', res);
          const data = res?.data?.data;
          try {
            console.info('Lifestyle server data keys ->', Object.keys(data || {}));
            console.info('Lifestyle server values ->', {
              diet: data?.diet ?? data?.Diet,
              smoking: data?.isTobaccoUser ?? data?.isTobacco ?? data?.smoking,
              drinking: data?.isAlcoholic ?? data?.alcoholic ?? data?.drinking,
              medicalHistoryDetails: data?.medicalHistoryDetails ?? data?.medicalHistory ?? data?.description,
            });
            // persist raw server payload so the UI can display all returned keys/values
            setLifestyleRaw(data || null);
          } catch (diagErr) {
            console.error('Failed to log lifestyle server values', diagErr);
          }
        if (!data || Object.keys(data).length === 0) {
          console.info('No lifestyle/health data returned from API (profile may not exist yet)');
          return;
        }

        // Map server fields to user-friendly display (like ExpectationDetails)
        const mapHabitDisplay = (val) => {
          if (val === undefined || val === null) return '';
          const s = String(val).toLowerCase();
          if (s === 'yes') return 'Yes';
          if (s === 'no') return 'No';
          if (s === 'occasional' || s === 'occasionally') return 'Occasional';
          return String(val);
        };

        const mapDietDisplay = (val) => {
          if (!val && val !== '') return '';
          const s = String(val || '').trim();
          if (!s) return '';
          return s.charAt(0).toUpperCase() + s.slice(1);
        };

        const normalizedSmoking = typeof data.isTobaccoUser === 'boolean'
          ? (data.isTobaccoUser ? 'Yes' : 'No')
          : mapHabitDisplay(data.isTobaccoUser ?? data.isTobacco ?? data.smoking ?? '');

        const normalizedDrinking = typeof data.isAlcoholic === 'boolean'
          ? (data.isAlcoholic ? 'Yes' : 'No')
          : mapHabitDisplay(data.isAlcoholic ?? data.alcoholic ?? data.drinking ?? '');

        const normalizedHaveMedicalHistory = typeof data.isHaveMedicalHistory === 'boolean'
          ? (data.isHaveMedicalHistory ? 'Yes' : 'No')
          : mapHabitDisplay(data.isHaveMedicalHistory ?? data.isHaveMedicalHistory ?? '');

        setLifestyle({
          diet: mapDietDisplay(data.diet || data.Diet || ''),
          smoking: normalizedSmoking,
          drinking: normalizedDrinking,
          healthIssues: data.medicalHistoryDetails || data.medicalHistory || data.description || '',
          isHaveMedicalHistory: normalizedHaveMedicalHistory,
          isHaveTattoos: mapHabitDisplay(data.isHaveTattoos || ''),
          isHaveHIV: mapHabitDisplay(data.isHaveHIV || ''),
          isPositiveInTB: mapHabitDisplay(data.isPositiveInTB || ''),
        });

        console.info('Loaded lifestyle keys:', Object.keys(data));
      } catch (err) {
        console.error('Failed to load lifestyle details', err);
      }
    };

    loadLifestyle();
  }, []);

  // ---------------------------------------
  // EXPECTATIONS loader (fetch when expectations tab active)
  // ---------------------------------------
  useEffect(() => {
    let mounted = true;
    const loadExpectations = async () => {
      try {
        const res = await getUserExpectations();
        const data = res?.data?.data;
        if (!mounted || !data) return;

        const determinePartnerLocation = (livingInCountry) => {
          if (!livingInCountry) return "No preference";
          if (typeof livingInCountry === "string") {
            if (livingInCountry === "India") return "India";
            if (livingInCountry === "No preference") return "No preference";
            return "Abroad";
          }
          if (Array.isArray(livingInCountry)) {
            const countryValues = livingInCountry.map((c) => c.value || c);
            if (countryValues.includes("India")) return "India";
            return "Abroad";
          }
          return "No preference";
        };

        const mapHabitsDisplay = (val) => {
          if (val === undefined || val === null) return "";
          const s = String(val).toLowerCase();
          if (s === "yes") return "Yes";
          if (s === "no") return "No";
          if (s === "occasionally" || s === "occasional") return "Occasional";
          return String(val);
        };

        const partnerLocation = determinePartnerLocation(data.livingInCountry);

        const partnerStateOrCountry = (() => {
          if (partnerLocation === "India") {
            return (data.livingInState || []).map((s) => (s.value || s));
          }
          if (partnerLocation === "Abroad") {
            return (data.livingInCountry || []).map((c) => (c.value || c.label || c));
          }
          return [];
        })();

        const toArray = (v) => (Array.isArray(v) ? v.map((e) => (e.value || e)) : []);

        setExpectations({
          partnerLocation,
          partnerStateOrCountry,
          openToPartnerHabits: mapHabitsDisplay(data.isConsumeAlcoholic ?? data.openToPartnerHabits ?? ''),
          partnerEducation: toArray(data.educationLevel || data.partnerEducation),
          partnerDiet: toArray(data.diet || data.partnerDiet),
          partnerCommunity: toArray(data.community || data.partnerCommunity),
          profession: toArray(data.profession),
          maritalStatus: toArray(data.maritalStatus),
          preferredAgeFrom: data.age?.from !== undefined && data.age?.from !== null ? String(data.age.from) : '',
          preferredAgeTo: data.age?.to !== undefined && data.age?.to !== null ? String(data.age.to) : '',
        });
      } catch (err) {
        if (err?.response?.status === 404) return; // no expectations yet
        console.error('Failed to load expectations', err);
      }
    };

    if (activeTab === 'expectations') loadExpectations();

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  // ---------------------------------------
  // PHOTOS loader (fetch on mount)
  // ---------------------------------------
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const res = await getUserPhotos();
        console.info('getUserPhotos ->', res);
        const payload = res?.data ?? res ?? {};

        const out = [];
        const pushIf = (v) => { if (v) out.push(v); };

        // personalPhotos could be an array
        if (Array.isArray(payload.personalPhotos) && payload.personalPhotos.length) {
          payload.personalPhotos.forEach((p) => pushIf(p?.url || p));
        } else if (payload.personalPhoto) {
          pushIf(payload.personalPhoto.url || payload.personalPhoto);
        }

        // family / closer
        pushIf(payload.familyPhoto?.url || payload.familyPhoto);
        pushIf(payload.closerPhoto?.url || payload.closerPhoto);

        // other photos array
        if (Array.isArray(payload.otherPhotos)) {
          payload.otherPhotos.forEach((p) => pushIf(p?.url || p));
        }

        // fallback: if payload itself is an array of items
        if (Array.isArray(payload) && out.length === 0) {
          payload.forEach((p) => pushIf(p?.url || p));
        }

        setPhotos(out);
      } catch (err) {
        console.error('Failed to load user photos', err);
      }
    };

    loadPhotos();
  }, []);

  // ---------------------------------------
  // PERSONAL DETAILS TAB
  // ---------------------------------------
  const handlePersonalChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setPersonal((prev) => ({ ...prev, [field]: value }));
  };

  const getDobParts = (isoDate) => {
    if (!isoDate) return { day: '', month: '', year: '' };
    const parts = String(isoDate).split('-');
    if (parts.length === 3) return { year: parts[0] || '', month: parts[1] || '', day: parts[2] || '' };
    return { day: '', month: '', year: '' };
  };

  const handleDobPartChange = (part) => (e) => {
    const raw = e?.target ? e.target.value : e;
    const val = String(raw).replace(/\D/g, '').slice(0, part === 'year' ? 4 : 2);
    const curr = getDobParts(personal.dateOfBirth);
    const next = { ...curr, [part]: val };
    if (next.year && next.month && next.day) {
      setPersonal((p) => ({ ...p, dateOfBirth: `${next.year}-${next.month.padStart(2, '0')}-${next.day.padStart(2, '0')}` }));
    } else {
      setPersonal((p) => ({ ...p, dateOfBirth: `${next.year || ''}-${next.month || ''}-${next.day || ''}` }));
    }
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'family') {
        const normalize = (v) => (v === undefined || v === null ? "" : v);
        const submissionData = {
          fatherName: normalize(family.fatherName),
          fatherOccupation: normalize(family.fatherProfession),
          fatherContact: normalize(family.fatherPhone),
          fatherNativePlace: normalize(family.fatherNative),
          motherName: normalize(family.motherName),
          motherOccupation: normalize(family.motherProfession),
          motherContact: normalize(family.motherPhone),
          motherNativePlace: normalize(family.motherNative),
          grandFatherName: normalize(family.grandFatherName),
          grandMotherName: normalize(family.grandMotherName),
          nanaName: normalize(family.nanaName),
          naniName: normalize(family.naniName),
          nanaNativePlace: normalize(family.nanaNativePlace),
          familyType: normalize(family.familyType),
          haveSibling: typeof family.hasSiblings === 'boolean' ? family.hasSiblings : (family.hasSiblings ? true : false),
          howManySiblings: Number(family.siblingCount) || 0,
          siblingDetails: family.siblings || [],
          doYouHaveChildren: !!family.doYouHaveChildren,
        };

        try { console.info('Family submissionData ->', submissionData); } catch (e) { /* ignore */ }

        const existing = await getUserFamilyDetails();
        if (existing?.data?.data) {
          await updateUserFamilyDetails(submissionData);
          try {
            const refetch = await getUserFamilyDetails();
            const server = refetch?.data?.data || {};
            setFamily((prev) => ({
              ...prev,
              fatherName: server.fatherName || server.fatherName || submissionData.fatherName,
              fatherProfession: server.fatherOccupation || submissionData.fatherOccupation,
              fatherPhone: server.fatherContact || submissionData.fatherContact,
              fatherNative: server.fatherNativePlace || submissionData.fatherNativePlace,
              motherName: server.motherName || submissionData.motherName,
              motherProfession: server.motherOccupation || submissionData.motherOccupation,
              motherPhone: server.motherContact || submissionData.motherContact,
              motherNative: server.motherNativePlace || submissionData.motherNativePlace,
              grandFatherName: server.grandFatherName || submissionData.grandFatherName,
              grandMotherName: server.grandMotherName || submissionData.grandMotherName,
              nanaName: server.nanaName || submissionData.nanaName,
              naniName: server.naniName || submissionData.naniName,
              nanaNativePlace: server.nanaNativePlace || submissionData.nanaNativePlace,
              familyType: server.familyType || submissionData.familyType,
              hasSiblings: typeof server.haveSibling === 'boolean' ? server.haveSibling : submissionData.haveSibling,
              siblingCount: server.howManySiblings || submissionData.howManySiblings,
              siblings: server.siblingDetails || submissionData.siblingDetails,
              doYouHaveChildren: server.doYouHaveChildren ?? submissionData.doYouHaveChildren,
            }));
          } catch (refErr) { console.error('Failed to refetch family after update', refErr); }

          toast.success('✅ Family details updated successfully');
        } else {
          const res = await saveUserFamilyDetails(submissionData);
          try {
            const refetch = await getUserFamilyDetails();
            const server = refetch?.data?.data || {};
            setFamily((prev) => ({
              ...prev,
              fatherName: server.fatherName || submissionData.fatherName,
            }));
          } catch (refErr) { console.error('Failed to refetch family after save', refErr); }
          toast.success('✅ Family details saved successfully');
        }
        return;
      }

      if (activeTab === 'expectations') {
        const normalize = (v) => (v === undefined || v === null ? "" : v);

        const submissionData = {
          // if partnerLocation is India, send as livingInState, otherwise as livingInCountry
          livingInCountry: expectations.partnerLocation === 'Abroad' ? (expectations.partnerStateOrCountry || []) : [],
          livingInState: expectations.partnerLocation === 'India' ? (expectations.partnerStateOrCountry || []) : [],
          isConsumeAlcoholic: normalize(expectations.openToPartnerHabits),
          educationLevel: expectations.partnerEducation || [],
          diet: expectations.partnerDiet || [],
          community: expectations.partnerCommunity || [],
          profession: expectations.profession || [],
          maritalStatus: expectations.maritalStatus || [],
          age: {
            from: expectations.preferredAgeFrom ? Number(expectations.preferredAgeFrom) : undefined,
            to: expectations.preferredAgeTo ? Number(expectations.preferredAgeTo) : undefined,
          },
        };

        try { console.info('Expectations submissionData ->', submissionData); } catch (e) { }

        const existing = await getUserExpectations();
        if (existing?.data?.data) {
          await updateUserExpectations(submissionData);
          try {
            const refetch = await getUserExpectations();
            const server = refetch?.data?.data || {};
            // reuse loader logic to map server -> expectations
            const determinePartnerLocation = (livingInCountry) => {
              if (!livingInCountry) return "No preference";
              if (typeof livingInCountry === "string") {
                if (livingInCountry === "India") return "India";
                if (livingInCountry === "No preference") return "No preference";
                return "Abroad";
              }
              if (Array.isArray(livingInCountry)) {
                const countryValues = livingInCountry.map((c) => c.value || c);
                if (countryValues.includes("India")) return "India";
                return "Abroad";
              }
              return "No preference";
            };

            const partnerLocation = determinePartnerLocation(server.livingInCountry || server.livingInState || expectations.partnerLocation);
            const partnerStateOrCountry = (() => {
              if (partnerLocation === "India") {
                return (server.livingInState || []).map((s) => (s.value || s));
              }
              if (partnerLocation === "Abroad") {
                return (server.livingInCountry || []).map((c) => (c.value || c.label || c));
              }
              return [];
            })();

            const toArray = (v) => (Array.isArray(v) ? v.map((e) => (e.value || e)) : []);

            setExpectations({
              partnerLocation,
              partnerStateOrCountry,
              openToPartnerHabits: server.isConsumeAlcoholic ?? server.openToPartnerHabits ?? expectations.openToPartnerHabits,
              partnerEducation: toArray(server.educationLevel || server.partnerEducation),
              partnerDiet: toArray(server.diet || server.partnerDiet),
              partnerCommunity: toArray(server.community || server.partnerCommunity),
              profession: toArray(server.profession),
              maritalStatus: toArray(server.maritalStatus),
              preferredAgeFrom: server.age?.from !== undefined && server.age?.from !== null ? String(server.age.from) : expectations.preferredAgeFrom,
              preferredAgeTo: server.age?.to !== undefined && server.age?.to !== null ? String(server.age.to) : expectations.preferredAgeTo,
            });
          } catch (refErr) { console.error('Failed to refetch expectations after update', refErr); }

          toast.success('✅ Expectations updated successfully');
        } else {
          await saveUserExpectations(submissionData);
          try {
            const refetch = await getUserExpectations();
            const server = refetch?.data?.data || {};
            // minimal set to update UI
            setExpectations((prev) => ({ ...prev, partnerEducation: server.educationLevel || prev.partnerEducation }));
          } catch (refErr) { console.error('Failed to refetch expectations after save', refErr); }
          toast.success('✅ Expectations saved successfully');
        }

        return;
      }
      if (activeTab === 'education') {
        // Build education payload expected by backend
        const normalize = (v) => (v === undefined || v === null ? "" : String(v));
        const submissionData = {
          SchoolName: normalize(education.schoolName),
          HighestEducation: normalize(education.highestEducation),
          FieldOfStudy: normalize(education.fieldOfStudy),
          University: normalize(education.universityName),
          CountryOfEducation: normalize(education.countryOfEducation),
          OtherCountry: normalize(education.otherCountry),
        };

        // Log submission payload for debugging
        try {
          console.info('Education submissionData ->', submissionData);
        } catch (logErr) {
          console.error('Failed to log education submissionData', logErr);
        }

        const existing = await getEducationalDetails();
        if (existing?.data?.data) {
          const resUpdate = await updateEducationalDetails(submissionData);
          console.info('Education update response ->', resUpdate);
          // Re-fetch from server to verify persistence and update UI
          try {
            const refetch = await getEducationalDetails();
            const server = refetch?.data?.data || {};
            setEducation((prev) => ({
              ...prev,
              schoolName: server.SchoolName || server.schoolName || submissionData.SchoolName,
              highestEducation: server.HighestEducation || server.highestEducation || submissionData.HighestEducation,
              fieldOfStudy:
                server.FieldOfStudy && typeof server.FieldOfStudy === 'object'
                  ? server.FieldOfStudy.value || server.FieldOfStudy.label || String(server.FieldOfStudy)
                  : server.FieldOfStudy || server.fieldOfStudy || submissionData.FieldOfStudy,
              universityName: server.University || server.universityName || server.university || submissionData.University,
              countryOfEducation:
                server.CountryOfEducation && typeof server.CountryOfEducation === 'object'
                  ? server.CountryOfEducation.value || server.CountryOfEducation.label || String(server.CountryOfEducation)
                  : server.CountryOfEducation || server.countryOfEducation || submissionData.CountryOfEducation,
              otherCountry: server.OtherCountry || server.otherCountry || submissionData.OtherCountry,
            }));
          } catch (refetchErr) {
            console.error('Failed to refetch education after update', refetchErr);
          }

          toast.success('✅ Education details updated successfully');
        } else {
          const resSave = await saveEducationalDetails(submissionData);
          console.info('Education save response ->', resSave);
          // Re-fetch to ensure the server persisted the record
          try {
            const refetch = await getEducationalDetails();
            const server = refetch?.data?.data || {};
            setEducation((prev) => ({
              ...prev,
              schoolName: server.SchoolName || server.schoolName || submissionData.SchoolName,
              highestEducation: server.HighestEducation || server.highestEducation || submissionData.HighestEducation,
              fieldOfStudy:
                server.FieldOfStudy && typeof server.FieldOfStudy === 'object'
                  ? server.FieldOfStudy.value || server.FieldOfStudy.label || String(server.FieldOfStudy)
                  : server.FieldOfStudy || server.fieldOfStudy || submissionData.FieldOfStudy,
              universityName: server.University || server.universityName || server.university || submissionData.University,
              countryOfEducation:
                server.CountryOfEducation && typeof server.CountryOfEducation === 'object'
                  ? server.CountryOfEducation.value || server.CountryOfEducation.label || String(server.CountryOfEducation)
                  : server.CountryOfEducation || server.countryOfEducation || submissionData.CountryOfEducation,
              otherCountry: server.OtherCountry || server.otherCountry || submissionData.OtherCountry,
            }));
          } catch (refetchErr) {
            console.error('Failed to refetch education after save', refetchErr);
          }

          toast.success('✅ Education details saved successfully');
        }
        return;
      }

      if (activeTab === 'profession') {
        const normalize = (v) => (v === undefined || v === null ? "" : String(v));
        const submissionData = {
          EmploymentStatus: normalize(profession.employmentStatus),
          Occupation: normalize(profession.occupation),
          AnnualIncome: normalize(profession.annualIncome),
          OrganizationName: normalize(profession.organizationName),
        };

        try {
          console.info('Profession submissionData ->', submissionData);
        } catch (logErr) {
          console.error('Failed to log profession submissionData', logErr);
        }

        const existingProf = await getUserProfession();
        if (existingProf?.data?.data) {
          const resUpdate = await updateUserProfession(submissionData);
          console.info('Profession update response ->', resUpdate);
          try {
            const refetch = await getUserProfession();
            const server = refetch?.data?.data || {};
            setProfession({
              employmentStatus: server.EmploymentStatus || server.employmentStatus || submissionData.EmploymentStatus,
              occupation: server.Occupation || server.occupation || submissionData.Occupation,
              annualIncome: server.AnnualIncome || server.annualIncome || submissionData.AnnualIncome,
              organizationName: server.OrganizationName || server.organizationName || submissionData.OrganizationName,
            });
          } catch (refetchErr) {
            console.error('Failed to refetch profession after update', refetchErr);
          }

          toast.success('✅ Profession details updated successfully');
        } else {
          const resSave = await saveUserProfession(submissionData);
          console.info('Profession save response ->', resSave);
          try {
            const refetch = await getUserProfession();
            const server = refetch?.data?.data || {};
            setProfession({
              employmentStatus: server.EmploymentStatus || server.employmentStatus || submissionData.EmploymentStatus,
              occupation: server.Occupation || server.occupation || submissionData.Occupation,
              annualIncome: server.AnnualIncome || server.annualIncome || submissionData.AnnualIncome,
              organizationName: server.OrganizationName || server.organizationName || submissionData.OrganizationName,
            });
          } catch (refetchErr) {
            console.error('Failed to refetch profession after save', refetchErr);
          }

          toast.success('✅ Profession details saved successfully');
        }
        return;
      }

        if (activeTab === 'lifestyle') {
          const normalize = (v) => (v === undefined || v === null ? "" : String(v));
          const submissionData = {
            diet: normalize(lifestyle.diet),
            isAlcoholic: normalize(lifestyle.drinking) || "",
            isTobaccoUser: normalize(lifestyle.smoking) || "",
            // prefer explicit flag if user set it, otherwise infer from details presence
            isHaveMedicalHistory:
              normalize(lifestyle.isHaveMedicalHistory) || (lifestyle.healthIssues && String(lifestyle.healthIssues).trim() !== '' ? 'yes' : 'no'),
            medicalHistoryDetails: normalize(lifestyle.healthIssues),
            isHaveTattoos: normalize(lifestyle.isHaveTattoos) || "",
            isHaveHIV: normalize(lifestyle.isHaveHIV) || "",
            isPositiveInTB: normalize(lifestyle.isPositiveInTB) || "",
          };

          try {
            console.info('Lifestyle submissionData ->', submissionData);
          } catch (logErr) {
            console.error('Failed to log lifestyle submissionData', logErr);
          }

          const existingHealth = await getUserHealth();
          if (existingHealth?.data?.data) {
            const resUpdate = await updateUserHealth(submissionData);
            console.info('Lifestyle update response ->', resUpdate);
            try {
              const refetch = await getUserHealth();
              const server = refetch?.data?.data || {};
              setLifestyle({
                diet: server.diet || server.Diet || '',
                smoking:
                  (typeof server.isTobaccoUser === 'boolean'
                    ? (server.isTobaccoUser ? 'yes' : 'no')
                    : (server.isTobaccoUser ?? server.isTobacco ?? server.smoking ?? '')),
                drinking:
                  (typeof server.isAlcoholic === 'boolean'
                    ? (server.isAlcoholic ? 'yes' : 'no')
                    : (server.isAlcoholic ?? server.alcoholic ?? server.drinking ?? '')),
                healthIssues: server.medicalHistoryDetails || server.medicalHistory || server.description || '',
                isHaveMedicalHistory:
                  (typeof server.isHaveMedicalHistory === 'boolean'
                    ? (server.isHaveMedicalHistory ? 'yes' : 'no')
                    : (server.isHaveMedicalHistory ?? server.isHaveMedicalHistory ?? '')),
                isHaveTattoos: server.isHaveTattoos || '',
                isHaveHIV: server.isHaveHIV || '',
                isPositiveInTB: server.isPositiveInTB || '',
              });
            } catch (refetchErr) {
              console.error('Failed to refetch lifestyle after update', refetchErr);
            }

            toast.success('✅ Lifestyle details updated successfully');
          } else {
            const resSave = await saveUserHealth(submissionData);
            console.info('Lifestyle save response ->', resSave);
            try {
              const refetch = await getUserHealth();
              const server = refetch?.data?.data || {};
              setLifestyle({
                diet: server.diet || server.Diet || '',
                smoking:
                  (typeof server.isTobaccoUser === 'boolean'
                    ? (server.isTobaccoUser ? 'yes' : 'no')
                    : (server.isTobaccoUser ?? server.isTobacco ?? server.smoking ?? '')),
                drinking:
                  (typeof server.isAlcoholic === 'boolean'
                    ? (server.isAlcoholic ? 'yes' : 'no')
                    : (server.isAlcoholic ?? server.alcoholic ?? server.drinking ?? '')),
                healthIssues: server.medicalHistoryDetails || server.medicalHistory || server.description || '',
                isHaveMedicalHistory:
                  (typeof server.isHaveMedicalHistory === 'boolean'
                    ? (server.isHaveMedicalHistory ? 'yes' : 'no')
                    : (server.isHaveMedicalHistory ?? server.isHaveMedicalHistory ?? '')),
                isHaveTattoos: server.isHaveTattoos || '',
                isHaveHIV: server.isHaveHIV || '',
                isPositiveInTB: server.isPositiveInTB || '',
              });
            } catch (refetchErr) {
              console.error('Failed to refetch lifestyle after save', refetchErr);
            }

            toast.success('✅ Lifestyle details saved successfully');
          }
          return;
        }

      // default: save personal
      const timeOfBirth = personal.birthHour && personal.birthMinute ? `${personal.birthHour}:${personal.birthMinute}` : null;

      const payload = {
        dateOfBirth: personal.dateOfBirth || null,
        timeOfBirth,
        firstName: personal.firstName || undefined,
        middleName: personal.middleName || undefined,
        lastName: personal.lastName || undefined,
        marriedStatus: personal.maritalStatus || undefined,
        height: personal.height || undefined,
        weight: personal.weight || undefined,
        religion: personal.religion || undefined,
        astrologicalSign: personal.rashi || undefined,
        dosh: personal.dosh || undefined,
        subCaste: personal.caste || undefined,
        
        birthPlace: personal.birthCity || undefined,
        birthState: personal.birthState || undefined,
        full_address: {
          street1: personal.street1 || undefined,
          street2: personal.street2 || undefined,
          city: personal.city || undefined,
          state: personal.state || undefined,
          zipCode: personal.pincode || undefined,
          isYourHome: personal.ownHouse === 'Yes',
        },
        nationality: personal.nationality || undefined,
        isResidentOfIndia: personal.residingInIndia === 'yes' ? true : personal.residingInIndia === 'no' ? false : undefined,
        residingCountry: personal.residingCountry || undefined,
        visaType: personal.visaCategory || undefined,
        divorceStatus: personal.divorceStatus || undefined,
        isHaveChildren: personal.hasChildren === 'Yes' ? true : personal.hasChildren === 'No' ? false : undefined,
        numberOfChildren: personal.numChildren ? parseInt(personal.numChildren) : undefined,
        isChildrenLivingWithYou: personal.livingWith === 'With Me' ? true : personal.livingWith === 'No' ? false : undefined,
        separatedSince: personal.separatedSince || undefined,
      };

      await updateUserPersonal(payload);
      toast.success('✅ Personal details saved');
    } catch (err) {
      console.error('Failed to save details', err);
      toast.error('Failed to save details');
    }
  };

  // ---------------------------------------
  // FAMILY handlers
  // ---------------------------------------
  const handleFamilyChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setFamily((prev) => ({ ...prev, [field]: value }));
  };

  const handleFamilyPhoneChange = (field, value) => {
    if (field === 'fatherPhone' || field === 'motherPhone') {
      const digitsOnly = String(value).replace(/\D/g, '');
      setFamily((prev) => ({ ...prev, [field]: digitsOnly }));
    } else {
      setFamily((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSiblingChange = (index, field, value) => {
    setFamily((prev) => {
      const updated = [...(prev.siblings || [])];
      updated[index] = { ...(updated[index] || {}) };
      updated[index][field] = field === 'name' ? String(value).replace(/\b\w/g, (c) => c.toUpperCase()) : value;
      return { ...prev, siblings: updated };
    });
  };

  const handleSiblingCount = (count) => {
    const siblingsArray = Array.from({ length: count }, () => ({ name: '', relation: '', maritalStatus: '' }));
    setFamily((prev) => ({ ...prev, siblingCount: count, siblings: siblingsArray }));
  };

  // EDUCATION handlers
  const handleEducationChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setEducation((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfessionChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setProfession((prev) => ({ ...prev, [field]: value }));
  };

  const handleLifestyleChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setLifestyle((prev) => ({ ...prev, [field]: value }));
  };

  // EXPECTATIONS handlers
  const handleExpectationsTextChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setExpectations((prev) => ({ ...prev, [field]: value }));
  };

  const handleExpectationsArrayChange = (field) => (e) => {
    const raw = e?.target ? e.target.value : e;
    const arr = String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setExpectations((prev) => ({ ...prev, [field]: arr }));
  };

  const handlePartnerLocationChange = (e) => {
    const val = e?.target ? e.target.value : e;
    setExpectations((prev) => ({ ...prev, partnerLocation: val, partnerStateOrCountry: [] }));
  };

  const inputClass =
    "w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition";

  // Helper to treat empty/null/undefined as blank
  const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && String(v).trim() === '');

  // EditableInput: disables input when its current value is blank
  const EditableInput = ({ name, section = 'personal', value, onChange, ...rest }) => {
    const editable = !isBlank(value);
    return <Input name={name} value={value} onChange={onChange} disabled={!editable} {...rest} />;
  };



  const renderPersonalDetails = () => (
    <div className="space-y-6">
      {/* Full Name */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>First Name *</Label>
          <EditableInput value={personal.firstName || ''} onChange={handlePersonalChange('firstName')} className="rounded-md" name="firstName" />
        </div>
        <div>
          <Label>Middle Name</Label>
          <EditableInput value={personal.middleName || ''} onChange={handlePersonalChange('middleName')} className="rounded-md" name="middleName" />
        </div>
        <div>
          <Label>Last Name *</Label>
          <EditableInput value={personal.lastName || ''} onChange={handlePersonalChange('lastName')} className="rounded-md" name="lastName" />
        </div>
      </div>

      {/* Date of Birth split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Date of Birth (DD)</Label>
          <EditableInput value={getDobParts(personal.dateOfBirth).day || ''} onChange={handleDobPartChange('day')} placeholder="DD" maxLength={2} className="rounded-md" name="dateOfBirth_day" />
        </div>
        <div>
          <Label>Date of Birth (MM)</Label>
          <EditableInput value={getDobParts(personal.dateOfBirth).month || ''} onChange={handleDobPartChange('month')} placeholder="MM" maxLength={2} className="rounded-md" name="dateOfBirth_month" />
        </div>
        <div>
          <Label>Date of Birth (YYYY)</Label>
          <EditableInput value={getDobParts(personal.dateOfBirth).year || ''} onChange={handleDobPartChange('year')} placeholder="YYYY" maxLength={4} className="rounded-md" name="dateOfBirth_year" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Time of Birth (HH : MM)</Label>
          <div className="flex gap-2 mt-1">
            <EditableInput name="birthHour" value={personal.birthHour || ''} onChange={handlePersonalChange('birthHour')} placeholder="HH" maxLength={2} className="rounded-md" />
            <EditableInput name="birthMinute" value={personal.birthMinute || ''} onChange={handlePersonalChange('birthMinute')} placeholder="MM" maxLength={2} className="rounded-md" />
          </div>
        </div>
      </div>

      {/* Marital Status */}
      <div>
        <Label>Marital Status *</Label>
        <EditableInput value={personal.maritalStatus || ''} onChange={handlePersonalChange('maritalStatus')} className="rounded-md" name="maritalStatus" />
      </div>

      {/* Height + Weight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Height *</Label>
          <EditableInput value={personal.height || ''} onChange={handlePersonalChange('height')} className="rounded-md" name="height" />
        </div>
        <div>
          <Label>Weight (kg) *</Label>
          <EditableInput type="text" value={personal.weight || ''} onChange={handlePersonalChange('weight')} className="rounded-md" name="weight" />
        </div>
      </div>

      {/* Rashi + Dosh */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Rashi</Label>
          <EditableInput value={personal.rashi || ''} onChange={handlePersonalChange('rashi')} className="rounded-md" name="rashi" />
        </div>
        <div>
          <Label>Dosh</Label>
          <EditableInput value={personal.dosh || ''} onChange={handlePersonalChange('dosh')} className="rounded-md" name="dosh" />
        </div>
      </div>

      {/* Religion + Caste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Religion *</Label>
          <EditableInput value={personal.religion || ''} onChange={handlePersonalChange('religion')} className="rounded-md" name="religion" />
        </div>
        <div>
          <Label>Caste *</Label>
          <EditableInput value={personal.caste || ''} onChange={handlePersonalChange('caste')} className="rounded-md" name="caste" />
        </div>
      </div>

      {/* Birth Place */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Birth City</Label>
          <EditableInput value={personal.birthCity || ''} onChange={handlePersonalChange('birthCity')} className="rounded-md" name="birthCity" />
        </div>
        <div>
          <Label>Birth State</Label>
          <EditableInput value={personal.birthState || ''} onChange={handlePersonalChange('birthState')} className="rounded-md" name="birthState" />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2 mt-4">
        <h4 className="font-medium">Full Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <EditableInput placeholder="Street 1" value={personal.street1 || ''} onChange={handlePersonalChange('street1')} className="rounded-md" name="street1" />
          <EditableInput placeholder="Street 2" value={personal.street2 || ''} onChange={handlePersonalChange('street2')} className="rounded-md" name="street2" />
          <EditableInput placeholder="Pincode" value={personal.pincode || ''} onChange={handlePersonalChange('pincode')} className="rounded-md" name="pincode" />
          <EditableInput placeholder="City" value={personal.city || ''} onChange={handlePersonalChange('city')} className="rounded-md" name="city" />
          <EditableInput placeholder="State" value={personal.state || ''} onChange={handlePersonalChange('state')} className="rounded-md" name="state" />
          <div className="mt-2">
            <Label>Is this your own house?</Label>
            <div className="flex items-center gap-6 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ownHouse"
                  value="Yes"
                  checked={personal.ownHouse === 'Yes'}
                  onChange={() => setPersonal((p) => ({ ...p, ownHouse: 'Yes' }))}
                  disabled={isBlank(personal.ownHouse)}
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${personal.ownHouse === 'Yes' ? 'bg-[#E4C48A] border-[#E4C48A]' : 'border-gray-300'} focus:ring-1 focus:ring-[#E4C48A]`}
                />
                <span className="text-gray-700 text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ownHouse"
                  value="No"
                  checked={personal.ownHouse === 'No'}
                  onChange={() => setPersonal((p) => ({ ...p, ownHouse: 'No' }))}
                  disabled={isBlank(personal.ownHouse)}
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${personal.ownHouse === 'No' ? 'bg-[#E4C48A] border-[#E4C48A]' : 'border-gray-300'} focus:ring-1 focus:ring-[#E4C48A]`}
                />
                <span className="text-gray-700 text-sm">No</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Nationality + Residing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label>Nationality</Label>
          <EditableInput value={personal.nationality || ''} onChange={handlePersonalChange('nationality')} className="rounded-md" name="nationality" />
        </div>
        <div>
          <Label>Currently Residing in India?</Label>
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="residingInIndia"
                value="yes"
                checked={personal.residingInIndia === 'yes'}
                onChange={() => setPersonal((p) => ({ ...p, residingInIndia: 'yes', residingCountry: 'India' }))}
                disabled={isBlank(personal.residingInIndia)}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${personal.residingInIndia === 'yes' ? 'bg-[#E4C48A] border-[#E4C48A]' : 'border-gray-300'} focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="residingInIndia"
                value="no"
                checked={personal.residingInIndia === 'no'}
                onChange={() => setPersonal((p) => ({ ...p, residingInIndia: 'no', residingCountry: '' }))}
                disabled={isBlank(personal.residingInIndia)}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${personal.residingInIndia === 'no' ? 'bg-[#E4C48A] border-[#E4C48A]' : 'border-gray-300'} focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">No</span>
            </label>
          </div>
        </div>
      </div>

      {personal.residingInIndia === 'no' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <Label>Residing Country</Label>
            <EditableInput value={personal.residingCountry || ''} onChange={handlePersonalChange('residingCountry')} className="rounded-md" name="residingCountry" />
          </div>
          <div>
            <Label>Visa Category</Label>
            <EditableInput value={personal.visaCategory || ''} onChange={handlePersonalChange('visaCategory')} className="rounded-md" name="visaCategory" />
          </div>
        </div>
      )}

      {/* Children + Divorce */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label>Do you have children?</Label>
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasChildren"
                value="Yes"
                checked={personal.hasChildren === 'Yes'}
                onChange={() => setPersonal((p) => ({ ...p, hasChildren: 'Yes' }))}
                disabled={isBlank(personal.hasChildren)}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${personal.hasChildren === 'Yes' ? 'bg-[#E4C48A] border-[#E4C48A]' : 'border-gray-300'} focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasChildren"
                value="No"
                checked={personal.hasChildren === 'No'}
                onChange={() => setPersonal((p) => ({ ...p, hasChildren: 'No' }))}
                disabled={isBlank(personal.hasChildren)}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${personal.hasChildren === 'No' ? 'bg-[#E4C48A] border-[#E4C48A]' : 'border-gray-300'} focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">No</span>
            </label>
          </div>
          {personal.hasChildren === 'Yes' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <EditableInput value={personal.numChildren || ''} onChange={handlePersonalChange('numChildren')} placeholder="Number of children" className="rounded-md" name="numChildren" />
              <EditableInput value={personal.livingWith || ''} onChange={handlePersonalChange('livingWith')} placeholder="Living with (With Me/No)" className="rounded-md" name="livingWith" />
            </div>
          )}
        </div>

        <div>
          <Label>Divorce Status</Label>
          <EditableInput value={personal.divorceStatus || ''} onChange={handlePersonalChange('divorceStatus')} className="rounded-md" name="divorceStatus" />
          <div className="mt-2">
            <Label>Separated Since (year)</Label>
            <EditableInput value={personal.separatedSince || ''} onChange={handlePersonalChange('separatedSince')} className="rounded-md" name="separatedSince" />
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------
  // EXPECTATIONS read-only renderer
  // ---------------------------------------
  const renderExpectations = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Preferred Partner Location</Label>
          <select value={expectations.partnerLocation || ''} disabled={isBlank(expectations.partnerLocation)} onChange={handlePartnerLocationChange} className={inputClass}>
            <option value="">Select</option>
            <option value="No preference">No preference</option>
            <option value="India">India</option>
            <option value="Abroad">Abroad</option>
          </select>
        </div>

        <div>
          <Label>Preferred State / Country</Label>
          <EditableInput value={(expectations.partnerStateOrCountry || []).join(', ') || ''} onChange={handleExpectationsArrayChange('partnerStateOrCountry')} className={inputClass} name="partnerStateOrCountry" />
        </div>

        <div>
          <Label>Open To Partner Habits</Label>
          <EditableInput value={expectations.openToPartnerHabits || ''} onChange={handleExpectationsTextChange('openToPartnerHabits')} className={inputClass} name="openToPartnerHabits" />
        </div>

        <div>
          <Label>Preferred Education</Label>
          <EditableInput value={(expectations.partnerEducation || []).join(', ') || ''} onChange={handleExpectationsArrayChange('partnerEducation')} className={inputClass} name="partnerEducation" />
        </div>

        <div>
          <Label>Preferred Diet</Label>
          <EditableInput value={(expectations.partnerDiet || []).join(', ') || ''} onChange={handleExpectationsArrayChange('partnerDiet')} className={inputClass} name="partnerDiet" />
        </div>

        <div>
          <Label>Preferred Community</Label>
          <EditableInput value={(expectations.partnerCommunity || []).join(', ') || ''} onChange={handleExpectationsArrayChange('partnerCommunity')} className={inputClass} name="partnerCommunity" />
        </div>

        <div>
          <Label>Preferred Profession</Label>
          <EditableInput value={(expectations.profession || []).join(', ') || ''} onChange={handleExpectationsArrayChange('profession')} className={inputClass} name="profession_expectations" />
        </div>

        <div>
          <Label>Marital Status Preference</Label>
          <EditableInput value={(expectations.maritalStatus || []).join(', ') || ''} onChange={handleExpectationsArrayChange('maritalStatus')} className={inputClass} name="maritalStatus_expectations" />
        </div>

        <div>
          <Label>Preferred Age From</Label>
          <EditableInput value={expectations.preferredAgeFrom || ''} onChange={handleExpectationsTextChange('preferredAgeFrom')} className={inputClass} name="preferredAgeFrom" />
        </div>

        <div>
          <Label>Preferred Age To</Label>
          <EditableInput value={expectations.preferredAgeTo || ''} onChange={handleExpectationsTextChange('preferredAgeTo')} className={inputClass} name="preferredAgeTo" />
        </div>
      </div>
    </div>
  );

  // ---------------------------------------
  // FAMILY DETAILS TAB
  // ---------------------------------------
  const renderFamilyDetails = () => (
    <div className="space-y-6">
      {/* Parents */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Father's Name</Label>
          <EditableInput placeholder="Enter father's name" value={family.fatherName || ''} onChange={handleFamilyChange('fatherName')} className="rounded-[12px]" name="fatherName" />
        </div>
        <div className="space-y-2">
          <Label>Father's Occupation</Label>
          <EditableInput placeholder="Enter occupation" value={family.fatherProfession || ''} onChange={handleFamilyChange('fatherProfession')} className="rounded-[12px]" name="fatherProfession" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Father's Phone</Label>
          <EditableInput placeholder="Enter father's phone" value={family.fatherPhone || ''} onChange={(e) => handleFamilyPhoneChange('fatherPhone', e.target.value)} className="rounded-[12px]" name="fatherPhone" />
        </div>
        <div className="space-y-2">
          <Label>Father's Native Place</Label>
          <EditableInput placeholder="Native place" value={family.fatherNative || ''} onChange={handleFamilyChange('fatherNative')} className="rounded-[12px]" name="fatherNative" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Mother's Name</Label>
          <EditableInput placeholder="Enter mother's name" value={family.motherName || ''} onChange={handleFamilyChange('motherName')} className="rounded-[12px]" name="motherName" />
        </div>
        <div className="space-y-2">
          <Label>Mother's Occupation</Label>
          <EditableInput placeholder="Enter occupation" value={family.motherProfession || ''} onChange={handleFamilyChange('motherProfession')} className="rounded-[12px]" name="motherProfession" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Mother's Phone</Label>
          <EditableInput placeholder="Enter mother's phone" value={family.motherPhone || ''} onChange={(e) => handleFamilyPhoneChange('motherPhone', e.target.value)} className="rounded-[12px]" name="motherPhone" />
        </div>
        <div className="space-y-2">
          <Label>Mother's Native Place</Label>
          <EditableInput placeholder="Native place" value={family.motherNative || ''} onChange={handleFamilyChange('motherNative')} className="rounded-[12px]" name="motherNative" />
        </div>
      </div>

      {/* Grandparents */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Grand Parents</h4>
        {[
          { label: "Grandfather's Name", key: 'grandFatherName' },
          { label: "Grandmother's Name", key: 'grandMotherName' },
          { label: "Nana's Name", key: 'nanaName' },
          { label: "Nani's Name", key: 'naniName' },
          { label: "Nana's Native Place", key: 'nanaNativePlace' },
        ].map(({ label, key }) => (
          <div className="flex flex-col" key={key}>
            <label className="text-sm font-medium mb-1">{label}</label>
            <input
              type="text"
              name={key}
              placeholder={label}
              value={family[key] || ''}
              onChange={(e) => handleFamilyChange(key)(e)}
              disabled={isBlank(family[key])}
              className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
            />
          </div>
        ))}
      </div>

      {/* Family Type (radio) */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Family Type *</Label>
          <div className="flex items-center gap-6 mt-2">
            {['Joint', 'Nuclear'].map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="familyType"
                  value={type}
                  checked={family.familyType === type}
                  onChange={() => setFamily((prev) => ({ ...prev, familyType: type }))}
                  disabled={isBlank(family.familyType)}
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${family.familyType === type ? 'bg-[#D4A052] border-[#D4A052]' : 'border-gray-300'} focus:ring-1 focus:ring-[#E4C48A]`}
                />
                <span className="text-gray-700 text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div />
      </div>

      {/* Siblings */}
      <div className="space-y-4 mt-4">
        <label className="text-sm font-medium mb-2 block">Do you have any siblings?</label>
        <div className="flex gap-4 items-center">
          {['Yes', 'No'].map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="hasSiblings"
                value={option}
                checked={family.hasSiblings === (option === 'Yes')}
                onChange={() => setFamily((prev) => ({ ...prev, hasSiblings: option === 'Yes', siblingCount: 0, siblings: [] }))}
                disabled={isBlank(family.hasSiblings)}
                className={`appearance-none w-4 h-4 rounded-full border border-[#E4C48A] transition duration-200
            ${
              family.hasSiblings === (option === 'Yes')
                ? 'bg-[#D4A052] border-[#D4A052]'
                : 'border-[#E4C48A]'
            }
            focus:outline-none`}
              />
              <span className="text-gray-700">{option}</span>
            </label>
          ))}
        </div>

        {family.hasSiblings && (
          <div className="mt-3 space-y-3">
            <label className="text-sm font-medium mb-2">How many siblings?</label>
            <select
              value={family.siblingCount}
              onChange={(e) => handleSiblingCount(Number(e.target.value))}
              disabled={isBlank(family.siblingCount)}
              className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
            >
              <option value="">Select</option>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>

            {family.siblings.map((sibling, index) => (
              <div key={index} className="border p-3 rounded-md bg-purple-50 space-y-2">
                <div className="flex flex-col">
                  <label className="text-sm font-medium">Sibling {index + 1} Name</label>
                  <input
                    type="text"
                    placeholder={`Sibling ${index + 1} Name`}
                    value={sibling.name}
                    disabled={isBlank(sibling.name)}
                    onChange={(e) => handleSiblingChange(index, 'name', e.target.value)}
                    className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium">Relation</label>
                  <select
                    value={sibling.relation}
                    disabled={isBlank(sibling.relation)}
                    onChange={(e) => handleSiblingChange(index, 'relation', e.target.value)}
                    className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                  >
                    <option value="">Select</option>
                    <option value="Elder Brother">Elder Brother</option>
                    <option value="Younger Brother">Younger Brother</option>
                    <option value="Elder Sister">Elder Sister</option>
                    <option value="Younger Sister">Younger Sister</option>
                  </select>
                </div>

                {['Elder Brother','Younger Brother','Elder Sister','Younger Sister'].includes(sibling.relation) && (
                  <div className="flex flex-col">
                    <label className="text-sm font-medium">Marital Status</label>
                    <select
                      value={sibling.maritalStatus}
                      disabled={isBlank(sibling.maritalStatus)}
                      onChange={(e) => handleSiblingChange(index, 'maritalStatus', e.target.value)}
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

      {/* Family Location and About Family removed (were dummy data) */}
    </div>
  );

  // ---------------------------------------
  // EDUCATION / CAREER TAB
  // ---------------------------------------
  const renderEducationDetails = () => (
    <div className="space-y-6">
      {/* School Name */}
      <div className="space-y-2">
        <Label>School Name</Label>
        <EditableInput placeholder="Enter your school name" value={education.schoolName || ''} onChange={handleEducationChange('schoolName')} className="rounded-[12px]" name="schoolName" />
      </div>
      {/* Highest Qualification */}
      <div className="space-y-2">
        <Label>Highest Qualification *</Label>
        <EditableInput value={education.highestEducation || ''} onChange={handleEducationChange('highestEducation')} className="rounded-[12px]" name="highestEducation" />
         
      </div>

      {/* Field of Study */}
      <div className="space-y-2">
        <Label>Field of Study</Label>
        <EditableInput placeholder="Field of study" value={education.fieldOfStudy || ''} onChange={handleEducationChange('fieldOfStudy')} className="rounded-[12px]" name="fieldOfStudy" />
      </div>

      {/* University / College */}
      <div className="space-y-2">
        <Label>University / College Name</Label>
        <EditableInput placeholder="Enter university name" value={education.universityName || ''} onChange={handleEducationChange('universityName')} className="rounded-[12px]" name="universityName" />
      </div>

      {/* Country of Education */}
      <div className="space-y-2">
        <Label>Country of Education</Label>
        <select
          value={education.countryOfEducation || ''}
          disabled={isBlank(education.countryOfEducation)}
          onChange={(e) => handleEducationChange('countryOfEducation')(e)}
          className="w-full border border-[#D4A052] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
        >
          <option value="">Select country</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="Other">Other</option>
        </select>
        {education.countryOfEducation === 'Other' && (
          <EditableInput placeholder="Please specify your country" value={education.otherCountry || ''} onChange={handleEducationChange('otherCountry')} className="rounded-[12px] mt-2" name="otherCountry" />
        )}
      </div>

      {/* Occupation, Company and Annual Income removed (were dummy fields) */}
    </div>
  );

  // ---------------------------------------
  // PROFESSION DETAILS TAB
  // ---------------------------------------
  const renderProfessionDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Employment Status</Label>
          <EditableInput value={profession.employmentStatus || ''} onChange={handleProfessionChange('employmentStatus')} className="rounded-md" name="employmentStatus" />
        </div>
        <div>
          <Label>Occupation</Label>
          <EditableInput value={profession.occupation || ''} onChange={handleProfessionChange('occupation')} className="rounded-md" name="occupation" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Annual Income</Label>
          <EditableInput value={profession.annualIncome || ''} onChange={handleProfessionChange('annualIncome')} className="rounded-md" name="annualIncome" />
        </div>
        <div>
          <Label>Organization Name</Label>
          <EditableInput value={profession.organizationName || ''} onChange={handleProfessionChange('organizationName')} className="rounded-md" name="organizationName" />
        </div>
      </div>
    </div>
  );

  // ---------------------------------------
  // LIFESTYLE TAB (controlled inputs)
  // ---------------------------------------
  const renderLifestyleDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Diet</Label>
          <EditableInput value={lifestyle.diet || ''} onChange={handleLifestyleChange('diet')} className={inputClass} name="diet" />
        </div>

        <div>
          <Label>Smoking / Tobacco</Label>
          <EditableInput value={lifestyle.smoking || ''} onChange={handleLifestyleChange('smoking')} className={inputClass} name="smoking" />
        </div>

        <div>
          <Label>Drinking / Alcohol</Label>
          <EditableInput value={lifestyle.drinking || ''} onChange={handleLifestyleChange('drinking')} className={inputClass} name="drinking" />
        </div>

        <div>
          <Label>Have Medical History?</Label>
          <EditableInput value={lifestyle.isHaveMedicalHistory || ''} onChange={handleLifestyleChange('isHaveMedicalHistory')} className={inputClass} name="isHaveMedicalHistory" />
        </div>

        <div>
          <Label>Have Tattoos?</Label>
          <EditableInput value={lifestyle.isHaveTattoos || ''} onChange={handleLifestyleChange('isHaveTattoos')} className={inputClass} name="isHaveTattoos" />
        </div>

        <div>
          <Label>HIV Positive?</Label>
          <EditableInput value={lifestyle.isHaveHIV || ''} onChange={handleLifestyleChange('isHaveHIV')} className={inputClass} name="isHaveHIV" />
        </div>

        <div>
          <Label>Positive in TB?</Label>
          <EditableInput value={lifestyle.isPositiveInTB || ''} onChange={handleLifestyleChange('isPositiveInTB')} className={inputClass} name="isPositiveInTB" />
        </div>

        <div className="md:col-span-2">
          <Label>Medical History Details</Label>
          <Textarea value={lifestyle.healthIssues || ''} onChange={(e) => handleLifestyleChange('healthIssues')(e)} className={inputClass} />
        </div>
      </div>

      {/* Raw server payload removed per request */}
    </div>
  );

  // ---------------------------------------
  // PHOTOS tab renderer
  // ---------------------------------------
  const renderPhotosDetails = () => (
    <div className="space-y-6">
      <div className="text-left mb-4">
        <h3 className="text-2xl font-semibold text-black">Photos</h3>
      </div>
      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {photos.map((src, idx) => (
            <div key={idx} className="flex flex-col items-start">
              <a href={src} target="_blank" rel="noreferrer" className="block w-full h-32 overflow-hidden rounded-md bg-gray-50 mb-2">
                <img src={src} alt={`photo-${idx}`} className="w-full h-full object-cover" />
              </a>
              <div className="w-full flex items-center gap-3">
                <div className="text-sm font-medium">{getPhotoLabel(idx)}</div>
                <button
                  type="button"
                  onClick={() => handleReplacePhoto(idx)}
                  className="ml-auto px-3 py-1 rounded-md bg-[#D4A052] text-white text-sm"
                >
                  {uploadingPhotoIdx === idx ? 'Uploading...' : 'Edit'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No photos uploaded yet.</p>
      )}
    </div>
  );

  // helpers for photo labels and replace
  function getPhotoLabel(index) {
    if (index === 0) return 'Personal Photo';
    if (index === 1) return 'Family Photo';
    if (index === 2) return 'Closer Photo';
    return `Other Photo ${index - 2}`;
  }

  function mapIndexToPhotoType(index) {
    if (index === 0) return 'personal';
    if (index === 1) return 'family';
    if (index === 2) return 'closer';
    return 'other';
  }

  async function uploadToCloudinaryAndSave(file, photoType, index) {
    const CLOUD_NAME = 'dpmdvt00f';
    const UPLOAD_PRESET = 'satfera';
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data?.secure_url) throw new Error('Upload failed');
      const url = data.secure_url;

      // ✅ Use axios instead of fetch - handles authentication automatically
      const body = { photoType, url };
      const axiosInstance = (await import('../../../api/auth')).default || axios;
      const saveRes = await axiosInstance.post(
        `${API_BASE_URL}/user-personal/upload/photos`,
        body
      );
      
      // Check axios response status
      if (!saveRes || saveRes.status < 200 || saveRes.status >= 300) {
        const errorMsg = saveRes?.data?.message || 'Save failed';
        throw new Error(errorMsg);
      }

      setPhotos((prev) => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      toast.success('Photo updated');
    } catch (err) {
      console.error('Replace photo error', err);
      toast.error('Failed to update photo');
    } finally {
      setUploadingPhotoIdx(null);
    }
  }

  function handleReplacePhoto(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setUploadingPhotoIdx(index);
      const photoType = mapIndexToPhotoType(index);
      await uploadToCloudinaryAndSave(file, photoType, index);
    };
    input.click();
  }

  // ---------------------------------------
  // MAIN UI
  // ---------------------------------------
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="bg-white rounded-[24px] shadow-md border border-[#e5e5e5] p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onNavigateBack} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">Edit Profile</h2>
      </div>

      {/* Photos preview moved into Photos tab to avoid showing above header */}

      {/* Tabs */}
      <TabsComponent tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="mt-8">
        {activeTab === 'personal' && renderPersonalDetails()}
        {activeTab === 'family' && renderFamilyDetails()}
        {activeTab === 'education' && renderEducationDetails()}
        {activeTab === 'profession' && renderProfessionDetails()}
        {activeTab === 'lifestyle' && renderLifestyleDetails()}
        {activeTab === 'expectations' && renderExpectations()}
        {activeTab === 'photos' && renderPhotosDetails()}
      </div>

      {/* Action Buttons */}
      <div className="mt-10 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onNavigateBack}
          className="rounded-[12px] px-6 py-3 text-base border-[#C8A227] text-[#C8A227] hover:bg-[#C8A227] hover:text-white transition-colors"
        >
          Cancel
        </Button>
        <Button onClick={handleSave} className="rounded-[12px] px-6 py-3 text-base flex items-center gap-2 bg-[#C8A227] hover:bg-[#B49520] text-white">
          <Save size={18} />
          Save Changes
        </Button>
      </div>
      </div>
    </div>
  );
}
