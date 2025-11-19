import { listPendingKyc, approveKyc } from '../services/kyc.service.js';
import { approveKycSchema } from '../validations/customer.validation.js';

export const KycController = {
    // 11) GET /api/kyc/pending (Staff)
    async pending(req, res, next) {
        try {
            const customers = await listPendingKyc();
            res.json(customers);
        } catch (e) {
            next(e);
        }
    },

    // 🔹 12) PATCH /api/kyc/approve (Staff)
    // Body: { "customer_id": "<uuid>", "status": "APPROVED" | "REJECTED" }
    async approve(req, res, next) {
        try {
            const { customer_id, status } = await approveKycSchema.validateAsync(req.body);
            const customer = await approveKyc(customer_id, status);
            res.json(customer);
        } catch (e) {
            next(e);
        }
    },
};
