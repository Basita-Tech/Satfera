import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { AuthenticatedRequest, JWTPayload } from "../types";

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers?.authorization || "";
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader || req.cookies?.token;

    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    try {
      const decoded = verifyToken(token);
      if (!decoded?.id)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized Access" });

      const user = await User.findById(decoded.id).select(
        "email role phoneNumber isDeleted"
      );
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "User not found" });

      if ((user as any).isDeleted) {
        return res.status(403).json({
          success: false,
          message:
            "Account has been deleted. Please contact support or create a new account."
        });
      }

      const emailFromToken = (decoded as any).email;
      const phoneFromToken = (decoded as any).phoneNumber;

      req.user = {
        id: String(user._id),
        role: (user as any).role || "user",
        email: emailFromToken || user.email,
        phoneNumber: phoneFromToken || (user as any).phoneNumber
      };
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: (error as any)?.message || "Invalid token"
      });
    }

    return next();
  } catch (e: any) {
    return res
      .status(401)
      .json({ success: false, message: e?.message || "Authentication failed" });
  }
};

export default authenticate;
