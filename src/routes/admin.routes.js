import { Router } from 'express';
import { RoleController } from '../controllers/role.controller.js';
import { UserController } from '../controllers/user.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// Admin only
r.get('/roles', auth(true), requireRole(['ADMIN', 'Admin']), RoleController.list);
r.post('/users/assign-role', auth(true), requireRole(['ADMIN', 'Admin']), UserController.assignRole);

export default r;