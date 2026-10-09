import type { Animal, RiskZone, WildlifeAlert } from "../types/wildlife";

const API_BASE = "/api";

export const fetchAnimals = async (): Promise<Animal[]> => {
  const res = await fetch(`${API_BASE}/animals`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch animals");
  return data.data;
};

export interface SimulateResult {
  _id: string;
  name: string;
  species: string;
  collarId: string;
  collarStatus: "Active" | "Signal Lost" | "Inactive";
  location: { latitude: number; longitude: number };
  lastSignal: string;
  isInsideRiskZone: boolean;
  alert: WildlifeAlert | null;
}

export const simulateAnimalMovement = async (
  animalId: string,
  latitude: number,
  longitude: number
): Promise<SimulateResult> => {
  const res = await fetch(`${API_BASE}/animals/${animalId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to simulate movement");
  return data.data;
};

export const seedAnimals = async (): Promise<Animal[]> => {
  const res = await fetch(`${API_BASE}/animals/seed`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to seed animals");
  return data.data;
};

export const fetchRiskZones = async (): Promise<RiskZone[]> => {
  const res = await fetch(`${API_BASE}/risk-zones`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch risk zones");
  return data.data;
};

export const seedRiskZones = async (): Promise<RiskZone[]> => {
  const res = await fetch(`${API_BASE}/risk-zones/seed`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to seed risk zones");
  return data.data;
};

export const fetchAlerts = async (): Promise<WildlifeAlert[]> => {
  const res = await fetch(`${API_BASE}/wildlife-alerts`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch alerts");
  return data.data;
};

export const createAlert = async (
  animalId: string,
  riskZoneId: string
): Promise<WildlifeAlert> => {
  const res = await fetch(`${API_BASE}/wildlife-alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ animalId, riskZoneId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create alert");
  return data.data;
};

export const dispatchAlertApi = async (
  alertId: string,
  responder: string,
  responderRole: "Ranger" | "Community Liaison Officer"
): Promise<WildlifeAlert> => {
  const res = await fetch(`${API_BASE}/wildlife-alerts/${alertId}/dispatch`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responder, responderRole }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to dispatch alert");
  return data.data;
};

export const deleteAlertApi = async (alertId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/wildlife-alerts/${alertId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Failed to delete alert");
  }
};
