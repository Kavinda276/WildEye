import express from "express";
import cors from "cors";
import path from "path";
import config from "./config";
import routes from "./routes";
import incidentRoutes from "./routes/incidentRoutes";
import animalRoutes from "./routes/animalRoutes";
import riskZoneRoutes from "./routes/riskZoneRoutes";
import wildlifeAlertRoutes from "./routes/wildlifeAlertRoutes";
import communityReportRoutes from "./routes/communityReportRoutes";
import cameraTrapRoutes from "./routes/cameraTrapRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", routes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/risk-zones", riskZoneRoutes);
app.use("/api/wildlife-alerts", wildlifeAlertRoutes);
app.use("/api/community-reports", communityReportRoutes);
app.use("/api/camera-traps", cameraTrapRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
