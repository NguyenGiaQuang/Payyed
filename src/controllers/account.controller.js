import { listMyAccounts, openAccount } from '../services/account.service.js';
import { openAccountSchema } from '../validations/account.validation.js';


export const AccountController = {
    async me(req, res, next) {
        try {
            const data = await listMyAccounts(req.user.sub);
            res.json({ accounts: data });
        } catch (e) { next(e); }
    },
    async open(req, res, next) {
        try {
            const payload = await openAccountSchema.validateAsync(req.body);
            const acc = await openAccount(payload);
            res.status(201).json(acc);
        } catch (e) { next(e); }
    }
};