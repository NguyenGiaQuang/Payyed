import { Router } from 'express';
import { OtpController } from '../controllers/otp.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// 31) Gửi yêu cầu OTP – Customer
r.post(
  '/request',
  auth(true),
  requireRole(['CUSTOMER']),
  OtpController.request,
);
// 32) Xác thực OTP – Customer
r.post(
  '/verify',
  auth(true),
  requireRole(['CUSTOMER']),
  OtpController.verify,
);

export default r;
