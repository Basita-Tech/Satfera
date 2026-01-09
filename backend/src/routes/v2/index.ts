import express from "express";
import recommendationRouterV2 from "../../controllers/userController/v2";
import { getPreSignedUrl } from "../../controllers/getPreSignedUrl";

const apiV2 = express();

apiV2.use("/", recommendationRouterV2);

apiV2.get("/pre-signed-url", getPreSignedUrl);

export default apiV2;
