import express from "express";
import recommendationRouterV2 from "../../controllers/userController/v2";

const apiV2 = express();

apiV2.use("/", recommendationRouterV2);

export default apiV2;
