import request from "supertest";
import express from "express";
import communityReportRoutes from "../../src/routes/communityReportRoutes";
import cameraTrapRoutes from "../../src/routes/cameraTrapRoutes";
import { errorHandler } from "../../src/middleware/errorHandler";
import { notFoundHandler } from "../../src/middleware/notFound";
import * as communityReportService from "../../src/services/communityReportService";
import * as cameraTrapService from "../../src/services/cameraTrapService";

jest.mock("../../src/services/communityReportService");
jest.mock("../../src/services/cameraTrapService");

const app = express();
app.use(express.json());
app.use("/api/community-reports", communityReportRoutes);
app.use("/api/camera-traps", cameraTrapRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const mockedReportService = jest.mocked(communityReportService);
const mockedCameraService = jest.mocked(cameraTrapService);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---- UC03: Responder Availability ----
describe("UC03 - Responder Availability", () => {
  const mockReport = {
    _id: "report123",
    reportType: "Elephant Sighting",
    description: "",
    location: { latitude: 6.85, longitude: 80.86, source: "GPS" as const },
    status: "Assigned",
    assignedResponder: "Rt. Cmdr. Perera",
    assignedResponderRole: "Ranger" as const,
    reportedAt: "2026-09-24T10:00:00.000Z",
    createdAt: "2026-09-24T10:00:00.000Z",
    updatedAt: "2026-09-24T10:00:00.000Z",
  };

  it("should assign responder when available", async () => {
    mockedReportService.createReport.mockResolvedValue(mockReport as never);
    const res = await request(app)
      .post("/api/community-reports")
      .send({
        reportType: "Elephant Sighting",
        location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("Assigned");
    expect(res.body.data.assignedResponder).toBeTruthy();
  });

  it("should return Pending Assignment when no responders available", async () => {
    const pendingReport = { ...mockReport, status: "Pending Assignment", assignedResponder: "", assignedResponderRole: "" };
    mockedReportService.createReport.mockResolvedValue(pendingReport as never);
    const res = await request(app)
      .post("/api/community-reports")
      .send({
        reportType: "Elephant Sighting",
        location: { latitude: 6.85, longitude: 80.86, source: "GPS" },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("Pending Assignment");
    expect(res.body.data.assignedResponder).toBe("");
  });

  it("should get responders list", async () => {
    mockedReportService.getResponders.mockReturnValue([
      { name: "Rt. Cmdr. Perera", role: "Ranger", available: true },
      { name: "Ms. Jayasinghe", role: "Community Liaison Officer", available: false },
    ]);
    const res = await request(app).get("/api/community-reports/responders");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].available).toBe(true);
    expect(res.body.data[1].available).toBe(false);
  });

  it("should toggle responder availability", async () => {
    mockedReportService.setResponderAvailability.mockReturnValue(true);
    mockedReportService.getResponders.mockReturnValue([
      { name: "Rt. Cmdr. Perera", role: "Ranger", available: false },
    ]);
    const res = await request(app)
      .patch("/api/community-reports/responders/availability")
      .send({ name: "Rt. Cmdr. Perera", available: false });
    expect(res.status).toBe(200);
    expect(mockedReportService.setResponderAvailability).toHaveBeenCalledWith("Rt. Cmdr. Perera", false);
  });

  it("should reject toggle with missing name", async () => {
    const res = await request(app)
      .patch("/api/community-reports/responders/availability")
      .send({ available: false });
    expect(res.status).toBe(400);
  });
});

// ---- UC04: Needs Second Review ----
describe("UC04 - Needs Second Review", () => {
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

  it("should set status to needs_second_review when classified as Needs Second Review", async () => {
    const classified = { ...mockCapture, status: "needs_second_review", classification: "Needs Second Review" };
    mockedCameraService.classifyCapture.mockResolvedValue(classified as never);
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "Needs Second Review" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("needs_second_review");
    expect(res.body.data.classification).toBe("Needs Second Review");
  });

  it("should return captures needing second review", async () => {
    const needsReview = [{ ...mockCapture, status: "needs_second_review", classification: "Needs Second Review" }];
    mockedCameraService.getNeedsSecondReview.mockResolvedValue(needsReview as never);
    const res = await request(app).get("/api/camera-traps/needs-second-review");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("needs_second_review");
  });

  it("should allow re-classifying a needs_second_review capture to a final classification", async () => {
    const finalClassified = { ...mockCapture, status: "reviewed", classification: "Species Sighting", species: "Sri Lankan Leopard" };
    mockedCameraService.classifyCapture.mockResolvedValue(finalClassified as never);
    const res = await request(app)
      .patch("/api/camera-traps/capture123/classify")
      .send({ classification: "Species Sighting", species: "Sri Lankan Leopard" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("reviewed");
    expect(res.body.data.classification).toBe("Species Sighting");
  });
});
