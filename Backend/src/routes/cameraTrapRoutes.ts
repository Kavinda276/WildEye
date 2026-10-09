import { Router } from "express";
import * as cameraTrapController from "../controllers/cameraTrapController";

const router = Router();

router.post("/seed", cameraTrapController.seedCaptures);
router.get("/pending", cameraTrapController.getPendingCaptures);
router.get("/needs-second-review", cameraTrapController.getNeedsSecondReview);
router.get("/alerts", cameraTrapController.getAlerts);
router.get("/reports", cameraTrapController.getReports);
router.post("/reports/generate", cameraTrapController.generateSessionReport);
router.get("/:id", cameraTrapController.getCaptureById);
router.patch("/:id/classify", cameraTrapController.classifyCapture);

export default router;
