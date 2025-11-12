import { register, login } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';


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
    }
};