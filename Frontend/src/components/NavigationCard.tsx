import { Link } from "react-router-dom";

interface NavigationCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
}

function NavigationCard({ icon, title, description, href }: NavigationCardProps) {
  return (
    <Link to={href} className="portal-card">
      <div className="portal-card-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}

export default NavigationCard;
