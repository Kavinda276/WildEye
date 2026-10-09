import mongoose, { Schema, Document } from "mongoose";

export interface ICommunityReport extends Document {
  reportType: "Elephant Sighting" | "Crop-Raiding Incident";
  description: string;
  location: {
    latitude: number;
    longitude: number;
    source: "GPS" | "Manual";
  };
  status: "Submitted" | "Assigned" | "Pending Assignment";
  assignedResponder: string;
  assignedResponderRole: "Ranger" | "Community Liaison Officer" | "";
  reportedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const communityReportSchema = new Schema<ICommunityReport>(
  {
    reportType: {
      type: String,
      required: true,
      enum: ["Elephant Sighting", "Crop-Raiding Incident"],
    },
    description: { type: String, default: "" },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      source: {
        type: String,
        enum: ["GPS", "Manual"],
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["Submitted", "Assigned", "Pending Assignment"],
      default: "Submitted",
    },
    assignedResponder: { type: String, default: "" },
    assignedResponderRole: {
      type: String,
      enum: ["Ranger", "Community Liaison Officer", ""],
      default: "",
    },
    reportedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CommunityReport = mongoose.model<ICommunityReport>(
  "CommunityReport",
  communityReportSchema
);
export default CommunityReport;
