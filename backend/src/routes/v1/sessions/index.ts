import { Router } from "express";
import { SessionController } from "../../../controllers/sessionController";
import { authenticate } from "../../../middleware/authMiddleware";

const router = Router();

/**
 * @route GET /api/v1/sessions
 * @desc Get all active sessions/devices for logged-in user
 * @access Private
 */
router.get("/", authenticate, SessionController.getUserSessions);

/**
 * @route DELETE /api/v1/sessions/:sessionId
 * @desc Logout from a specific session/device
 * @access Private
 */
router.delete("/:sessionId", authenticate, SessionController.logoutSession);

/**
 * @route POST /api/v1/sessions/logout-all
 * @desc Logout from all sessions except current
 * @access Private
 */
router.post("/logout-all", authenticate, SessionController.logoutAllSessions);

export default router;
