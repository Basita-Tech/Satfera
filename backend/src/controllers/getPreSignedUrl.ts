import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/awsClient";

export async function getPreSignedUrl(req, res) {
  const key = req.query.filename || "default-img.png";

  const BUCKET_NAME = process.env.PHOTO_BUCKET_NAME || "satfera-assets";

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    res.status(200).json({ success: true, url: url });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}
