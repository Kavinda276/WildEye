import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NetworkStatus from "../components/common/NetworkStatus";

beforeEach(() => {
  Object.defineProperty(navigator, "onLine", { value: true, writable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NetworkStatus", () => {
  it("displays Online when navigator.onLine is true", () => {
    render(<NetworkStatus />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("displays Offline when navigator.onLine is false", () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true });
    render(<NetworkStatus />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("updates to Offline when offline event fires", () => {
    render(<NetworkStatus />);
    expect(screen.getByText("Online")).toBeInTheDocument();

    fireEvent(window, new Event("offline"));
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("updates to Online when online event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true });
    render(<NetworkStatus />);
    expect(screen.getByText("Offline")).toBeInTheDocument();

    fireEvent(window, new Event("online"));
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("applies correct CSS class for online state", () => {
    render(<NetworkStatus />);
    const container = screen.getByText("Online").closest("div");
    expect(container).toHaveClass("network-online");
  });

  it("applies correct CSS class for offline state", () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true });
    render(<NetworkStatus />);
    const container = screen.getByText("Offline").closest("div");
    expect(container).toHaveClass("network-offline");
  });
});
