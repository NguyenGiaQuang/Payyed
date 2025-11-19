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
    async list(req, res, next) {
        try {
            const customers = await listCustomers();
            res.json(customers);
        } catch (e) {
            next(e);
        }
    },

    async detail(req, res, next) {
        try {
            const { customer_id } = await customerDetailSchema.validateAsync(req.body);
            const customer = await getCustomerDetail(customer_id);
            res.json(customer);
        } catch (e) {
            next(e);
        }
    },

    async updateProfile(req, res, next) {
        try {
            const payload = await updateProfileSchema.validateAsync(req.body);
            const customer = await updateMyProfile(req.user.sub, payload);
            res.json(customer);
        } catch (e) {
            next(e);
        }
    },

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
