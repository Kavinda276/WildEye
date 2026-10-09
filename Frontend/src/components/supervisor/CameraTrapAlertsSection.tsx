import type { CameraTrapAlert } from "../../services/cameraTrapApi";

const ALERT_STATUS_COLORS: Record<string, string> = {
  Active: "#ef4444",
  Dispatched: "#3b82f6",
  Resolved: "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#6b7280",
};

interface CameraTrapAlertsSectionProps {
  alerts: CameraTrapAlert[];
}

function CameraTrapAlertsSection({ alerts }: CameraTrapAlertsSectionProps) {
  return (
    <div className="section-panel">
      <div className="section-panel-header">
        <h2>Camera Trap Alerts</h2>
        <span className="section-count">{alerts.length}</span>
      </div>

      {alerts.length === 0 && <p className="section-empty">No camera trap alerts yet.</p>}

      <div className="camera-alerts-grid">
        {alerts.map((alert) => (
          <div key={alert._id} className="camera-alert-card">
            <div className="camera-alert-top">
              <span className="camera-alert-type">
                {alert.alertType === "Species Sighting" ? "\uD83D\uDC3E" : "\uD83D\uDEA8"} {alert.alertType}
              </span>
              <span
                className="priority-pill"
                style={{ backgroundColor: PRIORITY_COLORS[alert.priority] || "#6b7280" }}
              >
                {alert.priority}
              </span>
            </div>
            <div className="camera-alert-details">
              <span><strong>Camera:</strong> {alert.cameraTrapId}</span>
              {alert.species && <span><strong>Species:</strong> {alert.species}</span>}
              <span><strong>Location:</strong> {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}</span>
              <span><strong>Time:</strong> {new Date(alert.createdAt).toLocaleString()}</span>
            </div>
            <div className="camera-alert-bottom">
              <span className="status-pill" style={{ backgroundColor: ALERT_STATUS_COLORS[alert.status] }}>
                {alert.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CameraTrapAlertsSection;
