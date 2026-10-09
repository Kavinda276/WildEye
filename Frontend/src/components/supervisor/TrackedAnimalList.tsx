import type { Animal } from "../../types/wildlife";

interface TrackedAnimalListProps {
  animals: Animal[];
  selectedAnimal: Animal | null;
  onSelect: (animal: Animal) => void;
  onSimulate: (animal: Animal) => void;
  onSignalLost: (animal: Animal) => void;
  simulating: boolean;
}

function TrackedAnimalList({
  animals,
  selectedAnimal,
  onSelect,
  onSimulate,
  onSignalLost,
  simulating,
}: TrackedAnimalListProps) {
  const getState = (a: Animal) => {
    if (a.collarStatus === "Signal Lost") return { label: "Signal Lost", color: "#ef4444" };
    if (a.isInsideRiskZone) return { label: "High Risk", color: "#f59e0b" };
    return { label: "Safe", color: "#22c55e" };
  };

  return (
    <div className="animal-list-panel">
      <div className="animal-list-header">
        <h3>Tracked Animals</h3>
        <span className="animal-list-count">{animals.length}</span>
      </div>
      <div className="animal-list-body">
        {animals.length === 0 && (
          <p className="animal-list-empty">No animals tracked. Load seed data to start.</p>
        )}
        {animals.map((animal) => {
          const state = getState(animal);
          return (
            <div
              key={animal._id}
              className={`animal-card ${selectedAnimal?._id === animal._id ? "selected" : ""} ${animal.isInsideRiskZone ? "in-risk" : ""}`}
              onClick={() => onSelect(animal)}
            >
              <div className="animal-card-top">
                <span className="animal-card-name">{animal.name}</span>
                <span className="animal-state-badge" style={{ backgroundColor: `${state.color}20`, color: state.color }}>
                  {state.label}
                </span>
              </div>
              <div className="animal-card-meta">
                <span>{animal.species}</span>
                <span>{animal.collarId}</span>
              </div>
              <div className="animal-card-coords">
                {animal.location.latitude.toFixed(4)}, {animal.location.longitude.toFixed(4)}
              </div>
              <div className="animal-card-actions">
                <button
                  className="animal-btn-move"
                  disabled={simulating}
                  onClick={(e) => { e.stopPropagation(); onSimulate(animal); }}
                >
                  {simulating ? "Moving..." : "Simulate Move"}
                </button>
                <button
                  className="animal-btn-signal"
                  disabled={simulating}
                  onClick={(e) => { e.stopPropagation(); onSignalLost(animal); }}
                >
                  Signal Lost
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TrackedAnimalList;
