import createError from 'http-errors';
import { User, Role, UserRole } from '../models/index.js';
import { assignRoleSchema } from '../validations/user.validation.js';

export const UserController = {
    async assignRole(req, res, next) {
        try {
            const { user_id, role_code, role_id } = await assignRoleSchema.validateAsync(req.body);

            const user = await User.findByPk(user_id);
            if (!user) throw createError(404, 'User not found');

            let role;
            if (role_id) {
                role = await Role.findByPk(role_id);
            } else if (role_code) {
                role = await Role.findOne({ where: { code: role_code } });
            }
            if (!role) throw createError(404, 'Role not found');

            const existed = await UserRole.findOne({
                where: { user_id, role_id: role.id },
            });

            if (existed) {
                return res.status(200).json({
                    ok: true,
                    message: 'Role already assigned',
                });
            }

            await UserRole.create({ user_id, role_id: role.id });

            return res.status(201).json({ ok: true });
        } catch (e) {
            next(e);
        }
    },
};
