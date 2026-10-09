import mongoose, { Schema, Document } from "mongoose";

export interface IWildlifeAlert extends Document {
  animal: {
    name: string;
    species: string;
    collarId: string;
  };
  riskZone: {
    name: string;
    severity: string;
  };
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  responder: string;
  responderRole: "Ranger" | "Community Liaison Officer";
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Pending" | "Dispatched" | "Pending Delivery" | "Signal Lost" | "Resolved";
  createdAt: Date;
  updatedAt: Date;
}

const wildlifeAlertSchema = new Schema<IWildlifeAlert>(
  {
    animal: {
      name: { type: String, required: true },
      species: { type: String, required: true },
      collarId: { type: String, required: true },
    },
    riskZone: {
      name: { type: String, required: true },
      severity: { type: String, required: true },
    },
    currentLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    responder: { type: String, default: "" },
    responderRole: {
      type: String,
      enum: ["Ranger", "Community Liaison Officer"],
      default: "Ranger",
    },
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "High",
    },
    status: {
      type: String,
      enum: ["Pending", "Dispatched", "Pending Delivery", "Signal Lost", "Resolved"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const WildlifeAlert = mongoose.model<IWildlifeAlert>(
  "WildlifeAlert",
  wildlifeAlertSchema
);
export default WildlifeAlert;
