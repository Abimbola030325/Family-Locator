import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import circlesRouter from "./circles";
import locationsRouter from "./locations";
import notificationsRouter from "./notifications";
import invitesRouter from "./invites";
import sosRouter from "./sos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(circlesRouter);
router.use(locationsRouter);
router.use(notificationsRouter);
router.use(invitesRouter);
router.use(sosRouter);

export default router;
