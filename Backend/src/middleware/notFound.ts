import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError("Route not found", 404));
};
