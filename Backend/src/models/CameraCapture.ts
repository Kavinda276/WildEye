import mongoose, { Schema, Document } from "mongoose";

export interface ICameraCapture extends Document {
  cameraTrapId: string;
  imageUrl: string;
  capturedAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  status: "unreviewed" | "reviewed" | "needs_second_review";
  classification: "" | "Species Sighting" | "Poacher Alert" | "False Trigger" | "Needs Second Review";
  species: string;
  createdAt: Date;
  updatedAt: Date;
}

const cameraCaptureSchema = new Schema<ICameraCapture>(
  {
    cameraTrapId: { type: String, required: true },
    imageUrl: { type: String, required: true },
    capturedAt: { type: Date, required: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["unreviewed", "reviewed", "needs_second_review"],
      default: "unreviewed",
    },
    classification: {
      type: String,
      enum: ["", "Species Sighting", "Poacher Alert", "False Trigger", "Needs Second Review"],
      default: "",
    },
    species: { type: String, default: "" },
  },
  { timestamps: true }
);

const CameraCapture = mongoose.model<ICameraCapture>(
  "CameraCapture",
  cameraCaptureSchema
);
export default CameraCapture;
