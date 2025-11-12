import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { auth } from '../middlewares/auth.middleware.js';


const r = Router();
r.get('/me', auth(true), AccountController.me);
r.post('/open', auth(true), AccountController.open);
export default r;