import RiskZone, { IRiskZone } from "../models/RiskZone";

export const getAllRiskZones = async (): Promise<IRiskZone[]> => {
  return RiskZone.find({ active: true });
};

export const getRiskZoneById = async (id: string): Promise<IRiskZone | null> => {
  return RiskZone.findById(id);
};
