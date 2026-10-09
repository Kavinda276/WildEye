import { describe, it, expect, vi, beforeEach } from "vitest";
import * as incidentApi from "../services/incidentApi";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("incidentApi", () => {
  describe("createIncidentWithFormData", () => {
    it("sends FormData and returns result", async () => {
      const mockResponse = {
        success: true,
        message: "Incident created successfully",
        data: { _id: "abc123" },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const formData = new FormData();
      formData.append("incidentType", "Snare");

      const result = await incidentApi.createIncidentWithFormData(formData);

      expect(result.success).toBe(true);
      expect(result.data?._id).toBe("abc123");
    });

    it("throws error on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: "Validation failed" }),
      } as Response);

      const formData = new FormData();

      await expect(incidentApi.createIncidentWithFormData(formData)).rejects.toThrow(
        "Validation failed"
      );
    });
  });

  describe("getAllIncidents", () => {
    it("returns incidents list", async () => {
      const mockResponse = {
        success: true,
        message: "ok",
        data: [{ _id: "1" }, { _id: "2" }],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await incidentApi.getAllIncidents();

      expect(result.data).toHaveLength(2);
    });

    it("throws on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Server error" }),
      } as Response);

      await expect(incidentApi.getAllIncidents()).rejects.toThrow("Server error");
    });
  });
});
