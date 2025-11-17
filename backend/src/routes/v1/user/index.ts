import express from "express";
import authRouter from "../auth";
import requestRouter from "./request";
import user from "./user";

const userRouter = express();

userRouter.use("/auth", authRouter);
userRouter.use("/", user);
userRouter.use("/requests", requestRouter);

export default userRouter;
