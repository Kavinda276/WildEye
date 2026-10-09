import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Navbar from "../components/Navbar";
import LandingPage from "../pages/LandingPage";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("Navbar", () => {
  it("renders the brand linking to home", () => {
    const { container } = renderWithRouter(<Navbar />);

    const brand = container.querySelector(".navbar-brand");
    expect(brand).toHaveAttribute("href", "/");
    expect(brand).toHaveTextContent("WildEye");
  });

  it("renders every navigation link", () => {
    renderWithRouter(<Navbar />);

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/",
        "/ranger",
        "/supervisor",
        "/community",
        "/camera-traps",
      ])
    );
  });

  it("labels the links", () => {
    renderWithRouter(<Navbar />);

    ["Home", "Ranger Portal", "Supervisor", "Community", "Camera Traps"].forEach(
      (label) => {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      }
    );
  });

  it("renders a hamburger button that is hidden on desktop", () => {
    renderWithRouter(<Navbar />);

    const button = screen.getByRole("button", { name: /open menu/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("navbar-hamburger");
  });

  it("does not mark the mobile menu as active before it is opened", () => {
    const { container } = renderWithRouter(<Navbar />);

    expect(container.querySelector(".navbar-mobile-menu")).not.toHaveClass("active");
    expect(container.querySelector(".navbar-mobile-overlay")).not.toHaveClass("active");
  });

  it("opens the mobile menu when the hamburger is clicked", () => {
    const { container } = renderWithRouter(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    expect(container.querySelector(".navbar-mobile-menu")).toHaveClass("active");
    expect(container.querySelector(".navbar-mobile-overlay")).toHaveClass("active");
  });

  it("closes the mobile menu from the close button", () => {
    const { container } = renderWithRouter(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /close menu/i }));

    expect(container.querySelector(".navbar-mobile-menu")).not.toHaveClass("active");
    expect(container.querySelector(".navbar-mobile-overlay")).not.toHaveClass("active");
  });

  it("closes the mobile menu when the overlay is clicked", () => {
    const { container } = renderWithRouter(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const overlay = container.querySelector(".navbar-mobile-overlay")!;
    fireEvent.click(overlay);

    expect(container.querySelector(".navbar-mobile-menu")).not.toHaveClass("active");
  });

  it("closes the mobile menu after following a link", () => {
    const { container } = renderWithRouter(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const mobileLink = screen
      .getAllByText("Supervisor")
      .find((el) => el.classList.contains("navbar-mobile-link"))!;
    fireEvent.click(mobileLink);

    expect(container.querySelector(".navbar-mobile-menu")).not.toHaveClass("active");
  });

  it("duplicates every link inside the mobile menu", () => {
    const { container } = renderWithRouter(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const mobileLinks = container.querySelectorAll(".navbar-mobile-link");
    expect(mobileLinks).toHaveLength(5);
  });
});

describe("LandingPage", () => {
  it("renders the system name and tagline", () => {
    renderWithRouter(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("WildEye");
    expect(
      screen.getByText(/smart wildlife conservation and anti-poaching monitoring system/i)
    ).toBeInTheDocument();
  });

  it("renders a card for each of the four portals", () => {
    renderWithRouter(<LandingPage />);

    ["Ranger Portal", "Supervisor Dashboard", "Community Reporting", "Camera Trap Review"].forEach(
      (title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      }
    );
  });

  it("links each portal to its route", () => {
    renderWithRouter(<LandingPage />);

    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));

    expect(hrefs).toEqual(
      expect.arrayContaining(["/ranger", "/supervisor", "/community", "/camera-traps"])
    );
  });

  it("describes each portal", () => {
    renderWithRouter(<LandingPage />);

    expect(
      screen.getByText(/report and track wildlife incidents/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/monitor ranger activity/i)).toBeInTheDocument();
    expect(screen.getByText(/local communities to report/i)).toBeInTheDocument();
    expect(screen.getByText(/classify species/i)).toBeInTheDocument();
  });

  it("renders exactly four cards", () => {
    const { container } = renderWithRouter(<LandingPage />);

    expect(container.querySelectorAll(".portal-card")).toHaveLength(4);
  });
});