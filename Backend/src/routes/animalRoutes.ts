import { Router } from "express";
import * as animalController from "../controllers/animalController";

const router = Router();

router.get("/", animalController.getAllAnimals);
router.get("/:id", animalController.getAnimalById);
router.post("/:id/simulate", animalController.simulateMovement);
router.patch("/:id/collar-status", animalController.setCollarStatus);
router.post("/seed", animalController.seedAnimals);

export default router;
