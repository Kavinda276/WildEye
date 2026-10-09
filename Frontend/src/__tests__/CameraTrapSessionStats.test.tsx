import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CameraTrap from "../pages/CameraTrap";
import * as cameraTrapApi from "../services/cameraTrapApi";

vi.mock("../services/cameraTrapApi");

const mockedApi = vi.mocked(cameraTrapApi);

const buildCapture = (overrides: Partial<cameraTrapApi.CameraCapture> = {}): cameraTrapApi.CameraCapture => ({
  _id: "cap-1",
  cameraTrapId: "CT-001",
  imageUrl: "https://example.com/photo.jpg",
  capturedAt: "2026-10-07T01:00:00.000Z",
  location: { latitude: 6.85, longitude: 80.86 },
  status: "unreviewed",
  classification: "",
  species: "",
  createdAt: "2026-10-07T01:00:00.000Z",
  updatedAt: "2026-10-07T01:00:00.000Z",
  ...overrides,
});

const renderTrap = () =>
  render(
    <BrowserRouter>
      <CameraTrap />
    </BrowserRouter>
  );

/**
 * Reads a session counter from either the "Current Session" sidebar
 * ("Species: 3") or the summary grid ("3 / Species Sightings").
 */
const SIDEBAR_LABELS: Record<string, string> = {
  Species: "Species",
  Poacher: "Poacher",
  False: "False",
  Review: "Review",
};

const SUMMARY_CLASSES: Record<string, string> = {
  Species: "camera-stat-species",
  Poacher: "camera-stat-poacher",
  False: "camera-stat-false",
  Review: "camera-stat-review",
};

const readCounters = (): Record<string, string> => {
  const counters: Record<string, string> = {};
  const blocks = document.querySelectorAll(".camera-session-stats");

  blocks.forEach((block) => {
    block.querySelectorAll(".camera-session-stat").forEach((row) => {
      const text = (row.textContent ?? "").replace(/\s+/g, " ").trim();
      Object.entries(SIDEBAR_LABELS).forEach(([key, sidebarLabel]) => {
        if (new RegExp(`^${sidebarLabel}:\\s*\\d+$`).test(text)) {
          counters[key] = text.split(":")[1].trim();
        }
      });
    });
  });

  Object.entries(SUMMARY_CLASSES).forEach(([key, className]) => {
    if (counters[key] !== undefined) return;
    const cell = document.querySelector(`.camera-stat.${className}`);
    const value = cell?.querySelector(".camera-stat-value");
    if (value) counters[key] = (value.textContent ?? "").trim();
  });

  return counters;
};

const sessionStat = (label: string): string => {
  const value = readCounters()[label];
  if (value === undefined) throw new Error(`session counter "${label}" not rendered`);
  return value;
};

// The component wraps its initial load in a retry helper, so under a loaded
// machine (full parallel suite) the first paint can take noticeably longer.
const WAIT = { timeout: 20000 };

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.fetchPendingCaptures.mockResolvedValue([]);
  mockedApi.fetchNeedsSecondReview.mockResolvedValue([]);
  mockedApi.fetchCameraTrapAlerts.mockResolvedValue([]);
  mockedApi.fetchSessionReports.mockResolvedValue([]);
  mockedApi.classifyCaptureApi.mockResolvedValue(buildCapture({ status: "reviewed" }));
});

afterEach(() => {
  cleanup();
});

describe("CameraTrap session counters", () => {
it("increments the matching counter for each direct classification", async () => {
    const threePending = [
      buildCapture({ _id: "cap-1", cameraTrapId: "CT-001" }),
      buildCapture({ _id: "cap-2", cameraTrapId: "CT-002" }),
      buildCapture({ _id: "cap-3", cameraTrapId: "CT-003" }),
    ];
    mockedApi.fetchPendingCaptures.mockResolvedValue(threePending);

    renderTrap();
    await waitFor(() => expect(screen.getAllByText("CT-001").length).toBeGreaterThan(0), WAIT);

const advance = async (action: () => void, expected: string, label: string) => {
    action();
    await waitFor(
      () => {
        expect(sessionStat(label)).toBe(expected);
      },
      { timeout: 4000 }
    );
  };

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Sri Lankan Elephant" },
    });
    await advance(
      () => fireEvent.click(screen.getByRole("button", { name: /species sighting/i })),
      "1",
      "Species"
    );
    await advance(
      () => fireEvent.click(screen.getByRole("button", { name: /false trigger/i })),
      "1",
      "False"
    );
    await advance(
      () => fireEvent.click(screen.getByRole("button", { name: /needs second review/i })),
      "1",
      "Review"
    );

    expect(sessionStat("Poacher")).toBe("0");
  });

  it("counts a capture sent to second review under Review, not as finalized", async () => {
    mockedApi.fetchPendingCaptures.mockResolvedValue([
      buildCapture({ _id: "cap-1", cameraTrapId: "CT-001" }),
    ]);

    renderTrap();
    await waitFor(() => expect(screen.getAllByText("CT-001").length).toBeGreaterThan(0), WAIT);

    fireEvent.click(screen.getByRole("button", { name: /needs second review/i }));

    await waitFor(() => {
      expect(mockedApi.classifyCaptureApi).toHaveBeenCalledWith(
        "cap-1",
        "Needs Second Review",
        undefined
      );
    });

    expect(sessionStat("Review")).toBe("1");
    expect(sessionStat("Poacher")).toBe("0");
    expect(sessionStat("False")).toBe("0");
  });

