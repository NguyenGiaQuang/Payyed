import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { auth } from '../middlewares/auth.middleware.js';


const r = Router();
r.post('/register', AuthController.register);
r.post('/login', AuthController.login);
r.get('/me', auth(true), AuthController.me);
r.post('/logout', auth(false), AuthController.logout);
export default r;