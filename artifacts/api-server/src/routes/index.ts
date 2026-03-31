import { Router, type IRouter } from "express";
import companyProfileRouter from "./company-profile.js";
import healthRouter from "./health.js";
import meRouter from "./me.js";
import proposalsRouter from "./proposals.js";
import templatesRouter from "./templates.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/me", meRouter);
router.use("/company-profile", companyProfileRouter);
router.use("/proposals", proposalsRouter);
router.use("/templates", templatesRouter);

export default router;
