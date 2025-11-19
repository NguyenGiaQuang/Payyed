import {
    getLedgerBalance,
    checkLedgerBalanced,
} from '../services/ledger.service.js';

import {
    ledgerBalanceQuerySchema,
    ledgerCheckQuerySchema,
} from '../validations/journal.validation.js';

export const LedgerController = {
    // 26) GET /api/ledger/balance – tổng hợp số dư
    async balance(req, res, next) {
        try {
            const filters = await ledgerBalanceQuerySchema.validateAsync(req.query);
            const rows = await getLedgerBalance(filters);
            res.json(rows);
        } catch (e) {
            next(e);
        }
    },

    // 27) GET /api/ledger/check – kiểm tra cân bằng Nợ/Có
    async check(req, res, next) {
        try {
            const filters = await ledgerCheckQuerySchema.validateAsync(req.query);
            const result = await checkLedgerBalanced(filters);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
};
