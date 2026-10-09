import request from "supertest";
import express from "express";
import riskZoneRoutes from "../../src/routes/riskZoneRoutes";
import { errorHandler } from "../../src/middleware/errorHandler";
import { notFoundHandler } from "../../src/middleware/notFound";
import * as riskZoneService from "../../src/services/riskZoneService";

jest.mock("../../src/services/riskZoneService");

jest.mock("../../src/models/RiskZone", () => {
  const MockRiskZone = {
    find: jest.fn(),
    findById: jest.fn(),
    deleteMany: jest.fn(),
    insertMany: jest.fn(),
  };
  const constructorMock = jest.fn();
  Object.assign(constructorMock, MockRiskZone);
  return { __esModule: true, default: constructorMock, ...MockRiskZone };
});

import RiskZone from "../../src/models/RiskZone";

const MockRiskZone = jest.mocked(RiskZone) as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
  deleteMany: jest.Mock;
  insertMany: jest.Mock;
};

const app = express();
app.use(express.json());
app.use("/api/risk-zones", riskZoneRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const mockedService = jest.mocked(riskZoneService);

const mockZone = {
  _id: "zone123",
  name: "Snare Trap Area - West",
  description: "Evidence of wire snare traps found in previous patrols.",
  bounds: { north: 6.87, south: 6.85, east: 80.83, west: 80.80 },
  severity: "High",
  active: true,
  createdAt: new Date("2026-09-24T08:00:00Z"),
  updatedAt: new Date("2026-09-24T08:00:00Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---- GET /api/risk-zones ----
describe("GET /api/risk-zones", () => {
  it("returns the risk zones", async () => {
    mockedService.getAllRiskZones.mockResolvedValue([mockZone] as never);

    const res = await request(app).get("/api/risk-zones");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].severity).toBe("High");
  });

  it("returns an empty list when no zones exist", async () => {
    mockedService.getAllRiskZones.mockResolvedValue([]);

    const res = await request(app).get("/api/risk-zones");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 500 when the lookup fails", async () => {
    mockedService.getAllRiskZones.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/risk-zones");

    expect(res.status).toBe(500);
  });
});

// ---- GET /api/risk-zones/:id ----
describe("GET /api/risk-zones/:id", () => {
  it("returns the zone by id", async () => {
    mockedService.getRiskZoneById.mockResolvedValue(mockZone as never);

    const res = await request(app).get("/api/risk-zones/zone123");

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe("zone123");
  });

  it("returns 404 when the zone does not exist", async () => {
    mockedService.getRiskZoneById.mockResolvedValue(null);

    const res = await request(app).get("/api/risk-zones/missing");

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Risk zone not found");
  });

  it("returns 500 when the lookup fails", async () => {
    mockedService.getRiskZoneById.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/risk-zones/zone123");

    expect(res.status).toBe(500);
  });
});

// ---- POST /api/risk-zones/seed ----
describe("POST /api/risk-zones/seed", () => {
  it("clears existing zones and inserts the sample dataset", async () => {
    MockRiskZone.deleteMany.mockResolvedValue({});
    MockRiskZone.insertMany.mockResolvedValue([mockZone]);

    const res = await request(app).post("/api/risk-zones/seed");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(MockRiskZone.deleteMany).toHaveBeenCalled();

    const inserted = MockRiskZone.insertMany.mock.calls[0][0] as unknown[];
    expect(inserted).toHaveLength(3);
    expect(
      inserted.map((z) => (z as { name: string }).name)
    ).toEqual([
      "Poacher Hotspot - North",
      "Human-Wildlife Conflict Zone",
      "Snare Trap Area - West",
    ]);
  });

  it("seeds valid bounds for every zone", async () => {
    MockRiskZone.deleteMany.mockResolvedValue({});
    MockRiskZone.insertMany.mockResolvedValue([mockZone]);

    await request(app).post("/api/risk-zones/seed");

    const inserted = MockRiskZone.insertMany.mock.calls[0][0] as {
      bounds: { north: number; south: number; east: number; west: number };
      severity: string;
    }[];

    inserted.forEach((zone) => {
      expect(zone.bounds.north).toBeGreaterThan(zone.bounds.south);
      expect(zone.bounds.east).toBeGreaterThan(zone.bounds.west);
      expect(["High", "Medium", "Low"]).toContain(zone.severity);
    });
  });

  it("returns 500 when seeding fails", async () => {
    MockRiskZone.deleteMany.mockRejectedValue(new Error("DB error"));

    const res = await request(app).post("/api/risk-zones/seed");

    expect(res.status).toBe(500);
  });
});