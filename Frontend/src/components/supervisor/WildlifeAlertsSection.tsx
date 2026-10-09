import { useState } from "react";
import type { WildlifeAlert, Responder } from "../../types/wildlife";

const RESPONDERS: Responder[] = [
  { name: "Rt. Cmdr. Perera", role: "Ranger" },
  { name: "Sgt. Fernando", role: "Ranger" },
  { name: "Cpl. Wickramasinghe", role: "Ranger" },
  { name: "Ms. Jayasinghe", role: "Community Liaison Officer" },
  { name: "Mr. Bandara", role: "Community Liaison Officer" },
  { name: "Ms. Ratnayake", role: "Community Liaison Officer" },
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  Dispatched: "#3b82f6",
  "Pending Delivery": "#a855f7",
  "Signal Lost": "#6b7280",
  Resolved: "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#6b7280",
};

interface WildlifeAlertsSectionProps {
  alerts: WildlifeAlert[];
  onDispatch: (alertId: string, responder: string, role: "Ranger" | "Community Liaison Officer") => void;
  onDelete: (alertId: string) => void;
}

function WildlifeAlertsSection({ alerts, onDispatch, onDelete }: WildlifeAlertsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedResponder, setSelectedResponder] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"Ranger" | "Community Liaison Officer">("Ranger");

  const pendingAlerts = alerts.filter((a) => a.status === "Pending");
  const otherAlerts = alerts.filter((a) => a.status !== "Pending");

  const handleDispatch = (alertId: string) => {
    if (!selectedResponder) return;
    onDispatch(alertId, selectedResponder, selectedRole);
    setExpandedId(null);
    setSelectedResponder("");
  };

  return (
    <div className="section-panel">
      <div className="section-panel-header">
        <h2>Active Wildlife Alerts</h2>
        <span className="section-count">{alerts.length}</span>
      </div>

      {alerts.length === 0 && <p className="section-empty">No wildlife alerts yet.</p>}

      {pendingAlerts.length > 0 && (
        <div className="alerts-subsection">
          <h4 className="alerts-subsection-title">Needs Dispatch ({pendingAlerts.length})</h4>
          {pendingAlerts.map((alert) => (
            <div key={alert._id} className="alert-card pending">
              <div className="alert-card-main">
                <div className="alert-card-info">
                  <div className="alert-card-title">
                    <span className="alert-animal-name">{alert.animal.name}</span>
                    <span className="alert-species">({alert.animal.species})</span>
                  </div>
                  <div className="alert-card-details">
                    <span>Zone: {alert.riskZone.name}</span>
                    <span>Priority: <strong style={{ color: PRIORITY_COLORS[alert.priority] }}>{alert.priority}</strong></span>
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <span className="status-pill" style={{ backgroundColor: STATUS_COLORS[alert.status] }}>{alert.status}</span>
              </div>
              <div className="alert-card-actions">
                <button
                  className="alert-expand-btn"
                  onClick={() => setExpandedId(expandedId === alert._id ? null : alert._id)}
                >
                  {expandedId === alert._id ? "Cancel" : "Dispatch"}
                </button>
                <button
                  className="alert-delete-btn"
                  onClick={() => onDelete(alert._id)}
                >
                  Delete
                </button>
              </div>
              {expandedId === alert._id && (
                <div className="alert-dispatch-form">
                  <select
                    value={selectedResponder}
                    onChange={(e) => {
                      const r = RESPONDERS.find((res) => res.name === e.target.value);
                      setSelectedResponder(e.target.value);
                      if (r) setSelectedRole(r.role);
                    }}
                  >
                    <option value="">Select responder...</option>
                    {RESPONDERS.map((r) => (
                      <option key={r.name} value={r.name}>{r.name} ({r.role})</option>
                    ))}
                  </select>
                  <button className="alert-dispatch-btn" onClick={() => handleDispatch(alert._id)}>
                    Confirm Dispatch
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {otherAlerts.length > 0 && (
        <div className="alerts-subsection">
          <h4 className="alerts-subsection-title">Other Alerts ({otherAlerts.length})</h4>
          {otherAlerts.map((alert) => (
            <div key={alert._id} className="alert-card">
              <div className="alert-card-main">
                <div className="alert-card-info">
                  <div className="alert-card-title">
                    <span className="alert-animal-name">{alert.animal.name}</span>
                    <span className="alert-species">({alert.animal.species})</span>
                  </div>
                  <div className="alert-card-details">
                    <span>Zone: {alert.riskZone.name}</span>
                    <span>Priority: <strong style={{ color: PRIORITY_COLORS[alert.priority] }}>{alert.priority}</strong></span>
                    {alert.responder && <span>Responder: {alert.responder}</span>}
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <span className="status-pill" style={{ backgroundColor: STATUS_COLORS[alert.status] }}>{alert.status}</span>
              </div>
              <button
                className="alert-delete-btn"
                onClick={() => onDelete(alert._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WildlifeAlertsSection;
