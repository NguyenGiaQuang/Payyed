import createError from 'http-errors';
import {
    Customer,
    KycDocument,
    Account,
    Role,
    UserRole,
} from '../models/index.js';

// Helper: lấy list role code của user (nếu cần dùng cho logic khác)
async function getUserRoleCodes(userId) {
    const rows = await UserRole.findAll({
        where: { user_id: userId },
        include: [{ model: Role }],
    });
    return rows.map((r) => r.role?.code).filter(Boolean);
}

// 7) Danh sách khách hàng (Staff/Admin)
export async function listCustomers() {
    return Customer.findAll({
        order: [['created_at', 'ASC']],
    });
}

// 8) Chi tiết 1 khách hàng (Staff/Admin)
export async function getCustomerDetail(customerId) {
    const customer = await Customer.findByPk(customerId, {
        include: [
            {
                model: KycDocument,
                as: 'kyc_documents',
                required: false,
            },
            {
                model: Account,
                required: false,
            },
        ],
    });

    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');
    return customer;
}

// 9) Cập nhật hồ sơ cho chính mình (Customer)
export async function updateMyProfile(userId, payload) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    customer.full_name = payload.full_name;
    customer.dob = payload.dob ?? customer.dob;
    customer.national_id = payload.national_id ?? customer.national_id;
    customer.address = payload.address ?? customer.address;

    await customer.save();
    return customer;
}

// 10) Gửi hồ sơ KYC cho chính mình
export async function submitKyc(customerId, userId, documents) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    // Bắt buộc chỉ được gửi KYC cho chính mình
    if (customer.user_id !== userId) {
        throw createError(403, 'Không được phép gửi KYC cho khách hàng khác');
    }

    // Nếu muốn xoá docs KYC cũ, giữ docs mới
    await KycDocument.destroy({ where: { customer_id: customer.id } });

    // Tạo docs mới
    for (const doc of documents) {
        await KycDocument.create({
            customer_id: customer.id,
            doc_type: doc.doc_type,
            url: doc.url,
        });
    }

    // Đặt trạng thái KYC về PENDING
    customer.kyc = 'PENDING';
    await customer.save();

    return { ok: true };
}
