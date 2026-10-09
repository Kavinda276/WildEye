import NavigationCard from "../components/NavigationCard";

const portals = [
  {
    icon: "🛡️",
    title: "Ranger Portal",
    description:
      "Report and track wildlife incidents, poaching activity, and patrol logs in real time.",
    href: "/ranger",
  },
  {
    icon: "📊",
    title: "Supervisor Dashboard",
    description:
      "Monitor ranger activity, review alerts, and manage incident workflows across the park.",
    href: "/supervisor",
  },
  {
    icon: "👥",
    title: "Community Reporting",
    description:
      "Enable local communities to report wildlife sightings, injured animals, and suspicious activity.",
    href: "/community",
  },
  {
    icon: "📷",
    title: "Camera Trap Review",
    description:
      "Review camera trap captures, classify species, and detect anomalies from automated alerts.",
    href: "/camera-traps",
  },
];

function LandingPage() {
  return (
    <section className="landing">
      <header className="landing-header">
        <h1>WildEye</h1>
        <p>
          Smart Wildlife Conservation and Anti-Poaching Monitoring System.
          Choose a portal to get started.
        </p>
      </header>
      <div className="portal-grid">
        {portals.map((portal) => (
          <NavigationCard key={portal.href} {...portal} />
        ))}
      </div>
    </section>
  );
}

export default LandingPage;
