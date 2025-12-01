// src/controllers/kyc.controller.js
import { listPendingKyc, approveKyc, getMyKyc } from '../services/kyc.service.js';
import { approveKycSchema } from '../validations/customer.validation.js';

export const KycController = {
    // Staff: danh sách hồ sơ KYC PENDING
    async pending(req, res, next) {
        try {
            const customers = await listPendingKyc();
            res.json(customers);
        } catch (e) {
            next(e);
        }
    },

    // Staff: duyệt / từ chối KYC
    async approve(req, res, next) {
        try {
            const { customer_id, status } = await approveKycSchema.validateAsync(req.body);
            const customer = await approveKyc(customer_id, status);
            res.json(customer);
        } catch (e) {
            next(e);
        }
    },

    // Customer: xem hồ sơ KYC của chính mình
    async me(req, res, next) {
        try {
            const customer = await getMyKyc(req.user.sub);
            res.json(customer);
        } catch (e) {
            next(e);
        }
    },
};
