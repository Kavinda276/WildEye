import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import NotFound from "../pages/NotFound";
import CameraTrapReview from "../pages/CameraTrapReview";
import { api } from "../services/api";
import {
  fetchResponders,
  setResponderAvailability,
} from "../services/communityReportApi";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

const rawResponse = (data: unknown) =>
  ({
    ok: true,
    statusText: "OK",
    json: async () => data,
  }) as Response;

const envelopeResponse = (data: unknown) =>
  ({
    ok: true,
    statusText: "OK",
    json: async () => ({ success: true, data }),
  }) as Response;

const badResponse = (statusText: string) =>
  ({
    ok: false,
    statusText,
    json: async () => ({ success: false, message: statusText }),
  }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("NotFound", () => {
  it("renders the 404 heading and explanation", () => {
    renderWithRouter(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404");
    expect(
      screen.getByText(/the page you are looking for does not exist/i)
    ).toBeInTheDocument();
  });

  it("offers a link back to the home page", () => {
    renderWithRouter(<NotFound />);

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/"
    );
  });
});

describe("CameraTrapReview", () => {
  it("renders the heading and explains the review workflow", () => {
    renderWithRouter(<CameraTrapReview />);

    expect(
      screen.getByRole("heading", { name: /camera trap review/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/classify species/i)).toBeInTheDocument();
    expect(screen.getByText(/automated alerts/i)).toBeInTheDocument();
  });

  it("links back to the home page", () => {
    renderWithRouter(<CameraTrapReview />);

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/"
    );
  });
});

describe("api helper", () => {
  describe("get", () => {
    it("requests the endpoint and returns parsed json", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(rawResponse({ ok: 1 }));

      const result = await api.get<{ ok: number }>("/animals");

      expect(spy).toHaveBeenCalledWith("/api/animals");
      expect(result).toEqual({ ok: 1 });
    });

    it("throws with the method, endpoint and status on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(badResponse("Not Found"));

      await expect(api.get("/missing")).rejects.toThrow(
        "GET /missing failed: Not Found"
      );
    });
  });

  describe("post", () => {
    it("sends json and returns parsed json", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(rawResponse({ id: "x" }));

      const result = await api.post<{ id: string }>("/reports", { a: 1 });

      expect(spy).toHaveBeenCalledWith("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: 1 }),
      });
      expect(result).toEqual({ id: "x" });
    });

    it("throws with the method, endpoint and status on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(badResponse("Server Error"));

      await expect(api.post("/reports", {})).rejects.toThrow(
        "POST /reports failed: Server Error"
      );
    });
  });
});

describe("communityReportApi responder endpoints", () => {
  const responder = {
    name: "Sgt. Fernando",
    role: "Ranger" as const,
    available: false,
  };

  it("fetches the responder roster", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(envelopeResponse([responder]));

    const result = await fetchResponders();

    expect(spy).toHaveBeenCalledWith("/api/community-reports/responders");
    expect(result).toHaveLength(1);
    expect(result[0].available).toBe(false);
  });

  it("throws the server message when the roster lookup fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(badResponse("Server Error"));

    await expect(fetchResponders()).rejects.toThrow();
  });

  it("patches responder availability and returns the updated roster", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(envelopeResponse([responder]));

    const result = await setResponderAvailability("Sgt. Fernando", false);

    expect(spy).toHaveBeenCalledWith(
      "/api/community-reports/responders/availability",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Sgt. Fernando", available: false }),
      }
    );
    expect(result[0].name).toBe("Sgt. Fernando");
  });

  it("throws the server message when the update fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(badResponse("Not Found"));

    await expect(setResponderAvailability("Nobody", true)).rejects.toThrow();
  });
});

