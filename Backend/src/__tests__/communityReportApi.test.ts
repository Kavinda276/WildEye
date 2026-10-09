import request from "supertest";
import express from "express";
import communityReportRoutes from "../../src/routes/communityReportRoutes";
import { errorHandler } from "../../src/middleware/errorHandler";
import { notFoundHandler } from "../../src/middleware/notFound";
import * as communityReportService from "../../src/services/communityReportService";

jest.mock("../../src/services/communityReportService");

const app = express();
app.use(express.json());
app.use("/api/community-reports", communityReportRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const mockedService = jest.mocked(communityReportService);

beforeEach(() => {
  jest.clearAllMocks();
});

const mockReport = {
  _id: "report123",
  reportType: "Elephant Sighting",
  description: "Elephant spotted near village",
  location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
  status: "Assigned",
  assignedResponder: "Ms. Jayasinghe",
  assignedResponderRole: "Community Liaison Officer",
  reportedAt: "2026-09-24T10:00:00.000Z",
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
};

const validPayload = {
  reportType: "Elephant Sighting",
  description: "Elephant near paddy field",
  location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
};

// ---- POST /api/community-reports ----
describe("POST /api/community-reports", () => {
  it("should create Elephant Sighting report", async () => {
    mockedService.createReport.mockResolvedValue(mockReport as never);
    const res = await request(app).post("/api/community-reports").send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reportType).toBe("Elephant Sighting");
    expect(res.body.data.status).toBe("Assigned");
  });

  it("should create Crop-Raiding Incident report", async () => {
    const cropReport = { ...mockReport, reportType: "Crop-Raiding Incident" };
    mockedService.createReport.mockResolvedValue(cropReport as never);
    const res = await request(app)
      .post("/api/community-reports")
      .send({ ...validPayload, reportType: "Crop-Raiding Incident" });
    expect(res.status).toBe(201);
    expect(res.body.data.reportType).toBe("Crop-Raiding Incident");
  });

  it("should reject missing reportType", async () => {
    const res = await request(app)
      .post("/api/community-reports")
      .send({ location: validPayload.location });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Report type must be");
  });

  it("should reject invalid reportType", async () => {
    const res = await request(app)
      .post("/api/community-reports")
      .send({ ...validPayload, reportType: "Invalid Type" });
    expect(res.status).toBe(400);
  });

  it("should reject missing location", async () => {
    const res = await request(app)
      .post("/api/community-reports")
      .send({ reportType: "Elephant Sighting" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Location");
  });

  it("should reject invalid latitude", async () => {
    const res = await request(app)
      .post("/api/community-reports")
      .send({ ...validPayload, location: { latitude: 91, longitude: 80.86, source: "GPS" } });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid latitude");
  });

  it("should reject invalid longitude", async () => {
    const res = await request(app)
      .post("/api/community-reports")
      .send({ ...validPayload, location: { latitude: 6.85, longitude: 181, source: "GPS" } });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid longitude");
  });

  it("should reject invalid location source", async () => {
    const res = await request(app)
      .post("/api/community-reports")
      .send({ ...validPayload, location: { latitude: 6.85, longitude: 80.86, source: "Satellite" } });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Location source must be");
  });

  it("should accept Manual location source", async () => {
    const manualReport = { ...mockReport, location: { ...mockReport.location, source: "Manual" } };
    mockedService.createReport.mockResolvedValue(manualReport as never);
    const res = await request(app)
      .post("/api/community-reports")
      .send({ ...validPayload, location: { latitude: 6.85, longitude: 80.86, source: "Manual" } });
    expect(res.status).toBe(201);
    expect(res.body.data.location.source).toBe("Manual");
  });

  it("should accept empty description", async () => {
    mockedService.createReport.mockResolvedValue(mockReport as never);
    const res = await request(app)
      .post("/api/community-reports")
      .send({ ...validPayload, description: "" });
    expect(res.status).toBe(201);
  });

  it("should handle service failure", async () => {
    mockedService.createReport.mockRejectedValue(new Error("DB error"));
    const res = await request(app).post("/api/community-reports").send(validPayload);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- GET /api/community-reports ----
describe("GET /api/community-reports", () => {
  it("should return all reports", async () => {
    mockedService.getAllReports.mockResolvedValue([mockReport] as never);
    const res = await request(app).get("/api/community-reports");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("should handle service failure", async () => {
    mockedService.getAllReports.mockRejectedValue(new Error("DB error"));
    const res = await request(app).get("/api/community-reports");
    expect(res.status).toBe(500);
  });
});

// ---- GET /api/community-reports/:id ----
describe("GET /api/community-reports/:id", () => {
  it("should return report by ID", async () => {
    mockedService.getReportById.mockResolvedValue(mockReport as never);
    const res = await request(app).get("/api/community-reports/report123");
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe("report123");
  });

  it("should return 404 for non-existing report", async () => {
    mockedService.getReportById.mockResolvedValue(null);
    const res = await request(app).get("/api/community-reports/nonexistent");
    expect(res.status).toBe(404);
  });
});

// ---- PATCH /api/community-reports/:id/responder ----
describe("PATCH /api/community-reports/:id/responder", () => {
  it("should update responder", async () => {
    const updated = { ...mockReport, assignedResponder: "New Officer" };
    mockedService.updateReportResponder.mockResolvedValue(updated as never);
    const res = await request(app)
      .patch("/api/community-reports/report123/responder")
      .send({ responder: "New Officer", responderRole: "Ranger" });
    expect(res.status).toBe(200);
    expect(res.body.data.assignedResponder).toBe("New Officer");
  });

  it("should reject missing responder", async () => {
    const res = await request(app)
      .patch("/api/community-reports/report123/responder")
      .send({});
    expect(res.status).toBe(400);
  });

  it("should return 404 for non-existing report", async () => {
    mockedService.updateReportResponder.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/community-reports/nonexistent/responder")
      .send({ responder: "Officer" });
    expect(res.status).toBe(404);
  });
});
