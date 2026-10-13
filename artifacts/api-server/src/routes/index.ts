import { Router, type IRouter } from "express";
import healthRouter from "./health";
import windowDoorRouter from "./window-door";

const router: IRouter = Router();

router.use(healthRouter);
router.use(windowDoorRouter);

export default router;
