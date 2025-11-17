import express from "express";
import userRouter from "./user";
import adminRouter from "./admin";
import recommendationRouter from "./user/recommendation";

const apiV1 = express();

apiV1.use("/", userRouter);
apiV1.use("/admin", adminRouter);
apiV1.use("/", recommendationRouter);

export default apiV1;
