import * as cameraTrapService from "../../src/services/cameraTrapService";
import CameraCapture from "../../src/models/CameraCapture";
import CameraTrapAlert from "../../src/models/CameraTrapAlert";
import SessionReport from "../../src/models/SessionReport";

jest.mock("../../src/models/CameraCapture");
jest.mock("../../src/models/CameraTrapAlert");
jest.mock("../../src/models/SessionReport");

const mockCaptureModel = jest.mocked(CameraCapture) as unknown as {
  findByIdAndUpdate: jest.Mock;
  find: jest.Mock;
};
const mockAlertModel = jest.mocked(CameraTrapAlert) as unknown as {
  findOne: jest.Mock;
  create: jest.Mock;
};
const mockReportModel = jest.mocked(SessionReport) as unknown as {
  create: jest.Mock;
};

const buildCapture = (overrides: Record<string, unknown> = {}) => ({
  _id: "cap1",
  cameraTrapId: "CT-001",
  imageUrl: "https://example.com/photo.jpg",
  capturedAt: new Date("2026-10-07T01:00:00Z"),
  location: { latitude: 6.85, longitude: 80.86 },
  status: "unreviewed",
  classification: "",
  species: "",
  ...overrides,
});

const buildAlert = (overrides: Record<string, unknown> = {}) => ({
  _id: "alert1",
  capture: "cap1",
  alertType: "Species Sighting",
  species: "Sri Lankan Elephant",
  priority: "Medium",
  cameraTrapId: "CT-001",
  location: { latitude: 6.85, longitude: 80.86 },
  status: "Active",
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const asQuery = <T,>(value: T) =>
  ({
    sort: jest.fn().mockResolvedValue(value),
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("cameraTrapService.classifyCapture", () => {
  describe("alert creation", () => {
    it("creates a Medium alert for Species Sighting when none exists", async () => {
      const capture = buildCapture();
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(capture);
      mockAlertModel.findOne.mockResolvedValue(null);

      await cameraTrapService.classifyCapture("cap1", "Species Sighting", "Sri Lankan Elephant");

      expect(mockAlertModel.create).toHaveBeenCalledTimes(1);
      expect(mockAlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: "Species Sighting",
          priority: "Medium",
          species: "Sri Lankan Elephant",
        })
      );
    });

    it("creates a Critical alert for Poacher Alert when none exists", async () => {
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());
      mockAlertModel.findOne.mockResolvedValue(null);

      await cameraTrapService.classifyCapture("cap1", "Poacher Alert");

      expect(mockAlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ alertType: "Poacher Alert", priority: "Critical" })
      );
    });

    it("does NOT create any alert for False Trigger", async () => {
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());

      await cameraTrapService.classifyCapture("cap1", "False Trigger");

      expect(mockAlertModel.create).not.toHaveBeenCalled();
      expect(mockAlertModel.findOne).not.toHaveBeenCalled();
    });

    it("does NOT create any alert for Needs Second Review", async () => {
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());

      await cameraTrapService.classifyCapture("cap1", "Needs Second Review");

      expect(mockAlertModel.create).not.toHaveBeenCalled();
      expect(mockAlertModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe("duplicate prevention", () => {
    it("reuses the existing alert instead of creating a duplicate", async () => {
      const existing = buildAlert();
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());
      mockAlertModel.findOne.mockResolvedValue(existing);

      await cameraTrapService.classifyCapture("cap1", "Poacher Alert");

      expect(mockAlertModel.create).not.toHaveBeenCalled();
      expect(existing.save).toHaveBeenCalledTimes(1);
      expect(existing.alertType).toBe("Poacher Alert");
      expect(existing.priority).toBe("Critical");
    });

    it("keeps one alert per capture across repeated classifications", async () => {
      const existing = buildAlert();
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());
      mockAlertModel.findOne.mockResolvedValue(existing);

      await cameraTrapService.classifyCapture("cap1", "Species Sighting", "Sri Lankan Elephant");
      await cameraTrapService.classifyCapture("cap1", "Poacher Alert");

      expect(mockAlertModel.create).not.toHaveBeenCalled();
      expect(mockAlertModel.findOne).toHaveBeenCalledTimes(2);
    });

    it("resets a previously resolved alert back to Active on re-classification", async () => {
      const existing = buildAlert({ status: "Resolved" });
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());
      mockAlertModel.findOne.mockResolvedValue(existing);

      await cameraTrapService.classifyCapture("cap1", "Poacher Alert");

      expect(existing.status).toBe("Active");
    });
  });

  describe("capture status", () => {
    it("sets status to reviewed for a final classification", async () => {
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());
      mockAlertModel.findOne.mockResolvedValue(null);

      await cameraTrapService.classifyCapture("cap1", "False Trigger");

      expect(mockCaptureModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "cap1",
        expect.objectContaining({ status: "reviewed" }),
        { new: true }
      );
    });

    it("sets status to needs_second_review instead of reviewed", async () => {
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(buildCapture());

      await cameraTrapService.classifyCapture("cap1", "Needs Second Review");

      expect(mockCaptureModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "cap1",
        expect.objectContaining({ status: "needs_second_review" }),
        { new: true }
      );
    });

    it("returns null when the capture does not exist", async () => {
      mockCaptureModel.findByIdAndUpdate.mockResolvedValue(null);

      const result = await cameraTrapService.classifyCapture("missing", "False Trigger");

      expect(result).toBeNull();
      expect(mockAlertModel.create).not.toHaveBeenCalled();
    });
  });

  describe("getNeedsSecondReview", () => {
    it("returns only captures with needs_second_review status", async () => {
      const capture = buildCapture({ status: "needs_second_review" });
      mockCaptureModel.find.mockReturnValue(asQuery([capture]));

      const result = await cameraTrapService.getNeedsSecondReview();

      expect(mockCaptureModel.find).toHaveBeenCalledWith({ status: "needs_second_review" });
      expect(result).toHaveLength(1);
    });
  });
});

