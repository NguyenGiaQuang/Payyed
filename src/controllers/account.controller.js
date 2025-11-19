// src/controllers/account.controller.js
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
    // 13) GET /api/accounts – danh sách tài khoản của user hiện tại (Customer)
    async listCurrent(req, res, next) {
        try {
            const data = await listMyAccounts(req.user.sub);
            res.json({ accounts: data });
        } catch (e) {
            next(e);
        }
    },

    // GET /api/accounts/detail – xem chi tiết tài khoản, account_id trong body
    async detailByBody(req, res, next) {
        try {
            const { account_id } = await accountDetailBodySchema.validateAsync(req.body);
            const acc = await getAccountDetail(account_id, req.user.sub);
            res.json(acc);
        } catch (e) {
            next(e);
        }
    },

    // 15) POST /api/accounts – Staff / Admin tạo tài khoản mới cho khách hàng
    async create(req, res, next) {
        try {
            const payload = await openAccountSchema.validateAsync(req.body);
            const acc = await openAccount(payload);
            res.status(201).json(acc);
        } catch (e) {
            next(e);
        }
    },

    // PATCH /api/accounts/status – Admin cập nhật trạng thái tài khoản (body: account_id + status)
    async updateStatusByBody(req, res, next) {
        try {
            const { account_id, status } = await updateAccountStatusBodySchema.validateAsync(req.body);
            const acc = await updateAccountStatus(account_id, status);
            res.json(acc);
        } catch (e) {
            next(e);
        }
    },

    // POST /api/accounts/statement – sao kê tài khoản (account_id, from, to trong body)
    async statementByBody(req, res, next) {
        try {
            const { account_id, from, to } = await statementBodySchema.validateAsync(req.body);
            const result = await getAccountStatement(account_id, { from, to }, req.user.sub);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },

    // alias cũ nếu bạn vẫn muốn dùng /api/accounts/me, /api/accounts/open
    async me(req, res, next) {
        return AccountController.listCurrent(req, res, next);
    },

    async open(req, res, next) {
        return AccountController.create(req, res, next);
    },
};
