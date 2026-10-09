import mongoose from "mongoose";

jest.mock("../../src/models/Animal", () => {
  const MockAnimal = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const constructorMock = jest.fn();
  Object.assign(constructorMock, MockAnimal);
  return { __esModule: true, default: constructorMock, ...MockAnimal };
});

jest.mock("../../src/models/WildlifeAlert", () => {
  const MockAlert = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
  };
  const constructorMock = jest.fn();
  Object.assign(constructorMock, MockAlert);
  return { __esModule: true, default: constructorMock, ...MockAlert };
});

import Animal from "../../src/models/Animal";
import WildlifeAlert from "../../src/models/WildlifeAlert";
import * as animalService from "../../src/services/animalService";
import * as wildlifeAlertService from "../../src/services/wildlifeAlertService";

const MockAnimal = jest.mocked(Animal);
const MockAlert = jest.mocked(WildlifeAlert);

const mockAnimal = {
  _id: "animal123",
  name: "Kavi",
  species: "Sri Lankan Leopard",
  collarId: "COLLAR-001",
  collarStatus: "Active",
  location: { latitude: 6.85, longitude: 80.86 },
  lastSignal: new Date("2026-09-24T09:00:00Z"),
  isInsideRiskZone: false,
};

const mockAlert = {
  _id: "alert123",
  animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
  riskZone: { name: "Snare Trap Area", severity: "High" },
  currentLocation: { latitude: 6.85, longitude: 80.86 },
  priority: "Critical",
  status: "Pending",
  responder: "",
  responderRole: "Ranger",
  createdAt: new Date("2026-09-24T10:00:00Z"),
  updatedAt: new Date("2026-09-24T10:00:00Z"),
};

