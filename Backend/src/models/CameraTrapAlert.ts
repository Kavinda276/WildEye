import mongoose, { Schema, Document } from "mongoose";

export interface ICameraTrapAlert extends Document {
  capture: mongoose.Types.ObjectId;
  alertType: "Species Sighting" | "Poacher Alert";
  species: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  cameraTrapId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: "Active" | "Dispatched" | "Resolved";
  createdAt: Date;
  updatedAt: Date;
}

const cameraTrapAlertSchema = new Schema<ICameraTrapAlert>(
  {
    capture: { type: Schema.Types.ObjectId, ref: "CameraCapture", required: true },
    alertType: {
      type: String,
      enum: ["Species Sighting", "Poacher Alert"],
      required: true,
    },
    species: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    cameraTrapId: { type: String, required: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["Active", "Dispatched", "Resolved"],
      default: "Active",
    },
  },
  { timestamps: true }
);

const CameraTrapAlert = mongoose.model<ICameraTrapAlert>(
  "CameraTrapAlert",
  cameraTrapAlertSchema
);
export default CameraTrapAlert;
