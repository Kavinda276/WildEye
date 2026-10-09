import mongoose from "mongoose";

// Mock Mongoose entirely - no real DB needed
jest.mock("../../src/models/Incident", () => {
  const mockDoc = (data: Record<string, unknown>) => ({
    ...data,
    _id: data._id || new mongoose.Types.ObjectId().toString(),
    save: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnValue(data),
  });

  const MockIncident = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  // Make it callable as a constructor for model()
  const constructorMock = jest.fn().mockImplementation((data) => mockDoc(data));
  Object.assign(constructorMock, MockIncident);

  return {
    __esModule: true,
    default: constructorMock,
    ...MockIncident,
  };
});

import Incident from "../../src/models/Incident";
import * as incidentService from "../../src/services/incidentService";

const MockIncident = jest.mocked(Incident);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Incident Service", () => {
  const validData = {
    incidentType: "Snare" as const,
    description: "Large steel snare found",
    location: { latitude: -2.3456, longitude: 34.5678, source: "GPS" as const },
    patrolId: "PATROL-001",
  };

  describe("createIncident", () => {
    it("should create and return an incident", async () => {
      const mockResult = { _id: "abc123", ...validData, syncStatus: "Synced" };
      MockIncident.create.mockResolvedValue(mockResult as never);

      const result = await incidentService.createIncident(validData);

      expect(MockIncident.create).toHaveBeenCalledWith(validData);
      expect(result).toEqual(mockResult);
    });

    it("should store photoUrl when provided", async () => {
      const dataWithPhoto = { ...validData, photoUrl: "/uploads/incidents/photo.jpg" };
      const mockResult = { _id: "abc123", ...dataWithPhoto, syncStatus: "Synced" };
      MockIncident.create.mockResolvedValue(mockResult as never);

      const result = await incidentService.createIncident(dataWithPhoto);

      expect(MockIncident.create).toHaveBeenCalledWith(dataWithPhoto);
      expect(result.photoUrl).toBe("/uploads/incidents/photo.jpg");
    });

    it("should store syncStatus as Synced by default", async () => {
      const mockResult = { _id: "abc123", ...validData, syncStatus: "Synced" };
      MockIncident.create.mockResolvedValue(mockResult as never);

      const result = await incidentService.createIncident(validData);

      expect(result.syncStatus).toBe("Synced");
    });
  });

  describe("getAllIncidents", () => {
    it("should return all incidents sorted newest first", async () => {
      const mockIncidents = [
        { _id: "2", description: "newer", createdAt: "2026-09-23" },
        { _id: "1", description: "older", createdAt: "2026-09-22" },
      ];
      const mockQuery = { sort: jest.fn().mockResolvedValue(mockIncidents) };
      MockIncident.find.mockReturnValue(mockQuery as never);

      const result = await incidentService.getAllIncidents();

      expect(MockIncident.find).toHaveBeenCalled();
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockIncidents);
    });

    it("should return empty array when no incidents exist", async () => {
      const mockQuery = { sort: jest.fn().mockResolvedValue([]) };
      MockIncident.find.mockReturnValue(mockQuery as never);

      const result = await incidentService.getAllIncidents();

      expect(result).toEqual([]);
    });
  });

  describe("getIncidentById", () => {
    it("should return an incident by id", async () => {
      const mockIncident = { _id: "abc123", ...validData };
      MockIncident.findById.mockResolvedValue(mockIncident as never);

      const result = await incidentService.getIncidentById("abc123");

      expect(MockIncident.findById).toHaveBeenCalledWith("abc123");
      expect(result).toEqual(mockIncident);
    });

    it("should return null for non-existing id", async () => {
      MockIncident.findById.mockResolvedValue(null);

      const result = await incidentService.getIncidentById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("updateSyncStatus", () => {
    it("should update syncStatus to Synced", async () => {
      const mockUpdated = { _id: "abc123", syncStatus: "Synced" };
      MockIncident.findByIdAndUpdate.mockResolvedValue(mockUpdated as never);

      const result = await incidentService.updateSyncStatus("abc123", "Synced");

      expect(MockIncident.findByIdAndUpdate).toHaveBeenCalledWith(
        "abc123",
        { syncStatus: "Synced" },
        { new: true, runValidators: true }
      );
      expect(result?.syncStatus).toBe("Synced");
    });

    it("should return null for non-existing id", async () => {
      MockIncident.findByIdAndUpdate.mockResolvedValue(null);

      const result = await incidentService.updateSyncStatus("nonexistent", "Synced");

      expect(result).toBeNull();
    });
  });
});
