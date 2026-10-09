export interface CameraCapture {
  _id: string;
  cameraTrapId: string;
  imageUrl: string;
  capturedAt: string;
  location: { latitude: number; longitude: number };
  status: "unreviewed" | "reviewed" | "needs_second_review";
  classification: "" | "Species Sighting" | "Poacher Alert" | "False Trigger" | "Needs Second Review";
  species: string;
  createdAt: string;
  updatedAt: string;
}

export interface CameraTrapAlert {
  _id: string;
  capture: string;
  alertType: "Species Sighting" | "Poacher Alert";
  species: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  cameraTrapId: string;
  location: { latitude: number; longitude: number };
  status: "Active" | "Dispatched" | "Resolved";
  createdAt: string;
  updatedAt: string;
}

export interface SessionReport {
  _id: string;
  sessionDate: string;
  totalReviewed: number;
  speciesSightings: number;
  poacherAlerts: number;
  falseTriggers: number;
  secondReviews: number;
  captureLocations: { latitude: number; longitude: number; cameraTrapId: string }[];
  classificationBreakdown: { classification: string; count: number }[];
  createdAt: string;
  updatedAt: string;
}

const API_BASE = "/api/camera-traps";

export const seedCaptures = async (): Promise<void> => {
  const res = await fetch(`${API_BASE}/seed`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to seed captures");
};

export const fetchPendingCaptures = async (): Promise<CameraCapture[]> => {
  const res = await fetch(`${API_BASE}/pending`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch captures");
  return data.data;
};

export const fetchNeedsSecondReview = async (): Promise<CameraCapture[]> => {
  const res = await fetch(`${API_BASE}/needs-second-review`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch captures");
  return data.data;
};

export const classifyCaptureApi = async (
  id: string,
  classification: string,
  species?: string
): Promise<CameraCapture> => {
  const res = await fetch(`${API_BASE}/${id}/classify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classification, species }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to classify capture");
  return data.data;
};

export const fetchCameraTrapAlerts = async (): Promise<CameraTrapAlert[]> => {
  const res = await fetch(`${API_BASE}/alerts`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch alerts");
  return data.data;
};

export const generateSessionReportApi = async (): Promise<SessionReport> => {
  const res = await fetch(`${API_BASE}/reports/generate`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to generate report");
  return data.data;
};

export const fetchSessionReports = async (): Promise<SessionReport[]> => {
  const res = await fetch(`${API_BASE}/reports`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch reports");
  return data.data;
};
