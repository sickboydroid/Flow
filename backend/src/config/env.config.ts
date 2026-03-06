import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT!,
  mongoUri: process.env.MONGODB_URI!,
  nodeEnv: process.env.NODE_ENV!,
};
