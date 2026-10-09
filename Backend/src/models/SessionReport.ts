import mongoose, { Schema, Document } from "mongoose";

export interface ISessionReport extends Document {
  sessionDate: Date;
  totalReviewed: number;
  speciesSightings: number;
  poacherAlerts: number;
  falseTriggers: number;
  secondReviews: number;
  captureLocations: { latitude: number; longitude: number; cameraTrapId: string }[];
  classificationBreakdown: { classification: string; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const sessionReportSchema = new Schema<ISessionReport>(
  {
    sessionDate: { type: Date, required: true },
    totalReviewed: { type: Number, default: 0 },
    speciesSightings: { type: Number, default: 0 },
    poacherAlerts: { type: Number, default: 0 },
    falseTriggers: { type: Number, default: 0 },
    secondReviews: { type: Number, default: 0 },
    captureLocations: [
      {
        latitude: Number,
        longitude: Number,
        cameraTrapId: String,
      },
    ],
    classificationBreakdown: [
      {
        classification: String,
        count: Number,
      },
    ],
  },
  { timestamps: true }
);

const SessionReport = mongoose.model<ISessionReport>(
  "SessionReport",
  sessionReportSchema
);
export default SessionReport;
