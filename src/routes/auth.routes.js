import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { csrfProtection } from '../middlewares/csrf.middleware.js';

const r = Router();
r.post('/register', AuthController.register);
r.post('/login', AuthController.login);
r.get('/me', auth(true), AuthController.me);
r.post('/logout', auth(false), AuthController.logout);
r.post('/email', auth(true), csrfProtection, AuthController.changeEmail);
r.patch('/email', auth(true), csrfProtection, AuthController.changeEmail);
r.post('/password', auth(true), csrfProtection, AuthController.changePassword);
r.patch('/password', auth(true), csrfProtection, AuthController.changePassword);
export default r;