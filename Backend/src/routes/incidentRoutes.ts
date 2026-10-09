import { Router } from "express";
import * as incidentController from "../controllers/incidentController";
import upload from "../middleware/upload";

const router = Router();

router.post("/", upload.single("photo"), incidentController.createIncident);
router.get("/", incidentController.getAllIncidents);
router.get("/:id", incidentController.getIncidentById);
router.patch("/:id/sync", incidentController.updateSyncStatus);
router.patch("/:id/review", incidentController.updateReviewStatus);

export default router;
