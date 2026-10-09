import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CommunityReporting from "../pages/CommunityReporting";
import * as api from "../services/communityReportApi";
import type { CommunityReport, ResponderInfo } from "../services/communityReportApi";

vi.mock("../services/communityReportApi");

const mockedApi = vi.mocked(api);

const WAIT = { timeout: 20000 };

const buildReport = (
  overrides: Partial<CommunityReport> = {}
): CommunityReport => ({
  _id: "report1",
  reportType: "Elephant Sighting",
  description: "Elephants near the paddy field",
  location: { latitude: 6.855, longitude: 80.91, source: "Manual" },
  status: "Assigned",
  assignedResponder: "Ms. Ratnayake",
  assignedResponderRole: "Community Liaison Officer",
  reportedAt: "2026-09-24T10:00:00.000Z",
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
  ...overrides,
});

const buildResponder = (
  overrides: Partial<ResponderInfo> = {}
): ResponderInfo => ({
  name: "Rt. Cmdr. Perera",
  role: "Ranger",
  available: true,
  ...overrides,
});

const renderPage = () =>
  render(
    <BrowserRouter>
      <CommunityReporting />
    </BrowserRouter>
  );

const fillCoordinates = (lat = "6.855", lng = "80.91") => {
  fireEvent.change(screen.getByPlaceholderText(/latitude/i), {
    target: { value: lat },
  });
  fireEvent.change(screen.getByPlaceholderText(/longitude/i), {
    target: { value: lng },
  });
};

const selectType = (label: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name: label }));
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.fetchCommunityReports.mockResolvedValue([]);
  mockedApi.fetchResponders.mockResolvedValue([buildResponder()]);
  mockedApi.createCommunityReport.mockResolvedValue(buildReport());
  mockedApi.setResponderAvailability.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
}, 20000);

describe("CommunityReporting - rendering", () => {
  it("shows the page heading", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /wildeye community/i })).toBeInTheDocument();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);
  });

  it("has a link back to the home page", () => {
    renderPage();

    expect(screen.getByText(/home/i).closest("a")).toHaveAttribute("href", "/");
  });

  it("loads reports and responders on mount", async () => {
    renderPage();

    await waitFor(() => {
      expect(mockedApi.fetchCommunityReports).toHaveBeenCalled();
      expect(mockedApi.fetchResponders).toHaveBeenCalled();
    }, WAIT);
  });

  it("shows an empty state when there are no reports", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no reports submitted yet/i)).toBeInTheDocument();
    }, WAIT);
  });

  it("lists existing reports", async () => {
    mockedApi.fetchCommunityReports.mockResolvedValue([
      buildReport({ _id: "r1" }),
      buildReport({ _id: "r2", reportType: "Crop-Raiding Incident", status: "Pending Assignment" }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Recent Reports \(2\)/i)).toBeInTheDocument();
    }, WAIT);
    expect(screen.getAllByText(/Elephant Sighting/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Crop-Raiding Incident/).length).toBeGreaterThan(0);
    expect(screen.getByText("Pending Assignment")).toBeInTheDocument();
  });

  it("shows a connection warning when loading fails", async () => {
    mockedApi.fetchCommunityReports.mockRejectedValue(new Error("offline"));
    mockedApi.fetchResponders.mockRejectedValue(new Error("offline"));

    renderPage();

    // The page retries the load before giving up, so this needs more than the default budget.
    await waitFor(() => {
      expect(screen.getByText(/cannot reach the server/i)).toBeInTheDocument();
    }, WAIT);
  }, 20000);
});

describe("CommunityReporting - validation", () => {
  it("requires a report type", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    fillCoordinates();
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText(/please select a report type/i)).toBeInTheDocument();
    }, WAIT);
    expect(mockedApi.createCommunityReport).not.toHaveBeenCalled();
  });

  it("requires a location", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    selectType(/elephant sighting/i);
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText(/please provide a location/i)).toBeInTheDocument();
    }, WAIT);
  });

  it("rejects an out-of-range latitude", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    selectType(/elephant sighting/i);
    fillCoordinates("120", "80.91");
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid latitude/i)).toBeInTheDocument();
    }, WAIT);
  });

  it("rejects an out-of-range longitude", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    selectType(/elephant sighting/i);
    fillCoordinates("6.85", "999");
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid longitude/i)).toBeInTheDocument();
    }, WAIT);
  });
});

