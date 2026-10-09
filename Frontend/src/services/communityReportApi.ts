export interface CommunityReport {
  _id: string;
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
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  reportType: "Elephant Sighting" | "Crop-Raiding Incident";
  description?: string;
  location: {
    latitude: number;
    longitude: number;
    source: "GPS" | "Manual";
  };
}

const API_BASE = "/api/community-reports";

export const createCommunityReport = async (
  payload: CreateReportPayload
): Promise<CommunityReport> => {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit report");
  return data.data;
};

export const fetchCommunityReports = async (): Promise<CommunityReport[]> => {
  const res = await fetch(API_BASE);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch reports");
  return data.data;
};

export interface ResponderInfo {
  name: string;
  role: "Ranger" | "Community Liaison Officer";
  available: boolean;
}

export const fetchResponders = async (): Promise<ResponderInfo[]> => {
  const res = await fetch(`${API_BASE}/responders`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch responders");
  return data.data;
};

export const setResponderAvailability = async (
  name: string,
  available: boolean
): Promise<ResponderInfo[]> => {
  const res = await fetch(`${API_BASE}/responders/availability`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, available }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update responder");
  return data.data;
};
