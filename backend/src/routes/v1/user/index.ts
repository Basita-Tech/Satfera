import express from "express";
import authRouter from "../auth";
import requestRouter from "./request";
import user from "./user";
import { reportProfileController } from "../../../controllers";
import authenticate from "../../../middleware/authMiddleware";
import { apiGatewayLimiter } from "../../../middleware/redisRateLimiter";
import userSupportRouter from "./support";

const userRouter = express();

userRouter.use("/auth", authRouter);

// userRouter.use(apiGatewayLimiter);

userRouter.use("/requests", requestRouter);
userRouter.use("/", user);
userRouter.use("/support", userSupportRouter);

userRouter.post("/report", authenticate, reportProfileController);

export default userRouter;
