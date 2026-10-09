import { Request, Response, NextFunction } from "express";
import * as cameraTrapService from "../services/cameraTrapService";
import { AppError } from "../middleware/errorHandler";

export const seedCaptures = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await cameraTrapService.seedCaptures();
    res.status(200).json({ success: true, message: "Camera captures seeded" });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to seed captures", 500));
  }
};

export const getPendingCaptures = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const captures = await cameraTrapService.getPendingCaptures();
    res.status(200).json({ success: true, data: captures });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to fetch captures", 500));
  }
};

export const getNeedsSecondReview = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const captures = await cameraTrapService.getNeedsSecondReview();
    res.status(200).json({ success: true, data: captures });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to fetch captures", 500));
  }
};

export const getCaptureById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const capture = await cameraTrapService.getCaptureById(req.params.id);
    if (!capture) throw new AppError("Capture not found", 404);
    res.status(200).json({ success: true, data: capture });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to fetch capture", 500));
  }
};

export const classifyCapture = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classification, species } = req.body;
    const validClassifications = ["Species Sighting", "Poacher Alert", "False Trigger", "Needs Second Review"];

    if (!classification || !validClassifications.includes(classification)) {
      throw new AppError("Invalid classification", 400);
    }

    if (classification === "Species Sighting" && !species) {
      throw new AppError("Species is required for Species Sighting classification", 400);
    }

    const capture = await cameraTrapService.classifyCapture(req.params.id, classification, species);
    if (!capture) throw new AppError("Capture not found", 404);

    res.status(200).json({ success: true, data: capture });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to classify capture", 500));
  }
};

export const getAlerts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alerts = await cameraTrapService.getAlerts();
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to fetch alerts", 500));
  }
};

export const generateSessionReport = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await cameraTrapService.generateSessionReport();
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to generate report", 500));
  }
};

export const getReports = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reports = await cameraTrapService.getReports();
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to fetch reports", 500));
  }
};
