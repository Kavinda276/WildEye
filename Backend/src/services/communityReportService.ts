import CommunityReport, { ICommunityReport } from "../models/CommunityReport";

interface Responder {
  name: string;
  role: "Ranger" | "Community Liaison Officer";
  available: boolean;
}

const RESPONDERS: Responder[] = [
  { name: "Rt. Cmdr. Perera", role: "Ranger", available: true },
  { name: "Sgt. Fernando", role: "Ranger", available: true },
  { name: "Cpl. Wickramasinghe", role: "Ranger", available: true },
  { name: "Ms. Jayasinghe", role: "Community Liaison Officer", available: true },
  { name: "Mr. Bandara", role: "Community Liaison Officer", available: true },
  { name: "Ms. Ratnayake", role: "Community Liaison Officer", available: true },
];

export const getResponders = (): Responder[] => {
  return RESPONDERS.map((r) => ({ ...r }));
};

export const setResponderAvailability = (name: string, available: boolean): boolean => {
  const responder = RESPONDERS.find((r) => r.name === name);
  if (!responder) return false;
  responder.available = available;
  return true;
};

export const getAllReports = async (): Promise<ICommunityReport[]> => {
  return CommunityReport.find().sort({ createdAt: -1 });
};

export const getReportById = async (id: string): Promise<ICommunityReport | null> => {
  return CommunityReport.findById(id);
};

export const createReport = async (data: {
  reportType: "Elephant Sighting" | "Crop-Raiding Incident";
  description?: string;
  location: { latitude: number; longitude: number; source: "GPS" | "Manual" };
}): Promise<ICommunityReport> => {
  const available = RESPONDERS.filter((r) => r.available);

  let status: "Assigned" | "Pending Assignment";
  let assignedResponder = "";
  let assignedResponderRole: "Ranger" | "Community Liaison Officer" | "" = "";

  if (available.length > 0) {
    const responder = available[Math.floor(Math.random() * available.length)];
    status = "Assigned";
    assignedResponder = responder.name;
    assignedResponderRole = responder.role;
  } else {
    status = "Pending Assignment";
  }

  const report = await CommunityReport.create({
    ...data,
    description: data.description || "",
    status,
    assignedResponder,
    assignedResponderRole,
    reportedAt: new Date(),
  });

  return report;
};

export const updateReportResponder = async (
  id: string,
  responder: string,
  responderRole: "Ranger" | "Community Liaison Officer"
): Promise<ICommunityReport | null> => {
  return CommunityReport.findByIdAndUpdate(
    id,
    { assignedResponder: responder, assignedResponderRole: responderRole, status: "Assigned" },
    { new: true }
  );
};
