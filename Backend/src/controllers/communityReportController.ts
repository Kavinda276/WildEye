import { Request, Response, NextFunction } from "express";
import * as communityReportService from "../services/communityReportService";
import { AppError } from "../middleware/errorHandler";

const validTypes = ["Elephant Sighting", "Crop-Raiding Incident"];

export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportType, description, location } = req.body;

    if (!reportType || !validTypes.includes(reportType)) {
      throw new AppError("Report type must be Elephant Sighting or Crop-Raiding Incident", 400);
    }

    if (!location || location.latitude === undefined || location.longitude === undefined) {
      throw new AppError("Location (latitude and longitude) is required", 400);
    }

    const lat = Number(location.latitude);
    const lng = Number(location.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new AppError("Invalid latitude", 400);
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new AppError("Invalid longitude", 400);
    }

    if (!location.source || !["GPS", "Manual"].includes(location.source)) {
      throw new AppError("Location source must be GPS or Manual", 400);
    }

    const report = await communityReportService.createReport({
      reportType,
      description: description || "",
      location: { latitude: lat, longitude: lng, source: location.source },
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to create report", 500));
  }
};

export const getAllReports = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reports = await communityReportService.getAllReports();
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to fetch reports", 500));
  }
};

export const getReportById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await communityReportService.getReportById(req.params.id);
    if (!report) throw new AppError("Report not found", 404);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to fetch report", 500));
  }
};

export const updateReportResponder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { responder, responderRole } = req.body;
    if (!responder) throw new AppError("responder name is required", 400);

    const report = await communityReportService.updateReportResponder(
      req.params.id,
      responder,
      responderRole || "Ranger"
    );
    if (!report) throw new AppError("Report not found", 404);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to update report", 500));
  }
};

export const getResponders = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const responders = communityReportService.getResponders();
    res.status(200).json({ success: true, data: responders });
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to fetch responders", 500));
  }
};

export const setResponderAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, available } = req.body;
    if (!name || typeof available !== "boolean") {
      throw new AppError("name and available (boolean) are required", 400);
    }
    const updated = communityReportService.setResponderAvailability(name, available);
    if (!updated) throw new AppError("Responder not found", 404);
    res.status(200).json({ success: true, data: communityReportService.getResponders() });
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(error instanceof Error ? error : new AppError("Failed to update responder", 500));
  }
};
