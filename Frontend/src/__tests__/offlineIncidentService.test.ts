import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockStore: Record<string, unknown> = {};

const createMockIDBRequest = (result?: unknown, error?: unknown) => {
  const req = {
    result,
    error,
    onsuccess: null as ((() => void) | null),
    onerror: null as ((() => void) | null),
  };
  return req;
};

const mockObjectStore = {
  put: vi.fn((item: unknown) => {
    const req = createMockIDBRequest();
    mockStore[(item as { localId: string }).localId] = item;
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  }),
  getAll: vi.fn(() => {
    const req = createMockIDBRequest(Object.values(mockStore));
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  }),
  delete: vi.fn((key: string) => {
    const req = createMockIDBRequest();
    delete mockStore[key];
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  }),
  clear: vi.fn(() => {
    const req = createMockIDBRequest();
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  }),
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
};

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: {
    contains: vi.fn(() => true),
  },
  createObjectStore: vi.fn(),
};

let openDBSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  vi.clearAllMocks();

  openDBSpy = vi.fn(() => {
    const req = {
      result: mockDB,
      error: null,
      onsuccess: null as ((() => void) | null),
      onerror: null as ((() => void) | null),
      onupgradeneeded: null as ((() => void) | null),
    };
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  });

  vi.stubGlobal("indexedDB", { open: openDBSpy });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("offlineIncidentService", () => {
  const mockIncident = {
    localId: "local-001",
    incidentType: "Snare" as const,
    description: "Found a snare",
    location: { latitude: 6.5, longitude: 80.0, source: "GPS" as const },
    patrolId: "PATROL-001",
    syncStatus: "Pending" as const,
    reportedAt: "2026-09-23T10:00:00Z",
    createdAt: "2026-09-23T10:00:00Z",
  };

  it("saves a local incident to IndexedDB", async () => {
    const { saveLocalIncident } = await import("../services/offlineIncidentService");
    await saveLocalIncident(mockIncident);
    expect(mockObjectStore.put).toHaveBeenCalledWith(mockIncident);
  });

  it("gets all pending incidents from IndexedDB", async () => {
    mockStore["local-001"] = mockIncident;
    const { getPendingIncidents } = await import("../services/offlineIncidentService");
    const result = await getPendingIncidents();
    expect(result).toEqual([mockIncident]);
  });

  it("removes a local incident by localId", async () => {
    mockStore["local-001"] = mockIncident;
    const { removeLocalIncident } = await import("../services/offlineIncidentService");
    await removeLocalIncident("local-001");
    expect(mockObjectStore.delete).toHaveBeenCalledWith("local-001");
  });

  it("clears all pending incidents", async () => {
    mockStore["local-001"] = mockIncident;
    const { clearAllPendingIncidents } = await import("../services/offlineIncidentService");
    await clearAllPendingIncidents();
    expect(mockObjectStore.clear).toHaveBeenCalled();
  });

  it("calls onupgradeneeded when DB needs upgrade", async () => {
    const upgradeReq = {
      result: {
        objectStoreNames: { contains: vi.fn(() => false) },
        createObjectStore: vi.fn(),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            put: vi.fn(() => {
              const req = createMockIDBRequest();
              setTimeout(() => req.onsuccess?.(), 0);
              return req;
            }),
          })),
        })),
      },
      error: null,
      onsuccess: null as ((() => void) | null),
      onerror: null as ((() => void) | null),
      onupgradeneeded: null as ((() => void) | null),
    };

    vi.stubGlobal("indexedDB", { open: vi.fn(() => upgradeReq) });

    const { saveLocalIncident } = await import("../services/offlineIncidentService");

    const p = saveLocalIncident(mockIncident);

    if (upgradeReq.onupgradeneeded) {
      upgradeReq.onupgradeneeded({} as unknown as Event);
    }
    await new Promise((r) => setTimeout(r, 10));

    if (upgradeReq.onsuccess) {
      upgradeReq.onsuccess({} as unknown as Event);
    }
    await p;

    expect(upgradeReq.result.createObjectStore).toHaveBeenCalledWith("pending-incidents", { keyPath: "localId" });
  });

  it("rejects on openDB error", async () => {
    const req = {
      result: null,
      error: new Error("DB open failed"),
      onsuccess: null as ((() => void) | null),
      onerror: null as ((() => void) | null),
      onupgradeneeded: null as ((() => void) | null),
    };

    vi.stubGlobal("indexedDB", { open: vi.fn(() => req) });

    const { saveLocalIncident } = await import("../services/offlineIncidentService");

    const promise = saveLocalIncident(mockIncident);

    if (req.onerror) {
      req.onerror({} as unknown as Event);
    }

    await expect(promise).rejects.toThrow("DB open failed");
  });

  it("rejects on store.put error", async () => {
    mockObjectStore.put.mockImplementation(() => {
      const req = createMockIDBRequest(undefined, new Error("put failed"));
      setTimeout(() => req.onerror?.(), 0);
      return req;
    });

    const { saveLocalIncident } = await import("../services/offlineIncidentService");
    await expect(saveLocalIncident(mockIncident)).rejects.toThrow("put failed");
  });

  it("rejects on store.getAll error", async () => {
    mockObjectStore.getAll.mockImplementation(() => {
      const req = createMockIDBRequest(undefined, new Error("getAll failed"));
      setTimeout(() => req.onerror?.(), 0);
      return req;
    });

    const { getPendingIncidents } = await import("../services/offlineIncidentService");
    await expect(getPendingIncidents()).rejects.toThrow("getAll failed");
  });

  it("rejects on store.delete error", async () => {
    mockObjectStore.delete.mockImplementation(() => {
      const req = createMockIDBRequest(undefined, new Error("delete failed"));
      setTimeout(() => req.onerror?.(), 0);
      return req;
    });

    const { removeLocalIncident } = await import("../services/offlineIncidentService");
    await expect(removeLocalIncident("local-001")).rejects.toThrow("delete failed");
  });

  it("rejects on store.clear error", async () => {
    mockObjectStore.clear.mockImplementation(() => {
      const req = createMockIDBRequest(undefined, new Error("clear failed"));
      setTimeout(() => req.onerror?.(), 0);
      return req;
    });

    const { clearAllPendingIncidents } = await import("../services/offlineIncidentService");
    await expect(clearAllPendingIncidents()).rejects.toThrow("clear failed");
  });
});
