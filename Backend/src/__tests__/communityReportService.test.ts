import CommunityReport from "../../src/models/CommunityReport";
import * as communityReportService from "../../src/services/communityReportService";

jest.mock("../../src/models/CommunityReport", () => {
  const MockCommunityReport = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  };
  const constructorMock = jest.fn();
  Object.assign(constructorMock, MockCommunityReport);
  return { __esModule: true, default: constructorMock, ...MockCommunityReport };
});

const MockReport = jest.mocked(CommunityReport);

const asQuery = <T,>(value: T) =>
  ({
    sort: jest.fn().mockResolvedValue(value),
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  }) as never;

const validPayload = {
  reportType: "Elephant Sighting" as const,
  description: "Elephants near the paddy field",
  location: { latitude: 6.855, longitude: 80.91, source: "Manual" as const },
};

const resetAllResponders = () => {
  communityReportService.getResponders().forEach((r) => {
    communityReportService.setResponderAvailability(r.name, true);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetAllResponders();
});

afterAll(() => {
  resetAllResponders();
});

describe("communityReportService - responder availability", () => {
  it("returns the full responder roster", () => {
    const responders = communityReportService.getResponders();

    expect(responders).toHaveLength(6);
    expect(responders.every((r) => typeof r.name === "string")).toBe(true);
    expect(responders.some((r) => r.role === "Ranger")).toBe(true);
    expect(responders.some((r) => r.role === "Community Liaison Officer")).toBe(true);
  });

  it("returns copies so callers cannot mutate the roster", () => {
    const first = communityReportService.getResponders();
    first[0].available = false;

    const second = communityReportService.getResponders();

    expect(second.find((r) => r.name === first[0].name)?.available).toBe(true);
  });

  it("marks a responder unavailable", () => {
    expect(
      communityReportService.setResponderAvailability("Sgt. Fernando", false)
    ).toBe(true);

    const updated = communityReportService
      .getResponders()
      .find((r) => r.name === "Sgt. Fernando");

    expect(updated?.available).toBe(false);
  });

  it("marks a responder available again", () => {
    communityReportService.setResponderAvailability("Sgt. Fernando", false);
    communityReportService.setResponderAvailability("Sgt. Fernando", true);

    const updated = communityReportService
      .getResponders()
      .find((r) => r.name === "Sgt. Fernando");

    expect(updated?.available).toBe(true);
  });

  it("returns false for an unknown responder", () => {
    expect(
      communityReportService.setResponderAvailability("Nobody", false)
    ).toBe(false);
  });
});

describe("communityReportService - createReport", () => {
  it("auto-assigns an available responder", async () => {
    MockReport.create.mockResolvedValue({ _id: "report1" } as never);

    await communityReportService.createReport(validPayload);

    expect(MockReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Assigned",
        assignedResponderRole: expect.stringMatching(/Ranger|Liaison/),
      })
    );

    const created = MockReport.create.mock.calls[0][0] as {
      assignedResponder: string;
      assignedResponderRole: string;
    };
    expect(created.assignedResponder).not.toBe("");
    expect(["Ranger", "Community Liaison Officer"]).toContain(
      created.assignedResponderRole
    );
  });

  it("only assigns responders who are currently available", async () => {
    communityReportService.getResponders().forEach((r) => {
      communityReportService.setResponderAvailability(r.name, false);
    });
    communityReportService.setResponderAvailability("Ms. Ratnayake", true);

    MockReport.create.mockResolvedValue({ _id: "report1" } as never);

    await communityReportService.createReport(validPayload);

    const created = MockReport.create.mock.calls[0][0] as {
      assignedResponder: string;
      assignedResponderRole: string;
    };
    expect(created.assignedResponder).toBe("Ms. Ratnayake");
    expect(created.assignedResponderRole).toBe("Community Liaison Officer");
  });

  it("falls back to Pending Assignment when nobody is available", async () => {
    communityReportService.getResponders().forEach((r) => {
      communityReportService.setResponderAvailability(r.name, false);
    });

    MockReport.create.mockResolvedValue({ _id: "report1" } as never);

    const report = await communityReportService.createReport(validPayload);

    expect(MockReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Pending Assignment",
        assignedResponder: "",
        assignedResponderRole: "",
      })
    );
    expect(report._id).toBe("report1");
  });

  it("defaults a missing description to an empty string", async () => {
    MockReport.create.mockResolvedValue({ _id: "report1" } as never);

    await communityReportService.createReport({
      reportType: "Crop-Raiding Incident",
      location: { latitude: 6.8, longitude: 80.8, source: "GPS" },
    });

    expect(MockReport.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: "" })
    );
  });

  it("stamps reportedAt on creation", async () => {
    MockReport.create.mockResolvedValue({ _id: "report1" } as never);

    await communityReportService.createReport(validPayload);

    expect(MockReport.create).toHaveBeenCalledWith(
      expect.objectContaining({ reportedAt: expect.any(Date) })
    );
  });
});

describe("communityReportService - queries", () => {
  it("returns all reports newest first", async () => {
    const sort = jest.fn().mockResolvedValue([{ _id: "report1" }]);
    MockReport.find.mockReturnValue({ sort } as never);

    const result = await communityReportService.getAllReports();

    expect(MockReport.find).toHaveBeenCalled();
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toHaveLength(1);
  });

  it("returns an empty list when there are no reports", async () => {
    MockReport.find.mockReturnValue(asQuery([]));

    await expect(communityReportService.getAllReports()).resolves.toEqual([]);
  });

  it("returns a report by id", async () => {
    MockReport.findById.mockResolvedValue({ _id: "report1" } as never);

    const result = await communityReportService.getReportById("report1");

    expect(MockReport.findById).toHaveBeenCalledWith("report1");
    expect(result?._id).toBe("report1");
  });

  it("returns null when the report does not exist", async () => {
    MockReport.findById.mockResolvedValue(null);

    await expect(communityReportService.getReportById("missing")).resolves.toBeNull();
  });
});

describe("communityReportService - updateReportResponder", () => {
  it("assigns the responder and sets status to Assigned", async () => {
    MockReport.findByIdAndUpdate.mockResolvedValue({ _id: "report1" } as never);

    await communityReportService.updateReportResponder(
      "report1",
      "Mr. Bandara",
      "Community Liaison Officer"
    );

    expect(MockReport.findByIdAndUpdate).toHaveBeenCalledWith(
      "report1",
      {
        assignedResponder: "Mr. Bandara",
        assignedResponderRole: "Community Liaison Officer",
        status: "Assigned",
      },
      { new: true }
    );
  });

  it("returns null when the report does not exist", async () => {
    MockReport.findByIdAndUpdate.mockResolvedValue(null);

    await expect(
      communityReportService.updateReportResponder("missing", "Mr. Bandara", "Ranger")
    ).resolves.toBeNull();
  });
});