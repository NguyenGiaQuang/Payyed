import createError from 'http-errors';

export function csrfProtection(req, res, next) {
    const method = req.method.toUpperCase();
    const safe = ['GET', 'HEAD', 'OPTIONS'];
    if (safe.includes(method)) return next();

    const csrfCookie = req.cookies?.csrf_token;
    const csrfHeader = req.headers['x-csrf-token'] || req.body?._csrf;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return next(createError(403, 'CSRF token không hợp lệ'));
    }

    next();
}
