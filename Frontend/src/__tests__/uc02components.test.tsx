import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TrackedAnimalList from "../components/supervisor/TrackedAnimalList";
import SummaryCards from "../components/supervisor/SummaryCards";
import WildlifeAlertsSection from "../components/supervisor/WildlifeAlertsSection";
import type { Animal, WildlifeAlert } from "../types/wildlife";

const buildAnimal = (overrides: Partial<Animal> = {}): Animal => ({
  _id: "animal123",
  name: "Kavi",
  species: "Sri Lankan Leopard",
  collarId: "COLLAR-001",
  collarStatus: "Active",
  location: { latitude: 6.85, longitude: 80.86 },
  lastSignal: "2026-09-24T09:00:00.000Z",
  isInsideRiskZone: false,
  createdAt: "2026-09-24T08:00:00.000Z",
  updatedAt: "2026-09-24T09:00:00.000Z",
  ...overrides,
});

const buildAlert = (overrides: Partial<WildlifeAlert> = {}): WildlifeAlert => ({
  _id: "alert123",
  animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
  riskZone: { name: "Snare Trap Area", severity: "High" },
  currentLocation: { latitude: 6.85, longitude: 80.86 },
  priority: "Critical",
  status: "Pending",
  responder: "",
  responderRole: "Ranger",
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("SummaryCards", () => {
  it("renders all four metrics with their counts", () => {
    render(
      <SummaryCards
        activeAlerts={3}
        trackedAnimals={5}
        openIncidents={2}
        pendingReports={1}
      />
    );

    expect(screen.getByText("Active Wildlife Alerts")).toBeInTheDocument();
    expect(screen.getByText("Tracked Animals")).toBeInTheDocument();
    expect(screen.getByText("Open Incidents")).toBeInTheDocument();
    expect(screen.getByText("Pending Reports")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders zero counts without crashing", () => {
    render(
      <SummaryCards
        activeAlerts={0}
        trackedAnimals={0}
        openIncidents={0}
        pendingReports={0}
      />
    );

    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});

describe("TrackedAnimalList", () => {
  const setup = (animals: Animal[]) => {
    const onSelect = vi.fn();
    const onSimulate = vi.fn();
    const onSignalLost = vi.fn();

    render(
      <TrackedAnimalList
        animals={animals}
        selectedAnimal={null}
        onSelect={onSelect}
        onSimulate={onSimulate}
        onSignalLost={onSignalLost}
        simulating={false}
      />
    );

    return { onSelect, onSimulate, onSignalLost };
  };

  it("shows an empty state when nothing is tracked", () => {
    setup([]);

    expect(screen.getByText(/no animals tracked/i)).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows the tracked count and each animal", () => {
    setup([buildAnimal(), buildAnimal({ _id: "a2", name: "Suraksha" })]);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Kavi")).toBeInTheDocument();
    expect(screen.getByText("Suraksha")).toBeInTheDocument();
    expect(screen.getAllByText("COLLAR-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sri Lankan Leopard").length).toBeGreaterThan(0);
  });

  it("labels a healthy animal as Safe", () => {
    setup([buildAnimal()]);

    expect(screen.getByText("Safe")).toBeInTheDocument();
  });

  it("labels an animal inside a risk zone as High Risk", () => {
    setup([buildAnimal({ isInsideRiskZone: true })]);

    expect(screen.getByText("High Risk")).toBeInTheDocument();
  });

  it("shows Signal Lost in preference to the risk state", () => {
    const { container } = render(
      <TrackedAnimalList
        animals={[buildAnimal({ collarStatus: "Signal Lost", isInsideRiskZone: true })]}
        selectedAnimal={null}
        onSelect={vi.fn()}
        onSimulate={vi.fn()}
        onSignalLost={vi.fn()}
        simulating={false}
      />
    );

    const badge = container.querySelector(".animal-state-badge");
    expect(badge?.textContent).toBe("Signal Lost");
  });

  it("selects an animal when its card is clicked", () => {
    const animal = buildAnimal();
    const { onSelect } = setup([animal]);

    fireEvent.click(screen.getByText("Kavi"));

    expect(onSelect).toHaveBeenCalledWith(animal);
  });

  it("triggers a movement simulation without selecting the card", () => {
    const animal = buildAnimal();
    const { onSimulate, onSelect } = setup([animal]);

    fireEvent.click(screen.getByRole("button", { name: /simulate move/i }));

    expect(onSimulate).toHaveBeenCalledWith(animal);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("triggers the signal lost action", () => {
    const animal = buildAnimal();
    const { onSignalLost } = setup([animal]);

    fireEvent.click(screen.getByRole("button", { name: /signal lost/i }));

    expect(onSignalLost).toHaveBeenCalledWith(animal);
  });

  it("disables the action buttons and shows progress while simulating", () => {
    render(
      <TrackedAnimalList
        animals={[buildAnimal()]}
        selectedAnimal={null}
        onSelect={vi.fn()}
        onSimulate={vi.fn()}
        onSignalLost={vi.fn()}
        simulating
      />
    );

    expect(screen.getByRole("button", { name: /moving/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /signal lost/i })).toBeDisabled();
  });

  it("highlights the selected animal", () => {
    const { container } = render(
      <TrackedAnimalList
        animals={[buildAnimal()]}
        selectedAnimal={buildAnimal()}
        onSelect={vi.fn()}
        onSimulate={vi.fn()}
        onSignalLost={vi.fn()}
        simulating={false}
      />
    );

    expect(container.querySelector(".animal-card.selected")).toBeInTheDocument();
  });

  it("applies the in-risk modifier class", () => {
    const { container } = render(
      <TrackedAnimalList
        animals={[buildAnimal({ isInsideRiskZone: true })]}
        selectedAnimal={null}
        onSelect={vi.fn()}
        onSimulate={vi.fn()}
        onSignalLost={vi.fn()}
        simulating={false}
      />
    );

    expect(container.querySelector(".animal-card.in-risk")).toBeInTheDocument();
  });
});

describe("WildlifeAlertsSection", () => {
  const setup = (
    alerts: WildlifeAlert[],
    handlers: {
      onDispatch?: ReturnType<typeof vi.fn>;
      onDelete?: ReturnType<typeof vi.fn>;
    } = {}
  ) => {
    const onDispatch = handlers.onDispatch ?? vi.fn();
    const onDelete = handlers.onDelete ?? vi.fn();

    render(
      <WildlifeAlertsSection alerts={alerts} onDispatch={onDispatch} onDelete={onDelete} />
    );

    return { onDispatch, onDelete };
  };

  it("shows an empty state when there are no alerts", () => {
    setup([]);

    expect(screen.getByText(/no wildlife alerts yet/i)).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("separates pending alerts from other alerts", () => {
    setup([
      buildAlert({ _id: "a1", status: "Pending" }),
      buildAlert({ _id: "a2", status: "Resolved", responder: "Sgt. Fernando" }),
    ]);

    expect(screen.getByText("Needs Dispatch (1)")).toBeInTheDocument();
    expect(screen.getByText("Other Alerts (1)")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("shows the alert details for a pending alert", () => {
    setup([buildAlert({ status: "Pending" })]);

    expect(screen.getByText("Kavi")).toBeInTheDocument();
    expect(screen.getByText("(Sri Lankan Leopard)")).toBeInTheDocument();
    expect(screen.getByText("Zone: Snare Trap Area")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("shows the assigned responder on a dispatched alert", () => {
    setup([
      buildAlert({ status: "Dispatched", responder: "Sgt. Fernando" }),
    ]);

    expect(screen.getByText("Responder: Sgt. Fernando")).toBeInTheDocument();
  });

  it("expands the dispatch form when Dispatch is clicked", () => {
    setup([buildAlert({ status: "Pending" })]);

    fireEvent.click(screen.getByRole("button", { name: /dispatch/i }));

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm dispatch/i })).toBeInTheDocument();
  });

  it("collapses the form when Cancel is clicked", () => {
    setup([buildAlert({ status: "Pending" })]);

    fireEvent.click(screen.getByRole("button", { name: /dispatch/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("button", { name: /confirm dispatch/i })).not.toBeInTheDocument();
  });

  it("dispatches to the chosen responder and collapses the form", () => {
    const { onDispatch } = setup([buildAlert({ status: "Pending" })]);

    fireEvent.click(screen.getByRole("button", { name: /dispatch/i }));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Rt. Cmdr. Perera" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm dispatch/i }));

    expect(onDispatch).toHaveBeenCalledWith(
      "alert123",
      "Rt. Cmdr. Perera",
      "Ranger"
    );
  });

  it("does not dispatch when no responder is selected", () => {
    const { onDispatch } = setup([buildAlert({ status: "Pending" })]);

    fireEvent.click(screen.getByRole("button", { name: /dispatch/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm dispatch/i }));

    expect(onDispatch).not.toHaveBeenCalled();
  });

  it("lists both ranger and liaison officers as options", () => {
    setup([buildAlert({ status: "Pending" })]);

    fireEvent.click(screen.getByRole("button", { name: /dispatch/i }));

    const options = screen.getAllByRole("option").map((o) => o.textContent ?? "");
    expect(options.some((o) => o.includes("Rt. Cmdr. Perera"))).toBe(true);
    expect(options.some((o) => o.includes("Ms. Jayasinghe"))).toBe(true);
  });

  it("deletes an alert from either section", () => {
    const { onDelete } = setup([
      buildAlert({ _id: "a1", status: "Pending" }),
      buildAlert({ _id: "a2", status: "Resolved" }),
    ]);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(deleteButtons[1]);

    expect(onDelete).toHaveBeenNthCalledWith(1, "a1");
    expect(onDelete).toHaveBeenNthCalledWith(2, "a2");
  });
});