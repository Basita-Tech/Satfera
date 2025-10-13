import { User, IUser } from "../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class AuthService {
  async loginWithEmail(email: string, password: string) {
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const user = await User.findOne({
        email: email.toLowerCase(),
        isActive: true,
        isEmailLoginEnabled: true,
      });

      if (!user) {
        throw new Error("User not found");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || "secret",
        {
          expiresIn: "7d",
        }
      );

      return { user, token };
    } catch (error: any) {
      const message = error?.message || "Authentication failed";
      throw new Error(message);
    }
  }

  async loginWithPhone(phoneNumber: string, password: string) {
    try {
      if (!phoneNumber || !password) {
        throw new Error("Phone number and password are required");
      }
      const user = await User.findOne({
        phoneNumber: phoneNumber,
        isActive: true,
        isMobileLoginEnabled: true,
      });

      if (!user) {
        throw new Error("User not found");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      const token = jwt.sign(
        { id: user._id, phoneNumber: user.phoneNumber },
        process.env.JWT_SECRET || "secret",
        {
          expiresIn: "7d",
        }
      );

      return { user, token };
    } catch (error: any) {
      const message = error?.message || "Authentication failed";
      throw new Error(message);
    }
  }

  async signup(
    data: Partial<IUser> & {
      password: string;
      email: string;
      phoneNumber: string;
    }
  ) {
    try {
      const email = data.email ? data.email.toLowerCase().trim() : undefined;
      const phoneNumber = data.phoneNumber
        ? data.phoneNumber.toString().trim()
        : undefined;

      if (email) {
        const byEmail = await User.findOne({ email });
        if (byEmail) {
          throw new Error("Email already in use");
        }
      }

      if (phoneNumber) {
        const byPhone = await User.findOne({ phoneNumber });
        if (byPhone) {
          throw new Error("Phone number already in use");
        }
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);
      const newUser = new User({
        ...(data as any),
        email,
        phoneNumber,
        password: hashedPassword,
      });

      await newUser.save();

      return newUser.toObject ? newUser.toObject() : newUser;
    } catch (error) {
      const message = (error as any)?.message || "Signup failed";
      throw new Error(message);
    }
  }
}
