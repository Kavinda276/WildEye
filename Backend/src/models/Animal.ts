import mongoose, { Schema, Document } from "mongoose";

export interface IAnimal extends Document {
  name: string;
  species: string;
  collarId: string;
  collarStatus: "Active" | "Signal Lost" | "Inactive";
  location: {
    latitude: number;
    longitude: number;
  };
  lastSignal: Date;
  isInsideRiskZone: boolean;
}

const animalSchema = new Schema<IAnimal>(
  {
    name: { type: String, required: true },
    species: { type: String, required: true },
    collarId: { type: String, required: true, unique: true },
    collarStatus: {
      type: String,
      enum: ["Active", "Signal Lost", "Inactive"],
      default: "Active",
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    lastSignal: { type: Date, default: Date.now },
    isInsideRiskZone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Animal = mongoose.model<IAnimal>("Animal", animalSchema);
export default Animal;
