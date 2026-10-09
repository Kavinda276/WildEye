import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import * as incidentService from "../services/incidentService";

const validTypes = ["Snare", "Animal Carcass", "Illegal Campsite", "At-Risk Species Footprint"];

export const createIncident = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body;

    let location: { latitude: number; longitude: number; source: string } | undefined;

    if (body.location) {
      try {
        location = typeof body.location === "string" ? JSON.parse(body.location) : body.location;
      } catch {
        throw new AppError("Invalid location data", 400);
      }
    }

    const incidentType = body.incidentType;
    const description = body.description;
    const patrolId = body.patrolId;
    const reportedAt = body.reportedAt;
    const localId = typeof body.localId === "string" && body.localId ? body.localId : undefined;

    if (localId) {
      const existing = await incidentService.findByLocalId(localId);
      if (existing) {
        res.status(200).json({
          success: true,
          message: "Incident already synced",
          data: existing,
        });
        return;
      }
    }

    if (!incidentType) {
      throw new AppError("Incident type is required", 400);
    }

    if (!validTypes.includes(incidentType)) {
      throw new AppError(
        "Incident type must be Snare, Animal Carcass, Illegal Campsite, or At-Risk Species Footprint",
        400
      );
    }

    if (!description || description.trim() === "") {
      throw new AppError("Description is required", 400);
    }

    if (!patrolId) {
      throw new AppError("Patrol ID is required", 400);
    }

    if (!location || location.latitude === undefined || location.longitude === undefined) {
      throw new AppError("Location (latitude and longitude) is required", 400);
    }

    const lat = Number(location.latitude);
    const lng = Number(location.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new AppError("Invalid latitude (must be between -90 and 90)", 400);
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new AppError("Invalid longitude (must be between -180 and 180)", 400);
    }

    if (!location.source || !["GPS", "Manual"].includes(location.source)) {
      throw new AppError("Location source must be GPS or Manual", 400);
    }

    const photoUrl = req.file ? `/uploads/incidents/${req.file.filename}` : undefined;

    const incident = await incidentService.createIncident({
      incidentType,
      description: description.trim(),
      photoUrl,
      location: {
        latitude: lat,
        longitude: lng,
        source: location.source as "GPS" | "Manual",
      },
      patrolId,
      reportedAt: reportedAt || new Date(),
      localId,
    });

    res.status(201).json({
      success: true,
      message: "Incident created successfully",
      data: incident,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(error instanceof Error ? error : new Error("Failed to create incident"));
  }
};

export const getAllIncidents = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidents = await incidentService.getAllIncidents();

    res.status(200).json({
      success: true,
      message: "Incidents retrieved successfully",
      data: incidents,
    });
  } catch (error) {
    next(error instanceof Error ? error : new Error("Failed to retrieve incidents"));
  }
};

export const getIncidentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const incident = await incidentService.getIncidentById(id);

    if (!incident) {
      throw new AppError("Incident not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Incident retrieved successfully",
      data: incident,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(error instanceof Error ? error : new Error("Failed to retrieve incident"));
  }
};

export const updateSyncStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const incident = await incidentService.updateSyncStatus(id, "Synced");

    if (!incident) {
      throw new AppError("Incident not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Incident sync status updated successfully",
      data: incident,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(error instanceof Error ? error : new Error("Failed to update sync status"));
  }
};

export const updateReviewStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewStatus } = req.body;

    if (!reviewStatus || !["Open", "Reviewed", "Resolved"].includes(reviewStatus)) {
      throw new AppError("reviewStatus must be Open, Reviewed, or Resolved", 400);
    }

    const incident = await incidentService.updateReviewStatus(id, reviewStatus);

    if (!incident) {
      throw new AppError("Incident not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Incident review status updated successfully",
      data: incident,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(error instanceof Error ? error : new Error("Failed to update review status"));
  }
};
