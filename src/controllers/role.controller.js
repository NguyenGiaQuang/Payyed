import { Role } from '../models/index.js';

export const RoleController = {
    async list(req, res, next) {
        try {
            const roles = await Role.findAll({ attributes: ['id', 'code', 'name'] });
            res.json(roles);
        } catch (e) { next(e); }
    }
};
