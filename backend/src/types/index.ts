import { Request as ExpressRequest } from "express";

export interface LoginRequest {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface JWTPayload {
  id: string;
  email?: string;
  phoneNumber?: string;
  role: "user" | "admin";
  firstName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export type AuthenticatedRequest = ExpressRequest;

export type CreateUserPersonalInput = {
  userId: string;
  dateOfBirth: Date;
  timeOfBirth?: string;
  height?: number;
  weight?: number;
  astrologicalSign: string;
  birthPlace?: string;
  religion: string;
  marriedStatus: string;
  marryToOtherReligion?: boolean;
  full_address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    isYourHome?: boolean;
  };
  nationality: string;
  isResidentOfIndia: boolean;
  isHaveChildren?: boolean;
  numberOfChildren?: number;
  occupation: string;
  isChildrenLivingWithYou?: boolean;
  isYouLegallySeparated?: boolean;
  separatedSince?: string;
};

export type ScoreDetail = { score: number; reasons: string[] };

export type MatchingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "blocked"
  | null;

export interface ListingProfile {
  userId: string;
  firstName: string;
  lastName: string;
  age?: number;
  photos?: string[];
  city?: string;
  state?: string;
  country?: string;
  religion?: string;
  subCaste?: string;
  status: MatchingStatus;
}

export interface CandidateDataMaps {
  personal?: Record<string, any>;
  education?: Record<string, any>;
  profession?: Record<string, any>;
  health?: Record<string, any>;
}

export interface PreloadedScoreData {
  seeker?: any;
  seekerExpect?: any;
  candidate?: any;
  candidatePersonal?: any;
  candidateHealth?: any;
  candidateEducation?: any;
  candidateProfession?: any;
}

export interface NotificationJobData {
  notificationId: string;
  channels?: ("email" | "push" | "inapp")[];
  userId?: string;
}

export interface WelcomeEmailJobData {
  userId: string;
  email: string;
  userName: string;
  username: string;
  loginLink: string;
}

export interface ReviewEmailJobData {
  userId: string;
  email: string;
  userName: string;
  type: "submission" | "approved" | "rejected";
  reason?: string;
  dashboardLink?: string;
}

export interface ProfileReviewJobData {
  profileId: string;
  userId: string;
  email: string;
  userName: string;
  type: "submitted" | "approved" | "rejected";
  reason?: string;
}

export type AllJobData =
  | NotificationJobData
  | WelcomeEmailJobData
  | ReviewEmailJobData
  | ProfileReviewJobData;

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}
