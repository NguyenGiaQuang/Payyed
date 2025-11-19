import {
    listMyAccounts,
    getAccountDetail,
    openAccount,
    updateAccountStatus,
    getAccountStatement,
} from '../services/account.service.js';

import {
    openAccountSchema,
    accountDetailBodySchema,
    updateAccountStatusBodySchema,
    statementBodySchema,
} from '../validations/account.validation.js';

export const AccountController = {
    async listCurrent(req, res, next) {
        try {
            const data = await listMyAccounts(req.user.sub);
            res.json({ accounts: data });
        } catch (e) {
            next(e);
        }
    },

    async detailByBody(req, res, next) {
        try {
            const { account_id } = await accountDetailBodySchema.validateAsync(req.body);
            const acc = await getAccountDetail(account_id, req.user.sub);
            res.json(acc);
        } catch (e) {
            next(e);
        }
    },

    async create(req, res, next) {
        try {
            const payload = await openAccountSchema.validateAsync(req.body);
            const acc = await openAccount(payload);
            res.status(201).json(acc);
        } catch (e) {
            next(e);
        }
    },

    async updateStatusByBody(req, res, next) {
        try {
            const { account_id, status } = await updateAccountStatusBodySchema.validateAsync(req.body);
            const acc = await updateAccountStatus(account_id, status);
            res.json(acc);
        } catch (e) {
            next(e);
        }
    },

    async statementByBody(req, res, next) {
        try {
            const { account_id, from, to } = await statementBodySchema.validateAsync(req.body);
            const result = await getAccountStatement(account_id, { from, to }, req.user.sub);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },

    async me(req, res, next) {
        return AccountController.listCurrent(req, res, next);
    },

    async open(req, res, next) {
        return AccountController.create(req, res, next);
    },
};
