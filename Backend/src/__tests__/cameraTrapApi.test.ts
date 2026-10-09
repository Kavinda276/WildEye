import request from "supertest";
import express from "express";
import cameraTrapRoutes from "../../src/routes/cameraTrapRoutes";
import { errorHandler } from "../../src/middleware/errorHandler";
import { notFoundHandler } from "../../src/middleware/notFound";
import * as cameraTrapService from "../../src/services/cameraTrapService";

jest.mock("../../src/services/cameraTrapService");

const app = express();
app.use(express.json());
app.use("/api/camera-traps", cameraTrapRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const mockedService = jest.mocked(cameraTrapService);

beforeEach(() => {
  jest.clearAllMocks();
});

const mockCapture = {
  _id: "capture123",
  cameraTrapId: "CT-001",
  imageUrl: "https://example.com/photo.jpg",
  capturedAt: "2026-09-20T06:15:00.000Z",
  location: { latitude: 6.8732, longitude: 80.8961 },
  status: "unreviewed",
  classification: "",
  species: "",
  createdAt: "2026-09-20T06:15:00.000Z",
  updatedAt: "2026-09-20T06:15:00.000Z",
};

const mockAlert = {
  _id: "alert123",
  capture: "capture123",
  alertType: "Species Sighting",
  species: "Sri Lankan Elephant",
  priority: "Medium",
  cameraTrapId: "CT-001",
  location: { latitude: 6.8732, longitude: 80.8961 },
  status: "Active",
  createdAt: "2026-09-20T06:15:00.000Z",
  updatedAt: "2026-09-20T06:15:00.000Z",
};

const mockReport = {
  _id: "report123",
  sessionDate: "2026-09-24T10:00:00.000Z",
  totalReviewed: 5,
  speciesSightings: 2,
  poacherAlerts: 1,
  falseTriggers: 1,
  secondReviews: 1,
  captureLocations: [{ latitude: 6.87, longitude: 80.89, cameraTrapId: "CT-001" }],
  classificationBreakdown: [
    { classification: "Species Sighting", count: 2 },
    { classification: "Poacher Alert", count: 1 },
  ],
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
};

// ---- POST /api/camera-traps/seed ----
describe("POST /api/camera-traps/seed", () => {
  it("should seed captures", async () => {
    mockedService.seedCaptures.mockResolvedValue(undefined);
    const res = await request(app).post("/api/camera-traps/seed");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---- GET /api/camera-traps/pending ----
describe("GET /api/camera-traps/pending", () => {
  it("should return pending captures", async () => {
    mockedService.getPendingCaptures.mockResolvedValue([mockCapture] as never);
    const res = await request(app).get("/api/camera-traps/pending");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("unreviewed");
  });

  it("should return empty array when no pending", async () => {
    mockedService.getPendingCaptures.mockResolvedValue([]);
    const res = await request(app).get("/api/camera-traps/pending");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ---- GET /api/camera-traps/needs-second-review ----
describe("GET /api/camera-traps/needs-second-review", () => {
  it("should return captures needing second review", async () => {
    const needsReview = [{ ...mockCapture, status: "needs_second_review", classification: "Needs Second Review" }];
    mockedService.getNeedsSecondReview.mockResolvedValue(needsReview as never);
    const res = await request(app).get("/api/camera-traps/needs-second-review");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("needs_second_review");
  });

  it("should return empty array when none need review", async () => {
    mockedService.getNeedsSecondReview.mockResolvedValue([]);
    const res = await request(app).get("/api/camera-traps/needs-second-review");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ---- GET /api/camera-traps/:id ----
describe("GET /api/camera-traps/:id", () => {
  it("should return capture by ID", async () => {
    mockedService.getCaptureById.mockResolvedValue(mockCapture as never);
    const res = await request(app).get("/api/camera-traps/capture123");
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe("capture123");
  });

  it("should return 404 for non-existing capture", async () => {
    mockedService.getCaptureById.mockResolvedValue(null);
    const res = await request(app).get("/api/camera-traps/nonexistent");
    expect(res.status).toBe(404);
  });
});

// ---- PATCH /api/camera-traps/:id/classify ----
describe("PATCH /api/camera-traps/:id/classify", () => {
  it("should classify as Species Sighting with species", async () => {
    const classified = { ...mockCapture, status: "reviewed", classification: "Species Sighting", species: "Sri Lankan Elephant" };
    mockedService.classifyCapture.mockResolvedValue(classified as never);
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "Species Sighting", species: "Sri Lankan Elephant" });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe("Species Sighting");
    expect(res.body.data.species).toBe("Sri Lankan Elephant");
  });

  it("should classify as Poacher Alert", async () => {
    const classified = { ...mockCapture, status: "reviewed", classification: "Poacher Alert" };
    mockedService.classifyCapture.mockResolvedValue(classified as never);
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "Poacher Alert" });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe("Poacher Alert");
  });

  it("should classify as False Trigger", async () => {
    const classified = { ...mockCapture, status: "reviewed", classification: "False Trigger" };
    mockedService.classifyCapture.mockResolvedValue(classified as never);
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "False Trigger" });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe("False Trigger");
  });

  it("should classify as Needs Second Review", async () => {
    const classified = { ...mockCapture, status: "needs_second_review", classification: "Needs Second Review" };
    mockedService.classifyCapture.mockResolvedValue(classified as never);
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "Needs Second Review" });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe("Needs Second Review");
    expect(res.body.data.status).toBe("needs_second_review");
  });

  it("should reject Species Sighting without species", async () => {
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "Species Sighting" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Species is required");
  });

  it("should reject invalid classification", async () => {
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "Invalid" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid classification");
  });

  it("should reject missing classification", async () => {
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({});
    expect(res.status).toBe(400);
  });

  it("should return 404 for non-existing capture", async () => {
    mockedService.classifyCapture.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/camera-traps/nonexistent/classify")
      .send({ classification: "False Trigger" });
    expect(res.status).toBe(404);
  });
});

// ---- GET /api/camera-traps/alerts ----
describe("GET /api/camera-traps/alerts", () => {
  it("should return camera trap alerts", async () => {
    mockedService.getAlerts.mockResolvedValue([mockAlert] as never);
    const res = await request(app).get("/api/camera-traps/alerts");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ---- POST /api/camera-traps/reports/generate ----
describe("POST /api/camera-traps/reports/generate", () => {
  it("should generate session report", async () => {
    mockedService.generateSessionReport.mockResolvedValue(mockReport as never);
    const res = await request(app).post("/api/camera-traps/reports/generate");
    expect(res.status).toBe(201);
    expect(res.body.data.totalReviewed).toBe(5);
    expect(res.body.data.speciesSightings).toBe(2);
    expect(res.body.data.poacherAlerts).toBe(1);
  });

  it("should handle report generation failure", async () => {
    mockedService.generateSessionReport.mockRejectedValue(new Error("DB error"));
    const res = await request(app).post("/api/camera-traps/reports/generate");
    expect(res.status).toBe(500);
  });
});

// ---- GET /api/camera-traps/reports ----
describe("GET /api/camera-traps/reports", () => {
  it("should return session reports", async () => {
    mockedService.getReports.mockResolvedValue([mockReport] as never);
    const res = await request(app).get("/api/camera-traps/reports");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].classificationBreakdown).toHaveLength(2);
  });
});
