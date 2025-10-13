import express from "express";
import dotenv from "dotenv";

import { db } from "./config/mongo";
import type { Request, Response } from "express";
import authRouter from "./routes/authRouter";
import userPersonalRouter from "./routes/userPersonal";

dotenv.config();

const app = express();

app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
  });
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Server is up and running",
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user-personal", userPersonalRouter);

async function initializeDatabase() {
  try {
    await db.connect();
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

app.listen(PORT, () => {
  initializeDatabase();
  console.log(`Server is running on http://localhost:${PORT}`);
});
