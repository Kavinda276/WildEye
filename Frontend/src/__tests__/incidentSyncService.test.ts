import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetPending = vi.fn();
const mockRemoveLocal = vi.fn();

vi.mock("../services/offlineIncidentService", () => ({
  getPendingIncidents: (...args: unknown[]) => mockGetPending(...args),
  removeLocalIncident: (...args: unknown[]) => mockRemoveLocal(...args),
}));

const mockLocalIncident = {
  localId: "local-001",
  incidentType: "Snare" as const,
  description: "Found a snare",
  location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
  patrolId: "PATROL-001",
  syncStatus: "Pending" as const,
  reportedAt: "2026-09-23T10:00:00Z",
  createdAt: "2026-09-23T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("incidentSyncService", () => {
  describe("syncPendingIncidents", () => {
    it("syncs pending incidents and returns counts", async () => {
      mockGetPending.mockResolvedValue([mockLocalIncident]);
      mockRemoveLocal.mockResolvedValue(undefined);

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { _id: "1" } }),
      } as Response);

      const { syncPendingIncidents } = await import("../services/incidentSyncService");

      const promise = syncPendingIncidents();
      await vi.advanceTimersByTimeAsync(0);
      const result = await promise;

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockRemoveLocal).toHaveBeenCalledWith("local-001");
    });

    it("handles multiple pending incidents", async () => {
      const incident2 = { ...mockLocalIncident, localId: "local-002" };
      mockGetPending.mockResolvedValue([mockLocalIncident, incident2]);
      mockRemoveLocal.mockResolvedValue(undefined);

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { _id: "1" } }),
      } as Response);

      const { syncPendingIncidents } = await import("../services/incidentSyncService");

      const promise = syncPendingIncidents();
      await vi.advanceTimersByTimeAsync(0);
      const result = await promise;

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("returns empty when no pending incidents", async () => {
      mockGetPending.mockResolvedValue([]);

      const { syncPendingIncidents } = await import("../services/incidentSyncService");
      const result = await syncPendingIncidents();

      expect(result).toEqual({ synced: 0, failed: 0 });
    });

    it("marks as failed after max retries when upload keeps failing", async () => {
      mockGetPending.mockResolvedValue([mockLocalIncident]);
      mockRemoveLocal.mockResolvedValue(undefined);

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: "Server error" }),
      } as Response);

      const { syncPendingIncidents } = await import("../services/incidentSyncService");

      const promise = syncPendingIncidents();
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockRemoveLocal).not.toHaveBeenCalled();
    });

    it("succeeds after first retry when initial attempt fails", async () => {
      mockGetPending.mockResolvedValue([mockLocalIncident]);
      mockRemoveLocal.mockResolvedValue(undefined);

      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            json: async () => ({ success: false, message: "Temp error" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({ success: true, data: { _id: "1" } }),
        } as Response;
      });

      const { syncPendingIncidents } = await import("../services/incidentSyncService");

      const promise = syncPendingIncidents();
      await vi.advanceTimersByTimeAsync(10000);
      const result = await promise;

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("sends photo blob as File when present", async () => {
      const incidentWithPhoto = {
        ...mockLocalIncident,
        photoBlob: new Blob(["test"], { type: "image/jpeg" }),
        photoName: "test.jpg",
      };
      mockGetPending.mockResolvedValue([incidentWithPhoto]);
      mockRemoveLocal.mockResolvedValue(undefined);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { _id: "1" } }),
      } as Response);

      const { syncPendingIncidents } = await import("../services/incidentSyncService");

      const promise = syncPendingIncidents();
      await vi.advanceTimersByTimeAsync(0);
      await promise;

      expect(fetchSpy).toHaveBeenCalled();
      const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
      expect(formData.get("photo")).toBeInstanceOf(File);
    });

    it("does not append photo when photoBlob is absent", async () => {
      mockGetPending.mockResolvedValue([mockLocalIncident]);
      mockRemoveLocal.mockResolvedValue(undefined);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { _id: "1" } }),
      } as Response);

      const { syncPendingIncidents } = await import("../services/incidentSyncService");

      const promise = syncPendingIncidents();
      await vi.advanceTimersByTimeAsync(0);
      await promise;

      const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
      expect(formData.get("photo")).toBeNull();
    });
  });

  describe("retrySingleIncident", () => {
    it("returns true on successful sync", async () => {
      mockRemoveLocal.mockResolvedValue(undefined);
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { _id: "1" } }),
      } as Response);

      const { retrySingleIncident } = await import("../services/incidentSyncService");
      const result = await retrySingleIncident(mockLocalIncident);

      expect(result).toBe(true);
      expect(mockRemoveLocal).toHaveBeenCalledWith("local-001");
    });

    it("returns false after all retries fail", async () => {
      mockRemoveLocal.mockResolvedValue(undefined);
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: "Server error" }),
      } as Response);

      const { retrySingleIncident } = await import("../services/incidentSyncService");

      const promise = retrySingleIncident(mockLocalIncident);
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(result).toBe(false);
      expect(mockRemoveLocal).not.toHaveBeenCalled();
    });

    it("succeeds after retry on transient failure", async () => {
      mockRemoveLocal.mockResolvedValue(undefined);
      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          return {
            ok: false,
            json: async () => ({ success: false, message: "Temp" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({ success: true, data: { _id: "1" } }),
        } as Response;
      });

      const { retrySingleIncident } = await import("../services/incidentSyncService");

      const promise = retrySingleIncident(mockLocalIncident);
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(result).toBe(true);
    });

    it("throws from uploadIncident when response has no message", async () => {
      mockRemoveLocal.mockResolvedValue(undefined);
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({ success: false }),
      } as Response);

      const { retrySingleIncident } = await import("../services/incidentSyncService");

      const promise = retrySingleIncident(mockLocalIncident);
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(result).toBe(false);
    });
  });
});