const asQuery = <T,>(value: T) =>
  ({
    sort: jest.fn().mockResolvedValue(value),
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("animalService", () => {
  describe("getAllAnimals", () => {
    it("returns every animal", async () => {
      MockAnimal.find.mockReturnValue(asQuery([mockAnimal]));

      const result = await animalService.getAllAnimals();

      expect(MockAnimal.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("returns an empty list when there are no animals", async () => {
      MockAnimal.find.mockReturnValue(asQuery([]));

      await expect(animalService.getAllAnimals()).resolves.toEqual([]);
    });
  });

  describe("getAnimalById", () => {
    it("returns the animal when found", async () => {
      MockAnimal.findById.mockResolvedValue(mockAnimal as never);

      const result = await animalService.getAnimalById("animal123");

      expect(MockAnimal.findById).toHaveBeenCalledWith("animal123");
      expect(result).toEqual(mockAnimal);
    });

    it("returns null when the animal does not exist", async () => {
      MockAnimal.findById.mockResolvedValue(null);

      await expect(animalService.getAnimalById("missing")).resolves.toBeNull();
    });
  });

  describe("updateAnimalLocation", () => {
    it("updates the location and refreshes lastSignal", async () => {
      MockAnimal.findByIdAndUpdate.mockResolvedValue(mockAnimal as never);

      await animalService.updateAnimalLocation("animal123", 6.9, 80.9);

      expect(MockAnimal.findByIdAndUpdate).toHaveBeenCalledWith(
        "animal123",
        {
          location: { latitude: 6.9, longitude: 80.9 },
          lastSignal: expect.any(Date),
        },
        { new: true }
      );
    });

    it("returns null when the animal does not exist", async () => {
      MockAnimal.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        animalService.updateAnimalLocation("missing", 6.9, 80.9)
      ).resolves.toBeNull();
    });
  });

  describe("setAnimalRiskZoneStatus", () => {
    it("marks the animal as inside a risk zone", async () => {
      MockAnimal.findByIdAndUpdate.mockResolvedValue(mockAnimal as never);

      await animalService.setAnimalRiskZoneStatus("animal123", true);

      expect(MockAnimal.findByIdAndUpdate).toHaveBeenCalledWith(
        "animal123",
        { isInsideRiskZone: true },
        { new: true }
      );
    });

    it("marks the animal as outside a risk zone", async () => {
      MockAnimal.findByIdAndUpdate.mockResolvedValue(mockAnimal as never);

      await animalService.setAnimalRiskZoneStatus("animal123", false);

      expect(MockAnimal.findByIdAndUpdate).toHaveBeenCalledWith(
        "animal123",
        { isInsideRiskZone: false },
        { new: true }
      );
    });
  });

  describe("setCollarStatus", () => {
    it.each(["Active", "Signal Lost", "Inactive"] as const)(
      "sets collar status to %s",
      async (status) => {
        MockAnimal.findByIdAndUpdate.mockResolvedValue(mockAnimal as never);

        await animalService.setCollarStatus("animal123", status);

        expect(MockAnimal.findByIdAndUpdate).toHaveBeenCalledWith(
          "animal123",
          { collarStatus: status },
          { new: true }
        );
      }
    );
  });
});

describe("wildlifeAlertService", () => {
  describe("getAllAlerts", () => {
    it("returns alerts newest first", async () => {
      const sort = jest.fn().mockResolvedValue([mockAlert]);
      MockAlert.find.mockReturnValue({ sort } as never);

      const result = await wildlifeAlertService.getAllAlerts();

      expect(MockAlert.find).toHaveBeenCalled();
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(1);
    });

    it("returns an empty list when there are no alerts", async () => {
      MockAlert.find.mockReturnValue(asQuery([]));

      await expect(wildlifeAlertService.getAllAlerts()).resolves.toEqual([]);
    });
  });

  describe("getAlertById", () => {
    it("returns the alert when found", async () => {
      MockAlert.findById.mockResolvedValue(mockAlert as never);

      const result = await wildlifeAlertService.getAlertById("alert123");

      expect(MockAlert.findById).toHaveBeenCalledWith("alert123");
      expect(result).toEqual(mockAlert);
    });

    it("returns null when the alert does not exist", async () => {
      MockAlert.findById.mockResolvedValue(null);

      await expect(wildlifeAlertService.getAlertById("missing")).resolves.toBeNull();
    });
  });

  describe("createAlert", () => {
    it("creates a pending alert with an empty responder", async () => {
      MockAlert.create.mockResolvedValue(mockAlert as never);

      await wildlifeAlertService.createAlert({
        animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
        riskZone: { name: "Snare Trap Area", severity: "High" },
        currentLocation: { latitude: 6.85, longitude: 80.86 },
        priority: "Critical",
      });

      expect(MockAlert.create).toHaveBeenCalledWith({
        animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
        riskZone: { name: "Snare Trap Area", severity: "High" },
        currentLocation: { latitude: 6.85, longitude: 80.86 },
        priority: "Critical",
        status: "Pending",
        responder: "",
        responderRole: "Ranger",
      });
    });
  });

  describe("dispatchAlert", () => {
    it("assigns the responder and sets status to Dispatched", async () => {
      MockAlert.findByIdAndUpdate.mockResolvedValue(mockAlert as never);

      await wildlifeAlertService.dispatchAlert("alert123", "Sgt. Fernando", "Ranger");

      expect(MockAlert.findByIdAndUpdate).toHaveBeenCalledWith(
        "alert123",
        { responder: "Sgt. Fernando", responderRole: "Ranger", status: "Dispatched" },
        { new: true }
      );
    });

    it("returns null when the alert does not exist", async () => {
      MockAlert.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        wildlifeAlertService.dispatchAlert("missing", "Sgt. Fernando", "Ranger")
      ).resolves.toBeNull();
    });
  });

  describe("updateAlertStatus", () => {
    it.each(["Pending", "Dispatched", "Resolved"] as const)(
      "updates status to %s",
      async (status) => {
        MockAlert.findByIdAndUpdate.mockResolvedValue(mockAlert as never);

        await wildlifeAlertService.updateAlertStatus("alert123", status);

        expect(MockAlert.findByIdAndUpdate).toHaveBeenCalledWith(
          "alert123",
          { status },
          { new: true }
        );
      }
    );

    it("returns null when the alert does not exist", async () => {
      MockAlert.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        wildlifeAlertService.updateAlertStatus("missing", "Resolved")
      ).resolves.toBeNull();
    });
  });

  describe("deleteAlert", () => {
    it("deletes the alert by id", async () => {
      MockAlert.findByIdAndDelete.mockResolvedValue(mockAlert as never);

      const result = await wildlifeAlertService.deleteAlert("alert123");

      expect(MockAlert.findByIdAndDelete).toHaveBeenCalledWith("alert123");
      expect(result).toEqual(mockAlert);
    });

    it("returns null when the alert does not exist", async () => {
      MockAlert.findByIdAndDelete.mockResolvedValue(null);

      await expect(wildlifeAlertService.deleteAlert("missing")).resolves.toBeNull();
    });
  });
});