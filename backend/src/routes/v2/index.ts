import express from "express";
import recommendationRouterV2 from "../../controllers/userController/v2";
import { getPreSignedUrl } from "../../controllers/getPreSignedUrl";
import authenticate from "../../middleware/authMiddleware";
import { asyncHandler } from "../../utils/utils";
import { updatePhotoController } from "../../controllers/userController/v2/uploadPhoto";

const apiV2 = express();

apiV2.use("/", recommendationRouterV2);

apiV2.get("/pre-signed-url", asyncHandler(getPreSignedUrl));

apiV2.put("/upload/photos", authenticate, asyncHandler(updatePhotoController));

export default apiV2;
