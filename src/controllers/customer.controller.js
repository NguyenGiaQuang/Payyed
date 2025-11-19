import {
    listCustomers,
    getCustomerDetail,
    updateMyProfile,
    submitKyc,
} from '../services/customer.service.js';

import {
    updateProfileSchema,
    customerDetailSchema,
    submitKycSchema,
} from '../validations/customer.validation.js';

export const CustomerController = {
    // 7) GET /api/customers – Staff/Admin
    async list(req, res, next) {
        try {
            const customers = await listCustomers();
            res.json(customers);
        } catch (e) {
            next(e);
        }
    },

    // 🔹 8) GET /api/customers/detail – Staff/Admin
    // Body: { "customer_id": "<uuid>" }
    async detail(req, res, next) {
        try {
            const { customer_id } = await customerDetailSchema.validateAsync(req.body);
            const customer = await getCustomerDetail(customer_id);
            res.json(customer);
        } catch (e) {
            next(e);
        }
    },

    // 9) POST /api/customers – Customer cập nhật profile của chính mình
    async updateProfile(req, res, next) {
        try {
            const payload = await updateProfileSchema.validateAsync(req.body);
            const customer = await updateMyProfile(req.user.sub, payload);
            res.json(customer);
        } catch (e) {
            next(e);
        }
    },

    // 🔹 10) POST /api/customers/kyc – Customer gửi KYC cho chính mình
    // Body: { "customer_id": "<uuid>", "documents": [...] }
    async submitKyc(req, res, next) {
        try {
            const { customer_id, documents } = await submitKycSchema.validateAsync(req.body);
            const result = await submitKyc(customer_id, req.user.sub, documents);
            res.status(201).json(result);
        } catch (e) {
            next(e);
        }
    },
};
