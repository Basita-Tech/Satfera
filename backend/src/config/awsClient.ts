import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandOutput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import fs from "fs";
import { Upload } from "@aws-sdk/lib-storage";

export interface UploadResponse {
  url: string;
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

function getFileType(fileBuffer: Buffer, filename: string): "image" | "pdf" {
  if (fileBuffer.length >= 4) {
    const pdfSignature = [0x25, 0x50, 0x44, 0x46];
    if (pdfSignature.every((byte, index) => fileBuffer[index] === byte)) {
      return "pdf";
    }
  }

  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    return "pdf";
  }

  return "image";
}

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.S3_BUCKET || "";
const accessKeyId = process.env.AWS_ACCESS_KEY || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  }
});

export function getUserFileKey(userId: string, photoType: string): string {
  return `satfera=${photoType}/${userId}`;
}

export async function uploadImageToS3(
  key: string,
  img: object
): Promise<PutObjectCommandOutput> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: img as Buffer
  });

  const response = await s3Client.send(command);
  return response;
}

export async function deleteImageFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  await s3Client.send(command);
}

const generateWebFormS3URL = async (event) => {
  try {
    let KEY = event.key;

    const client = new S3Client({ region: AWS_REGION });
    const command = new PutObjectCommand({ Bucket: "satfera-pdf", Key: KEY });

    const presignedUrl = await getSignedUrl(client, command, {
      expiresIn: 360
    });
    console.log("Presigned URL:", presignedUrl);

    return {
      status: "Success",
      message: presignedUrl
    };
  } catch (err) {
    console.error(err);
    throw new Error(err);
  }
};

async function getSignedDownloadUrl(path) {
  let command = new GetObjectCommand({ Bucket: "satfera-pdf", Key: path });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

async function getSignedUploadUrl(path) {
  let command = new PutObjectCommand({ Bucket: "satfera-pdf", Key: path });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export const uploadPdfToS3 = async (bucketName, pdfBuffer, userId) => {
  const fileKey = `${userId}-biodata.pdf`;

  const uploadParams = {
    Bucket: bucketName,
    Key: fileKey,
    Body: pdfBuffer,
    ContentType: "application/pdf"
  };

  try {
    const parallelUploads3 = new Upload({
      client: s3Client,
      params: uploadParams,
      tags: [
        { Key: "public", Value: "true" },
        { Key: "category", Value: "biodata-pdf" }
      ]
    });

    parallelUploads3.on("httpUploadProgress", (progress) => {
      console.log(`Uploaded ${progress.loaded} of ${progress.total} bytes`);
    });

    const data = await parallelUploads3.done();
    return data.Location;
  } catch (err) {
    console.error("Error uploading buffer to S3:", err);
    throw err;
  }
};
