export type IncidentType =
  | "Snare"
  | "Animal Carcass"
  | "Illegal Campsite"
  | "At-Risk Species Footprint";

export type LocationSource = "GPS" | "Manual";

export type SyncStatus = "Synced" | "Pending";

export type ReviewStatus = "Open" | "Reviewed" | "Resolved";

export interface Location {
  latitude: number;
  longitude: number;
  source: LocationSource;
}

export interface Incident {
  _id: string;
  incidentType: IncidentType;
  description: string;
  photoUrl?: string;
  location: Location;
  patrolId: string;
  syncStatus: SyncStatus;
  reviewStatus: ReviewStatus;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalIncident {
  localId: string;
  incidentType: IncidentType;
  description: string;
  photoBlob?: Blob;
  photoName?: string;
  location: Location;
  patrolId: string;
  syncStatus: SyncStatus;
  reportedAt: string;
  createdAt: string;
}

export interface CreateIncidentPayload {
  incidentType: IncidentType;
  description: string;
  photoUrl?: string;
  location: Location;
  patrolId: string;
}
