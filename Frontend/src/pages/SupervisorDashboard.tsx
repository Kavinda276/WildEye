import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { Animal, RiskZone, WildlifeAlert } from "../types/wildlife";
import type { Incident } from "../types/incident";
import {
  fetchAnimals,
  fetchRiskZones,
  fetchAlerts,
  simulateAnimalMovement,
  seedAnimals,
  seedRiskZones,
  dispatchAlertApi,
  deleteAlertApi,
} from "../services/wildlifeApi";
import { getAllIncidents, updateIncidentReviewStatus } from "../services/incidentApi";
import { fetchCommunityReports, type CommunityReport } from "../services/communityReportApi";
import {
  fetchCameraTrapAlerts,
  type CameraTrapAlert as CameraTrapAlertType,
} from "../services/cameraTrapApi";
import { withRetry, SERVER_UNREACHABLE_MESSAGE } from "../services/retry";

import SummaryCards from "../components/supervisor/SummaryCards";
import WildlifeMapSection from "../components/supervisor/WildlifeMapSection";
import WildlifeAlertsSection from "../components/supervisor/WildlifeAlertsSection";
import IncidentReportsSection from "../components/supervisor/IncidentReportsSection";
import CommunityReportsSection from "../components/supervisor/CommunityReportsSection";
import CameraTrapAlertsSection from "../components/supervisor/CameraTrapAlertsSection";

type DashboardTab = "map" | "alerts" | "incidents" | "community" | "camera";

