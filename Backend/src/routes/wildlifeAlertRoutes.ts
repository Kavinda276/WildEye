import { Router } from "express";
import * as wildlifeAlertController from "../controllers/wildlifeAlertController";

const router = Router();

router.get("/", wildlifeAlertController.getAllAlerts);
router.post("/", wildlifeAlertController.createAlert);
router.patch("/:id/dispatch", wildlifeAlertController.dispatchAlert);
router.patch("/:id/status", wildlifeAlertController.updateAlertStatus);
router.delete("/:id", wildlifeAlertController.deleteAlert);

export default router;
