import createError from 'http-errors';
import { Customer, KycDocument } from '../models/index.js';

export async function listPendingKyc() {
    const customers = await Customer.findAll({
        where: { kyc: 'PENDING' },
        include: [
            {
                model: KycDocument,
                as: 'kyc_documents',
                required: false,
            },
        ],
        order: [['created_at', 'ASC']],
    });

    return customers;
}

export async function approveKyc(customerId, status) {
    const customer = await Customer.findByPk(customerId, {
        include: [{ model: KycDocument, as: 'kyc_documents', required: false }],
    });

    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    customer.kyc = status; // 'APPROVED' hoặc 'REJECTED'
    await customer.save();

    return customer;
}
