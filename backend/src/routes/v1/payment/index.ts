import express from "express";
import { paymentCompleteController } from "../../../controllers/paymentController";

const router = express();

router.post("/complete", paymentCompleteController);

export default router;
