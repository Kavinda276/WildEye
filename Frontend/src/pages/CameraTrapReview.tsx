import { Link } from "react-router-dom";

function CameraTrapReview() {
  return (
    <section className="placeholder-page">
      <h1>Camera Trap Review</h1>
      <p>
        Review camera trap captures, classify species, and detect anomalies
        from automated alerts.
      </p>
      <Link to="/">Back to Home</Link>
    </section>
  );
}

export default CameraTrapReview;
