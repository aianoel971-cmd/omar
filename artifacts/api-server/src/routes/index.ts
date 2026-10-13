import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import uploadsRouter from "./uploads";
import windowDoorRouter from "./window-door";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(uploadsRouter);
router.use(windowDoorRouter);

export default router;
