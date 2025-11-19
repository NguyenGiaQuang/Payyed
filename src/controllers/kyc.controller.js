import { listPendingKyc, approveKyc } from '../services/kyc.service.js';
import { approveKycSchema } from '../validations/customer.validation.js';

export const KycController = {
    async pending(req, res, next) {
        try {
            const customers = await listPendingKyc();
            res.json(customers);
        } catch (e) {
            next(e);
        }
    },

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
