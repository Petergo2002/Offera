import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proposalsRouter from "./proposals";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/proposals", proposalsRouter);

export default router;
