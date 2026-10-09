import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCommunityReport,
  fetchCommunityReports,
  type CommunityReport,
} from "../services/communityReportApi";

const mockReport: CommunityReport = {
  _id: "report123",
  reportType: "Elephant Sighting",
  description: "Elephant near village",
  location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
  status: "Assigned",
  assignedResponder: "Ms. Jayasinghe",
  assignedResponderRole: "Community Liaison Officer",
  reportedAt: "2026-09-24T10:00:00.000Z",
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
};

describe("communityReportApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createCommunityReport", () => {
    it("should create report and return data", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockReport }),
      } as Response);

      const result = await createCommunityReport({
        reportType: "Elephant Sighting",
        description: "Elephant near village",
        location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
      });

      expect(result._id).toBe("report123");
      expect(result.status).toBe("Assigned");
      expect(result.assignedResponder).toBeTruthy();
    });

    it("should throw on server error with message", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Invalid report type" }),
      } as Response);

      await expect(
        createCommunityReport({
          reportType: "Elephant Sighting",
          location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
        })
      ).rejects.toThrow("Invalid report type");
    });

    it("should throw default message when server provides none", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(
        createCommunityReport({
          reportType: "Elephant Sighting",
          location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
        })
      ).rejects.toThrow("Failed to submit report");
    });
  });

  describe("fetchCommunityReports", () => {
    it("should return list of reports", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [mockReport] }),
      } as Response);

      const result = await fetchCommunityReports();
      expect(result).toHaveLength(1);
      expect(result[0].reportType).toBe("Elephant Sighting");
    });

    it("should return empty array when no reports", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const result = await fetchCommunityReports();
      expect(result).toEqual([]);
    });

    it("should throw on fetch failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ message: "DB connection failed" }),
      } as Response);

      await expect(fetchCommunityReports()).rejects.toThrow("DB connection failed");
    });
  });
});
