import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { CommunityReport } from "../services/communityReportApi";
import {
  createCommunityReport,
  fetchCommunityReports,
  fetchResponders,
  setResponderAvailability,
  type ResponderInfo,
} from "../services/communityReportApi";
import { withRetry, SERVER_UNREACHABLE_MESSAGE } from "../services/retry";

type ReportType = "Elephant Sighting" | "Crop-Raiding Incident";

function CommunityReporting() {
  const [reportType, setReportType] = useState<ReportType | "">("");
  const [locationMode, setLocationMode] = useState<"GPS" | "Manual">("Manual");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gpsError, setGpsError] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittedReport, setSubmittedReport] = useState<CommunityReport | null>(null);
  const [recentReports, setRecentReports] = useState<CommunityReport[]>([]);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSubmitting, setSmsSubmitting] = useState(false);
  const [responders, setResponders] = useState<ResponderInfo[]>([]);
  const [loadError, setLoadError] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const [reports, resp] = await withRetry(() =>
        Promise.all([
          fetchCommunityReports(),
          fetchResponders(),
        ])
      );
      setRecentReports(reports);
      setResponders(resp);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const handleReconnect = () => {
      if (navigator.onLine) void loadReports();
    };
    window.addEventListener("focus", loadReports);
    window.addEventListener("online", handleReconnect);
    return () => {
      window.removeEventListener("focus", loadReports);
      window.removeEventListener("online", handleReconnect);
    };
  }, [loadReports]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 6000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleToggleAllUnavailable = async () => {
    try {
      const allUnavailable = responders.every((r) => !r.available);
      const newState = allUnavailable;
      for (const r of responders) {
        await setResponderAvailability(r.name, newState);
      }
      const updated = await fetchResponders();
      setResponders(updated);
      setMessage({
        type: "success",
        text: newState ? "All responders set to available." : "All responders set to unavailable. New reports will be Pending Assignment.",
      });
    } catch {
      setMessage({ type: "error", text: "Failed to update responders." });
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("Geolocation not supported. Enter coordinates manually.");
      return;
    }

    const doRequest = () => {
      setGpsStatus("loading");
      setGpsError("");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
          setLocationMode("GPS");
          setGpsStatus("success");
        },
        (error) => {
          setGpsStatus("error");
          if (error.code === error.PERMISSION_DENIED) {
            setGpsError("Location access denied. Click the lock icon in the address bar → Location → Allow, then try again.");
          } else {
            setGpsError("GPS unavailable. Enter location manually.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "denied") {
          setGpsStatus("error");
          setGpsError("Location permission is blocked. Click the lock icon in the address bar, set Location to Allow, then reload the page.");
          return;
        }
        doRequest();
      }).catch(() => doRequest());
    } else {
      doRequest();
    }
  };

  const validate = (): boolean => {
    if (!reportType) {
      setMessage({ type: "error", text: "Please select a report type." });
      return false;
    }
    if (!latitude || !longitude) {
      setMessage({ type: "error", text: "Please provide a location." });
      return false;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setMessage({ type: "error", text: "Invalid latitude." });
      return false;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setMessage({ type: "error", text: "Invalid longitude." });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const report = await createCommunityReport({
        reportType: reportType as ReportType,
        description: notes,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          source: locationMode,
        },
      });
      setSubmittedReport(report);
      setMessage({ type: "success", text: "Report submitted successfully!" });
      await loadReports();

      setReportType("");
      setLatitude("");
      setLongitude("");
      setLocationMode("Manual");
      setGpsStatus("idle");
      setNotes("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit report",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSmsSubmit = async () => {
    if (!smsMessage.trim()) {
      setMessage({ type: "error", text: "SMS message cannot be empty." });
      return;
    }
    setSmsSubmitting(true);
    try {
      const reportType: ReportType = smsMessage.toLowerCase().includes("crop")
        ? "Crop-Raiding Incident"
        : "Elephant Sighting";

      const report = await createCommunityReport({
        reportType,
        description: `[SMS from ${smsPhone || "unknown"}] ${smsMessage}`,
        location: {
          latitude: 6.85 + Math.random() * 0.1,
          longitude: 80.85 + Math.random() * 0.1,
          source: "Manual",
        },
      });
      setSubmittedReport(report);
      setMessage({ type: "success", text: "SMS report converted and submitted!" });
      setSmsPhone("");
      setSmsMessage("");
      await loadReports();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit SMS report",
      });
    } finally {
      setSmsSubmitting(false);
    }
  };

  return (
    <div className="community-page">
      <div className="community-header">
        <Link to="/" className="community-back">&larr; Home</Link>
        <div className="community-brand">
          <span className="community-logo">🐘</span>
          <h1>WildEye Community</h1>
        </div>
        <div />
      </div>

      {loadError && (
        <div className="community-alert community-alert-error">
          {SERVER_UNREACHABLE_MESSAGE}
        </div>
      )}

      {message && (
        <div className={`community-alert community-alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="community-layout">
        <div className="community-form-section">
          <div className="community-card">
            <h2>Report a Sighting</h2>
            <p className="community-subtitle">Help protect wildlife by reporting what you see</p>

            <div className="community-field">
              <label>Report Type *</label>
              <div className="community-type-buttons">
                <button
                  className={`community-type-btn ${reportType === "Elephant Sighting" ? "active" : ""}`}
                  onClick={() => setReportType("Elephant Sighting")}
                >
                  🐘 Elephant Sighting
                </button>
                <button
                  className={`community-type-btn ${reportType === "Crop-Raiding Incident" ? "active" : ""}`}
                  onClick={() => setReportType("Crop-Raiding Incident")}
                >
                  🌾 Crop-Raiding Incident
                </button>
              </div>
            </div>

            <div className="community-field">
              <label>Location *</label>
              <div className="community-gps-toggle">
                <button
                  className={`community-gps-btn ${locationMode === "GPS" ? "active" : ""}`}
                  onClick={() => {
                    setLocationMode("GPS");
                    captureGPS();
                  }}
                  disabled={submitting}
                >
                  {gpsStatus === "loading" ? "Locating..." : "Use Current GPS"}
                </button>
                <button
                  className={`community-gps-btn ${locationMode === "Manual" ? "active" : ""}`}
                  onClick={() => {
                    setLocationMode("Manual");
                    setGpsStatus("idle");
                  }}
                  disabled={submitting}
                >
                  Enter Manually
                </button>
              </div>

              {gpsStatus === "success" && (
                <span className="community-gps-status">GPS location captured</span>
              )}
              {gpsStatus === "error" && (
                <span className="community-gps-error">{gpsError}</span>
              )}

              {locationMode === "Manual" && (
                <div className="community-coords">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    disabled={submitting}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}

              {locationMode === "GPS" && latitude && longitude && (
                <div className="community-coords community-coords-readonly">
                  <span>Lat: {latitude}</span>
                  <span>Lng: {longitude}</span>
                </div>
              )}
            </div>

            <div className="community-field">
              <label>Notes / Description (optional)</label>
              <textarea
                rows={3}
                placeholder="Additional details (e.g. number of elephants, direction of movement, damage observed)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button
              className="community-submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>

          {submittedReport && (
            <div className="community-card community-confirmation">
              <h3>Report Confirmed</h3>
              <div className="community-confirm-details">
                <p><strong>Type:</strong> {submittedReport.reportType}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span style={{ color: submittedReport.status === "Pending Assignment" ? "#f59e0b" : undefined }}>
                    {submittedReport.status}
                  </span>
                </p>
                {submittedReport.status === "Pending Assignment" && (
                  <p style={{ color: "#f59e0b", fontSize: "0.85rem" }}>
                    No responders are currently available. A supervisor will assign one when available.
                  </p>
                )}
                {submittedReport.assignedResponder && (
                  <p>
                    <strong>Assigned Responder:</strong> {submittedReport.assignedResponder} ({submittedReport.assignedResponderRole})
                  </p>
                )}
                <p>
                  <strong>Location:</strong> {submittedReport.location.latitude.toFixed(4)},{" "}
                  {submittedReport.location.longitude.toFixed(4)} ({submittedReport.location.source})
                </p>
                {submittedReport.description && (
                  <p><strong>Notes:</strong> {submittedReport.description}</p>
                )}
              </div>
            </div>
          )}

          <div className="community-card community-sms-section">
            <h3>📱 Simulate SMS Report</h3>
            <p className="community-subtitle">
              Simulate an SMS-based report from a community member
            </p>
            <div className="community-field">
              <label>Phone Number (optional)</label>
              <input
                type="tel"
                placeholder="+94 77 123 4567"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                disabled={smsSubmitting}
              />
            </div>
            <div className="community-field">
              <label>SMS Message *</label>
              <textarea
                rows={2}
                placeholder="e.g. 'Elephants near my paddy field' or 'Crop raiding at Galgamuwa'"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                disabled={smsSubmitting}
              />
            </div>
            <button
              className="community-sms-btn"
              onClick={handleSmsSubmit}
              disabled={smsSubmitting}
            >
              {smsSubmitting ? "Sending..." : "Simulate SMS Report"}
            </button>
          </div>

          <div className="community-card" style={{ marginTop: "1rem" }}>
            <h3>Demo: Responder Availability</h3>
            <p className="community-subtitle">
              Toggle all responders unavailable to see Pending Assignment status
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {responders.map((r) => (
                <span
                  key={r.name}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    backgroundColor: r.available ? "#dcfce7" : "#fee2e2",
                    color: r.available ? "#166534" : "#991b1b",
                  }}
                >
                  {r.name} ({r.available ? "Available" : "Unavailable"})
                </span>
              ))}
            </div>
            <button
              className="community-sms-btn"
              onClick={handleToggleAllUnavailable}
              style={{ backgroundColor: responders.every((r) => !r.available) ? "#22c55e" : "#ef4444" }}
            >
              {responders.every((r) => !r.available)
                ? "Set All Available"
                : "Set All Unavailable"}
            </button>
          </div>
        </div>

        <div className="community-reports-section">
          <div className="community-card">
            <h3>Recent Reports ({recentReports.length})</h3>
            {recentReports.length === 0 && (
              <p className="community-empty">No reports submitted yet.</p>
            )}
            {recentReports.map((report) => (
              <div key={report._id} className="community-report-card">
                <div className="community-report-header">
                  <span className="community-report-type">
                    {report.reportType === "Elephant Sighting" ? "🐘" : "🌾"} {report.reportType}
                  </span>
                  <span
                    className="community-status-badge"
                    style={{
                      backgroundColor:
                        report.status === "Assigned"
                          ? "#22c55e"
                          : report.status === "Pending Assignment"
                          ? "#f59e0b"
                          : "#3b82f6",
                    }}
                  >
                    {report.status}
                  </span>
                </div>
                <div className="community-report-body">
                  <span>
                    {report.location.latitude.toFixed(4)}, {report.location.longitude.toFixed(4)} ({report.location.source})
                  </span>
                  {report.assignedResponder && (
                    <span>Responder: {report.assignedResponder}</span>
                  )}
                  <span>{new Date(report.reportedAt).toLocaleString()}</span>
                  {report.description && (
                    <span className="community-report-notes">"{report.description}"</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunityReporting;
