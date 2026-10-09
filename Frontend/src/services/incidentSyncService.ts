import type { LocalIncident, Incident } from "../types/incident";
import {
  getPendingIncidents,
  removeLocalIncident,
} from "./offlineIncidentService";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const uploadIncident = async (incident: LocalIncident): Promise<Incident> => {
  const formData = new FormData();
  formData.append("incidentType", incident.incidentType);
  formData.append("description", incident.description);
  formData.append("location", JSON.stringify(incident.location));
  formData.append("patrolId", incident.patrolId);
  formData.append("reportedAt", incident.reportedAt);
  formData.append("localId", incident.localId);

  if (incident.photoBlob) {
    const file = new File([incident.photoBlob], incident.photoName || "photo.jpg", {
      type: incident.photoBlob.type || "image/jpeg",
    });
    formData.append("photo", file);
  }

  const res = await fetch("/api/incidents", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Sync failed");
  }

  return data.data;
};

export const syncPendingIncidents = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  const pending = await getPendingIncidents();
  let synced = 0;
  let failed = 0;

  for (const incident of pending) {
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await uploadIncident(incident);
        success = true;
        break;
      } catch {
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    if (success) {
      await removeLocalIncident(incident.localId);
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed };
};

export const retrySingleIncident = async (
  incident: LocalIncident
): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await uploadIncident(incident);
      await removeLocalIncident(incident.localId);
      return true;
    } catch {
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }
  return false;
};
