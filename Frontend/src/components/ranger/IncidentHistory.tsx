import type { Incident, LocalIncident } from "../../types/incident";

interface IncidentHistoryProps {
  serverIncidents: Incident[];
  localIncidents: LocalIncident[];
  onRefresh: () => void;
  onRetrySync: (incident: LocalIncident) => void;
  isSyncing: boolean;
}

function IncidentHistory({
  serverIncidents,
  localIncidents,
  onRefresh,
  onRetrySync,
  isSyncing,
}: IncidentHistoryProps) {
  return (
    <section className="ranger-history">
      <div className="ranger-history-header">
        <h2>Recent Incidents</h2>
        <button
          className="ranger-history-refresh"
          onClick={onRefresh}
          disabled={isSyncing}
        >
          {isSyncing ? "Syncing..." : "Refresh"}
        </button>
      </div>

      {localIncidents.length === 0 && serverIncidents.length === 0 && (
        <p className="ranger-history-empty">No incidents recorded yet.</p>
      )}

      {localIncidents.length > 0 && (
        <div className="ranger-history-section">
          <h3>Pending Sync</h3>
          {localIncidents.map((inc) => (
            <div key={inc.localId} className="ranger-history-card ranger-history-pending">
              <div className="ranger-history-card-header">
                <span className="ranger-history-type">{inc.incidentType}</span>
                <span className="ranger-history-status status-pending">Pending Sync</span>
              </div>
              <div className="ranger-history-meta">
                <span>Patrol: {inc.patrolId}</span>
                <span>{new Date(inc.createdAt).toLocaleString()}</span>
              </div>
              <button
                className="ranger-retry-btn"
                onClick={() => onRetrySync(inc)}
                disabled={isSyncing}
              >
                Retry Sync
              </button>
            </div>
          ))}
        </div>
      )}

      {serverIncidents.length > 0 && (
        <div className="ranger-history-section">
          <h3>Synced</h3>
          {serverIncidents.map((inc) => (
            <div key={inc._id} className="ranger-history-card ranger-history-synced">
              <div className="ranger-history-card-header">
                <span className="ranger-history-type">{inc.incidentType}</span>
                <span className="ranger-history-status status-synced">Synced</span>
              </div>
              <div className="ranger-history-meta">
                <span>Patrol: {inc.patrolId}</span>
                <span>Source: {inc.location.source}</span>
                <span>{new Date(inc.reportedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default IncidentHistory;
