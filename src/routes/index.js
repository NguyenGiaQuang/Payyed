import { Router } from 'express';
import authRoutes from './auth.routes.js';
import accountRoutes from './account.routes.js';
import transferRoutes from './transfer.routes.js';
import adminRoutes from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import kycRoutes from './kyc.routes.js';
import journalRoutes from './journal.routes.js';
import ledgerRoutes from './ledger.routes.js';
import beneficiaryRoutes from './beneficiary.routes.js';
import otpRoutes from './otp.routes.js';
import securityRoutes from './security.routes.js';
import notificationRoutes from './notification.routes.js';
import systemRoutes from './system.routes.js';
import uploadRoutes from './upload.routes.js';
import cashTransactionRoutes from './cash_transaction.routes.js';

const api = Router();

api.use('/auth', authRoutes);
api.use('/accounts', accountRoutes);
api.use('/transfers', transferRoutes);
api.use('/customers', customerRoutes);
api.use('/kyc', kycRoutes);
api.use('/', adminRoutes); // /roles, /users/assign-role
api.use('/journals', journalRoutes);
api.use('/ledger', ledgerRoutes);
api.use('/beneficiaries', beneficiaryRoutes);
api.use('/otp', otpRoutes);
api.use('/security', securityRoutes);
api.use('/notifications', notificationRoutes);
api.use('/system', systemRoutes);
api.use('/uploads', uploadRoutes);
api.use('/cash-transactions', cashTransactionRoutes);

export default api;
