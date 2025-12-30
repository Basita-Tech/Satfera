import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import random from "random-indian-name";
import { User } from "../models/User";
import { UserPersonal } from "../models/User_personal";
import { UserFamily } from "../models/User_family";
import { UserEducation } from "../models/User_educations";
import { UserProfession } from "../models/User_professions";
import { UserHealth } from "../models/User_health";
import { UserExpectations } from "../models/User_expectations";
import { Profile } from "../models/Profile";
import { env } from "../config";

const TOTAL_USERS = 5_000;
const BATCH_SIZE = 500;

const genders = ["male", "female"] as const;
const religions = ["Hindu", "Jain"];

const CASTES = [
  "Patel-Desai",
  "Patel-Kadva",
  "Patel-Leva",
  "Patel",
  "Brahmin-Audichya",
  "Brahmin",
  "Jain-Digambar",
  "Jain-Swetamber",
  "Jain-Vanta",
  "Vaishnav-Vania"
];

const maritalStatuses = [
  "Any",
  "Never Married",
  "Divorced",
  "Widowed",
  "Separated",
  "Awaiting Divorce"
];

const professions = [
  "Software Engineer",
  "Web Developer",
  "DevOps Engineer",
  "Data Analyst",
  "Teacher",
  "Professor",
  "Doctor",
  "Nurse",
  "Business Analyst",
  "HR",
  "Sales Executive",
  "Project Manager",
  "UX Designer",
  "Entrepreneur"
];

const employmentStatus = ["private sector", "government", "self-employed"];

const diet = [
  "vegetarian",
  "non-vegetarian",
  "eggetarian",
  "jain",
  "swaminarayan",
  "veg & non-veg"
];

const professionalQualifiedLevels = [
  "High School",
  "Undergraduate",
  "Bachelors",
  "Honours Degree",
  "Masters",
  "Doctorate",
  "Diploma"
];

const educationOptionsByLevel: Record<string, string[]> = {
  "High School": ["Science Stream", "Commerce Stream", "Arts Stream"],
  Undergraduate: [
    "BCA - Bachelor of Computer Applications",
    "B.Sc. - Bachelor of Science",
    "B.Com. - Bachelor of Commerce",
    "B.A. - Bachelor of Arts",
    "B.Tech. - Bachelor of Technology"
  ],
  Bachelors: [
    "B.E. - Bachelor of Engineering",
    "BBA - Bachelor of Business Administration",
    "LLB - Bachelor of Laws",
    "MBBS - Bachelor of Medicine"
  ],
  "Honours Degree": ["B.Tech. (Hons)", "B.Sc. (Hons)", "B.Com. (Hons)"],
  Masters: [
    "M.Tech - Master of Technology",
    "MBA - Master of Business Administration",
    "M.Sc - Master of Science",
    "MCA - Master of Computer Applications",
    "LLM - Master of Laws"
  ],
  Doctorate: [
    "Ph.D. - Doctor of Philosophy",
    "DM - Doctor of Medicine",
    "D.Sc - Doctor of Science"
  ],
  Diploma: [
    "Diploma in Engineering",
    "Diploma in Computer Applications",
    "Diploma in Management"
  ]
};
const steps = [
  "personal",
  "family",
  "education",
  "profession",
  "health",
  "expectation",
  "photos"
];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startYear = 1980, endYear = 2002): Date {
  const start = new Date(`${startYear}-01-01`).getTime();
  const end = new Date(`${endYear}-12-31`).getTime();
  return new Date(start + Math.random() * (end - start));
}

function closerPhoto(gender: "male" | "female", index: number) {
  return gender === "male"
    ? `https://randomuser.me/api/portraits/men/${index % 100}.jpg`
    : `https://randomuser.me/api/portraits/women/${index % 100}.jpg`;
}

function personalPhoto(gender: "male" | "female", index: number) {
  return gender === "male"
    ? `https://randomuser.me/api/portraits/men/${index % 100}.jpg`
    : `https://randomuser.me/api/portraits/women/${index % 100}.jpg`;
}

function picsumPhoto(id: number, w = 600, h = 400) {
  return `https://picsum.photos/id/${id % 1084}/${w}/${h}`;
}

function familyPhoto(index: number) {
  return {
    url: picsumPhoto(300 + index, 600, 400),
    uploadedAt: new Date()
  };
}

