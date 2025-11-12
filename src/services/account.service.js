import createError from 'http-errors';
import { Account, Customer, AccountLimit } from '../models/index.js';


export async function listMyAccounts(userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');
    return Account.findAll({ where: { customer_id: customer.id, status: 'ACTIVE' } });
}


export async function openAccount({ customer_id, account_no, type, currency }) {
    const exists = await Account.findOne({ where: { account_no } });
    if (exists) throw createError(409, 'Số tài khoản đã tồn tại');
    const acc = await Account.create({ customer_id, account_no, type, currency, status: 'ACTIVE', balance: 0 });
    await AccountLimit.create({ account_id: acc.id });
    return acc;
}