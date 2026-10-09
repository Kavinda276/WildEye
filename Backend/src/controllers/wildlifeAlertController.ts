import { Request, Response, NextFunction } from "express";
import * as wildlifeAlertService from "../services/wildlifeAlertService";
import * as animalService from "../services/animalService";
import * as riskZoneService from "../services/riskZoneService";
import { AppError } from "../middleware/errorHandler";

export const getAllAlerts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alerts = await wildlifeAlertService.getAllAlerts();
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to fetch alerts", 500));
  }
};

export const createAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { animalId, riskZoneId } = req.body;

    if (!animalId || !riskZoneId) {
      throw new AppError("animalId and riskZoneId are required", 400);
    }

    const animal = await animalService.getAnimalById(animalId);
    if (!animal) throw new AppError("Animal not found", 404);

    const zone = await riskZoneService.getRiskZoneById(riskZoneId);
    if (!zone) throw new AppError("Risk zone not found", 404);

    const existing = await (await import("../models/WildlifeAlert")).default.findOne({
      "animal.collarId": animal.collarId,
      status: { $in: ["Pending", "Dispatched"] },
    });

    if (existing) {
      res.status(200).json({ success: true, data: existing });
      return;
    }

    const priority =
      zone.severity === "High" ? "Critical" :
      zone.severity === "Medium" ? "High" : "Medium";

    const alert = await wildlifeAlertService.createAlert({
      animal: { name: animal.name, species: animal.species, collarId: animal.collarId },
      riskZone: { name: zone.name, severity: zone.severity },
      currentLocation: { latitude: animal.location.latitude, longitude: animal.location.longitude },
      priority,
    });

    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to create alert", 500));
  }
};

export const dispatchAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { responder, responderRole } = req.body;

    if (!responder) {
      throw new AppError("responder name is required", 400);
    }

    const alert = await wildlifeAlertService.dispatchAlert(
      req.params.id,
      responder,
      responderRole || "Ranger"
    );

    if (!alert) throw new AppError("Alert not found", 404);

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to dispatch alert", 500));
  }
};

export const updateAlertStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError("status is required", 400);

    const alert = await wildlifeAlertService.updateAlertStatus(req.params.id, status);
    if (!alert) throw new AppError("Alert not found", 404);

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to update alert", 500));
  }
};

export const deleteAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alert = await wildlifeAlertService.deleteAlert(req.params.id);
    if (!alert) throw new AppError("Alert not found", 404);
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to delete alert", 500));
  }
};
