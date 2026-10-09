import CameraCapture, { ICameraCapture } from "../models/CameraCapture";
import CameraTrapAlert from "../models/CameraTrapAlert";
import SessionReport, { ISessionReport } from "../models/SessionReport";

const MOCK_CAPTURES = [
  {
    cameraTrapId: "CT-001",
    imageUrl: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=600",
    capturedAt: new Date("2026-09-20T06:15:00Z"),
    location: { latitude: 6.8732, longitude: 80.8961 },
  },
  {
    cameraTrapId: "CT-002",
    imageUrl: "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=600",
    capturedAt: new Date("2026-09-20T07:30:00Z"),
    location: { latitude: 6.8650, longitude: 80.9020 },
  },
  {
    cameraTrapId: "CT-003",
    imageUrl: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=600",
    capturedAt: new Date("2026-09-20T08:00:00Z"),
    location: { latitude: 6.8800, longitude: 80.8850 },
  },
  {
    cameraTrapId: "CT-004",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600",
    capturedAt: new Date("2026-09-20T09:45:00Z"),
    location: { latitude: 6.8550, longitude: 80.9100 },
  },
  {
    cameraTrapId: "CT-005",
    imageUrl: "https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=600",
    capturedAt: new Date("2026-09-20T10:20:00Z"),
    location: { latitude: 6.8900, longitude: 80.8700 },
  },
];

export const seedCaptures = async (): Promise<void> => {
  await CameraCapture.deleteMany();
  await CameraCapture.insertMany(MOCK_CAPTURES);
};

export const getPendingCaptures = async (): Promise<ICameraCapture[]> => {
  return CameraCapture.find({ status: "unreviewed" }).sort({ capturedAt: 1 });
};

export const getNeedsSecondReview = async (): Promise<ICameraCapture[]> => {
  return CameraCapture.find({ status: "needs_second_review" }).sort({ capturedAt: 1 });
};

export const getCaptureById = async (id: string): Promise<ICameraCapture | null> => {
  return CameraCapture.findById(id);
};

export const classifyCapture = async (
  id: string,
  classification: string,
  species?: string
): Promise<ICameraCapture | null> => {
  const newStatus = classification === "Needs Second Review" ? "needs_second_review" : "reviewed";

  const capture = await CameraCapture.findByIdAndUpdate(
    id,
    {
      status: newStatus,
      classification,
      species: species || "",
    },
    { new: true }
  );

  if (!capture) return null;

  if (classification === "Species Sighting" || classification === "Poacher Alert") {
    const existingAlert = await CameraTrapAlert.findOne({ capture: capture._id });

    if (existingAlert) {
      existingAlert.alertType = classification;
      existingAlert.species = species || "";
      existingAlert.priority = classification === "Poacher Alert" ? "Critical" : "Medium";
      existingAlert.status = "Active";
      await existingAlert.save();
    } else {
      await CameraTrapAlert.create({
        capture: capture._id,
        alertType: classification,
        species: species || "",
        priority: classification === "Poacher Alert" ? "Critical" : "Medium",
        cameraTrapId: capture.cameraTrapId,
        location: capture.location,
        status: "Active",
      });
    }
  }

  return capture;
};

export const getAlerts = async (): Promise<any[]> => {
  return CameraTrapAlert.find().sort({ createdAt: -1 });
};

export const generateSessionReport = async (): Promise<ISessionReport> => {
  const reviewedCaptures = await CameraCapture.find({ status: "reviewed" });
  const secondReviewCaptures = await CameraCapture.find({ status: "needs_second_review" });

  const counts = { "Species Sighting": 0, "Poacher Alert": 0, "False Trigger": 0, "Needs Second Review": 0 };
  const locations: { latitude: number; longitude: number; cameraTrapId: string }[] = [];

  reviewedCaptures.forEach((c) => {
    if (c.classification && counts[c.classification as keyof typeof counts] !== undefined) {
      counts[c.classification as keyof typeof counts]++;
    }
    locations.push({
      latitude: c.location.latitude,
      longitude: c.location.longitude,
      cameraTrapId: c.cameraTrapId,
    });
  });

  secondReviewCaptures.forEach((c) => {
    if (c.classification && counts[c.classification as keyof typeof counts] !== undefined) {
      counts[c.classification as keyof typeof counts]++;
    }
    locations.push({
      latitude: c.location.latitude,
      longitude: c.location.longitude,
      cameraTrapId: c.cameraTrapId,
    });
  });

  const breakdown = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([classification, count]) => ({ classification, count }));

  const report = await SessionReport.create({
    sessionDate: new Date(),
    totalReviewed: reviewedCaptures.length,
    speciesSightings: counts["Species Sighting"],
    poacherAlerts: counts["Poacher Alert"],
    falseTriggers: counts["False Trigger"],
    secondReviews: counts["Needs Second Review"],
    captureLocations: locations,
    classificationBreakdown: breakdown,
  });

  return report;
};

export const getReports = async (): Promise<ISessionReport[]> => {
  return SessionReport.find().sort({ createdAt: -1 });
};
