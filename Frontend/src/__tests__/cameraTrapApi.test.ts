import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  seedCaptures,
  fetchPendingCaptures,
  classifyCaptureApi,
  generateSessionReportApi,
  fetchSessionReports,
  fetchCameraTrapAlerts,
} from "../services/cameraTrapApi";

const mockCapture = {
  _id: "capture123",
  cameraTrapId: "CT-001",
  imageUrl: "https://example.com/photo.jpg",
  capturedAt: "2026-09-20T06:15:00.000Z",
  location: { latitude: 6.8732, longitude: 80.8961 },
  status: "unreviewed" as const,
  classification: "" as const,
  species: "",
  createdAt: "2026-09-20T06:15:00.000Z",
  updatedAt: "2026-09-20T06:15:00.000Z",
};

const mockAlert = {
  _id: "alert123",
  capture: "capture123",
  alertType: "Species Sighting" as const,
  species: "Sri Lankan Elephant",
  priority: "Medium" as const,
  cameraTrapId: "CT-001",
  location: { latitude: 6.8732, longitude: 80.8961 },
  status: "Active" as const,
  createdAt: "2026-09-20T06:15:00.000Z",
  updatedAt: "2026-09-20T06:15:00.000Z",
};

const mockReport = {
  _id: "report123",
  sessionDate: "2026-09-24T10:00:00.000Z",
  totalReviewed: 5,
  speciesSightings: 2,
  poacherAlerts: 1,
  falseTriggers: 1,
  secondReviews: 1,
  captureLocations: [{ latitude: 6.87, longitude: 80.89, cameraTrapId: "CT-001" }],
  classificationBreakdown: [{ classification: "Species Sighting", count: 2 }],
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
};

describe("cameraTrapApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("seedCaptures", () => {
    it("should seed captures successfully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
      } as Response);

      await expect(seedCaptures()).resolves.toBeUndefined();
    });

    it("should throw on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
      } as Response);

      await expect(seedCaptures()).rejects.toThrow("Failed to seed captures");
    });
  });

  describe("fetchPendingCaptures", () => {
    it("should return pending captures", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [mockCapture] }),
      } as Response);

      const result = await fetchPendingCaptures();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("unreviewed");
    });

    it("should throw on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Error" }),
      } as Response);

      await expect(fetchPendingCaptures()).rejects.toThrow("Error");
    });
  });

  describe("classifyCaptureApi", () => {
    it("should classify capture successfully", async () => {
      const classified = { ...mockCapture, status: "reviewed", classification: "Species Sighting", species: "Sri Lankan Elephant" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: classified }),
      } as Response);

      const result = await classifyCaptureApi("capture123", "Species Sighting", "Sri Lankan Elephant");
      expect(result.classification).toBe("Species Sighting");
      expect(result.species).toBe("Sri Lankan Elephant");
    });

    it("should throw on classification error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Species is required" }),
      } as Response);

      await expect(classifyCaptureApi("capture123", "Species Sighting")).rejects.toThrow("Species is required");
    });
  });

  describe("fetchCameraTrapAlerts", () => {
    it("should return alerts", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [mockAlert] }),
      } as Response);

      const result = await fetchCameraTrapAlerts();
      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe("Species Sighting");
    });
  });

  describe("generateSessionReportApi", () => {
    it("should generate report", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockReport }),
      } as Response);

      const result = await generateSessionReportApi();
      expect(result.totalReviewed).toBe(5);
      expect(result.speciesSightings).toBe(2);
    });

    it("should throw on generation failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ message: "No reviewed captures" }),
      } as Response);

      await expect(generateSessionReportApi()).rejects.toThrow("No reviewed captures");
    });
  });

  describe("fetchSessionReports", () => {
    it("should return reports list", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [mockReport] }),
      } as Response);

      const result = await fetchSessionReports();
      expect(result).toHaveLength(1);
      expect(result[0].classificationBreakdown).toHaveLength(1);
    });
  });
});