function otherPhotos(index: number) {
  return [
    {
      title: "Lifestyle",
      url: picsumPhoto(400 + index, 600, 400),
      uploadedAt: new Date()
    },
    {
      title: "Travel",
      url: picsumPhoto(500 + index, 600, 400),
      uploadedAt: new Date()
    }
  ];
}

async function seed() {
  await mongoose.connect(env.MONGO_URI);
  console.log("Database connected:", mongoose.connection.name);

  const passwordHash = await bcrypt.hash("Sanjay@1", 10);

  for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
    const users = [];
    const personals = [];
    const families = [];
    const educations = [];
    const professionsArr = [];
    const healths = [];
    const expectations = [];
    const profiles = [];

    for (let j = 0; j < BATCH_SIZE && i + j < TOTAL_USERS; j++) {
      const index = i + j;
      const userId = new mongoose.Types.ObjectId();
      const gender = randomItem(genders);

      const highestEducation = randomItem(professionalQualifiedLevels);
      const fieldOfStudy = randomItem(
        educationOptionsByLevel[highestEducation]
      );

      users.push({
        _id: userId,
        firstName: random({ first: true, gender }),
        lastName: random({ last: true }),
        gender,
        phoneNumber: `90000${String(index).padStart(5, "0")}`,
        email: `user${index}@a.com`,
        password: passwordHash,
        isActive: true,
        isDeleted: false,
        isProfileApproved: true,
        profileReviewStatus: "approved",
        isEmailVerified: true,
        dateOfBirth: randomDate(),
        lastLoginAt: new Date(),
        customId: `SF-${index}`,
        completedSteps: steps,
        isOnboardingCompleted: true
      });

      personals.push({
        userId,
        religion: randomItem(religions),
        marriedStatus: randomItem(maritalStatuses),
        subCaste: randomItem(CASTES),
        nationality: "Indian",
        isResidentOfIndia: true,
        residingCountry: "India",
        height: `4'10" / 147 cm`,
        weight: "42 kg / 93 lbs",
        full_address: {
          city: "Ahmedabad",
          state: "Gujarat",
          zipCode: "380001",
          isYourHome: true
        }
      });

      families.push({
        userId,
        fatherName: "Ramesh Patel",
        motherName: "Sita Patel",
        familyType: "Joint",
        haveSibling: true,
        howManySiblings: 2
      });

      educations.push({
        userId,
        HighestEducation: highestEducation,
        FieldOfStudy: fieldOfStudy,
        University: "GTU",
        CountryOfEducation: "India"
      });

      professionsArr.push({
        userId,
        EmploymentStatus: randomItem(employmentStatus),
        Occupation: randomItem(professions),
        AnnualIncome: "6-10 LPA",
        OrganizationName: "Private Ltd"
      });

      healths.push({
        userId,
        isAlcoholic: "no",
        isTobaccoUser: "no",
        isHaveHIV: "no",
        isPositiveInTB: "no",
        isHaveMedicalHistory: "no",
        diet: randomItem(diet)
      });

      expectations.push({
        userId,
        age: { from: 21, to: 30 },
        maritalStatus: randomItem(maritalStatuses),
        isConsumeAlcoholic: "no",
        educationLevel: highestEducation,
        community: randomItem(CASTES),
        livingInCountry: [],
        livingInState: ["Gujarat"],
        profession: randomItem(professions),
        diet: randomItem(diet)
      });

      profiles.push({
        userId,
        isVerified: true,
        ProfileViewed: Math.floor(Math.random() * 100),
        photos: {
          closerPhoto: {
            url: closerPhoto(gender, index),
            uploadedAt: new Date()
          },

          personalPhotos: Array.from({ length: 3 }).map((_, i) => ({
            url: personalPhoto(gender, index + i + 10),
            uploadedAt: new Date()
          })),

          familyPhoto: familyPhoto(index),
          otherPhotos: otherPhotos(index)
        }
      });
    }

    await Promise.all([
      User.insertMany(users),
      UserPersonal.insertMany(personals),
      UserFamily.insertMany(families),
      UserEducation.insertMany(educations),
      UserProfession.insertMany(professionsArr),
      UserHealth.insertMany(healths),
      UserExpectations.insertMany(expectations),
      Profile.insertMany(profiles)
    ]);

    console.log(`Inserted ${Math.min(i + BATCH_SIZE, TOTAL_USERS)} users`);
  }

  console.log("Seeding completed successfully");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
