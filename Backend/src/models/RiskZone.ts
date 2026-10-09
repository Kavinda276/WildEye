import mongoose, { Schema, Document } from "mongoose";

export interface IRiskZone extends Document {
  name: string;
  description: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  severity: "High" | "Medium" | "Low";
  active: boolean;
}

const riskZoneSchema = new Schema<IRiskZone>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    bounds: {
      north: { type: Number, required: true },
      south: { type: Number, required: true },
      east: { type: Number, required: true },
      west: { type: Number, required: true },
    },
    severity: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RiskZone = mongoose.model<IRiskZone>("RiskZone", riskZoneSchema);
export default RiskZone;
