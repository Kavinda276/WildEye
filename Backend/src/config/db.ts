import mongoose from "mongoose";
import config from "./index";

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed. Server will continue without database.");
    console.error("Error details:", error instanceof Error ? error.message : error);
  }
};

export default connectDB;
