import request from "supertest";
import express from "express";
import incidentRoutes from "../../src/routes/incidentRoutes";
import { errorHandler, AppError } from "../../src/middleware/errorHandler";
import { notFoundHandler } from "../../src/middleware/notFound";
import * as incidentService from "../../src/services/incidentService";

jest.mock("../../src/services/incidentService");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/incidents", incidentRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const mockedService = jest.mocked(incidentService);

beforeEach(() => {
  jest.clearAllMocks();
});

const validPayload = {
  incidentType: "Snare",
  description: "Large steel snare found near river",
  location: { latitude: -2.3456, longitude: 34.5678, source: "GPS" },
  patrolId: "PATROL-001",
};

const mockIncident = {
  _id: "64f1a2b3c4d5e6f7a8b9c0d1",
  ...validPayload,
  syncStatus: "Synced",
  reportedAt: "2026-09-23T10:00:00.000Z",
  createdAt: "2026-09-23T10:00:00.000Z",
  updatedAt: "2026-09-23T10:00:00.000Z",
};

// ---- Scenario 1: Create valid incident ----
describe("POST /api/incidents - Create valid incident", () => {
  it("should create incident and return 201", async () => {
    mockedService.createIncident.mockResolvedValue(mockIncident as never);

    const res = await request(app)
      .post("/api/incidents")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Incident created successfully");
    expect(res.body.data.incidentType).toBe("Snare");
    expect(res.body.data.syncStatus).toBe("Synced");
    expect(mockedService.createIncident).toHaveBeenCalledTimes(1);
  });
});

// ---- Scenario 2: Without photo ----
describe("POST /api/incidents - Without photo", () => {
  it("should succeed without photo", async () => {
    mockedService.createIncident.mockResolvedValue(mockIncident as never);

    const res = await request(app)
      .post("/api/incidents")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ---- Scenario 3: Manual location ----
describe("POST /api/incidents - Manual location", () => {
  it("should accept Manual source", async () => {
    const manualPayload = {
      ...validPayload,
      location: { latitude: 6.9271, longitude: 79.8612, source: "Manual" },
    };
    const manualIncident = { ...mockIncident, location: manualPayload.location };
    mockedService.createIncident.mockResolvedValue(manualIncident as never);

    const res = await request(app)
      .post("/api/incidents")
      .send(manualPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.location.source).toBe("Manual");
  });
});

// ---- Scenario 4: Missing incident type ----
describe("POST /api/incidents - Missing incident type", () => {
  it("should return 400", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, incidentType: undefined });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Incident type is required");
  });
});

// ---- Scenario 5: Invalid incident type ----
describe("POST /api/incidents - Invalid incident type", () => {
  it("should return 400", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, incidentType: "Fire" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Incident type must be");
  });
});

// ---- Scenario 6: Empty description ----
describe("POST /api/incidents - Empty description", () => {
  it("should return 400", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, description: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Description is required");
  });

  it("should reject whitespace-only description", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, description: "   " });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Description is required");
  });
});

// ---- Scenario 7: Missing patrol ID ----
describe("POST /api/incidents - Missing patrol ID", () => {
  it("should return 400", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, patrolId: undefined });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Patrol ID is required");
  });
});

// ---- Scenario 8: Missing location ----
describe("POST /api/incidents - Missing location", () => {
  it("should return 400 when location is missing", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: undefined });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Location (latitude and longitude) is required");
  });

  it("should return 400 when latitude is missing", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { longitude: 34.5678, source: "GPS" } });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Location (latitude and longitude) is required");
  });
});

// ---- Scenario 9: Invalid latitude ----
describe("POST /api/incidents - Invalid latitude", () => {
  it("should reject latitude below -90", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { latitude: -91, longitude: 34.5678, source: "GPS" } });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid latitude");
  });

  it("should reject latitude above 90", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { latitude: 91, longitude: 34.5678, source: "GPS" } });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid latitude");
  });
});