describe("cameraTrapService.generateSessionReport", () => {
  it("excludes needs_second_review captures from totalReviewed", async () => {
    const reviewed = [
      buildCapture({ status: "reviewed", classification: "Species Sighting" }),
      buildCapture({ status: "reviewed", classification: "False Trigger" }),
    ];
    const awaiting = [
      buildCapture({ status: "needs_second_review", classification: "Needs Second Review" }),
    ];

    mockCaptureModel.find
      .mockReturnValueOnce(asQuery(reviewed))
      .mockReturnValueOnce(asQuery(awaiting));
    mockReportModel.create.mockImplementation(async (data: unknown) => data);

    const report = await cameraTrapService.generateSessionReport();

    expect(mockCaptureModel.find).toHaveBeenCalledWith({ status: "reviewed" });
    expect(mockCaptureModel.find).toHaveBeenCalledWith({ status: "needs_second_review" });
    expect(report.totalReviewed).toBe(2);
    expect(report.secondReviews).toBe(1);
  });

  it("counts each classification into the correct bucket", async () => {
    const reviewed = [
      buildCapture({ status: "reviewed", classification: "Species Sighting" }),
      buildCapture({ status: "reviewed", classification: "Poacher Alert" }),
      buildCapture({ status: "reviewed", classification: "Poacher Alert" }),
      buildCapture({ status: "reviewed", classification: "False Trigger" }),
    ];

    mockCaptureModel.find
      .mockReturnValueOnce(asQuery(reviewed))
      .mockReturnValueOnce(asQuery([]));
    mockReportModel.create.mockImplementation(async (data: unknown) => data);

    const report = await cameraTrapService.generateSessionReport();

    expect(report.speciesSightings).toBe(1);
    expect(report.poacherAlerts).toBe(2);
    expect(report.falseTriggers).toBe(1);
    expect(report.secondReviews).toBe(0);
  });

  it("includes capture locations from both reviewed and awaiting-review captures", async () => {
    const reviewed = [buildCapture({ status: "reviewed", classification: "False Trigger" })];
    const awaiting = [
      buildCapture({ status: "needs_second_review", classification: "Needs Second Review" }),
    ];

    mockCaptureModel.find
      .mockReturnValueOnce(asQuery(reviewed))
      .mockReturnValueOnce(asQuery(awaiting));
    mockReportModel.create.mockImplementation(async (data: unknown) => data);

    const report = await cameraTrapService.generateSessionReport();

    expect(report.captureLocations).toHaveLength(2);
  });

  it("omits zero-count entries from the classification breakdown", async () => {
    const reviewed = [buildCapture({ status: "reviewed", classification: "False Trigger" })];

    mockCaptureModel.find
      .mockReturnValueOnce(asQuery(reviewed))
      .mockReturnValueOnce(asQuery([]));
    mockReportModel.create.mockImplementation(async (data: unknown) => data);

    const report = await cameraTrapService.generateSessionReport();

    expect(report.classificationBreakdown).toEqual([
      { classification: "False Trigger", count: 1 },
    ]);
  });

  it("returns a report with zero total when nothing has been reviewed", async () => {
    mockCaptureModel.find.mockReturnValueOnce(asQuery([])).mockReturnValueOnce(asQuery([]));
    mockReportModel.create.mockImplementation(async (data: unknown) => data);

    const report = await cameraTrapService.generateSessionReport();

    expect(report.totalReviewed).toBe(0);
    expect(report.classificationBreakdown).toEqual([]);
  });
});