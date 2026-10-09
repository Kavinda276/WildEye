import dotenv from "dotenv";
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/wildeye",
  nodeEnv: process.env.NODE_ENV || "development",
};

export default config;
