import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IncidentHistory from "../components/ranger/IncidentHistory";
import type { Incident, LocalIncident } from "../types/incident";

const mockOnRefresh = vi.fn();
const mockOnRetrySync = vi.fn();

const serverIncidents: Incident[] = [
  {
    _id: "abc123",
    incidentType: "Snare",
    description: "Test snare",
    location: { latitude: -2.3456, longitude: 34.5678, source: "GPS" },
    patrolId: "PATROL-001",
    syncStatus: "Synced",
    reviewStatus: "Open",
    reportedAt: "2026-09-23T10:00:00.000Z",
    createdAt: "2026-09-23T10:00:00.000Z",
    updatedAt: "2026-09-23T10:00:00.000Z",
  },
];

const localIncidents: LocalIncident[] = [
  {
    localId: "local-001",
    incidentType: "Illegal Campsite",
    description: "Camp found",
    location: { latitude: 6.9, longitude: 79.8, source: "Manual" },
    patrolId: "PATROL-001",
    syncStatus: "Pending",
    reportedAt: "2026-09-23T10:00:00.000Z",
    createdAt: "2026-09-23T10:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IncidentHistory", () => {
  it("shows empty state when no incidents", () => {
    render(
      <IncidentHistory
        serverIncidents={[]}
        localIncidents={[]}
        onRefresh={mockOnRefresh}
        onRetrySync={mockOnRetrySync}
        isSyncing={false}
      />
    );

    expect(screen.getByText(/no incidents recorded yet/i)).toBeInTheDocument();
  });

  it("displays server incidents with Synced status", () => {
    render(
      <IncidentHistory
        serverIncidents={serverIncidents}
        localIncidents={[]}
        onRefresh={mockOnRefresh}
        onRetrySync={mockOnRetrySync}
        isSyncing={false}
      />
    );

    expect(screen.getByText("Snare")).toBeInTheDocument();
    expect(screen.getAllByText("Synced").length).toBeGreaterThan(0);
    expect(screen.getByText(/PATROL-001/)).toBeInTheDocument();
  });

  it("displays local incidents with Pending Sync status", () => {
    render(
      <IncidentHistory
        serverIncidents={[]}
        localIncidents={localIncidents}
        onRefresh={mockOnRefresh}
        onRetrySync={mockOnRetrySync}
        isSyncing={false}
      />
    );

    expect(screen.getByText("Illegal Campsite")).toBeInTheDocument();
    expect(screen.getAllByText("Pending Sync").length).toBeGreaterThan(0);
    expect(screen.getByText("Retry Sync")).toBeInTheDocument();
  });

  it("calls onRefresh when Refresh button is clicked", () => {
    render(
      <IncidentHistory
        serverIncidents={[]}
        localIncidents={[]}
        onRefresh={mockOnRefresh}
        onRetrySync={mockOnRetrySync}
        isSyncing={false}
      />
    );

    fireEvent.click(screen.getByText("Refresh"));
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it("calls onRetrySync with correct incident", () => {
    render(
      <IncidentHistory
        serverIncidents={[]}
        localIncidents={localIncidents}
        onRefresh={mockOnRefresh}
        onRetrySync={mockOnRetrySync}
        isSyncing={false}
      />
    );

    fireEvent.click(screen.getByText("Retry Sync"));
    expect(mockOnRetrySync).toHaveBeenCalledWith(localIncidents[0]);
  });

  it("disables buttons when syncing", () => {
    render(
      <IncidentHistory
        serverIncidents={[]}
        localIncidents={localIncidents}
        onRefresh={mockOnRefresh}
        onRetrySync={mockOnRetrySync}
        isSyncing={true}
      />
    );

    expect(screen.getByText("Syncing...")).toBeDisabled();
    expect(screen.getByText("Retry Sync")).toBeDisabled();
  });
});
