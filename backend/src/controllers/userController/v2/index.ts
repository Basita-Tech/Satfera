import express from "express";
import { getMatchesV2 } from "./recommendationController";
import { authenticate as isAuthenticated } from "../../../middleware/authMiddleware";

const router = express.Router();

router.get("/matches", isAuthenticated, getMatchesV2);

export default router;
