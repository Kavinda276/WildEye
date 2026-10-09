import request from "supertest";
import express from "express";
import wildlifeAlertRoutes from "../../src/routes/wildlifeAlertRoutes";
import animalRoutes from "../../src/routes/animalRoutes";
import riskZoneRoutes from "../../src/routes/riskZoneRoutes";
import { errorHandler } from "../../src/middleware/errorHandler";
import { notFoundHandler } from "../../src/middleware/notFound";
import * as wildlifeAlertService from "../../src/services/wildlifeAlertService";
import * as animalService from "../../src/services/animalService";
import * as riskZoneService from "../../src/services/riskZoneService";

jest.mock("../../src/services/wildlifeAlertService");
jest.mock("../../src/services/animalService");
jest.mock("../../src/services/riskZoneService");
jest.mock("../../src/models/WildlifeAlert", () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn().mockResolvedValue(null),
    },
  };
});

const app = express();
app.use(express.json());
app.use("/api/wildlife-alerts", wildlifeAlertRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/risk-zones", riskZoneRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const mockedAlertService = jest.mocked(wildlifeAlertService);
const mockedAnimalService = jest.mocked(animalService);
const mockedRiskZoneService = jest.mocked(riskZoneService);

beforeEach(() => {
  jest.clearAllMocks();
});

const mockAnimal = {
  _id: "animal123",
  name: "Kavi",
  species: "Sri Lankan Leopard",
  collarId: "COLLAR-001",
  collarStatus: "Active",
  location: { latitude: 6.85, longitude: 80.86 },
  lastSignal: new Date(),
  isInsideRiskZone: false,
  toObject() { return this; },
};

const mockZone = {
  _id: "zone123",
  name: "Snare Trap Area",
  description: "High risk zone",
  bounds: { north: 6.86, south: 6.84, east: 80.87, west: 80.85 },
  severity: "High",
  active: true,
};

const mockAlert = {
  _id: "alert123",
  animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
  riskZone: { name: "Snare Trap Area", severity: "High" },
  currentLocation: { latitude: 6.85, longitude: 80.86 },
  priority: "Critical",
  status: "Pending",
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
};

// ---- GET /api/wildlife-alerts ----
describe("GET /api/wildlife-alerts", () => {
  it("should return all alerts", async () => {
    mockedAlertService.getAllAlerts.mockResolvedValue([mockAlert] as never);
    const res = await request(app).get("/api/wildlife-alerts");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it("should handle service failure", async () => {
    mockedAlertService.getAllAlerts.mockRejectedValue(new Error("DB error"));
    const res = await request(app).get("/api/wildlife-alerts");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- POST /api/wildlife-alerts ----
describe("POST /api/wildlife-alerts", () => {
  it("should create alert when animal enters risk zone", async () => {
    mockedAnimalService.getAnimalById.mockResolvedValue(mockAnimal as never);
    mockedRiskZoneService.getRiskZoneById.mockResolvedValue(mockZone as never);
    mockedAlertService.createAlert.mockResolvedValue(mockAlert as never);

    const res = await request(app)
      .post("/api/wildlife-alerts")
      .send({ animalId: "animal123", riskZoneId: "zone123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("should reject missing animalId", async () => {
    const res = await request(app)
      .post("/api/wildlife-alerts")
      .send({ riskZoneId: "zone123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("animalId and riskZoneId are required");
  });

  it("should reject missing riskZoneId", async () => {
    const res = await request(app)
      .post("/api/wildlife-alerts")
      .send({ animalId: "animal123" });
    expect(res.status).toBe(400);
  });

  it("should return 404 for non-existing animal", async () => {
    mockedAnimalService.getAnimalById.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/wildlife-alerts")
      .send({ animalId: "nonexistent", riskZoneId: "zone123" });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Animal not found");
  });

  it("should return 404 for non-existing risk zone", async () => {
    mockedAnimalService.getAnimalById.mockResolvedValue(mockAnimal as never);
    mockedRiskZoneService.getRiskZoneById.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/wildlife-alerts")
      .send({ animalId: "animal123", riskZoneId: "nonexistent" });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Risk zone not found");
  });
});

// ---- PATCH /api/wildlife-alerts/:id/dispatch ----
describe("PATCH /api/wildlife-alerts/:id/dispatch", () => {
  it("should dispatch alert to responder", async () => {
    const dispatched = { ...mockAlert, status: "Dispatched", responder: "Rt. Cmdr. Perera" };
    mockedAlertService.dispatchAlert.mockResolvedValue(dispatched as never);

    const res = await request(app)
      .patch("/api/wildlife-alerts/alert123/dispatch")
      .send({ responder: "Rt. Cmdr. Perera", responderRole: "Ranger" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Dispatched");
  });

  it("should reject dispatch without responder", async () => {
    const res = await request(app)
      .patch("/api/wildlife-alerts/alert123/dispatch")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("responder name is required");
  });

  it("should return 404 for non-existing alert", async () => {
    mockedAlertService.dispatchAlert.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/wildlife-alerts/nonexistent/dispatch")
      .send({ responder: "Officer" });
    expect(res.status).toBe(404);
  });
});

// ---- PATCH /api/wildlife-alerts/:id/status ----
describe("PATCH /api/wildlife-alerts/:id/status", () => {
  it("should update alert status", async () => {
    const updated = { ...mockAlert, status: "Resolved" };
    mockedAlertService.updateAlertStatus.mockResolvedValue(updated as never);

    const res = await request(app)
      .patch("/api/wildlife-alerts/alert123/status")
      .send({ status: "Resolved" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Resolved");
  });

  it("should reject missing status", async () => {
    const res = await request(app)
      .patch("/api/wildlife-alerts/alert123/status")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("status is required");
  });

  it("should return 404 for non-existing alert", async () => {
    mockedAlertService.updateAlertStatus.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/wildlife-alerts/nonexistent/status")
      .send({ status: "Resolved" });
    expect(res.status).toBe(404);
  });
});

// ---- Simulate animal movement (UC02 core flow) ----
describe("POST /api/animals/:id/simulate", () => {
  it("should detect animal inside risk zone and auto-create alert", async () => {
    const animalInZone = { ...mockAnimal, toObject() { return this; } };
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(animalInZone as never);
    mockedRiskZoneService.getAllRiskZones.mockResolvedValue([mockZone] as never);
    mockedAnimalService.setAnimalRiskZoneStatus.mockResolvedValue(null as never);
    mockedAlertService.createAlert.mockResolvedValue(mockAlert as never);

    const res = await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });

    expect(res.status).toBe(200);
    expect(res.body.data.isInsideRiskZone).toBe(true);
    expect(res.body.data.alert).toBeDefined();
    expect(res.body.data.alert.status).toBe("Pending");
  });

  it("should not create duplicate alert if one already exists", async () => {
    const animalInZone = { ...mockAnimal, toObject() { return this; } };
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(animalInZone as never);
    mockedRiskZoneService.getAllRiskZones.mockResolvedValue([mockZone] as never);
    mockedAnimalService.setAnimalRiskZoneStatus.mockResolvedValue(null as never);

    const existingAlert = { ...mockAlert, status: "Dispatched" };
    const WildlifeAlertModel = require("../../src/models/WildlifeAlert").default;
    WildlifeAlertModel.findOne.mockResolvedValue(existingAlert);

    const res = await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });

    expect(res.status).toBe(200);
    expect(res.body.data.isInsideRiskZone).toBe(true);
    expect(res.body.data.alert).toBeDefined();
    expect(res.body.data.alert.status).toBe("Dispatched");
    expect(mockedAlertService.createAlert).not.toHaveBeenCalled();
  });

  it("should detect animal outside risk zone", async () => {
    const animalOutZone = { ...mockAnimal, toObject() { return this; } };
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(animalOutZone as never);
    mockedRiskZoneService.getAllRiskZones.mockResolvedValue([mockZone] as never);
    mockedAnimalService.setAnimalRiskZoneStatus.mockResolvedValue(null as never);

    const res = await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 7.00, longitude: 81.00 });

    expect(res.status).toBe(200);
    expect(res.body.data.isInsideRiskZone).toBe(false);
    expect(res.body.data.alert).toBeNull();
  });

  it("should reject missing coordinates", async () => {
    const res = await request(app)
      .post("/api/animals/animal123/simulate")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("latitude and longitude are required");
  });

  it("should return 404 for non-existing animal", async () => {
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/animals/nonexistent/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });
    expect(res.status).toBe(404);
  });
});