// ---- Scenario 10: Invalid longitude ----
describe("POST /api/incidents - Invalid longitude", () => {
  it("should reject longitude below -180", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { latitude: -2.3456, longitude: -181, source: "GPS" } });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid longitude");
  });

  it("should reject longitude above 180", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { latitude: -2.3456, longitude: 181, source: "GPS" } });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid longitude");
  });
});

// ---- Scenario 11: Invalid location source ----
describe("POST /api/incidents - Invalid location source", () => {
  it("should return 400", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { latitude: -2.3456, longitude: 34.5678, source: "Satellite" } });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Location source must be GPS or Manual");
  });
});

// ---- Scenario 12: Get all incidents ----
describe("GET /api/incidents", () => {
  it("should return all incidents", async () => {
    mockedService.getAllIncidents.mockResolvedValue([mockIncident] as never);

    const res = await request(app).get("/api/incidents");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it("should return empty array when none exist", async () => {
    mockedService.getAllIncidents.mockResolvedValue([]);

    const res = await request(app).get("/api/incidents");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ---- Scenario 13: Get incident by valid ID ----
describe("GET /api/incidents/:id", () => {
  it("should return incident by ID", async () => {
    mockedService.getIncidentById.mockResolvedValue(mockIncident as never);

    const res = await request(app).get(`/api/incidents/${mockIncident._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(mockIncident._id);
  });
});

// ---- Scenario 14: Get incident by non-existing ID ----
describe("GET /api/incidents/:id - Not found", () => {
  it("should return 404", async () => {
    mockedService.getIncidentById.mockResolvedValue(null);

    const res = await request(app).get("/api/incidents/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Incident not found");
  });
});

// ---- Scenario 15: Update sync status ----
describe("PATCH /api/incidents/:id/sync", () => {
  it("should update syncStatus to Synced", async () => {
    const syncedIncident = { ...mockIncident, syncStatus: "Synced" };
    mockedService.updateSyncStatus.mockResolvedValue(syncedIncident as never);

    const res = await request(app).patch(`/api/incidents/${mockIncident._id}/sync`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.syncStatus).toBe("Synced");
    expect(mockedService.updateSyncStatus).toHaveBeenCalledWith(mockIncident._id, "Synced");
  });

  it("should return 404 for non-existing incident", async () => {
    mockedService.updateSyncStatus.mockResolvedValue(null);

    const res = await request(app).patch("/api/incidents/nonexistent/sync");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Incident not found");
  });
});

// ---- Scenario 16: Service/database failure ----
describe("Database/service failure", () => {
  it("should handle createIncident failure gracefully", async () => {
    mockedService.createIncident.mockRejectedValue(new Error("DB connection failed"));

    const res = await request(app)
      .post("/api/incidents")
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Internal server error");
  });

  it("should handle getAllIncidents failure gracefully", async () => {
    mockedService.getAllIncidents.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/incidents");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("should handle getIncidentById failure gracefully", async () => {
    mockedService.getIncidentById.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/incidents/someid");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- Scenario 17: Invalid location JSON string ----
describe("POST /api/incidents - Invalid location JSON", () => {
  it("should return 400 for malformed location JSON", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: "not-valid-json" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---- Not found route ----
describe("Unknown route", () => {
  it("should return 404", async () => {
    const res = await request(app).get("/api/incidents/unknown/route");

    expect(res.status).toBe(404);
  });
});

// ---- Boundary coordinates ----
describe("Boundary coordinates", () => {
  it("should accept exact boundary latitude values", async () => {
    mockedService.createIncident.mockResolvedValue(mockIncident as never);

    const res90 = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { latitude: 90, longitude: 180, source: "GPS" } });

    expect(res90.status).toBe(201);

    const resNeg90 = await request(app)
      .post("/api/incidents")
      .send({ ...validPayload, location: { latitude: -90, longitude: -180, source: "GPS" } });

    expect(resNeg90.status).toBe(201);
  });
});
