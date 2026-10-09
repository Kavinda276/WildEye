import { useState } from "react";
import { Link } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/ranger", label: "Ranger Portal" },
  { to: "/supervisor", label: "Supervisor" },
  { to: "/community", label: "Community" },
  { to: "/camera-traps", label: "Camera Traps" },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          Wild<span>Eye</span>
        </Link>
        <ul className="navbar-links">
          {navLinks.map((link) => (
            <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
          ))}
        </ul>
        <button
          className="navbar-hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          &#9776;
        </button>
      </nav>

      <div
        className={`navbar-mobile-overlay ${mobileOpen ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`navbar-mobile-menu ${mobileOpen ? "active" : ""}`}>
        <div className="navbar-mobile-header">
          <span>Wild<span style={{ color: "var(--color-accent)" }}>Eye</span></span>
          <button className="navbar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            &times;
          </button>
        </div>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="navbar-mobile-link"
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </>
  );
}

export default Navbar;
