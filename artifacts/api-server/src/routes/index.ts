import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import circlesRouter from "./circles";
import locationsRouter from "./locations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(circlesRouter);
router.use(locationsRouter);

export default router;
