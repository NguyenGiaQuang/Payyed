import {
    listMyBeneficiaries,
    createBeneficiary,
    deleteMyBeneficiary
} from "../services/beneficiary.service.js";

import {
    createBeneficiarySchema,
    deleteBeneficiarySchema
} from "../validations/beneficiary.validation.js";

export const BeneficiaryController = {

    async list(req, res, next) {
        try {
            const data = await listMyBeneficiaries(req.user.sub);
            res.json(data);
        } catch (err) { next(err); }
    },

    async create(req, res, next) {
        try {
            const payload = await createBeneficiarySchema.validateAsync(req.body);
            const data = await createBeneficiary(req.user.sub, payload);
            res.status(201).json(data);
        } catch (err) { next(err); }
    },

    async remove(req, res, next) {
        try {
            const { beneficiary_id } = await deleteBeneficiarySchema.validateAsync(req.body);
            const data = await deleteMyBeneficiary(req.user.sub, beneficiary_id);
            res.json(data);
        } catch (err) { next(err); }
    },
};
