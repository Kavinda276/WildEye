export interface Animal {
  _id: string;
  name: string;
  species: string;
  collarId: string;
  collarStatus: "Active" | "Signal Lost" | "Inactive";
  location: {
    latitude: number;
    longitude: number;
  };
  lastSignal: string;
  isInsideRiskZone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RiskZone {
  _id: string;
  name: string;
  description: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  severity: "High" | "Medium" | "Low";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WildlifeAlert {
  _id: string;
  animal: {
    name: string;
    species: string;
    collarId: string;
  };
  riskZone: {
    name: string;
    severity: string;
  };
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  responder: string;
  responderRole: "Ranger" | "Community Liaison Officer";
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Pending" | "Dispatched" | "Pending Delivery" | "Signal Lost" | "Resolved";
  createdAt: string;
  updatedAt: string;
}

export interface Responder {
  name: string;
  role: "Ranger" | "Community Liaison Officer";
}
