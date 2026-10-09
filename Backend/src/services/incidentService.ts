import Incident, { IIncident } from "../models/Incident";

export const createIncident = async (data: Partial<IIncident>): Promise<IIncident> => {
  const incident = await Incident.create(data);
  return incident;
};

export const getAllIncidents = async (): Promise<IIncident[]> => {
  const incidents = await Incident.find().sort({ createdAt: -1 });
  return incidents;
};

export const getIncidentById = async (id: string): Promise<IIncident | null> => {
  const incident = await Incident.findById(id);
  return incident;
};

export const findByLocalId = async (localId: string): Promise<IIncident | null> => {
  return Incident.findOne({ localId });
};

export const updateSyncStatus = async (
  id: string,
  syncStatus: "Synced" | "Pending"
): Promise<IIncident | null> => {
  const incident = await Incident.findByIdAndUpdate(
    id,
    { syncStatus },
    { new: true, runValidators: true }
  );
  return incident;
};

export const updateReviewStatus = async (
  id: string,
  reviewStatus: "Open" | "Reviewed" | "Resolved"
): Promise<IIncident | null> => {
  const incident = await Incident.findByIdAndUpdate(
    id,
    { reviewStatus },
    { new: true, runValidators: true }
  );
  return incident;
};
