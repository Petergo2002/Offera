import { Router, type IRouter } from "express";
import companyProfileRouter from "./company-profile";
import healthRouter from "./health";
import meRouter from "./me";
import proposalsRouter from "./proposals";
import templatesRouter from "./templates";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/me", meRouter);
router.use("/company-profile", companyProfileRouter);
router.use("/proposals", proposalsRouter);
router.use("/templates", templatesRouter);

export default router;
