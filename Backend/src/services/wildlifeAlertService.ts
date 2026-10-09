import WildlifeAlert, { IWildlifeAlert } from "../models/WildlifeAlert";

export const getAllAlerts = async (): Promise<IWildlifeAlert[]> => {
  return WildlifeAlert.find().sort({ createdAt: -1 });
};

export const getAlertById = async (id: string): Promise<IWildlifeAlert | null> => {
  return WildlifeAlert.findById(id);
};

export const createAlert = async (data: {
  animal: { name: string; species: string; collarId: string };
  riskZone: { name: string; severity: string };
  currentLocation: { latitude: number; longitude: number };
  priority: "Critical" | "High" | "Medium" | "Low";
}): Promise<IWildlifeAlert> => {
  const alert = await WildlifeAlert.create({
    ...data,
    status: "Pending",
    responder: "",
    responderRole: "Ranger",
  });
  return alert;
};

export const dispatchAlert = async (
  id: string,
  responder: string,
  responderRole: "Ranger" | "Community Liaison Officer"
): Promise<IWildlifeAlert | null> => {
  return WildlifeAlert.findByIdAndUpdate(
    id,
    { responder, responderRole, status: "Dispatched" },
    { new: true }
  );
};

export const updateAlertStatus = async (
  id: string,
  status: IWildlifeAlert["status"]
): Promise<IWildlifeAlert | null> => {
  return WildlifeAlert.findByIdAndUpdate(id, { status }, { new: true });
};

export const deleteAlert = async (id: string): Promise<IWildlifeAlert | null> => {
  return WildlifeAlert.findByIdAndDelete(id);
};