const twoPendingSecondReview = () => [
  buildCapture({
    _id: "cap-1",
    cameraTrapId: "CT-001",
    status: "needs_second_review",
    classification: "Needs Second Review",
  }),
  buildCapture({
    _id: "cap-2",
    cameraTrapId: "CT-002",
    status: "needs_second_review",
    classification: "Needs Second Review",
  }),
];

it("finalizing one of two second-review items moves it out of Review into Poacher", async () => {
  mockedApi.fetchNeedsSecondReview.mockResolvedValue(twoPendingSecondReview());

  renderTrap();
  await waitFor(() => expect(screen.getAllByText(/re-classify capture/i).length).toBe(2), WAIT);

  const firstCard = screen.getAllByText(/re-classify capture/i)[0].closest(".camera-capture-card") as HTMLElement;
  mockedApi.classifyCaptureApi.mockResolvedValue(
    buildCapture({ _id: "cap-1", status: "reviewed", classification: "Poacher Alert" })
  );

  fireEvent.click(within(firstCard).getByRole("button", { name: /poacher alert/i }));
  await waitFor(() =>
    expect(within(firstCard).getByText(/confirmed poacher sighting/i)).toBeInTheDocument()
  );
  fireEvent.click(within(firstCard).getByRole("button", { name: /yes, create alert/i }));

  await waitFor(() => {
    expect(sessionStat("Poacher")).toBe("1");
  });
  expect(sessionStat("Review")).toBe("0");
});

it("finalizing one of two second-review items as False Trigger moves it out of Review", async () => {
  mockedApi.fetchNeedsSecondReview.mockResolvedValue(twoPendingSecondReview());

  renderTrap();
  await waitFor(() => expect(screen.getAllByText(/re-classify capture/i).length).toBe(2), WAIT);

  const firstCard = screen.getAllByText(/re-classify capture/i)[0].closest(".camera-capture-card") as HTMLElement;
  fireEvent.click(within(firstCard).getByRole("button", { name: /false trigger/i }));

  await waitFor(() => {
    expect(sessionStat("False")).toBe("1");
  });
  expect(sessionStat("Review")).toBe("0");
});

it("finalizing a second-review item as Species Sighting requires a species", async () => {
  mockedApi.fetchNeedsSecondReview.mockResolvedValue(twoPendingSecondReview());

  renderTrap();
  await waitFor(() => expect(screen.getAllByText(/re-classify capture/i).length).toBe(2), WAIT);

  const firstCard = screen.getAllByText(/re-classify capture/i)[0].closest(".camera-capture-card") as HTMLElement;
  fireEvent.change(within(firstCard).getByRole("combobox"), {
    target: { value: "Sri Lankan Leopard" },
  });
  fireEvent.click(within(firstCard).getByRole("button", { name: /species sighting/i }));

  await waitFor(() => {
    expect(sessionStat("Species")).toBe("1");
  });
  expect(sessionStat("Review")).toBe("0");
  expect(mockedApi.classifyCaptureApi).toHaveBeenCalledWith(
    "cap-1",
    "Species Sighting",
    "Sri Lankan Leopard"
  );
});

it("never lets the Review counter go negative", async () => {
    mockedApi.fetchPendingCaptures.mockResolvedValue([
      buildCapture({ _id: "cap-9", cameraTrapId: "CT-009" }),
    ]);

    renderTrap();
    await waitFor(() => expect(screen.getAllByText("CT-009").length).toBeGreaterThan(0), WAIT);
    expect(sessionStat("Review")).toBe("0");

    // Finalize a second-review item while the local Review count is already 0.
    fireEvent.click(screen.getByRole("button", { name: /false trigger/i }));

    await waitFor(() => {
      expect(mockedApi.classifyCaptureApi).toHaveBeenCalled();
    });
    expect(sessionStat("Review")).toBe("0");
    expect(sessionStat("False")).toBe("1");
  });

it("keeps Review incremented when an item is re-sent to second review", async () => {
    mockedApi.fetchPendingCaptures.mockResolvedValue([
      buildCapture({ _id: "cap-8", cameraTrapId: "CT-008" }),
    ]);

    renderTrap();
    await waitFor(() => expect(screen.getAllByText("CT-008").length).toBeGreaterThan(0), WAIT);

    fireEvent.click(screen.getByRole("button", { name: /needs second review/i }));

    await waitFor(() => {
      expect(sessionStat("Review")).toBe("1");
    });
    expect(sessionStat("False")).toBe("0");
  });

  it("resets all counters when captures are re-seeded", async () => {
    mockedApi.fetchPendingCaptures.mockResolvedValue([
      buildCapture({ _id: "cap-1", cameraTrapId: "CT-001" }),
    ]);

    renderTrap();
    await waitFor(() => expect(screen.getAllByText("CT-001").length).toBeGreaterThan(0), WAIT);

    fireEvent.click(screen.getByRole("button", { name: /needs second review/i }));
    await waitFor(() => expect(sessionStat("Review")).toBe("1"));

    mockedApi.seedCaptures.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: /load captures/i }));

    await waitFor(() => {
      expect(sessionStat("Review")).toBe("0");
    });
  });
});






