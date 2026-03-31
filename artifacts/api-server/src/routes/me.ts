import { Router, type IRouter } from "express";
import { MeResponse } from "@workspace/api-zod";
import { getMePayload, requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const me = await getMePayload(req.auth!);
    res.json(MeResponse.parse(me));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load authenticated profile");
    res.status(500).json({ error: "Failed to load authenticated profile." });
  }
});

export default router;
