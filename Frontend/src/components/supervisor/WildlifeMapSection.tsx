import { useEffect } from "react";
import { MapContainer, TileLayer, Rectangle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Animal, RiskZone } from "../../types/wildlife";
import TrackedAnimalList from "./TrackedAnimalList";

interface WildlifeMapSectionProps {
  animals: Animal[];
  riskZones: RiskZone[];
  selectedAnimal: Animal | null;
  onSelectAnimal: (animal: Animal) => void;
  onSimulate: (animal: Animal) => void;
  onSignalLost: (animal: Animal) => void;
  simulating: boolean;
  mapCenter: [number, number];
}

const SEVERITY_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

const createAnimalIcon = (species: string, inside: boolean) => {
  const emoji =
    species === "Sri Lankan Leopard"
      ? "\uD83D\uDC06"
      : species === "Asian Elephant"
      ? "\uD83D\uDC18"
      : species === "Sloth Bear"
      ? "\uD83D\uDC3B"
      : "\uD83D\uDC3E";

  return L.divIcon({
    className: "animal-marker",
    html: `<div style="
      font-size:24px;
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      animation: ${inside ? "pulse 1s infinite" : "none"};
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function WildlifeMapSection({
  animals,
  riskZones,
  selectedAnimal,
  onSelectAnimal,
  onSimulate,
  onSignalLost,
  simulating,
  mapCenter,
}: WildlifeMapSectionProps) {
  return (
    <div className="map-section">
      <div className="map-section-header">
        <h2>Wildlife Monitoring Map</h2>
      </div>
      <div className="map-section-body">
        <div className="map-container">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%", borderRadius: "10px" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} />
            {riskZones.map((zone) => (
              <Rectangle
                key={zone._id}
                bounds={[
                  [zone.bounds.south, zone.bounds.west],
                  [zone.bounds.north, zone.bounds.east],
                ]}
                pathOptions={{
                  color: SEVERITY_COLORS[zone.severity] || "#999",
                  fillColor: SEVERITY_COLORS[zone.severity] || "#999",
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>{zone.name}</strong>
                  <br />
                  Severity: {zone.severity}
                  <br />
                  {zone.description}
                </Popup>
              </Rectangle>
            ))}
            {animals.map((animal) => (
              <Marker
                key={animal._id}
                position={[animal.location.latitude, animal.location.longitude]}
                icon={createAnimalIcon(animal.species, animal.isInsideRiskZone)}
                eventHandlers={{
                  click: () => {
                    onSelectAnimal(animal);
                  },
                }}
              >
                <Popup>
                  <strong>{animal.name}</strong> ({animal.species})
                  <br />
                  Collar: {animal.collarId}
                  <br />
                  Status: {animal.collarStatus}
                  <br />
                  Inside Risk Zone: {animal.isInsideRiskZone ? "YES" : "No"}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <TrackedAnimalList
          animals={animals}
          selectedAnimal={selectedAnimal}
          onSelect={onSelectAnimal}
          onSimulate={onSimulate}
          onSignalLost={onSignalLost}
          simulating={simulating}
        />
      </div>
    </div>
  );
}

export default WildlifeMapSection;
