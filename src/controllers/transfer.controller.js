import { internalTransfer } from '../services/transfer.service.js';
import { transferSchema } from '../validations/transfer.validation.js';

export const TransferController = {
    async createInternal(req, res, next) {
        try {
            const payload = await transferSchema.validateAsync(req.body);
            const out = await internalTransfer({ ...payload, userId: req.user.sub });
            res.status(201).json(out);
        } catch (e) { next(e); }
    }
};