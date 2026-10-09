import { Router } from "express";
import * as communityReportController from "../controllers/communityReportController";

const router = Router();

router.post("/", communityReportController.createReport);
router.get("/", communityReportController.getAllReports);
router.get("/responders", communityReportController.getResponders);
router.patch("/responders/availability", communityReportController.setResponderAvailability);
router.get("/:id", communityReportController.getReportById);
router.patch("/:id/responder", communityReportController.updateReportResponder);

export default router;
