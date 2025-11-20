import createError from 'http-errors';
import { Beneficiary, Customer } from '../models/index.js';

async function getCustomer(userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(404, "Không tìm thấy customer");
    return customer;
}

// 28) Danh sách người thụ hưởng
export async function listMyBeneficiaries(userId) {
    const customer = await getCustomer(userId);
    return Beneficiary.findAll({
        where: { customer_id: customer.id },
        order: [["created_at", "ASC"]],
    });
}

// 29) Thêm người thụ hưởng
export async function createBeneficiary(userId, payload) {
    const customer = await getCustomer(userId);

    return Beneficiary.create({
        customer_id: customer.id,
        alias: payload.alias || null,
        target_account_no: payload.target_account_no,
        target_bank_code: payload.target_bank_code,
    });
}

// 30) Xóa người thụ hưởng
export async function deleteMyBeneficiary(userId, beneficiary_id) {
    const customer = await getCustomer(userId);

    const bene = await Beneficiary.findByPk(beneficiary_id);
    if (!bene) throw createError(404, "Không tìm thấy người thụ hưởng");

    if (bene.customer_id !== customer.id)
        throw createError(403, "Bạn không có quyền xoá mục này");

    await bene.destroy();

    return { ok: true };
}
