// src/services/kyc.service.js
import createError from 'http-errors';
import { Customer, KycDocument } from '../models/index.js';

// Staff: danh sách khách hàng có KYC = PENDING
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

// Staff: duyệt / từ chối KYC
export async function approveKyc(customerId, status) {
    const customer = await Customer.findByPk(customerId, {
        include: [
            {
                model: KycDocument,
                as: 'kyc_documents',
                required: false,
            },
        ],
    });

    if (!customer) {
        throw createError(404, 'Không tìm thấy khách hàng');
    }

    customer.kyc = status; // 'APPROVED' hoặc 'REJECTED'
    await customer.save();

    return customer;
}

// Customer: xem hồ sơ KYC của chính mình
export async function getMyKyc(userId) {
    const customer = await Customer.findOne({
        where: { user_id: userId },
        include: [
            {
                model: KycDocument,
                as: 'kyc_documents',
                required: false,
            },
        ],
    });

    if (!customer) {
        throw createError(404, 'Không tìm thấy khách hàng');
    }

    return customer;
}
