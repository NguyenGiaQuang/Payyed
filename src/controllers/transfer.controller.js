import {
    createInternalTransfer,
    listTransfers,
    getTransferDetail,
    verifyTransferOtp,
    createExternalTransfer,
    calcTransferFee,
} from '../services/transfer.service.js';

import {
    internalTransferSchema,
    transferListQuerySchema,
    transferDetailBodySchema,
    otpVerifySchema,
    externalTransferSchema,
    transferFeeSchema,
} from '../validations/transfer.validation.js';

export const TransferController = {
    async createInternal(req, res, next) {
        try {
            const payload = await internalTransferSchema.validateAsync(req.body);
            const tr = await createInternalTransfer(req.user.sub, payload);
            res.status(201).json(tr);
        } catch (e) {
            next(e);
        }
    },

    async list(req, res, next) {
        try {
            const filters = await transferListQuerySchema.validateAsync(req.query);
            const list = await listTransfers(req.user.sub, filters);
            res.json(list);
        } catch (e) {
            next(e);
        }
    },

    async detailByBody(req, res, next) {
        try {
            const { transfer_id } = await transferDetailBodySchema.validateAsync(req.body);
            const tr = await getTransferDetail(transfer_id, req.user.sub);
            res.json(tr);
        } catch (e) {
            next(e);
        }
    },

    async verifyOtp(req, res, next) {
        try {
            const { otp_code } = await otpVerifySchema.validateAsync(req.body);
            const result = await verifyTransferOtp(req.user.sub, otp_code);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },

    async createExternal(req, res, next) {
        try {
            const payload = await externalTransferSchema.validateAsync(req.body);
            const tr = await createExternalTransfer(req.user.sub, payload);
            res.status(201).json(tr);
        } catch (e) {
            next(e);
        }
    },

    async calcFee(req, res, next) {
        try {
            const { type, amount } = await transferFeeSchema.validateAsync(req.body);
            const result = calcTransferFee(type, amount);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },

    async createInternalAlias(req, res, next) {
        return TransferController.createInternal(req, res, next);
    },
};
