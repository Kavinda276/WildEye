import request from "supertest";
import express from "express";
import animalRoutes from "../../src/routes/animalRoutes";
import { errorHandler } from "../../src/middleware/errorHandler";
import { notFoundHandler } from "../../src/middleware/notFound";
import * as animalService from "../../src/services/animalService";
import * as riskZoneService from "../../src/services/riskZoneService";
import * as wildlifeAlertService from "../../src/services/wildlifeAlertService";

jest.mock("../../src/services/animalService");
jest.mock("../../src/services/riskZoneService");
jest.mock("../../src/services/wildlifeAlertService");
jest.mock("../../src/models/WildlifeAlert", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

import WildlifeAlert from "../../src/models/WildlifeAlert";

const app = express();
app.use(express.json());
app.use("/api/animals", animalRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const mockedAnimalService = jest.mocked(animalService);
const mockedRiskZoneService = jest.mocked(riskZoneService);
const mockedAlertService = jest.mocked(wildlifeAlertService);
const MockWildlifeAlert = jest.mocked(WildlifeAlert) as unknown as {
  findOne: jest.Mock;
};

const mockAnimal = {
  _id: "animal123",
  name: "Kavi",
  species: "Sri Lankan Leopard",
  collarId: "COLLAR-001",
  collarStatus: "Active",
  location: { latitude: 6.85, longitude: 80.86 },
  lastSignal: new Date("2026-09-24T09:00:00Z"),
  isInsideRiskZone: false,
  toObject() {
    return this;
  },
};

const mockZone = {
  _id: "zone123",
  name: "Snare Trap Area - West",
  description: "High risk snare zone",
  bounds: { north: 6.86, south: 6.84, east: 80.87, west: 80.85 },
  severity: "High",
  active: true,
};

const mockAlert = {
  _id: "alert123",
  animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
  riskZone: { name: "Snare Trap Area - West", severity: "High" },
  currentLocation: { latitude: 6.85, longitude: 80.86 },
  priority: "Critical",
  status: "Pending",
  responder: "",
  responderRole: "Ranger",
  createdAt: new Date("2026-09-24T10:00:00Z"),
  updatedAt: new Date("2026-09-24T10:00:00Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/animals", () => {
  it("returns all animals", async () => {
    mockedAnimalService.getAllAnimals.mockResolvedValue([mockAnimal] as never);

    const res = await request(app).get("/api/animals");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it("returns 500 when the lookup fails", async () => {
    mockedAnimalService.getAllAnimals.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/animals");

    expect(res.status).toBe(500);
  });
});

describe("GET /api/animals/:id", () => {
  it("returns the animal by id", async () => {
    mockedAnimalService.getAnimalById.mockResolvedValue(mockAnimal as never);

    const res = await request(app).get("/api/animals/animal123");

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe("animal123");
  });

  it("returns 404 when the animal does not exist", async () => {
    mockedAnimalService.getAnimalById.mockResolvedValue(null);

    const res = await request(app).get("/api/animals/missing");

    expect(res.status).toBe(404);
  });

  it("returns 500 when the lookup fails", async () => {
    mockedAnimalService.getAnimalById.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/animals/animal123");

    expect(res.status).toBe(500);
  });
});

describe("POST /api/animals/:id/simulate", () => {
  beforeEach(() => {
    mockedRiskZoneService.getAllRiskZones.mockResolvedValue([mockZone] as never);
    mockedAnimalService.setAnimalRiskZoneStatus.mockResolvedValue(mockAnimal as never);
  });

  it("requires latitude and longitude", async () => {
    const res = await request(app).post("/api/animals/animal123/simulate").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("latitude and longitude are required");
  });

  it("returns 404 when the animal does not exist", async () => {
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/animals/missing/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });

    expect(res.status).toBe(404);
  });

  it("reports the animal as safe when outside every risk zone", async () => {
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(mockAnimal as never);

    const res = await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 7.5, longitude: 81.5 });

    expect(res.status).toBe(200);
    expect(res.body.data.isInsideRiskZone).toBe(false);
    expect(res.body.data.alert).toBeNull();
    expect(mockedAnimalService.setAnimalRiskZoneStatus).toHaveBeenCalledWith(
      "animal123",
      false
    );
  });

  it("creates a Critical alert when entering a High severity zone", async () => {
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(mockAnimal as never);
    MockWildlifeAlert.findOne.mockResolvedValue(null);
    mockedAlertService.createAlert.mockResolvedValue(mockAlert as never);

    const res = await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });

    expect(res.status).toBe(200);
    expect(res.body.data.isInsideRiskZone).toBe(true);
    expect(res.body.data.alert._id).toBe("alert123");
    expect(mockedAlertService.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "Critical" })
    );
  });

  it("maps Medium severity zones to High priority", async () => {
    mockedRiskZoneService.getAllRiskZones.mockResolvedValue([
      { ...mockZone, severity: "Medium" },
    ] as never);
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(mockAnimal as never);
    MockWildlifeAlert.findOne.mockResolvedValue(null);
    mockedAlertService.createAlert.mockResolvedValue(mockAlert as never);

    await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });

    expect(mockedAlertService.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "High" })
    );
  });

  it("maps Low severity zones to Medium priority", async () => {
    mockedRiskZoneService.getAllRiskZones.mockResolvedValue([
      { ...mockZone, severity: "Low" },
    ] as never);
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(mockAnimal as never);
    MockWildlifeAlert.findOne.mockResolvedValue(null);
    mockedAlertService.createAlert.mockResolvedValue(mockAlert as never);

    await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });

    expect(mockedAlertService.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "Medium" })
    );
  });

  it("reuses an existing active alert instead of creating a duplicate", async () => {
    mockedAnimalService.updateAnimalLocation.mockResolvedValue(mockAnimal as never);
    MockWildlifeAlert.findOne.mockResolvedValue(mockAlert as never);

    const res = await request(app)
      .post("/api/animals/animal123/simulate")
      .send({ latitude: 6.85, longitude: 80.86 });

    expect(res.status).toBe(200);
    expect(res.body.data.alert._id).toBe("alert123");
    expect(mockedAlertService.createAlert).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/animals/:id/collar-status", () => {
  it("requires collarStatus", async () => {
    const res = await request(app).patch("/api/animals/animal123/collar-status").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("collarStatus is required");
  });

  it("returns 404 when the animal does not exist", async () => {
    mockedAnimalService.setCollarStatus.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/animals/missing/collar-status")
      .send({ collarStatus: "Signal Lost" });

    expect(res.status).toBe(404);
  });

  it("updates the collar status without creating an alert for Active", async () => {
    mockedAnimalService.setCollarStatus.mockResolvedValue(mockAnimal as never);

    const res = await request(app)
      .patch("/api/animals/animal123/collar-status")
      .send({ collarStatus: "Active" });

    expect(res.status).toBe(200);
    expect(res.body.data.alert).toBeNull();
    expect(mockedAlertService.createAlert).not.toHaveBeenCalled();
  });

  it("creates a High priority alert when the signal is lost", async () => {
    mockedAnimalService.setCollarStatus.mockResolvedValue(mockAnimal as never);
    MockWildlifeAlert.findOne.mockResolvedValue(null);
    mockedAlertService.createAlert.mockResolvedValue(mockAlert as never);

    const res = await request(app)
      .patch("/api/animals/animal123/collar-status")
      .send({ collarStatus: "Signal Lost" });

    expect(res.status).toBe(200);
    expect(mockedAlertService.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "High" })
    );
    expect(res.body.data.alert._id).toBe("alert123");
  });

  it("reuses an existing alert when the signal is lost again", async () => {
    mockedAnimalService.setCollarStatus.mockResolvedValue(mockAnimal as never);
    MockWildlifeAlert.findOne.mockResolvedValue(mockAlert as never);

    const res = await request(app)
      .patch("/api/animals/animal123/collar-status")
      .send({ collarStatus: "Signal Lost" });

    expect(res.status).toBe(200);
    expect(res.body.data.alert._id).toBe("alert123");
    expect(mockedAlertService.createAlert).not.toHaveBeenCalled();
  });

  it("returns 500 when the update fails", async () => {
    mockedAnimalService.setCollarStatus.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .patch("/api/animals/animal123/collar-status")
      .send({ collarStatus: "Signal Lost" });

    expect(res.status).toBe(500);
  });
});

describe("POST /api/animals/seed", () => {
  it("seeds the wildlife sample dataset", async () => {
    const AnimalModel = (await import("../../src/models/Animal")).default as unknown as {
      deleteMany: jest.Mock;
      insertMany: jest.Mock;
    };
    AnimalModel.deleteMany = jest.fn().mockResolvedValue({});
    AnimalModel.insertMany = jest.fn().mockResolvedValue([mockAnimal]);

    const res = await request(app).post("/api/animals/seed");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(AnimalModel.deleteMany).toHaveBeenCalled();
    expect(AnimalModel.insertMany).toHaveBeenCalled();
    expect(AnimalModel.insertMany.mock.calls[0][0]).toHaveLength(5);
  });

  it("returns 500 when seeding fails", async () => {
    const AnimalModel = (await import("../../src/models/Animal")).default as unknown as {
      deleteMany: jest.Mock;
    };
    AnimalModel.deleteMany = jest.fn().mockRejectedValue(new Error("DB error"));

    const res = await request(app).post("/api/animals/seed");

    expect(res.status).toBe(500);
  });
});