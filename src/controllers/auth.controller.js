import { register, login, changeEmail, changePassword } from '../services/auth.service.js';
import { registerSchema, loginSchema, changeEmailSchema, changePasswordSchema } from '../validations/auth.validation.js';
import { User, Customer, Role, UserRole } from '../models/index.js';

export const AuthController = {
    async register(req, res, next) {
        try {
            const payload = await registerSchema.validateAsync(req.body);
            const result = await register(payload);
            res.json(result);
        } catch (e) { next(e); }
    },
    async login(req, res, next) {
        try {
            const payload = await loginSchema.validateAsync(req.body);
            const result = await login(payload);
            res.json(result);
        } catch (e) { next(e); }
    },
    async me(req, res, next) {
        try {
            const user = await User.findByPk(req.user.sub, {
                attributes: ['id', 'email', 'is_active', 'created_at']
            });

            const customer = await Customer.findOne({
                where: { user_id: req.user.sub },
                // lấy toàn bộ field customer
            });

            const userRoles = await UserRole.findAll({
                where: { user_id: req.user.sub },
                include: [{ model: Role }]
            });
            const roles = userRoles.map(ur => ur.role?.code).filter(Boolean);

            res.json({ user, customer, roles });
        } catch (e) { next(e); }
    },
    async changeEmail(req, res, next) {
        try {
            const payload = await changeEmailSchema.validateAsync(req.body);
            const data = await changeEmail(req.user.sub, payload);
            res.json(data);
        } catch (e) { next(e); }
    },

    // 2) Đổi mật khẩu
    async changePassword(req, res, next) {
        try {
            const payload = await changePasswordSchema.validateAsync(req.body);
            const data = await changePassword(req.user.sub, payload);
            res.json(data);
        } catch (e) { next(e); }
    },
    
    async logout(req, res, next) {
    try {
        // JWT dạng Bearer là stateless, client chỉ cần xoá token
        // Nếu bạn set cookie, có thể xoá cookie ở đây:
        res.clearCookie?.('token');
        res.json({ ok: true, message: 'Logged out' });
    } catch (e) { next(e); }
}
};