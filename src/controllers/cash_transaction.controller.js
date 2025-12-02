// src/controllers/cash_transaction.controller.js
import {
    requestCashTransaction,
    approveCashTransaction,
    listCashTransactions,
} from '../services/cash_transaction.service.js';

import {
    requestCashTransactionSchema,
    approveCashTransactionSchema,
    cashTransactionListQuerySchema,
} from '../validations/cash_transaction.validation.js';

export const CashTransactionController = {
    // CUSTOMER: gửi request nạp/rút
    async request(req, res, next) {
        try {
            const payload = await requestCashTransactionSchema.validateAsync(
                req.body,
            );
            const row = await requestCashTransaction(req.user.sub, payload);
            res.status(201).json(row);
        } catch (e) {
            next(e);
        }
    },

    // STAFF/ADMIN: duyệt hoặc từ chối
    async approve(req, res, next) {
        try {
            const payload = await approveCashTransactionSchema.validateAsync(
                req.body,
            );
            const row = await approveCashTransaction(req.user.sub, payload);
            res.json(row);
        } catch (e) {
            next(e);
        }
    },

    // List: cả CUSTOMER & STAFF dùng chung
    async list(req, res, next) {
        try {
            const filters = await cashTransactionListQuerySchema.validateAsync(
                req.query,
            );
            const rows = await listCashTransactions(req.user.sub, filters);
            res.json(rows);
        } catch (e) {
            next(e);
        }
    },
};
