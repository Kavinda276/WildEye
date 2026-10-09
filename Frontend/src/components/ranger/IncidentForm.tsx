import { useState, useRef } from "react";
import type { IncidentType, CreateIncidentPayload } from "../../types/incident";

type LocationMode = "GPS" | "Manual";

interface IncidentFormProps {
  onSubmit: (payload: CreateIncidentPayload, photo: File | null) => Promise<void>;
  isSubmitting: boolean;
  disabled: boolean;
}

function IncidentForm({ onSubmit, isSubmitting, disabled }: IncidentFormProps) {
  const [incidentType, setIncidentType] = useState<IncidentType | "">("");
  const [description, setDescription] = useState("");
  const [locationMode, setLocationMode] = useState<LocationMode>("Manual");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gpsError, setGpsError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [patrolId, setPatrolId] = useState("PATROL-001");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!incidentType) {
      errors.incidentType = "Please select an incident type";
    }

    if (!description.trim()) {
      errors.description = "Description is required";
    }

    if (!latitude || !longitude) {
      errors.location = "Location coordinates are required";
    } else {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.location = "Invalid latitude (must be -90 to 90)";
      } else if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.location = "Invalid longitude (must be -180 to 180)";
      }
    }

    if (!patrolId.trim()) {
      errors.patrolId = "Patrol ID is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("Geolocation is not supported by your browser. Enter coordinates manually.");
      return;
    }

    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "denied") {
          setGpsStatus("error");
          setGpsError("Location permission is blocked. Click the lock icon in the address bar, set Location to Allow, then reload the page.");
          return;
        }
        requestGPS();
      }).catch(() => {
        requestGPS();
      });
    } else {
      requestGPS();
    }
  };

  const requestGPS = () => {
    setGpsStatus("loading");
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationMode("GPS");
        setGpsStatus("success");
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.location;
          return next;
        });
      },
      (error) => {
        setGpsStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError("Location access denied. Click the lock icon in the address bar → Location → Allow, then try again.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError("GPS position unavailable. Enter coordinates manually.");
            break;
          case error.TIMEOUT:
            setGpsError("GPS request timed out. Try again or enter coordinates manually.");
            break;
          default:
            setGpsError("Unable to get location. Enter coordinates manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFieldErrors((prev) => ({ ...prev, photo: "Photo must be under 5MB" }));
        return;
      }
      setPhotoFile(file);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.photo;
        return next;
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload: CreateIncidentPayload = {
      incidentType: incidentType as IncidentType,
      description: description.trim(),
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        source: locationMode,
      },
      patrolId: patrolId.trim(),
    };

    await onSubmit(payload, photoFile);

    setIncidentType("");
    setDescription("");
    setLatitude("");
    setLongitude("");
    setLocationMode("Manual");
    setGpsStatus("idle");
    setGpsError("");
    removePhoto();
    setPatrolId("PATROL-001");
    setFieldErrors({});
  };

  return (
    <form className="ranger-form" onSubmit={handleSubmit}>
      {/* Incident Type */}
      <div className="ranger-field">
        <label htmlFor="incidentType">Incident Type *</label>
        <select
          id="incidentType"
          value={incidentType}
          onChange={(e) => {
            setIncidentType(e.target.value as IncidentType);
            clearFieldError("incidentType");
          }}
          disabled={disabled}
        >
          <option value="">Select incident type</option>
          <option value="Snare">Snare</option>
          <option value="Animal Carcass">Animal Carcass</option>
          <option value="Illegal Campsite">Illegal Campsite</option>
          <option value="At-Risk Species Footprint">At-Risk Species Footprint</option>
        </select>
        {fieldErrors.incidentType && (
          <span className="ranger-field-error">{fieldErrors.incidentType}</span>
        )}
      </div>

      {/* Location */}
      <div className="ranger-field">
        <label>Location *</label>
        <div className="ranger-location-toggle">
          <button
            type="button"
            className={`ranger-loc-btn ${locationMode === "GPS" ? "active" : ""}`}
            onClick={() => {
              setLocationMode("GPS");
              captureGPS();
            }}
            disabled={disabled}
          >
            {gpsStatus === "loading" ? "Locating..." : "Use Current GPS"}
          </button>
          <button
            type="button"
            className={`ranger-loc-btn ${locationMode === "Manual" ? "active" : ""}`}
            onClick={() => {
              setLocationMode("Manual");
              setGpsStatus("idle");
              setGpsError("");
            }}
            disabled={disabled}
          >
            Enter Manually
          </button>
        </div>

        {gpsStatus === "success" && (
          <span className="ranger-gps-status">GPS location captured</span>
        )}

        {gpsStatus === "error" && (
          <span className="ranger-gps-error">{gpsError}</span>
        )}

        {locationMode === "Manual" && (
          <div className="ranger-coords">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => {
                setLatitude(e.target.value);
                clearFieldError("location");
              }}
              disabled={disabled}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                clearFieldError("location");
              }}
              disabled={disabled}
            />
          </div>
        )}

        {locationMode === "GPS" && latitude && longitude && (
          <div className="ranger-coords ranger-coords-readonly">
            <span>Lat: {latitude}</span>
            <span>Lng: {longitude}</span>
          </div>
        )}

        {fieldErrors.location && (
          <span className="ranger-field-error">{fieldErrors.location}</span>
        )}
      </div>

      {/* Description */}
      <div className="ranger-field">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          rows={4}
          placeholder="Describe what you observed..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            clearFieldError("description");
          }}
          disabled={disabled}
        />
        {fieldErrors.description && (
          <span className="ranger-field-error">{fieldErrors.description}</span>
        )}
      </div>

      {/* Photo */}
      <div className="ranger-field">
        <label>Supporting Photo (optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          capture="environment"
          onChange={handlePhotoChange}
          disabled={disabled}
          style={{ display: "none" }}
        />
        {!photoFile ? (
          <button
            type="button"
            className="ranger-photo-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Choose Photo
          </button>
        ) : (
          <div className="ranger-photo-preview">
            {photoPreview && <img src={photoPreview} alt="Preview" />}
            <div className="ranger-photo-info">
              <span>{photoFile.name}</span>
              <button
                type="button"
                className="ranger-photo-remove"
                onClick={removePhoto}
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          </div>
        )}
        {fieldErrors.photo && (
          <span className="ranger-field-error">{fieldErrors.photo}</span>
        )}
      </div>

      {/* Patrol ID */}
      <div className="ranger-field">
        <label htmlFor="patrolId">Patrol ID *</label>
        <input
          id="patrolId"
          type="text"
          value={patrolId}
          onChange={(e) => {
            setPatrolId(e.target.value);
            clearFieldError("patrolId");
          }}
          disabled={disabled}
        />
        {fieldErrors.patrolId && (
          <span className="ranger-field-error">{fieldErrors.patrolId}</span>
        )}
      </div>

      {/* Submit */}
      <button type="submit" className="ranger-submit" disabled={disabled}>
        {isSubmitting ? "Logging..." : "Log Incident"}
      </button>
    </form>
  );
}

export default IncidentForm;
