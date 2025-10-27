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