describe("CommunityReporting - submission", () => {
  it("submits a report with GPS coordinates", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    selectType(/elephant sighting/i);
    fillCoordinates();
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(mockedApi.createCommunityReport).toHaveBeenCalledWith({
        reportType: "Elephant Sighting",
        description: "",
        location: { latitude: 6.855, longitude: 80.91, source: "Manual" },
      });
    }, WAIT);
    expect(screen.getByText(/report submitted successfully/i)).toBeInTheDocument();
  });

  it("clears the form after a successful submission", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    selectType(/elephant sighting/i);
    fillCoordinates();
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/latitude/i)).toHaveValue(null);
    }, WAIT);
    expect(screen.getByPlaceholderText(/longitude/i)).toHaveValue(null);
  }, 20000);

  it("surfaces the server error when submission fails", async () => {
    mockedApi.createCommunityReport.mockRejectedValue(new Error("Invalid report type"));

    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    selectType(/elephant sighting/i);
    fillCoordinates();
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid report type")).toBeInTheDocument();
    }, WAIT);
  });
});

describe("CommunityReporting - SMS simulation", () => {
  it("rejects an empty SMS message", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    fireEvent.click(screen.getByRole("button", { name: /simulate sms report/i }));

    await waitFor(() => {
      expect(screen.getByText(/sms message cannot be empty/i)).toBeInTheDocument();
    }, WAIT);
  });

  it("converts a message mentioning crops into a Crop-Raiding Incident", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    fireEvent.change(screen.getByPlaceholderText(/\+94/i), {
      target: { value: "0771234567" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/e\.g\. 'Elephants near my paddy field'/i),
      { target: { value: "Crop raiding in the paddy field" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /simulate sms report/i }));

    await waitFor(() => {
      expect(mockedApi.createCommunityReport).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: "Crop-Raiding Incident" })
      );
    }, WAIT);
    expect(screen.getByText(/sms report converted and submitted/i)).toBeInTheDocument();
  });

  it("defaults other messages to an Elephant Sighting", async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.fetchCommunityReports).toHaveBeenCalled(), WAIT);

    fireEvent.change(
      screen.getByPlaceholderText(/e\.g\. 'Elephants near my paddy field'/i),
      { target: { value: "Elephants on the road" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /simulate sms report/i }));

    await waitFor(() => {
      expect(mockedApi.createCommunityReport).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: "Elephant Sighting" })
      );
    }, WAIT);
  });
});

describe("CommunityReporting - responder availability", () => {
  it("shows each responder and their state", async () => {
    mockedApi.fetchResponders.mockResolvedValue([
      buildResponder({ name: "Rt. Cmdr. Perera", available: true }),
      buildResponder({ name: "Ms. Ratnayake", available: false }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Rt\. Cmdr\. Perera \(Available\)/)).toBeInTheDocument();
    }, WAIT);
    expect(screen.getByText(/Ms\. Ratnayake \(Unavailable\)/)).toBeInTheDocument();
  });

  it("sets all responders unavailable when some are available", async () => {
    mockedApi.fetchResponders.mockResolvedValue([
      buildResponder({ name: "A", available: true }),
      buildResponder({ name: "B", available: false }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set all unavailable/i })
      ).toBeInTheDocument();
    }, WAIT);

    fireEvent.click(screen.getByRole("button", { name: /set all unavailable/i }));

    await waitFor(() => {
      expect(mockedApi.setResponderAvailability).toHaveBeenCalledWith("A", false);
    }, WAIT);
    expect(mockedApi.setResponderAvailability).toHaveBeenCalledWith("B", false);
    expect(
      screen.getByText(/all responders set to unavailable/i)
    ).toBeInTheDocument();
  });

  it("sets all responders available when none are available", async () => {
    mockedApi.fetchResponders.mockResolvedValue([
      buildResponder({ name: "A", available: false }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set all available/i })
      ).toBeInTheDocument();
    }, WAIT);

    fireEvent.click(screen.getByRole("button", { name: /set all available/i }));

    await waitFor(() => {
      expect(mockedApi.setResponderAvailability).toHaveBeenCalledWith("A", true);
    }, WAIT);
    expect(screen.getByText(/all responders set to available/i)).toBeInTheDocument();
  });

  it("shows an error when the availability update fails", async () => {
    mockedApi.setResponderAvailability.mockRejectedValue(new Error("Update failed"));

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set all unavailable/i })
      ).toBeInTheDocument();
    }, WAIT);

    fireEvent.click(screen.getByRole("button", { name: /set all unavailable/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to update responders/i)).toBeInTheDocument();
    }, WAIT);
  });
});