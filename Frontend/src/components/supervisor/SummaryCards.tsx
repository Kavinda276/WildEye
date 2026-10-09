interface SummaryCardsProps {
  activeAlerts: number;
  trackedAnimals: number;
  openIncidents: number;
  pendingReports: number;
}

function SummaryCards({ activeAlerts, trackedAnimals, openIncidents, pendingReports }: SummaryCardsProps) {
  const cards = [
    { label: "Active Wildlife Alerts", count: activeAlerts, icon: "\u26A0\uFE0F", color: "#ef4444" },
    { label: "Tracked Animals", count: trackedAnimals, icon: "\uD83D\uDC3E", color: "#22c55e" },
    { label: "Open Incidents", count: openIncidents, icon: "\uD83D\uDEA8", color: "#f59e0b" },
    { label: "Pending Reports", count: pendingReports, icon: "\uD83D\uDC65", color: "#3b82f6" },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card) => (
        <div key={card.label} className="summary-card">
          <div className="summary-card-icon" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
            {card.icon}
          </div>
          <div className="summary-card-info">
            <span className="summary-card-count">{card.count}</span>
            <span className="summary-card-label">{card.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
