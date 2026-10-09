import mongoose, { Schema, Document } from "mongoose";

export interface IIncident extends Document {
  incidentType: "Snare" | "Animal Carcass" | "Illegal Campsite" | "At-Risk Species Footprint";
  description: string;
  photoUrl?: string;
  location: {
    latitude: number;
    longitude: number;
    source: "GPS" | "Manual";
  };
  patrolId: string;
  syncStatus: "Synced" | "Pending";
  reviewStatus: "Open" | "Reviewed" | "Resolved";
  localId?: string;
  reportedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    incidentType: {
      type: String,
      required: [true, "Incident type is required"],
      enum: {
        values: ["Snare", "Animal Carcass", "Illegal Campsite", "At-Risk Species Footprint"],
        message: "Incident type must be Snare, Animal Carcass, Illegal Campsite, or At-Risk Species Footprint",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    photoUrl: {
      type: String,
      default: undefined,
    },
    location: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
      },
      source: {
        type: String,
        required: [true, "Location source is required"],
        enum: {
          values: ["GPS", "Manual"],
          message: "Location source must be GPS or Manual",
        },
      },
    },
    patrolId: {
      type: String,
      required: [true, "Patrol ID is required"],
    },
    syncStatus: {
      type: String,
      enum: {
        values: ["Synced", "Pending"],
        message: "Sync status must be Synced or Pending",
      },
      default: "Synced",
    },
    reviewStatus: {
      type: String,
      enum: {
        values: ["Open", "Reviewed", "Resolved"],
        message: "Review status must be Open, Reviewed, or Resolved",
      },
      default: "Open",
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    localId: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

incidentSchema.index({ localId: 1 }, { unique: true, sparse: true });

const Incident = mongoose.model<IIncident>("Incident", incidentSchema);

export default Incident;
