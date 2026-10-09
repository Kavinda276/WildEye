import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SupervisorDashboard from "../pages/SupervisorDashboard";
import * as wildlifeApi from "../services/wildlifeApi";
import * as incidentApi from "../services/incidentApi";
import * as communityReportApi from "../services/communityReportApi";
import * as cameraTrapApi from "../services/cameraTrapApi";

vi.mock("../services/wildlifeApi");
vi.mock("../services/incidentApi");
vi.mock("../services/communityReportApi");
vi.mock("../services/cameraTrapApi");

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Rectangle: () => null,
  Polygon: () => null,
  Marker: () => null,
  Popup: () => null,
  useMap: () => ({
    setView: () => {},
    flyTo: () => {},
    getZoom: () => 13,
    invalidateSize: () => {},
  }),
}));

const mockAlerts = [
  {
    _id: "alert-1",
    animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
    riskZone: { name: "Human-Wildlife Conflict Zone", severity: "High" },
    currentLocation: { latitude: 6.85, longitude: 80.86 },
    priority: "Critical" as const,
    status: "Pending" as const,
    responder: "",
    responderRole: "Ranger" as const,
    createdAt: "2026-10-07T09:00:00Z",
    updatedAt: "2026-10-07T09:00:00Z",
  },
];

const mockIncidents = [
  {
    _id: "inc-1",
    incidentType: "Snare" as const,
    description: "Snare found near boundary",
    photoUrl: undefined,
    location: { latitude: 6.85, longitude: 80.86, source: "Manual" as const },
    patrolId: "PATROL-001",
    syncStatus: "Synced" as const,
    reviewStatus: "Open" as const,
    reportedAt: "2026-10-07T09:10:00Z",
    createdAt: "2026-10-07T09:10:00Z",
    updatedAt: "2026-10-07T09:10:00Z",
  },
];

const mockCommunityReports = [
  {
    _id: "rep-1",
    reportType: "Elephant Sighting" as const,
    description: "Elephants near paddy field",
    location: { latitude: 6.87, longitude: 80.9, source: "Manual" as const },
    status: "Pending Assignment" as const,
    assignedResponder: "",
    assignedResponderRole: "" as const,
    reportedAt: "2026-10-07T09:20:00Z",
    createdAt: "2026-10-07T09:20:00Z",
    updatedAt: "2026-10-07T09:20:00Z",
  },
];

const mockCameraAlerts = [
  {
    _id: "cam-1",
    capture: "cap-1",
    alertType: "Poacher Alert" as const,
    species: "",
    priority: "Critical" as const,
    cameraTrapId: "CT-003",
    location: { latitude: 6.88, longitude: 80.885 },
    status: "Active" as const,
    createdAt: "2026-10-07T09:30:00Z",
    updatedAt: "2026-10-07T09:30:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(wildlifeApi.fetchAnimals).mockResolvedValue([
    {
      _id: "an-1",
      name: "Kavi",
      species: "Sri Lankan Leopard",
      collarId: "COLLAR-001",
      collarStatus: "Active" as const,
      location: { latitude: 6.85, longitude: 80.86 },
      lastSignal: "2026-10-07T09:00:00Z",
      isInsideRiskZone: false,
      createdAt: "2026-10-07T09:00:00Z",
      updatedAt: "2026-10-07T09:00:00Z",
    },
  ]);
  vi.mocked(wildlifeApi.fetchRiskZones).mockResolvedValue([]);
  vi.mocked(wildlifeApi.fetchAlerts).mockResolvedValue(mockAlerts);
  vi.mocked(incidentApi.getAllIncidents).mockResolvedValue({
    success: true,
    message: "ok",
    data: mockIncidents,
  });
  vi.mocked(communityReportApi.fetchCommunityReports).mockResolvedValue(mockCommunityReports);
  vi.mocked(cameraTrapApi.fetchCameraTrapAlerts).mockResolvedValue(mockCameraAlerts);
});

afterEach(() => {
  cleanup();
});

const renderDashboard = () =>
  render(
    <BrowserRouter>
      <SupervisorDashboard />
    </BrowserRouter>
  );

const waitForDashboard = async () => {
  await waitFor(() => {
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });
};

const getTab = (label: string): HTMLElement => {
  const match = screen
    .getAllByRole("tab")
    .find((el) => el.textContent?.includes(label));
  if (!match) throw new Error(`No tab labelled "${label}"`);
  return match;
};

describe("SupervisorDashboard tabs", () => {
  it("fetches all data sources on mount regardless of active tab", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(wildlifeApi.fetchAnimals).toHaveBeenCalled();
    });
    expect(wildlifeApi.fetchAlerts).toHaveBeenCalled();
    expect(incidentApi.getAllIncidents).toHaveBeenCalled();
    expect(communityReportApi.fetchCommunityReports).toHaveBeenCalled();
    expect(cameraTrapApi.fetchCameraTrapAlerts).toHaveBeenCalled();
  });

  it("shows all five tabs", async () => {
    renderDashboard();
    await waitForDashboard();

    expect(getTab("Monitoring Map")).toBeInTheDocument();
    expect(getTab("Wildlife Alerts")).toBeInTheDocument();
    expect(getTab("Incident Reports")).toBeInTheDocument();
    expect(getTab("Community Reports")).toBeInTheDocument();
    expect(getTab("Camera Trap Alerts")).toBeInTheDocument();
  });

  it("renders the map section by default and hides the other sections", async () => {
    renderDashboard();
    await waitForDashboard();

    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Active Wildlife Alerts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ranger Incident Reports" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Community Reports Requiring Attention" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Camera Trap Alerts" })).not.toBeInTheDocument();
  });

  it("shows wildlife alerts data when the alerts tab is clicked", async () => {
    renderDashboard();
    await waitForDashboard();

    fireEvent.click(getTab("Wildlife Alerts"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Active Wildlife Alerts" })).toBeInTheDocument();
    });
    expect(screen.getByText("Kavi")).toBeInTheDocument();
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
  });

  it("shows incident reports data when the incidents tab is clicked", async () => {
    renderDashboard();
    await waitForDashboard();

    fireEvent.click(getTab("Incident Reports"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ranger Incident Reports" })).toBeInTheDocument();
    });
    expect(screen.getByText("Snare")).toBeInTheDocument();
  });

  it("shows community reports data when the community tab is clicked", async () => {
    renderDashboard();
    await waitForDashboard();

    fireEvent.click(getTab("Community Reports"));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Community Reports Requiring Attention" })
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Elephant Sighting/)).toBeInTheDocument();
    expect(screen.getByText("Pending Assignment")).toBeInTheDocument();
  });

  it("shows camera trap alerts when the camera tab is clicked", async () => {
    renderDashboard();
    await waitForDashboard();

    fireEvent.click(getTab("Camera Trap Alerts"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Camera Trap Alerts" })).toBeInTheDocument();
    });
    expect(screen.getByText(/Poacher Alert/)).toBeInTheDocument();
  });

  it("marks only the selected tab as active", async () => {
    renderDashboard();
    await waitForDashboard();

    fireEvent.click(getTab("Community Reports"));

    await waitFor(() => {
      expect(getTab("Community Reports")).toHaveAttribute("aria-selected", "true");
    });
    expect(getTab("Monitoring Map")).toHaveAttribute("aria-selected", "false");
  });
});