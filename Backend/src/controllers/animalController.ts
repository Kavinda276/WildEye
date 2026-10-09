import { Request, Response, NextFunction } from "express";
import * as animalService from "../services/animalService";
import * as riskZoneService from "../services/riskZoneService";
import * as wildlifeAlertService from "../services/wildlifeAlertService";
import WildlifeAlert from "../models/WildlifeAlert";
import { AppError } from "../middleware/errorHandler";

export const getAllAnimals = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const animals = await animalService.getAllAnimals();
    res.status(200).json({ success: true, data: animals });
  } catch (error) {
    next(error instanceof Error ? error : new Error("Failed to fetch animals"));
  }
};

export const getAnimalById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const animal = await animalService.getAnimalById(req.params.id);
    if (!animal) throw new AppError("Animal not found", 404);
    res.status(200).json({ success: true, data: animal });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to fetch animal", 500));
  }
};

export const simulateMovement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      throw new AppError("latitude and longitude are required", 400);
    }

    const animal = await animalService.updateAnimalLocation(
      req.params.id,
      latitude,
      longitude
    );
    if (!animal) throw new AppError("Animal not found", 404);

    const riskZones = await riskZoneService.getAllRiskZones();
    const matchedZone = riskZones.find(
      (zone) =>
        latitude <= zone.bounds.north &&
        latitude >= zone.bounds.south &&
        longitude <= zone.bounds.east &&
        longitude >= zone.bounds.west
    );

    const insideAny = !!matchedZone;
    await animalService.setAnimalRiskZoneStatus(animal._id.toString(), insideAny);

    let alert = null;

    if (insideAny && matchedZone) {
      const existing = await WildlifeAlert.findOne({
        "animal.collarId": animal.collarId,
        status: { $in: ["Pending", "Dispatched"] },
      });

      if (existing) {
        alert = existing;
      } else {
        const priority =
          matchedZone.severity === "High" ? "Critical" :
          matchedZone.severity === "Medium" ? "High" : "Medium";

        alert = await wildlifeAlertService.createAlert({
          animal: { name: animal.name, species: animal.species, collarId: animal.collarId },
          riskZone: { name: matchedZone.name, severity: matchedZone.severity },
          currentLocation: { latitude: animal.location.latitude, longitude: animal.location.longitude },
          priority,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...animal.toObject(),
        isInsideRiskZone: insideAny,
        alert,
      },
    });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to simulate movement", 500));
  }
};

export const setCollarStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { collarStatus } = req.body;
    if (!collarStatus) throw new AppError("collarStatus is required", 400);

    const animal = await animalService.setCollarStatus(req.params.id, collarStatus);
    if (!animal) throw new AppError("Animal not found", 404);

    let alert = null;
    if (collarStatus === "Signal Lost") {
      const existing = await WildlifeAlert.findOne({
        "animal.collarId": animal.collarId,
        status: { $in: ["Pending", "Dispatched"] },
      });
      if (!existing) {
        alert = await wildlifeAlertService.createAlert({
          animal: { name: animal.name, species: animal.species, collarId: animal.collarId },
          riskZone: { name: "Unknown — Signal Lost", severity: "High" },
          currentLocation: { latitude: animal.location.latitude, longitude: animal.location.longitude },
          priority: "High",
        });
      } else {
        alert = existing;
      }
    }

    res.status(200).json({ success: true, data: { ...animal.toObject(), alert } });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to update collar status", 500));
  }
};

export const seedAnimals = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const Animal = (await import("../models/Animal")).default;
    await Animal.deleteMany();

    const seedData = [
      {
        name: "Kavi",
        species: "Sri Lankan Leopard",
        collarId: "COLLAR-001",
        collarStatus: "Active",
        location: { latitude: 6.8500, longitude: 80.8600 },
        lastSignal: new Date(),
        isInsideRiskZone: false,
      },
      {
        name: "Suraksha",
        species: "Asian Elephant",
        collarId: "COLLAR-002",
        collarStatus: "Active",
        location: { latitude: 6.8200, longitude: 80.9000 },
        lastSignal: new Date(),
        isInsideRiskZone: false,
      },
      {
        name: "Dola",
        species: "Sloth Bear",
        collarId: "COLLAR-003",
        collarStatus: "Active",
        location: { latitude: 6.8800, longitude: 80.8300 },
        lastSignal: new Date(),
        isInsideRiskZone: false,
      },
      {
        name: "Nuwara",
        species: "Sri Lankan Leopard",
        collarId: "COLLAR-004",
        collarStatus: "Active",
        location: { latitude: 6.9000, longitude: 80.9200 },
        lastSignal: new Date(),
        isInsideRiskZone: false,
      },
      {
        name: "Gaja",
        species: "Asian Elephant",
        collarId: "COLLAR-005",
        collarStatus: "Active",
        location: { latitude: 6.8700, longitude: 80.8100 },
        lastSignal: new Date(),
        isInsideRiskZone: false,
      },
    ];

    const animals = await Animal.insertMany(seedData);
    res.status(201).json({ success: true, data: animals });
  } catch (error) {
    next(error instanceof Error ? error : new Error("Failed to seed animals"));
  }
};
