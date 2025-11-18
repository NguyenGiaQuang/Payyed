import createError from 'http-errors';
import { User, Role, UserRole } from '../models/index.js';

export function requireRole(roles = []) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.sub;
            if (!userId) return next(createError(401, 'Unauthorized'));

            const userRoles = await UserRole.findAll({
                where: { user_id: userId },
                include: [{ model: Role }],
            });

            const codes = userRoles.map(ur => ur.role?.code).filter(Boolean);
            const ok = roles.length === 0 || roles.some(r => codes.includes(r));

            if (!ok) return next(createError(403, 'Forbidden'));

            req.user.roles = codes;
            next();
        } catch (e) { next(e); }
    };
}
