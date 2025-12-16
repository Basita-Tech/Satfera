import mongoose from "mongoose";
import { Profile, User } from "../models";
import bcrypt from "bcryptjs";
import { env } from "../config";

async function seedAdminUser() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Database connected successfully.");

    const hasedPassword = bcrypt.hashSync("Password@1", 10);

    const adminUser = {
      firstName: "Admin",
      lastName: "User",
      gender: "male",
      role: "admin",
      phoneNumber: "+911123654785",
      password: hasedPassword,
      email: "admin@gmail.com",
      isEmailLoginEnabled: true,
      isMobileLoginEnabled: false,
      for_Profile: "myself",
      isEmailVerified: true,
      isPhoneVerified: false,
      welcomeSent: true
    };

    const existingUser = await User.findOne({ email: adminUser.email });
    if (existingUser) {
      console.log("Admin user already exists. Skipping insertion.");
      process.exit(0);
    }

    const seedUser = await User.create(adminUser);
    await Profile.create({ userId: seedUser.id });
    console.log("Admin user seeded:", seedUser);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

seedAdminUser();
