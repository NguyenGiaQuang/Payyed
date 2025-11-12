import { Router } from 'express';
import authRoutes from './auth.routes.js';
import accountRoutes from './account.routes.js';
import transferRoutes from './transfer.routes.js';


const api = Router();
api.use('/auth', authRoutes);
api.use('/accounts', accountRoutes);
api.use('/transfers', transferRoutes);
export default api;