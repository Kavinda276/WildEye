import RiskZone from "../../src/models/RiskZone";
import * as riskZoneService from "../../src/services/riskZoneService";

jest.mock("../../src/models/RiskZone", () => {
  const MockRiskZone = {
    find: jest.fn(),
    findById: jest.fn(),
  };
  const constructorMock = jest.fn();
  Object.assign(constructorMock, MockRiskZone);
  return { __esModule: true, default: constructorMock, ...MockRiskZone };
});

const MockRiskZone = jest.mocked(RiskZone) as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
};

const mockZone = {
  _id: "zone123",
  name: "Snare Trap Area - West",
  description: "Evidence of wire snare traps found in previous patrols.",
  bounds: { north: 6.87, south: 6.85, east: 80.83, west: 80.80 },
  severity: "High",
  active: true,
  createdAt: new Date("2026-09-24T08:00:00Z"),
  updatedAt: new Date("2026-09-24T08:00:00Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("riskZoneService.getAllRiskZones", () => {
  it("returns only active zones", async () => {
    MockRiskZone.find.mockReturnValue([mockZone] as never);

    const result = await riskZoneService.getAllRiskZones();

    expect(MockRiskZone.find).toHaveBeenCalledWith({ active: true });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Snare Trap Area - West");
  });

  it("returns an empty list when no active zones exist", async () => {
    MockRiskZone.find.mockReturnValue([] as never);

    await expect(riskZoneService.getAllRiskZones()).resolves.toEqual([]);
  });

  it("excludes inactive zones at the query level", async () => {
    MockRiskZone.find.mockReturnValue([] as never);

    await riskZoneService.getAllRiskZones();

    expect(MockRiskZone.find).toHaveBeenCalledWith({ active: true });
  });
});

describe("riskZoneService.getRiskZoneById", () => {
  it("returns the zone when found", async () => {
    MockRiskZone.findById.mockResolvedValue(mockZone as never);

    const result = await riskZoneService.getRiskZoneById("zone123");

    expect(MockRiskZone.findById).toHaveBeenCalledWith("zone123");
    expect(result).toEqual(mockZone);
  });

  it("returns null when the zone does not exist", async () => {
    MockRiskZone.findById.mockResolvedValue(null);

    await expect(riskZoneService.getRiskZoneById("missing")).resolves.toBeNull();
  });

  it("looks up an inactive zone as well", async () => {
    MockRiskZone.findById.mockResolvedValue({ ...mockZone, active: false } as never);

    const result = await riskZoneService.getRiskZoneById("zone123");

    expect(result?.active).toBe(false);
  });
});