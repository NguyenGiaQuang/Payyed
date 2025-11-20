import { requestOtp, verifyOtp } from '../services/otp.service.js';
import { otpRequestSchema, otpVerifySchema } from '../validations/otp.validation.js';
import { writeAuditLog } from '../services/audit.service.js';

export const OtpController = {
    // 31) POST /api/otp/request
    async request(req, res, next) {
        try {
            const payload = await otpRequestSchema.validateAsync(req.body);
            const data = await requestOtp(req.user.sub, payload);

            // Ghi audit
            await writeAuditLog({
                user_id: req.user.sub,
                action: 'OTP_REQUEST',
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                metadata: { channel: payload.channel, purpose: payload.purpose },
            });

            res.status(201).json(data);
        } catch (e) {
            next(e);
        }
    },

    // 32) POST /api/otp/verify
    async verify(req, res, next) {
        try {
            const payload = await otpVerifySchema.validateAsync(req.body);
            const data = await verifyOtp(req.user.sub, payload);

            // Ghi audit
            await writeAuditLog({
                user_id: req.user.sub,
                action: 'OTP_VERIFY',
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                metadata: { request_id: payload.request_id, result: data.ok },
            });

            res.json(data);
        } catch (e) {
            next(e);
        }
    },
};
