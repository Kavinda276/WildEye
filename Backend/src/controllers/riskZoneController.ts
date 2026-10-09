import { Request, Response, NextFunction } from "express";
import * as riskZoneService from "../services/riskZoneService";
import { AppError } from "../middleware/errorHandler";

export const getAllRiskZones = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const zones = await riskZoneService.getAllRiskZones();
    res.status(200).json({ success: true, data: zones });
  } catch (error) {
    next(error instanceof Error ? error : new Error("Failed to fetch risk zones"));
  }
};

export const getRiskZoneById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const zone = await riskZoneService.getRiskZoneById(req.params.id);
    if (!zone) throw new AppError("Risk zone not found", 404);
    res.status(200).json({ success: true, data: zone });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to fetch risk zone", 500));
  }
};

export const seedRiskZones = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const RiskZone = (await import("../models/RiskZone")).default;
    await RiskZone.deleteMany();

    const seedData = [
      {
        name: "Poacher Hotspot - North",
        description: "Frequently reported illegal hunting activity near the northern boundary.",
        bounds: { north: 6.89, south: 6.87, east: 80.88, west: 80.85 },
        severity: "High" as const,
        active: true,
      },
      {
        name: "Human-Wildlife Conflict Zone",
        description: "Area with frequent elephant-crop conflict and human encounters.",
        bounds: { north: 6.83, south: 6.80, east: 80.92, west: 80.89 },
        severity: "Medium" as const,
        active: true,
      },
      {
        name: "Snare Trap Area - West",
        description: "Evidence of wire snare traps found in previous patrols.",
        bounds: { north: 6.87, south: 6.85, east: 80.83, west: 80.80 },
        severity: "High" as const,
        active: true,
      },
    ];

    const zones = await RiskZone.insertMany(seedData);
    res.status(201).json({ success: true, data: zones });
  } catch (error) {
    next(error instanceof Error ? error : new Error("Failed to seed risk zones"));
  }
};
