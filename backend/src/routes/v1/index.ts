import express from "express";
import userRouter from "./user";
import adminRouter from "../../admin/routes";
import recommendationRouter from "./user/recommendation";
import sessionsRouter from "./sessions";
import paymentRouter from "./payment";
import expoApp from "../../expo";

const apiV1 = express();

apiV1.use("/", userRouter);
apiV1.use("/admin", adminRouter);
apiV1.use("/", recommendationRouter);
apiV1.use("/sessions", sessionsRouter);
apiV1.use("/payment", paymentRouter);
apiV1.use("/", expoApp);

export default apiV1;
