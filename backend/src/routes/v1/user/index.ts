import express from "express";
import authRouter from "../auth";
import requestRouter from "./request";
import user from "./user";
import { reportProfileController } from "../../../controllers";
import authenticate from "../../../middleware/authMiddleware";

const userRouter = express();

userRouter.use("/auth", authRouter);
userRouter.use("/", user);
userRouter.use("/requests", requestRouter);

userRouter.post("/report", authenticate, reportProfileController);

export default userRouter;