function SupervisorDashboard() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [alerts, setAlerts] = useState<WildlifeAlert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [cameraAlerts, setCameraAlerts] = useState<CameraTrapAlertType[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([6.865, 80.87]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("map");

  const loadAll = useCallback(async () => {
    try {
      const [a, z, al, inc, rep, cam] = await withRetry(() =>
        Promise.all([
          fetchAnimals(),
          fetchRiskZones(),
          fetchAlerts(),
          getAllIncidents(),
          fetchCommunityReports(),
          fetchCameraTrapAlerts(),
        ])
      );
      setAnimals(a);
      setRiskZones(z);
      setAlerts(al);
      setIncidents(inc.data ?? []);
      setCommunityReports(rep);
      setCameraAlerts(cam);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const handleReconnect = () => {
      if (navigator.onLine) void loadAll();
    };
    window.addEventListener("focus", loadAll);
    window.addEventListener("online", handleReconnect);
    return () => {
      window.removeEventListener("focus", loadAll);
      window.removeEventListener("online", handleReconnect);
    };
  }, [loadAll]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleSeed = async () => {
    try {
      await seedAnimals();
      await seedRiskZones();
      await loadAll();
      setMessage({ type: "success", text: "Seed data loaded successfully." });
    } catch {
      setMessage({ type: "error", text: "Failed to seed data." });
    }
  };

  const handleSimulate = async (animal: Animal) => {
    setSimulating(true);
    try {
      const zone = riskZones[Math.floor(Math.random() * riskZones.length)];
      if (!zone) {
        setMessage({ type: "error", text: "No risk zones defined." });
        setSimulating(false);
        return;
      }
      const lat = zone.bounds.south + Math.random() * (zone.bounds.north - zone.bounds.south);
      const lng = zone.bounds.west + Math.random() * (zone.bounds.east - zone.bounds.west);
      const result = await simulateAnimalMovement(animal._id, lat, lng);
      const updated = { ...result, isInsideRiskZone: result.isInsideRiskZone } as unknown as Animal;
      setAnimals((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      setMapCenter([lat, lng]);
      const freshAlerts = await fetchAlerts();
      setAlerts(freshAlerts);
      if (result.isInsideRiskZone) {
        if (result.alert) {
          setMessage({ type: "error", text: `ALERT: ${animal.name} entered a risk zone!` });
        } else {
          setMessage({ type: "error", text: `${animal.name} is still inside a risk zone!` });
        }
      } else {
        setMessage({ type: "success", text: `${animal.name} moved to safe area.` });
      }
    } catch {
      setMessage({ type: "error", text: "Simulation failed." });
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateSignalLost = async (animal: Animal) => {
    try {
      await fetch(`/api/animals/${animal._id}/collar-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collarStatus: "Signal Lost" }),
      });
      const updatedAlerts = await fetchAlerts();
      setAlerts(updatedAlerts);
      await loadAll();
      setMessage({ type: "error", text: `SIGNAL LOST: ${animal.name}'s collar has stopped transmitting.` });
    } catch {
      setMessage({ type: "error", text: "Failed to simulate signal loss." });
    }
  };

  const handleSelectAnimal = (animal: Animal) => {
    setSelectedAnimal(animal);
    setMapCenter([animal.location.latitude, animal.location.longitude]);
  };

  const handleDispatch = async (alertId: string, responder: string, role: "Ranger" | "Community Liaison Officer") => {
    try {
      const updated = await dispatchAlertApi(alertId, responder, role);
      setAlerts((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      setMessage({ type: "success", text: "Alert dispatched successfully!" });
    } catch {
      setMessage({ type: "error", text: "Dispatch failed." });
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlertApi(alertId);
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      setMessage({ type: "success", text: "Alert deleted." });
    } catch {
      setMessage({ type: "error", text: "Failed to delete alert." });
    }
  };

  const handleIncidentStatus = async (incidentId: string, reviewStatus: "Open" | "Reviewed" | "Resolved") => {
    try {
      const res = await updateIncidentReviewStatus(incidentId, reviewStatus);
      if (res.data) {
        setIncidents((prev) => prev.map((i) => (i._id === incidentId ? res.data! : i)));
        setMessage({ type: "success", text: `Incident marked as ${reviewStatus}.` });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update incident status." });
    }
  };

  const activeAlertCount = alerts.filter((a) => a.status === "Pending").length;
  const openIncidentCount = incidents.filter((i) => i.reviewStatus === "Open").length;
  const pendingReportCount = communityReports.filter((r) => r.status === "Pending Assignment").length;

  const TABS: { id: DashboardTab; label: string; icon: string; count: number }[] = [
    { id: "map", label: "Monitoring Map", icon: "🗺️", count: animals.length },
    { id: "alerts", label: "Wildlife Alerts", icon: "⚠️", count: activeAlertCount },
    { id: "incidents", label: "Incident Reports", icon: "📋", count: openIncidentCount },
    { id: "community", label: "Community Reports", icon: "👥", count: pendingReportCount },
    { id: "camera", label: "Camera Trap Alerts", icon: "📷", count: cameraAlerts.length },
  ];

  if (loading) {
    return (
      <div className="supervisor-page">
        <div className="supervisor-loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="supervisor-page">
      <div className="supervisor-topbar">
        <Link to="/" className="supervisor-back">&larr; Home</Link>
        <h1 className="supervisor-title">Wildlife Monitoring Dashboard</h1>
        <div className="supervisor-topbar-actions">
          <button
            className="supervisor-refresh-btn"
            onClick={() => {
              setLoading(true);
              void loadAll();
            }}
          >
            Refresh
          </button>
          <button className="supervisor-seed-btn" onClick={handleSeed}>Load Seed Data</button>
        </div>
      </div>

      {loadError && (
        <div className="supervisor-alert supervisor-alert-error">
          {SERVER_UNREACHABLE_MESSAGE}
        </div>
      )}

      {message && (
        <div className={`supervisor-alert supervisor-alert-${message.type}`}>{message.text}</div>
      )}

      <div className="supervisor-content">
        <SummaryCards
          activeAlerts={activeAlertCount}
          trackedAnimals={animals.length}
          openIncidents={openIncidentCount}
          pendingReports={pendingReportCount}
        />

        <div className="supervisor-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`supervisor-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="supervisor-tab-icon">{tab.icon}</span>
              <span className="supervisor-tab-label">{tab.label}</span>
              {tab.count > 0 && <span className="supervisor-tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>

        <div className="supervisor-tab-panel">
          {activeTab === "map" && (
            <WildlifeMapSection
              animals={animals}
              riskZones={riskZones}
              selectedAnimal={selectedAnimal}
              onSelectAnimal={handleSelectAnimal}
              onSimulate={handleSimulate}
              onSignalLost={handleSimulateSignalLost}
              simulating={simulating}
              mapCenter={mapCenter}
            />
          )}

          {activeTab === "alerts" && (
            <WildlifeAlertsSection
              alerts={alerts}
              onDispatch={handleDispatch}
              onDelete={handleDeleteAlert}
            />
          )}

          {activeTab === "incidents" && (
            <IncidentReportsSection
              incidents={incidents}
              onUpdateStatus={handleIncidentStatus}
            />
          )}

          {activeTab === "community" && (
            <CommunityReportsSection reports={communityReports} />
          )}

          {activeTab === "camera" && (
            <CameraTrapAlertsSection alerts={cameraAlerts} />
          )}
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;
