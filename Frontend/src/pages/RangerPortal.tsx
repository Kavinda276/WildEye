import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import NetworkStatus from "../components/common/NetworkStatus";
import IncidentForm from "../components/ranger/IncidentForm";
import IncidentHistory from "../components/ranger/IncidentHistory";
import { createIncidentWithFormData, getAllIncidents } from "../services/incidentApi";
import {
  saveLocalIncident,
  getPendingIncidents,
} from "../services/offlineIncidentService";
import {
  syncPendingIncidents,
  retrySingleIncident,
} from "../services/incidentSyncService";
import { withRetry, SERVER_UNREACHABLE_MESSAGE } from "../services/retry";
import type {
  Incident,
  LocalIncident,
  CreateIncidentPayload,
} from "../types/incident";

const SYNC_INTERVAL_MS = 30000;

function RangerPortal() {
  const [serverIncidents, setServerIncidents] = useState<Incident[]>([]);
  const [localIncidents, setLocalIncidents] = useState<LocalIncident[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "offline"; text: string } | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadLocal = useCallback(async (): Promise<LocalIncident[]> => {
    const pending = await getPendingIncidents();
    setLocalIncidents(pending);
    return pending;
  }, []);

  const loadServer = useCallback(async () => {
    try {
      const res = await withRetry(() => getAllIncidents());
      setServerIncidents(res.data ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  const runSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    let result;
    try {
      result = await syncPendingIncidents();
    } catch {
      setIsSyncing(false);
      return;
    }
    await loadLocal();
    await loadServer();
    setIsSyncing(false);
    if (result.synced > 0) {
      setMessage({ type: "success", text: `${result.synced} incident(s) synchronized successfully.` });
    } else if (result.failed > 0) {
      setMessage({ type: "error", text: `${result.failed} incident(s) failed to sync. They remain pending.` });
    }
  }, [loadLocal, loadServer]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const pending = await loadLocal();
      await loadServer();
      if (!cancelled && pending.length > 0 && navigator.onLine) {
        await runSync();
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [loadServer, loadLocal, runSync]);

  useEffect(() => {
    window.addEventListener("online", runSync);
    window.addEventListener("focus", loadServer);
    return () => {
      window.removeEventListener("online", runSync);
      window.removeEventListener("focus", loadServer);
    };
  }, [runSync, loadServer]);

  useEffect(() => {
    const pending = localIncidents.length;
    if (pending === 0 || !navigator.onLine) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void runSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [localIncidents.length, runSync]);

  const handleSubmit = async (
    payload: CreateIncidentPayload,
    photo: File | null
  ) => {
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("incidentType", payload.incidentType);
    formData.append("description", payload.description);
    formData.append("location", JSON.stringify(payload.location));
    formData.append("patrolId", payload.patrolId);
    if (photo) {
      formData.append("photo", photo);
    }

    try {
      await createIncidentWithFormData(formData);
      await loadServer();
      setMessage({ type: "success", text: "Incident logged successfully. Status: Synced" });
    } catch {
      const localIncident: LocalIncident = {
        localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        incidentType: payload.incidentType,
        description: payload.description,
        location: payload.location,
        patrolId: payload.patrolId,
        syncStatus: "Pending",
        reportedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        photoBlob: photo ? await photo.arrayBuffer().then((buf) => new Blob([buf], { type: photo.type })) : undefined,
        photoName: photo?.name,
      };

      await saveLocalIncident(localIncident);
      await loadLocal();
      setMessage({ type: "offline", text: "Server unreachable. Incident saved locally. It will sync when connectivity is restored." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrySync = async (incident: LocalIncident) => {
    setIsSyncing(true);
    const success = await retrySingleIncident(incident);
    await loadLocal();
    if (success) {
      await loadServer();
      setMessage({ type: "success", text: "Incident synchronized successfully." });
    } else {
      setMessage({ type: "error", text: "Sync failed after retries. Please try again later." });
    }
    setIsSyncing(false);
  };

  const handleRefresh = async () => {
    await loadServer();
    await loadLocal();
  };

  return (
    <section className="ranger-page">
      <div className="ranger-container">
        <div className="ranger-top-bar">
          <Link to="/" className="ranger-back">&larr; Home</Link>
          <NetworkStatus />
        </div>

        <header className="ranger-header">
          <h1>Log Incident</h1>
          <p>Record wildlife or poaching incidents during patrol</p>
        </header>

        {loadError && (
          <div className="ranger-alert ranger-alert-error">
            {SERVER_UNREACHABLE_MESSAGE}
          </div>
        )}

        {message && (
          <div className={`ranger-alert ranger-alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <IncidentForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          disabled={isSubmitting || isSyncing}
        />

        <IncidentHistory
          serverIncidents={serverIncidents}
          localIncidents={localIncidents}
          onRefresh={handleRefresh}
          onRetrySync={handleRetrySync}
          isSyncing={isSyncing}
        />
      </div>
    </section>
  );
}

export default RangerPortal;
