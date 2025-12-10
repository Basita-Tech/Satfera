import { jsPDF } from "jspdf";
import { getViewProfiles } from "../api/auth";

/**
 * Fetch full profile data from backend using the same API as ProfileDetails.jsx
 */
const fetchFullProfile = async (profileId) => {
  try {
    if (!profileId) {
      console.error("❌ No profile ID provided");
      return null;
    }

    const response = await getViewProfiles(profileId, { useCache: false });

    if (response?.success && response?.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching full profile:", error);
    return null;
  }
};

/**
 * Generate and download a PDF profile card using Satfera biodata format
 * @param {Object} profile - Profile data object (basic data from card)
 */
export const generateProfilePDF = async (profile) => {
  try {
    // Extract profile ID - try multiple possible fields
    const profileId =
      profile.userId || profile.customId || profile.id || profile._id;

    // Always fetch full profile data to ensure we have complete information
    let fullProfile = profile;

    if (profileId) {
      const fetchedProfile = await fetchFullProfile(profileId);

      if (fetchedProfile) {
        fullProfile = fetchedProfile;
      } else {
        console.warn("⚠️ Failed to fetch full profile, using card data");
      }
    } else {
      console.warn("⚠️ No profile ID found in any field, using card data only");
    }

    // Validate we have at least basic profile data
    const personalData = fullProfile.personal || {};
    if (
      !fullProfile ||
      (!fullProfile.name && !personalData.firstName && !fullProfile.firstName)
    ) {
      console.error("❌ No valid profile data available for PDF generation");
      return { success: false, error: "No profile data available" };
    }

    const doc = new jsPDF();

    // Set up PDF styling
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const leftCol = margin + 3;
    let yPosition = 18;

    // Helper function to draw decorative outer border on any page
    const drawPageBorder = () => {
      doc.setDrawColor(200, 162, 39);
      doc.setLineWidth(3);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    };

    // Draw border on first page
    drawPageBorder();

    yPosition = 20;

    // Title - BIODATA
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 162, 39);
    doc.text("APPROVED MATCH PROFILE", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 10;

    // Helper function to add profile photo
    const addProfilePhoto = async (photoUrl) => {
      if (!photoUrl) return false;

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";

        return new Promise((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL("image/jpeg");

              // Add photo at top right with border
              const imgWidth = 38;
              const imgHeight = 48;
              const imgX = pageWidth - margin - imgWidth - 3;
              const imgY = yPosition;

              // Add image first
              doc.addImage(imgData, "JPEG", imgX, imgY, imgWidth, imgHeight);

              // Draw golden border touching the photo
              doc.setDrawColor(200, 162, 39);
              doc.setLineWidth(2.5);
              doc.rect(imgX, imgY, imgWidth, imgHeight);

              resolve(true);
            } catch (e) {
              console.warn("Error processing image:", e);
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          img.src = photoUrl;
        });
      } catch (e) {
        console.warn("Could not load profile photo:", e);
        return false;
      }
    };

    // Helper function to check if new page is needed
    const checkPageBreak = (neededSpace = 15) => {
      if (yPosition > pageHeight - neededSpace - 20) {
        doc.addPage();
        drawPageBorder();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Helper function to add section header
    const addSectionHeader = (title) => {
      checkPageBreak(20); // Ensure section header doesn't get cut
      yPosition += 5;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 162, 39);
      doc.text(title, leftCol, yPosition);
      yPosition += 6;
    };

    // Helper function to add field in two-column layout
    const addFieldTwoColumn = (label1, value1, label2, value2) => {
      checkPageBreak(15); // Check before adding field

      const col1X = leftCol;
      const col2X = pageWidth / 2 + 5;
      const labelWidth = 35;
      const maxValueWidth = pageWidth / 2 - labelWidth - 15;

      doc.setFontSize(9);

      // Left column
      if (value1) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(label1, col1X, yPosition);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const lines1 = doc.splitTextToSize(String(value1), maxValueWidth);
        doc.text(lines1, col1X, yPosition + 4);
      }

      // Right column
      if (value2 && label2) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(label2, col2X, yPosition);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const lines2 = doc.splitTextToSize(String(value2), maxValueWidth);
        doc.text(lines2, col2X, yPosition + 4);
      }

      yPosition += 10;
    };

    // Helper function for single field (full width)
    const addFieldSingle = (label, value) => {
      if (!value) return;

      checkPageBreak(15); // Check before adding field

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(label, leftCol, yPosition);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const maxWidth = pageWidth - leftCol - 60;
      const lines = doc.splitTextToSize(String(value), maxWidth);
      doc.text(lines, leftCol, yPosition + 3);

      yPosition += lines.length > 1 ? 8 + lines.length * 3 : 10;
    };

    // Add profile photo if available
    const photoUrl = fullProfile.closerPhoto?.url || fullProfile.image;
    if (photoUrl) {
      await addProfilePhoto(photoUrl);
    }

    // Helper to capitalize text
    const capitalize = (str) => {
      if (!str) return "";
      return String(str).charAt(0).toUpperCase() + String(str).slice(1);
    };

    // Helper to format age from DOB
    const formatAgeFromDob = (dob) => {
      if (!dob) return "";
      const birthDate = new Date(dob);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      return `${age} years`;
    };

    // SECTION: BASIC INFORMATION
    addSectionHeader("Personal Information");

    const personal = fullProfile.personal || {};

    // Handle name from different sources - check personal object first
    let fullName = "N/A";
    if (personal.firstName) {
      fullName = [personal.firstName, personal.middleName, personal.lastName]
        .filter(Boolean)
        .join(" ");
    } else if (fullProfile.firstName) {
      fullName = [
        fullProfile.firstName,
        fullProfile.middleName,
        fullProfile.lastName,
      ]
        .filter(Boolean)
        .join(" ");
    } else if (fullProfile.name) {
      fullName = fullProfile.name;
    }

    addFieldSingle("Name", fullName);

    // Handle date of birth and age - check personal object first
    const dob = personal.dateOfBirth || fullProfile.dateOfBirth;
    if (dob) {
      const birthDate = new Date(dob);
      const formattedDate = birthDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      addFieldTwoColumn(
        "Date of Birth",
        formattedDate,
        "Age",
        formatAgeFromDob(dob)
      );
    } else if (fullProfile.age) {
      const genderText =
        personal.gender || fullProfile.gender
          ? capitalize(personal.gender || fullProfile.gender)
          : "";
      addFieldTwoColumn(
        "Age",
        `${fullProfile.age} years`,
        "Gender",
        genderText
      );
    }

    // Gender (if not already added)
    const gender = personal.gender || fullProfile.gender;
    if (gender && !dob && !fullProfile.age) {
      addFieldSingle("Gender", capitalize(gender));
    }

    // Compatibility Score
    const compatibility =
      fullProfile.scoreDetail?.score || fullProfile.compatibility;
    if (compatibility) {
      const compatibilityText = `${compatibility}% Match`;
      addFieldSingle("Compatibility Score", compatibilityText);
    }

    // Add custom ID if available
    const customId = fullProfile.customId;
    if (customId) {
      addFieldSingle("Profile ID", customId);
    }

    // SECTION: PERSONAL DETAILS
    addSectionHeader("Personal Details");

    // Birth Place & State (personal already declared above)
    if (personal.birthPlace || personal.birthState) {
      const birthPlace = [personal.birthPlace, personal.birthState]
        .filter(Boolean)
        .join(", ");
      addFieldSingle("Birth Place", birthPlace);
    }

    // Time of Birth
    if (personal.timeOfBirth) {
      addFieldSingle("Time of Birth", personal.timeOfBirth);
    }

    // Marital Status
    if (personal.marriedStatus) {
      addFieldSingle("Marital Status", personal.marriedStatus);
    }

    // Height & Weight
    if (personal.height || personal.weight) {
      addFieldTwoColumn("Height", personal.height, "Weight", personal.weight);
    }

    // Complexion
    if (personal.complexion) {
      addFieldSingle("Complexion", capitalize(personal.complexion));
    }

    // Has Children
    if (personal.hasChildren !== undefined) {
      addFieldSingle("Has Children", personal.hasChildren ? "Yes" : "No");
    }

    // Divorce Status
    if (personal.divorceStatus) {
      addFieldSingle("Divorce Status", capitalize(personal.divorceStatus));
    }

    // Mother Tongue
    if (personal.motherTongue) {
      addFieldSingle("Mother Tongue", capitalize(personal.motherTongue));
    }

    // Religion & Caste
    const religion = capitalize(personal.religion || fullProfile.religion);
    const caste = capitalize(
      personal.caste || personal.subCaste || fullProfile.caste
    );

    if (religion || caste) {
      addFieldTwoColumn("Religion", religion, "Caste", caste);
    }

    // Sub Caste
    if (personal.subCaste && personal.subCaste !== caste) {
      addFieldSingle("Sub Caste", capitalize(personal.subCaste));
    }

    // Astrological Sign & Dosh
    if (personal.astrologicalSign || personal.dosh) {
      addFieldTwoColumn(
        "Astrological Sign",
        personal.astrologicalSign || "—",
        "Dosh",
        personal.dosh || "—"
      );
    }

    // Open to Inter-religion Marriage
    if (personal.marryToOtherReligion !== undefined) {
      addFieldSingle(
        "Open to Inter-religion Marriage",
        personal.marryToOtherReligion ? "Yes" : "No"
      );
    }

    // Nationality
    if (personal.nationality) {
      addFieldSingle("Nationality", personal.nationality);
    }

    // Country
    if (personal.country) {
      addFieldSingle("Country", personal.country);
    }

    // Current Location (City, State)
    const city = personal.city || fullProfile.city;
    const state = personal.state;

    if (city || state) {
      const location = [city, state].filter(Boolean).join(", ");
      addFieldSingle("Current Location", location);
    }

    // SECTION: FAMILY DETAILS
    const family = fullProfile.family || {};
    if (family.fatherName || family.motherName) {
      addSectionHeader("Family Details");

      if (family.fatherName || family.fatherOccupation) {
        addFieldTwoColumn(
          "Father's Name",
          capitalize(family.fatherName),
          "Father's Occupation",
          capitalize(family.fatherOccupation)
        );
      }

      if (family.fatherNativePlace) {
        addFieldSingle(
          "Father's Native Place",
          capitalize(family.fatherNativePlace)
        );
      }

      if (family.motherName || family.motherOccupation) {
        addFieldTwoColumn(
          "Mother's Name",
          capitalize(family.motherName),
          "Mother's Occupation",
          capitalize(family.motherOccupation)
        );
      }

      if (family.grandFatherName || family.nanaName) {
        addFieldTwoColumn(
          "Paternal Grandfather",
          capitalize(family.grandFatherName),
          "Maternal Grandfather",
          capitalize(family.nanaName)
        );
      }

      if (family.nanaNativePlace) {
        addFieldSingle(
          "Maternal Grandfather's Native Place",
          capitalize(family.nanaNativePlace)
        );
      }

      if (family.grandMotherName || family.naniName) {
        addFieldTwoColumn(
          "Paternal Grandmother",
          capitalize(family.grandMotherName),
          "Maternal Grandmother",
          capitalize(family.naniName)
        );
      }

      if (family.familyType) {
        addFieldSingle("Family Type", capitalize(family.familyType));
      }

      if (family.siblings !== undefined) {
        addFieldSingle("Number of Siblings", String(family.siblings));
      }

      if (
        family.siblingDetails &&
        Array.isArray(family.siblingDetails) &&
        family.siblingDetails.length > 0
      ) {
        checkPageBreak(20);
        yPosition += 3;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text("Sibling Details:", leftCol, yPosition);
        yPosition += 5;

        family.siblingDetails.forEach((sibling, index) => {
          checkPageBreak(10); // Check before each sibling entry
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          const siblingInfo = `${index + 1}. ${sibling.gender || ""} - ${
            sibling.marriedStatus || ""
          } ${sibling.occupation ? ", " + sibling.occupation : ""}`;
          doc.text(siblingInfo, leftCol + 3, yPosition);
          yPosition += 5;
        });
      }
    }

    // SECTION: EDUCATION DETAILS
    const education = fullProfile.education || {};
    if (
      education.HighestEducation ||
      education.SchoolName ||
      education.University
    ) {
      addSectionHeader("Education Details");

      // School Name
      if (education.SchoolName) {
        addFieldSingle("School", education.SchoolName);
      }

      // Highest Qualification
      if (education.HighestEducation) {
        addFieldSingle("Highest Qualification", education.HighestEducation);
      }

      // University / College
      if (education.University) {
        addFieldSingle("University / College", education.University);
      }

      // Field of Study
      if (education.FieldOfStudy) {
        addFieldSingle("Field of Study", education.FieldOfStudy);
      }

      // Country of Education
      if (education.CountryOfEducation) {
        addFieldSingle("Country of Education", education.CountryOfEducation);
      }
    }

    // SECTION: PROFESSIONAL DETAILS
    const professional = fullProfile.professional || {};
    const occupation = professional.Occupation || fullProfile.profession;

    if (
      occupation ||
      professional.EmploymentStatus ||
      professional.OrganizationName ||
      professional.AnnualIncome
    ) {
      addSectionHeader("Professional Details");

      // Employment Status
      if (professional.EmploymentStatus) {
        addFieldSingle(
          "Employment Status",
          capitalize(professional.EmploymentStatus)
        );
      }

      // Company
      if (professional.OrganizationName) {
        addFieldSingle("Company", professional.OrganizationName);
      }

      // Job Title (Occupation)
      if (occupation) {
        addFieldSingle("Job Title", occupation);
      }

      // Annual Income
      if (professional.AnnualIncome) {
        addFieldSingle("Annual Income", professional.AnnualIncome);
      }
    }

    // SECTION: DIET (Only from Health & Lifestyle)
    const health = fullProfile.healthAndLifestyle || {};
    if (health.diet) {
      yPosition += 5;
      addSectionHeader("Dietary Preference");
      addFieldSingle("Diet", capitalize(health.diet));
    }

    // Add connection date
    const connectionDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    yPosition += 10;

    addSectionHeader("Connection Details");
    addFieldSingle("Match Approved On", connectionDate);
    addFieldSingle("Connection Status", "Both Parties Approved ✓");

    // Footer
    const footerY = pageHeight - 20;
    doc.setFillColor(249, 245, 237);
    doc.rect(0, footerY - 5, pageWidth, 25, "F");

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Generated from Satfera - Approved Match",
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
    doc.text(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      pageWidth / 2,
      footerY + 5,
      { align: "center" }
    );

    // Save the PDF
    const fileName = `${(profile.name || "profile").replace(
      /\s+/g,
      "_"
    )}_Approved_${Date.now()}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return { success: false, error: error.message };
  }
};
