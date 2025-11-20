import { Router } from "express";
import { BeneficiaryController } from "../controllers/beneficiary.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const r = Router();

// 28) GET /api/beneficiaries
r.get("/", auth(true), requireRole(["CUSTOMER"]), BeneficiaryController.list);

// 29) POST /api/beneficiaries
r.post("/", auth(true), requireRole(["CUSTOMER"]), BeneficiaryController.create);

// 30) DELETE /api/beneficiaries
r.delete("/", auth(true), requireRole(["CUSTOMER"]), BeneficiaryController.remove);

export default r;
