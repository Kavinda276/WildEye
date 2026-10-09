import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import RangerPortal from "./pages/RangerPortal";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import CommunityReporting from "./pages/CommunityReporting";
import CameraTrap from "./pages/CameraTrap";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/ranger" element={<RangerPortal />} />
          <Route path="/supervisor" element={<SupervisorDashboard />} />
          <Route path="/community" element={<CommunityReporting />} />
          <Route path="/camera-traps" element={<CameraTrap />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
