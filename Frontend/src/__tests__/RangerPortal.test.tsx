import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RangerPortal from "../pages/RangerPortal";
import * as incidentApi from "../services/incidentApi";
import * as offlineService from "../services/offlineIncidentService";
import * as syncService from "../services/incidentSyncService";

vi.mock("../services/incidentApi");
vi.mock("../services/offlineIncidentService");
vi.mock("../services/incidentSyncService");

const mockedApi = vi.mocked(incidentApi);
const mockedOffline = vi.mocked(offlineService);
const mockedSync = vi.mocked(syncService);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, writable: true });
  mockedApi.getAllIncidents.mockResolvedValue({ success: true, message: "ok", data: [] });
  mockedOffline.getPendingIncidents.mockResolvedValue([]);
  mockedSync.syncPendingIncidents.mockResolvedValue({ synced: 0, failed: 0 });
  mockedSync.retrySingleIncident.mockResolvedValue(true);
});

const renderPortal = () =>
  render(
    <BrowserRouter>
      <RangerPortal />
    </BrowserRouter>
  );

describe("RangerPortal", () => {
  it("renders the Log Incident heading", async () => {
    renderPortal();
    expect(screen.getByRole("heading", { name: /log incident/i })).toBeInTheDocument();
  });

  it("renders the subtitle", async () => {
    renderPortal();
    expect(screen.getByText(/record wildlife or poaching incidents/i)).toBeInTheDocument();
  });

  it("renders the incident form", async () => {
    renderPortal();
    expect(screen.getByLabelText(/incident type/i)).toBeInTheDocument();
  });

  it("renders the network status", async () => {
    renderPortal();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renders Recent Incidents section", async () => {
    renderPortal();
    expect(screen.getByText("Recent Incidents")).toBeInTheDocument();
  });

  it("renders Home link", async () => {
    renderPortal();
    expect(screen.getByText(/home/i).closest("a")).toHaveAttribute("href", "/");
  });

  it("loads server incidents on mount", async () => {
    mockedApi.getAllIncidents.mockResolvedValue({
      success: true,
      message: "ok",
      data: [{ _id: "1", incidentType: "Snare", syncStatus: "Synced", reviewStatus: "Open", location: { latitude: 6.5, longitude: 80.0, source: "GPS" }, description: "Test", patrolId: "P-001", reportedAt: "2026-09-23T10:00:00Z", createdAt: "2026-09-23T10:00:00Z", updatedAt: "2026-09-23T10:00:00Z" }],
    });
    renderPortal();
    await waitFor(() => {
      expect(mockedApi.getAllIncidents).toHaveBeenCalled();
    });
  });

  it("loads pending local incidents on mount", async () => {
    mockedOffline.getPendingIncidents.mockResolvedValue([
      {
        localId: "local-1",
        incidentType: "Snare",
        description: "Test",
        location: { latitude: 6.5, longitude: 80.0, source: "GPS" },
        patrolId: "P-001",
        syncStatus: "Pending",
        reportedAt: "2026-09-23T10:00:00Z",
        createdAt: "2026-09-23T10:00:00Z",
      },
    ]);
    renderPortal();
    await waitFor(() => {
      expect(mockedOffline.getPendingIncidents).toHaveBeenCalled();
    });
  });

  it("saves to IndexedDB when the server is unreachable", async () => {
    mockedApi.createIncidentWithFormData.mockRejectedValue(new Error("Network request failed"));
    mockedOffline.saveLocalIncident.mockResolvedValue(undefined);
    mockedOffline.getPendingIncidents.mockResolvedValue([
      {
        localId: "local-1",
        incidentType: "Snare",
        description: "Test",
        location: { latitude: 6.5, longitude: 80.0, source: "GPS" },
        patrolId: "P-001",
        syncStatus: "Pending",
        reportedAt: "2026-09-23T10:00:00Z",
        createdAt: "2026-09-23T10:00:00Z",
      },
    ]);

    renderPortal();

    await waitFor(() => {
      expect(mockedOffline.getPendingIncidents).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText(/incident type/i), { target: { value: "Snare" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Test" } });

    const latInput = screen.getByPlaceholderText(/latitude/i);
    const lngInput = screen.getByPlaceholderText(/longitude/i);
    fireEvent.change(latInput, { target: { value: "6.5" } });
    fireEvent.change(lngInput, { target: { value: "80.0" } });

    fireEvent.click(screen.getByRole("button", { name: /log incident/i }));

    await waitFor(() => {
      expect(mockedOffline.saveLocalIncident).toHaveBeenCalled();
    });

    expect(screen.getByText(/saved locally/i)).toBeInTheDocument();
  });

  it("shows success message on successful online submit", async () => {
    mockedApi.createIncidentWithFormData.mockResolvedValue({ success: true, message: "Created", data: undefined });
    mockedApi.getAllIncidents.mockResolvedValue({ success: true, message: "ok", data: [] });

    renderPortal();

    fireEvent.change(screen.getByLabelText(/incident type/i), { target: { value: "Snare" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Test snare" } });

    const latInput = screen.getByPlaceholderText(/latitude/i);
    const lngInput = screen.getByPlaceholderText(/longitude/i);
    fireEvent.change(latInput, { target: { value: "6.5" } });
    fireEvent.change(lngInput, { target: { value: "80.0" } });

    fireEvent.click(screen.getByRole("button", { name: /log incident/i }));

    await waitFor(() => {
      expect(screen.getByText(/incident logged successfully/i)).toBeInTheDocument();
    });
  });

  it("falls back to local storage when submit fails", async () => {
    mockedApi.createIncidentWithFormData.mockRejectedValue(new Error("Server down"));
    mockedOffline.saveLocalIncident.mockResolvedValue(undefined);
    mockedOffline.getPendingIncidents.mockResolvedValue([]);

    renderPortal();

    fireEvent.change(screen.getByLabelText(/incident type/i), { target: { value: "Snare" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Test" } });

    const latInput = screen.getByPlaceholderText(/latitude/i);
    const lngInput = screen.getByPlaceholderText(/longitude/i);
    fireEvent.change(latInput, { target: { value: "6.5" } });
    fireEvent.change(lngInput, { target: { value: "80.0" } });

    fireEvent.click(screen.getByRole("button", { name: /log incident/i }));

    await waitFor(() => {
      expect(mockedOffline.saveLocalIncident).toHaveBeenCalled();
    });

    expect(screen.getByText(/saved locally/i)).toBeInTheDocument();
  });

  it("handles retry sync success", async () => {
    mockedSync.retrySingleIncident.mockResolvedValue(true);
    mockedApi.getAllIncidents.mockResolvedValue({ success: true, message: "ok", data: [] });

    renderPortal();

    await waitFor(() => {
      expect(mockedApi.getAllIncidents).toHaveBeenCalled();
    });

    const retryFn = mockedSync.retrySingleIncident;
    expect(retryFn).not.toHaveBeenCalled();
  });

  it("handles Refresh button click", async () => {
    renderPortal();

    await waitFor(() => {
      expect(mockedApi.getAllIncidents).toHaveBeenCalled();
    });

    const refreshBtn = screen.getByText("Refresh");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockedApi.getAllIncidents).toHaveBeenCalledTimes(2);
    });
  });

  it("shows sync messages when online event fires with synced incidents", async () => {
    mockedSync.syncPendingIncidents.mockResolvedValue({ synced: 2, failed: 0 });
    renderPortal();

    await waitFor(() => {
      expect(mockedApi.getAllIncidents).toHaveBeenCalled();
    });

    fireEvent(window, new Event("online"));

    await waitFor(() => {
      expect(screen.getByText(/2 incident.*synchronized/i)).toBeInTheDocument();
    });
  });

  it("shows error sync message when online event fires with failures", async () => {
    mockedSync.syncPendingIncidents.mockResolvedValue({ synced: 0, failed: 3 });
    renderPortal();

    await waitFor(() => {
      expect(mockedApi.getAllIncidents).toHaveBeenCalled();
    });

    fireEvent(window, new Event("online"));

    await waitFor(() => {
      expect(screen.getByText(/3 incident.*failed to sync/i)).toBeInTheDocument();
    });
  });

  it("shows no message when sync returns zero results", async () => {
    mockedSync.syncPendingIncidents.mockResolvedValue({ synced: 0, failed: 0 });
    renderPortal();

    await waitFor(() => {
      expect(mockedApi.getAllIncidents).toHaveBeenCalled();
    });

    fireEvent(window, new Event("online"));

    await waitFor(() => {
      expect(screen.queryByText(/synchronized/i)).not.toBeInTheDocument();
    });
  });
});
