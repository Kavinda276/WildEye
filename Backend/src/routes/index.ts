import { Router, Request, Response } from "express";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "WildEye API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
