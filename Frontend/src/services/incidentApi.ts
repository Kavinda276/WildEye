import type { Incident, LocalIncident } from "../types/incident";
import { ApiResponse } from "../types/index";

const API_BASE = "/api";

export const createIncidentWithFormData = async (
  formData: FormData
): Promise<ApiResponse<Incident>> => {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to create incident");
  }

  return data;
};

export const getAllIncidents = async (): Promise<ApiResponse<Incident[]>> => {
  const res = await fetch(`${API_BASE}/incidents`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch incidents");
  }

  return data;
};

export const createIncidentFromLocal = async (
  local: LocalIncident
): Promise<ApiResponse<Incident>> => {
  const formData = new FormData();
  formData.append("incidentType", local.incidentType);
  formData.append("description", local.description);
  formData.append("location", JSON.stringify(local.location));
  formData.append("patrolId", local.patrolId);
  formData.append("reportedAt", local.reportedAt);

  if (local.photoBlob) {
    const file = new File([local.photoBlob], local.photoName || "photo.jpg", {
      type: local.photoBlob.type || "image/jpeg",
    });
    formData.append("photo", file);
  }

  const res = await fetch(`${API_BASE}/incidents`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Sync failed");
  }

  return data;
};

export const updateIncidentReviewStatus = async (
  id: string,
  reviewStatus: "Open" | "Reviewed" | "Resolved"
): Promise<ApiResponse<Incident>> => {
  const res = await fetch(`${API_BASE}/incidents/${id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewStatus }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update review status");
  return data;
};
