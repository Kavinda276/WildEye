import type { CommunityReport } from "../../services/communityReportApi";

const REPORT_STATUS_COLORS: Record<string, string> = {
  Submitted: "#3b82f6",
  Assigned: "#22c55e",
  "Pending Assignment": "#f59e0b",
};

interface CommunityReportsSectionProps {
  reports: CommunityReport[];
}

function CommunityReportsSection({ reports }: CommunityReportsSectionProps) {
  const pendingFirst = [...reports].sort((a, b) => {
    const order: Record<string, number> = { "Pending Assignment": 0, Submitted: 1, Assigned: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="section-panel">
      <div className="section-panel-header">
        <h2>Community Reports Requiring Attention</h2>
        <span className="section-count">{reports.length}</span>
      </div>

      {reports.length === 0 && <p className="section-empty">No community reports yet.</p>}

      <div className="reports-table">
        <div className="reports-table-header">
          <span className="reports-col-type">Type</span>
          <span className="reports-col-location">Location</span>
          <span className="reports-col-time">Reported</span>
          <span className="reports-col-responder">Responder</span>
          <span className="reports-col-status">Status</span>
        </div>
        {pendingFirst.map((report) => (
          <div key={report._id} className="reports-table-row">
            <span className="reports-col-type">
              {report.reportType === "Elephant Sighting" ? "\uD83D\uDC18" : "\uD83C\uDF3E"} {report.reportType}
            </span>
            <span className="reports-col-location">
              {report.location.latitude.toFixed(4)}, {report.location.longitude.toFixed(4)}
            </span>
            <span className="reports-col-time">
              {new Date(report.reportedAt).toLocaleString()}
            </span>
            <span className="reports-col-responder">
              {report.assignedResponder ? `${report.assignedResponder} (${report.assignedResponderRole})` : "—"}
            </span>
            <span className="reports-col-status">
              <span className="status-pill" style={{ backgroundColor: REPORT_STATUS_COLORS[report.status] }}>
                {report.status}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CommunityReportsSection;
