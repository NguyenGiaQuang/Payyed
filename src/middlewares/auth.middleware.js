import createError from 'http-errors';
import { verifyJwt } from '../utils/crypto.util.js';


export function auth(required = true) {
    return (req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token && required) return next(createError(401, 'Missing token'));
        if (!token) return next();
        try {
            req.user = verifyJwt(token);
            next();
        } catch {
            next(createError(401, 'Invalid token'));
        }
    };
}