import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type {
  CameraCapture,
  CameraTrapAlert,
  SessionReport,
} from "../services/cameraTrapApi";
import {
  seedCaptures,
  fetchPendingCaptures,
  fetchNeedsSecondReview,
  classifyCaptureApi,
  fetchCameraTrapAlerts,
  generateSessionReportApi,
  fetchSessionReports,
} from "../services/cameraTrapApi";
import { withRetry, SERVER_UNREACHABLE_MESSAGE } from "../services/retry";

type Classification = "Species Sighting" | "Poacher Alert" | "False Trigger" | "Needs Second Review";

function CameraTrap() {
  const [captures, setCaptures] = useState<CameraCapture[]>([]);
  const [secondReviewCaptures, setSecondReviewCaptures] = useState<CameraCapture[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [alerts, setAlerts] = useState<CameraTrapAlert[]>([]);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    speciesSightings: 0,
    poacherAlerts: 0,
    falseTriggers: 0,
    secondReviews: 0,
  });
  const [poacherConfirm, setPoacherConfirm] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [pending, secondReview, allAlerts, allReports] = await withRetry(() =>
        Promise.all([
          fetchPendingCaptures(),
          fetchNeedsSecondReview(),
          fetchCameraTrapAlerts(),
          fetchSessionReports(),
        ])
      );
      setCaptures(pending);
      setSecondReviewCaptures(secondReview);
      setAlerts(allAlerts);
      setReports(allReports);
      setLoadError(false);
      if (pending.length === 0 && secondReview.length === 0) setShowSummary(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
    setLoading(true);
    try {
      await seedCaptures();
      await loadAll();
      setShowSummary(false);
      setSessionStats({ speciesSightings: 0, poacherAlerts: 0, falseTriggers: 0, secondReviews: 0 });
      setMessage({ type: "success", text: "5 camera captures loaded." });
    } catch {
      setMessage({ type: "error", text: "Failed to seed captures." });
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = async (classification: Classification) => {
    if (classifying) return;
    const capture = captures[currentIndex];
    if (!capture) return;

    if (classification === "Poacher Alert" && !poacherConfirm) {
      setPoacherConfirm(true);
      return;
    }

    setClassifying(true);
    try {
      await classifyCaptureApi(
        capture._id,
        classification,
        classification === "Species Sighting" ? selectedSpecies : undefined
      );

      setSessionStats((prev) => {
        const next = { ...prev };
        if (classification === "Species Sighting") next.speciesSightings++;
        else if (classification === "Poacher Alert") next.poacherAlerts++;
        else if (classification === "False Trigger") next.falseTriggers++;
        else if (classification === "Needs Second Review") next.secondReviews++;
        return next;
      });

      setSelectedSpecies("");
      setPoacherConfirm(false);

      const remaining = captures.filter((_, i) => i !== currentIndex);
      setCaptures(remaining);
      setCurrentIndex(0);

      const allRemaining = captures.filter((_, i) => i !== currentIndex);
      if (allRemaining.length === 0 && secondReviewCaptures.length === 0) setShowSummary(true);

      setMessage({ type: "success", text: `Classified as "${classification}"` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Classification failed",
      });
    } finally {
      setClassifying(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerateLoading(true);
    try {
      const report = await generateSessionReportApi();
      setReports((prev) => [report, ...prev]);
      setMessage({ type: "success", text: "Session report generated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to generate report",
      });
    } finally {
      setGenerateLoading(false);
    }
  };

  const currentCapture = captures[currentIndex];

  const handleSecondReviewClassify = async (captureId: string, classification: Classification) => {
    if (classifying) return;

    if (classification === "Poacher Alert" && !poacherConfirm) {
      setPoacherConfirm(true);
      return;
    }

    setClassifying(true);
    try {
      await classifyCaptureApi(
        captureId,
        classification,
        classification === "Species Sighting" ? selectedSpecies : undefined
      );

      setSessionStats((prev) => {
        const next = { ...prev };
        if (classification === "Needs Second Review") {
          next.secondReviews++;
        } else {
          if (next.secondReviews > 0) next.secondReviews--;
          if (classification === "Species Sighting") next.speciesSightings++;
          else if (classification === "Poacher Alert") next.poacherAlerts++;
          else if (classification === "False Trigger") next.falseTriggers++;
        }
        return next;
      });

      setSelectedSpecies("");
      setPoacherConfirm(false);

      setSecondReviewCaptures((prev) => prev.filter((c) => c._id !== captureId));

      setMessage({ type: "success", text: `Classified as "${classification}"` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Classification failed",
      });
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div className="camera-page">
      <div className="camera-header">
        <Link to="/" className="camera-back">&larr; Home</Link>
        <div className="camera-brand">
          <span className="camera-brand-icon">📷</span>
          <h1>Camera Trap Review</h1>
        </div>
        <button className="camera-seed-btn" onClick={handleSeed} disabled={loading || classifying}>
          Load Captures
        </button>
      </div>

      {loadError && (
        <div className="camera-alert camera-alert-error">{SERVER_UNREACHABLE_MESSAGE}</div>
      )}

      {message && (
        <div className={`camera-alert camera-alert-${message.type}`}>{message.text}</div>
      )}

      {loading ? (
        <div className="camera-loading">Loading camera trap data...</div>
      ) : showSummary && captures.length === 0 && secondReviewCaptures.length === 0 ? (
        <div className="camera-layout">
          <div className="camera-main">
            <div className="camera-summary-card">
              <h2>Session Complete</h2>
              <p className="camera-subtitle">All captures have been reviewed</p>

              <div className="camera-stats-grid">
                <div className="camera-stat camera-stat-species">
                  <span className="camera-stat-icon">🐘</span>
                  <span className="camera-stat-value">{sessionStats.speciesSightings}</span>
                  <span className="camera-stat-label">Species Sightings</span>
                </div>
                <div className="camera-stat camera-stat-poacher">
                  <span className="camera-stat-icon">🚨</span>
                  <span className="camera-stat-value">{sessionStats.poacherAlerts}</span>
                  <span className="camera-stat-label">Poacher Alerts</span>
                </div>
                <div className="camera-stat camera-stat-false">
                  <span className="camera-stat-icon">✅</span>
                  <span className="camera-stat-value">{sessionStats.falseTriggers}</span>
                  <span className="camera-stat-label">False Triggers</span>
                </div>
                <div className="camera-stat camera-stat-review">
                  <span className="camera-stat-icon">👁️</span>
                  <span className="camera-stat-value">{sessionStats.secondReviews}</span>
                  <span className="camera-stat-label">Needs Review</span>
                </div>
              </div>

              <button
                className="camera-generate-btn"
                onClick={handleGenerateReport}
                disabled={generateLoading}
              >
                {generateLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>

            {reports.length > 0 && (
              <div className="camera-reports-card">
                <h3>Session Reports ({reports.length})</h3>
                {reports.map((report) => (
                  <div key={report._id} className="camera-report-item">
                    <div className="camera-report-header">
                      <span>{new Date(report.sessionDate).toLocaleDateString()} {new Date(report.sessionDate).toLocaleTimeString()}</span>
                      <span className="camera-report-total">{report.totalReviewed} reviewed</span>
                    </div>
                    <div className="camera-report-breakdown">
                      {report.classificationBreakdown.map((b) => (
                        <span key={b.classification} className="camera-report-badge">
                          {b.classification}: {b.count}
                        </span>
                      ))}
                    </div>
                    {report.captureLocations.length > 0 && (
                      <div className="camera-report-locations">
                        Locations: {report.captureLocations.map((l) => `${l.cameraTrapId}`).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="camera-sidebar">
            <div className="camera-alerts-card">
              <h3>Recent Alerts ({alerts.length})</h3>
              {alerts.length === 0 && <p className="camera-empty">No alerts yet.</p>}
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert._id} className={`camera-alert-item camera-alert-${alert.priority.toLowerCase()}`}>
                  <div className="camera-alert-row">
                    <strong>{alert.alertType}</strong>
                    <span className={`camera-priority-badge camera-priority-${alert.priority.toLowerCase()}`}>
                      {alert.priority}
                    </span>
                  </div>
                  <div className="camera-alert-details">
                    {alert.species && <span>Species: {alert.species}</span>}
                    <span>Camera: {alert.cameraTrapId}</span>
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : currentCapture ? (
        <div className="camera-layout">
          <div className="camera-main">
            <div className="camera-progress">
              <span>Capture {currentIndex + 1} of {captures.length}</span>
              <div className="camera-progress-bar">
                <div
                  className="camera-progress-fill"
                  style={{ width: `${((captures.length - currentIndex) / captures.length) * 100}%` }}
                />
              </div>
              <span>{captures.length} remaining</span>
            </div>

            <div className="camera-capture-card">
              <div className="camera-image-container">
                <img
                  src={currentCapture.imageUrl}
                  alt={`Capture from ${currentCapture.cameraTrapId}`}
                  className="camera-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%231a1a2e' width='600' height='400'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='16'%3EImage not available%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="camera-image-overlay">
                  <span className="camera-capture-badge">{currentCapture.cameraTrapId}</span>
                  <span className="camera-capture-time">
                    {new Date(currentCapture.capturedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="camera-capture-details">
                <div className="camera-detail">
                  <span className="camera-detail-label">Camera Trap</span>
                  <span className="camera-detail-value">{currentCapture.cameraTrapId}</span>
                </div>
                <div className="camera-detail">
                  <span className="camera-detail-label">Captured</span>
                  <span className="camera-detail-value">
                    {new Date(currentCapture.capturedAt).toLocaleString()}
                  </span>
                </div>
                <div className="camera-detail">
                  <span className="camera-detail-label">Location</span>
                  <span className="camera-detail-value">
                    {currentCapture.location.latitude.toFixed(4)}, {currentCapture.location.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="camera-detail">
                  <span className="camera-detail-label">Status</span>
                  <span className="camera-detail-value camera-status-unreviewed">
                    {currentCapture.status === "unreviewed" ? "Unreviewed" : "Reviewed"}
                  </span>
                </div>
              </div>
            </div>

            <div className="camera-classify-section">
              <h3>Classify Capture</h3>
              {poacherConfirm && (
                <div className="camera-poacher-confirm">
                  <p>Confirm: Is this a <strong>confirmed poacher sighting</strong>? This will trigger a <strong>Critical</strong> alert.</p>
                  <div className="camera-confirm-btns">
                    <button onClick={() => setPoacherConfirm(false)} disabled={classifying}>Cancel</button>
                    <button
                      className="camera-confirm-yes"
                      onClick={() => handleClassify("Poacher Alert")}
                      disabled={classifying}
                    >
                      Yes, Create Alert
                    </button>
                  </div>
                </div>
              )}

              {!poacherConfirm && (
                <>
                  <div className="camera-species-select">
                    <label>Species (if Species Sighting):</label>
                    <select
                      value={selectedSpecies}
                      onChange={(e) => setSelectedSpecies(e.target.value)}
                      disabled={classifying}
                    >
                      <option value="">Select species...</option>
                      <option value="Sri Lankan Elephant">Sri Lankan Elephant</option>
                      <option value="Sri Lankan Leopard">Sri Lankan Leopard</option>
                    </select>
                  </div>

                  <div className="camera-classify-buttons">
                    <button
                      className="camera-btn camera-btn-species"
                      onClick={() => handleClassify("Species Sighting")}
                      disabled={classifying || !selectedSpecies}
                    >
                      🐘 Species Sighting
                    </button>
                    <button
                      className="camera-btn camera-btn-poacher"
                      onClick={() => handleClassify("Poacher Alert")}
                      disabled={classifying}
                    >
                      🚨 Poacher Alert
                    </button>
                    <button
                      className="camera-btn camera-btn-false"
                      onClick={() => handleClassify("False Trigger")}
                      disabled={classifying}
                    >
                      ✅ False Trigger
                    </button>
                    <button
                      className="camera-btn camera-btn-review"
                      onClick={() => handleClassify("Needs Second Review")}
                      disabled={classifying}
                    >
                      👁️ Needs Second Review
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="camera-sidebar">
            <div className="camera-session-card">
              <h3>Current Session</h3>
              <div className="camera-session-stats">
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-species" />
                  Species: {sessionStats.speciesSightings}
                </div>
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-poacher" />
                  Poacher: {sessionStats.poacherAlerts}
                </div>
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-false" />
                  False: {sessionStats.falseTriggers}
                </div>
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-review" />
                  Review: {sessionStats.secondReviews}
                </div>
              </div>
            </div>

            <div className="camera-alerts-card">
              <h3>Recent Alerts ({alerts.length})</h3>
              {alerts.length === 0 && <p className="camera-empty">No alerts yet.</p>}
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert._id} className={`camera-alert-item camera-alert-${alert.priority.toLowerCase()}`}>
                  <div className="camera-alert-row">
                    <strong>{alert.alertType}</strong>
                    <span className={`camera-priority-badge camera-priority-${alert.priority.toLowerCase()}`}>
                      {alert.priority}
                    </span>
                  </div>
                  <div className="camera-alert-details">
                    {alert.species && <span>Species: {alert.species}</span>}
                    <span>Camera: {alert.cameraTrapId}</span>
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : secondReviewCaptures.length > 0 ? (
        <div className="camera-layout">
          <div className="camera-main">
            <div className="camera-progress">
              <span>Second Review: {secondReviewCaptures.length} capture{secondReviewCaptures.length !== 1 ? "s" : ""} need follow-up</span>
            </div>

            {secondReviewCaptures.map((capture) => (
              <div key={capture._id} className="camera-capture-card" style={{ marginBottom: "1rem" }}>
                <div className="camera-image-container">
                  <img
                    src={capture.imageUrl}
                    alt={`Capture from ${capture.cameraTrapId}`}
                    className="camera-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%231a1a2e' width='600' height='400'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='16'%3EImage not available%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div className="camera-image-overlay">
                    <span className="camera-capture-badge">{capture.cameraTrapId}</span>
                    <span className="camera-capture-time">
                      {new Date(capture.capturedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="camera-capture-details">
                  <div className="camera-detail">
                    <span className="camera-detail-label">Camera Trap</span>
                    <span className="camera-detail-value">{capture.cameraTrapId}</span>
                  </div>
                  <div className="camera-detail">
                    <span className="camera-detail-label">Location</span>
                    <span className="camera-detail-value">
                      {capture.location.latitude.toFixed(4)}, {capture.location.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="camera-detail">
                    <span className="camera-detail-label">Status</span>
                    <span className="camera-detail-value" style={{ color: "#f59e0b" }}>
                      Needs Second Review
                    </span>
                  </div>
                </div>

                <div className="camera-classify-section">
                  <h3>Re-Classify Capture</h3>
                  {poacherConfirm && (
                    <div className="camera-poacher-confirm">
                      <p>Confirm: Is this a <strong>confirmed poacher sighting</strong>? This will trigger a <strong>Critical</strong> alert.</p>
                      <div className="camera-confirm-btns">
                        <button onClick={() => setPoacherConfirm(false)} disabled={classifying}>Cancel</button>
                        <button
                          className="camera-confirm-yes"
                          onClick={() => handleSecondReviewClassify(capture._id, "Poacher Alert")}
                          disabled={classifying}
                        >
                          Yes, Create Alert
                        </button>
                      </div>
                    </div>
                  )}

                  {!poacherConfirm && (
                    <>
                      <div className="camera-species-select">
                        <label>Species (if Species Sighting):</label>
                        <select
                          value={selectedSpecies}
                          onChange={(e) => setSelectedSpecies(e.target.value)}
                          disabled={classifying}
                        >
                          <option value="">Select species...</option>
                          <option value="Sri Lankan Elephant">Sri Lankan Elephant</option>
                          <option value="Sri Lankan Leopard">Sri Lankan Leopard</option>
                        </select>
                      </div>

                      <div className="camera-classify-buttons">
                        <button
                          className="camera-btn camera-btn-species"
                          onClick={() => handleSecondReviewClassify(capture._id, "Species Sighting")}
                          disabled={classifying || !selectedSpecies}
                        >
                          🐘 Species Sighting
                        </button>
                        <button
                          className="camera-btn camera-btn-poacher"
                          onClick={() => handleSecondReviewClassify(capture._id, "Poacher Alert")}
                          disabled={classifying}
                        >
                          🚨 Poacher Alert
                        </button>
                        <button
                          className="camera-btn camera-btn-false"
                          onClick={() => handleSecondReviewClassify(capture._id, "False Trigger")}
                          disabled={classifying}
                        >
                          ✅ False Trigger
                        </button>
                        <button
                          className="camera-btn camera-btn-review"
                          onClick={() => handleSecondReviewClassify(capture._id, "Needs Second Review")}
                          disabled={classifying}
                        >
                          👁️ Needs Second Review
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="camera-sidebar">
            <div className="camera-session-card">
              <h3>Current Session</h3>
              <div className="camera-session-stats">
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-species" />
                  Species: {sessionStats.speciesSightings}
                </div>
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-poacher" />
                  Poacher: {sessionStats.poacherAlerts}
                </div>
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-false" />
                  False: {sessionStats.falseTriggers}
                </div>
                <div className="camera-session-stat">
                  <span className="camera-session-dot camera-dot-review" />
                  Review: {sessionStats.secondReviews}
                </div>
              </div>
            </div>

            <div className="camera-alerts-card">
              <h3>Recent Alerts ({alerts.length})</h3>
              {alerts.length === 0 && <p className="camera-empty">No alerts yet.</p>}
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert._id} className={`camera-alert-item camera-alert-${alert.priority.toLowerCase()}`}>
                  <div className="camera-alert-row">
                    <strong>{alert.alertType}</strong>
                    <span className={`camera-priority-badge camera-priority-${alert.priority.toLowerCase()}`}>
                      {alert.priority}
                    </span>
                  </div>
                  <div className="camera-alert-details">
                    {alert.species && <span>Species: {alert.species}</span>}
                    <span>Camera: {alert.cameraTrapId}</span>
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="camera-loading">No unreviewed captures found.</div>
      )}
    </div>
  );
}

export default CameraTrap;
