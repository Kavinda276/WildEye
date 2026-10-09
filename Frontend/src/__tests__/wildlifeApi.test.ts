import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchAnimals,
  simulateAnimalMovement,
  seedAnimals,
  fetchRiskZones,
  seedRiskZones,
  fetchAlerts,
  createAlert,
  dispatchAlertApi,
  deleteAlertApi,
  type SimulateResult,
} from "../services/wildlifeApi";

const mockAnimal = {
  _id: "animal123",
  name: "Kavi",
  species: "Sri Lankan Leopard",
  collarId: "COLLAR-001",
  collarStatus: "Active" as const,
  location: { latitude: 6.85, longitude: 80.86 },
  lastSignal: "2026-09-24T09:00:00.000Z",
  isInsideRiskZone: false,
  createdAt: "2026-09-24T08:00:00.000Z",
  updatedAt: "2026-09-24T09:00:00.000Z",
};

const mockZone = {
  _id: "zone123",
  name: "Snare Trap Area - West",
  description: "High risk zone",
  bounds: { north: 6.86, south: 6.84, east: 80.87, west: 80.85 },
  severity: "High",
  active: true,
  createdAt: "2026-09-24T08:00:00.000Z",
  updatedAt: "2026-09-24T08:00:00.000Z",
};

const mockAlert = {
  _id: "alert123",
  animal: { name: "Kavi", species: "Sri Lankan Leopard", collarId: "COLLAR-001" },
  riskZone: { name: "Snare Trap Area - West", severity: "High" },
  currentLocation: { latitude: 6.85, longitude: 80.86 },
  priority: "Critical" as const,
  status: "Pending" as const,
  responder: "",
  responderRole: "Ranger" as const,
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
};

const ok = (data: unknown) =>
  ({
    ok: true,
    json: async () => ({ success: true, data }),
  }) as Response;

const fail = (message: string) =>
  ({
    ok: false,
    json: async () => ({ success: false, message }),
  }) as Response;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("wildlifeApi", () => {
  describe("fetchAnimals", () => {
    it("returns the animal list", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([mockAnimal]));

      const result = await fetchAnimals();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Kavi");
    });

    it("requests /api/animals", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([]));

      await fetchAnimals();

      expect(spy).toHaveBeenCalledWith("/api/animals");
    });

    it("throws the server message on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("DB error"));

      await expect(fetchAnimals()).rejects.toThrow("DB error");
    });

    it("throws a default message when none is provided", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(fetchAnimals()).rejects.toThrow("Failed to fetch animals");
    });
  });

  describe("simulateAnimalMovement", () => {
const insideZone: SimulateResult = {
    ...mockAnimal,
    isInsideRiskZone: true,
    alert: mockAlert,
  };

    it("posts the new coordinates and returns the result", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(insideZone));

      const result = await simulateAnimalMovement("animal123", 6.85, 80.86);

      expect(spy).toHaveBeenCalledWith("/api/animals/animal123/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: 6.85, longitude: 80.86 }),
      });
      expect(result.isInsideRiskZone).toBe(true);
      expect(result.alert?._id).toBe("alert123");
    });

    it("returns a null alert when the animal stays safe", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        ok({ ...mockAnimal, isInsideRiskZone: false, alert: null })
      );

      const result = await simulateAnimalMovement("animal123", 7.5, 81.5);

      expect(result.isInsideRiskZone).toBe(false);
      expect(result.alert).toBeNull();
    });

    it("throws when the simulation fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("No risk zones defined."));

      await expect(
        simulateAnimalMovement("animal123", 6.85, 80.86)
      ).rejects.toThrow("No risk zones defined.");
    });
  });

  describe("seedAnimals", () => {
    it("posts to the seed endpoint and returns the animals", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([mockAnimal]));

      const result = await seedAnimals();

      expect(spy).toHaveBeenCalledWith("/api/animals/seed", { method: "POST" });
      expect(result).toHaveLength(1);
    });

    it("propagates the server message when seeding fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("Seed failed"));

      await expect(seedAnimals()).rejects.toThrow("Seed failed");
    });
  });

  describe("fetchRiskZones", () => {
    it("returns the risk zone list", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([mockZone]));

      const result = await fetchRiskZones();

      expect(spy).toHaveBeenCalledWith("/api/risk-zones");
      expect(result[0].severity).toBe("High");
    });

    it("throws when the lookup fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("DB error"));

      await expect(fetchRiskZones()).rejects.toThrow("DB error");
    });
  });

  describe("seedRiskZones", () => {
    it("posts to the seed endpoint and returns the zones", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([mockZone]));

      const result = await seedRiskZones();

      expect(spy).toHaveBeenCalledWith("/api/risk-zones/seed", { method: "POST" });
      expect(result).toHaveLength(1);
    });

    it("propagates the server message when seeding fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("Seed failed"));

      await expect(seedRiskZones()).rejects.toThrow("Seed failed");
    });
  });

  describe("fetchAlerts", () => {
    it("returns the alert list", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([mockAlert]));

      const result = await fetchAlerts();

      expect(spy).toHaveBeenCalledWith("/api/wildlife-alerts");
      expect(result[0].priority).toBe("Critical");
    });

    it("throws when the lookup fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("DB error"));

      await expect(fetchAlerts()).rejects.toThrow("DB error");
    });
  });

  describe("createAlert", () => {
    it("posts animal and zone ids and returns the alert", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(mockAlert));

      const result = await createAlert("animal123", "zone123");

      expect(spy).toHaveBeenCalledWith("/api/wildlife-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId: "animal123", riskZoneId: "zone123" }),
      });
      expect(result._id).toBe("alert123");
    });

    it("throws when creation fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("Zone not found"));

      await expect(createAlert("animal123", "bad")).rejects.toThrow("Zone not found");
    });
  });

  describe("dispatchAlertApi", () => {
    it("patches the dispatch endpoint and returns the updated alert", async () => {
      const dispatched = { ...mockAlert, status: "Dispatched", responder: "Sgt. Fernando" };
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(dispatched));

      const result = await dispatchAlertApi(
        "alert123",
        "Sgt. Fernando",
        "Ranger"
      );

      expect(spy).toHaveBeenCalledWith("/api/wildlife-alerts/alert123/dispatch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responder: "Sgt. Fernando", responderRole: "Ranger" }),
      });
      expect(result.status).toBe("Dispatched");
    });

    it("throws when dispatch fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("responder name is required"));

      await expect(
        dispatchAlertApi("alert123", "", "Ranger")
      ).rejects.toThrow("responder name is required");
    });
  });

  describe("deleteAlertApi", () => {
    it("sends a DELETE request to the alert endpoint", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockAlert }),
      } as Response);

      await deleteAlertApi("alert123");

      expect(spy).toHaveBeenCalledWith("/api/wildlife-alerts/alert123", {
        method: "DELETE",
      });
    });

    it("throws the server message when deletion fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(fail("Alert not found"));

      await expect(deleteAlertApi("missing")).rejects.toThrow("Alert not found");
    });

    it("throws a default message when none is provided", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(deleteAlertApi("missing")).rejects.toThrow(
        "Failed to delete alert"
      );
    });
  });
});