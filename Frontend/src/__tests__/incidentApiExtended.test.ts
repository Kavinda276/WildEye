import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as incidentApi from "../services/incidentApi";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("incidentApi - createIncidentFromLocal", () => {
  it("creates incident from local data without photo", async () => {
    const mockResponse = {
      success: true,
      message: "Synced",
      data: { _id: "sync-001" },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const local = {
      localId: "local-001",
      incidentType: "Snare" as const,
      description: "Test incident",
      location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
      patrolId: "PATROL-001",
      syncStatus: "Pending" as const,
      reportedAt: "2026-09-23T10:00:00Z",
      createdAt: "2026-09-23T10:00:00Z",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await incidentApi.createIncidentFromLocal(local);

    expect(result.success).toBe(true);
    expect(result.data?._id).toBe("sync-001");

    const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
    expect(formData.get("incidentType")).toBe("Snare");
    expect(formData.get("description")).toBe("Test incident");
    expect(formData.get("location")).toBe(JSON.stringify(local.location));
    expect(formData.get("patrolId")).toBe("PATROL-001");
    expect(formData.get("reportedAt")).toBe(local.reportedAt);
    expect(formData.get("photo")).toBeNull();
  });

  it("creates incident from local data with photo blob", async () => {
    const mockResponse = {
      success: true,
      message: "Synced",
      data: { _id: "sync-002" },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const blob = new Blob(["fake image data"], { type: "image/jpeg" });
    const local = {
      localId: "local-002",
      incidentType: "Snare" as const,
      description: "Test with photo",
      location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
      patrolId: "PATROL-002",
      syncStatus: "Pending" as const,
      reportedAt: "2026-09-23T11:00:00Z",
      createdAt: "2026-09-23T11:00:00Z",
      photoBlob: blob,
      photoName: "evidence.jpg",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await incidentApi.createIncidentFromLocal(local);

    expect(result.success).toBe(true);

    const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
    expect(formData.get("photo")).toBeInstanceOf(File);
    const file = formData.get("photo") as File;
    expect(file.name).toBe("evidence.jpg");
  });

  it("uses default photo name when photoName is absent", async () => {
    const mockResponse = {
      success: true,
      message: "Synced",
      data: { _id: "sync-003" },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const blob = new Blob(["data"], { type: "image/jpeg" });
    const local = {
      localId: "local-003",
      incidentType: "Snare" as const,
      description: "Test",
      location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
      patrolId: "P-003",
      syncStatus: "Pending" as const,
      reportedAt: "2026-09-23T12:00:00Z",
      createdAt: "2026-09-23T12:00:00Z",
      photoBlob: blob,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await incidentApi.createIncidentFromLocal(local);

    expect(result.success).toBe(true);
    const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
    const file = formData.get("photo") as File;
    expect(file.name).toBe("photo.jpg");
  });

  it("uses fallback file type when blob.type is empty", async () => {
    const mockResponse = {
      success: true,
      message: "Synced",
      data: { _id: "sync-004" },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const blob = new Blob(["data"]);
    const local = {
      localId: "local-004",
      incidentType: "Snare" as const,
      description: "Test",
      location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
      patrolId: "P-004",
      syncStatus: "Pending" as const,
      reportedAt: "2026-09-23T13:00:00Z",
      createdAt: "2026-09-23T13:00:00Z",
      photoBlob: blob,
    };

    const result = await incidentApi.createIncidentFromLocal(local);
    expect(result.success).toBe(true);
  });

  it("throws on server error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: "Sync failed" }),
    } as Response);

    const local = {
      localId: "local-005",
      incidentType: "Snare" as const,
      description: "Test",
      location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
      patrolId: "P-005",
      syncStatus: "Pending" as const,
      reportedAt: "2026-09-23T14:00:00Z",
      createdAt: "2026-09-23T14:00:00Z",
    };

    await expect(incidentApi.createIncidentFromLocal(local)).rejects.toThrow("Sync failed");
  });

  it("throws default message when server provides no message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    } as Response);

    const local = {
      localId: "local-006",
      incidentType: "Snare" as const,
      description: "Test",
      location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
      patrolId: "P-006",
      syncStatus: "Pending" as const,
      reportedAt: "2026-09-23T15:00:00Z",
      createdAt: "2026-09-23T15:00:00Z",
    };

    await expect(incidentApi.createIncidentFromLocal(local)).rejects.toThrow("Sync failed");
  });
});
