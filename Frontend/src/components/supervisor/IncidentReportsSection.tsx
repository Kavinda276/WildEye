import { useState } from "react";
import type { Incident } from "../../types/incident";

const REVIEW_COLORS: Record<string, string> = {
  Open: "#f59e0b",
  Reviewed: "#3b82f6",
  Resolved: "#22c55e",
};

interface IncidentReportsSectionProps {
  incidents: Incident[];
  onUpdateStatus: (id: string, status: "Open" | "Reviewed" | "Resolved") => void;
}

function IncidentReportsSection({ incidents, onUpdateStatus }: IncidentReportsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="section-panel">
      <div className="section-panel-header">
        <h2>Ranger Incident Reports</h2>
        <span className="section-count">{incidents.length}</span>
      </div>

      {incidents.length === 0 && <p className="section-empty">No incidents reported yet.</p>}

      {incidents.map((incident) => (
        <div key={incident._id} className={`incident-card ${expandedId === incident._id ? "expanded" : ""}`}>
          <div className="incident-card-main">
            <div className="incident-card-info">
              <div className="incident-card-title">
                <span className="incident-type">{incident.incidentType}</span>
                <span className="incident-patrol">Patrol: {incident.patrolId}</span>
              </div>
              <p className="incident-description">{incident.description}</p>
              <div className="incident-card-meta">
                <span>{incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}</span>
                <span>{new Date(incident.reportedAt).toLocaleString()}</span>
              </div>
            </div>
            <span className="status-pill" style={{ backgroundColor: REVIEW_COLORS[incident.reviewStatus] }}>
              {incident.reviewStatus}
            </span>
          </div>

          <button
            className="incident-expand-btn"
            onClick={() => setExpandedId(expandedId === incident._id ? null : incident._id)}
          >
            {expandedId === incident._id ? "Close" : "View Details"}
          </button>

          {expandedId === incident._id && (
            <div className="incident-details">
              <div className="incident-detail-grid">
                <div className="incident-detail">
                  <span className="incident-detail-label">Type</span>
                  <span className="incident-detail-value">{incident.incidentType}</span>
                </div>
                <div className="incident-detail">
                  <span className="incident-detail-label">Description</span>
                  <span className="incident-detail-value">{incident.description}</span>
                </div>
                <div className="incident-detail">
                  <span className="incident-detail-label">Location</span>
                  <span className="incident-detail-value">
                    {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)} ({incident.location.source})
                  </span>
                </div>
                <div className="incident-detail">
                  <span className="incident-detail-label">Patrol ID</span>
                  <span className="incident-detail-value">{incident.patrolId}</span>
                </div>
                <div className="incident-detail">
                  <span className="incident-detail-label">Reported</span>
                  <span className="incident-detail-value">{new Date(incident.reportedAt).toLocaleString()}</span>
                </div>
                <div className="incident-detail">
                  <span className="incident-detail-label">Sync Status</span>
                  <span className="incident-detail-value">{incident.syncStatus}</span>
                </div>
                {incident.photoUrl && (
                  <div className="incident-detail">
                    <span className="incident-detail-label">Photo</span>
                    <a href={incident.photoUrl} target="_blank" rel="noreferrer" className="incident-photo-link">
                      View Photo
                    </a>
                  </div>
                )}
              </div>
              {incident.reviewStatus !== "Resolved" && (
                <div className="incident-status-actions">
                  {incident.reviewStatus === "Open" && (
                    <button className="status-btn reviewed" onClick={() => onUpdateStatus(incident._id, "Reviewed")}>
                      Mark Reviewed
                    </button>
                  )}
                  <button className="status-btn resolved" onClick={() => onUpdateStatus(incident._id, "Resolved")}>
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default IncidentReportsSection;
