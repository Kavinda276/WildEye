import { Router } from "express";
import * as riskZoneController from "../controllers/riskZoneController";

const router = Router();

router.get("/", riskZoneController.getAllRiskZones);
router.get("/:id", riskZoneController.getRiskZoneById);
router.post("/seed", riskZoneController.seedRiskZones);

export default router;
