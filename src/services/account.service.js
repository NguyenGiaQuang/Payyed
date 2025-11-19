import createError from 'http-errors';
import { Op } from 'sequelize';
import {
    Account,
    AccountLimit,
    Customer,
    JournalEntry,
    JournalLine,
    GLAccount,
    Role,
    UserRole,
} from '../models/index.js';

// Helper: lấy rồle code của user
async function getUserRoleCodes(userId) {
    const userRoles = await UserRole.findAll({
        where: { user_id: userId },
        include: [{ model: Role }],
    });
    return userRoles.map((ur) => ur.role?.code).filter(Boolean);
}

// Helper: kiểm tra xem user có được phép xem account này không
async function ensureCanViewAccount(account, userId) {
    const codes = await getUserRoleCodes(userId);
    const isStaffOrAdmin = codes.includes('STAFF') || codes.includes('ADMIN');

    if (isStaffOrAdmin) return; // ok

    // Customer: chỉ được xem tài khoản của mình
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(403, 'Không có quyền truy cập tài khoản này');

    if (account.customer_id !== customer.id) {
        throw createError(403, 'Không có quyền truy cập tài khoản này');
    }
}

export async function listMyAccounts(userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    return Account.findAll({
        where: { customer_id: customer.id },
        order: [['opened_at', 'ASC']],
    });
}

export async function getAccountDetail(accountId, userId) {
    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    await ensureCanViewAccount(account, userId);
    return account;
}

export async function openAccount({ customer_id, account_no, type, currency }) {
    const exists = await Account.findOne({ where: { account_no } });
    if (exists) throw createError(409, 'Số tài khoản đã tồn tại');

    const customer = await Customer.findByPk(customer_id);
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    const acc = await Account.create({
        customer_id,
        account_no,
        type,
        currency,
        status: 'ACTIVE',
        balance: 0,
    });

    await AccountLimit.create({ account_id: acc.id });

    return acc;
}

export async function updateAccountStatus(accountId, status) {
    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    if (account.status === status) {
        return account; // không thay đổi
    }

    if (status === 'CLOSED') {
        const bal = Number(account.balance);
        if (bal !== 0) {
            throw createError(400, 'Tài khoản còn số dư, không thể đóng');
        }
        account.closed_at = new Date();
    }

    account.status = status;
    await account.save();

    return account;
}

export async function getAccountStatement(accountId, { from, to }, userId) {
    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    // kiểm tra quyền xem account
    await ensureCanViewAccount(account, userId);

    const whereEntry = {};
    if (from) {
        whereEntry.created_at = { [Op.gte]: new Date(from) };
    }
    if (to) {
        whereEntry.created_at = {
            ...(whereEntry.created_at || {}),
            [Op.lte]: new Date(to),
        };
    }

    // Lấy các dòng journal cho account này
    const lines = await JournalLine.findAll({
        where: { customer_account_id: account.id },
        include: [
            {
                model: JournalEntry,
                as: 'entry',
                required: true,
                where: Object.keys(whereEntry).length ? whereEntry : undefined,
            },
            {
                model: GLAccount,
                as: 'gl_account',
                required: false,
            },
        ],
        order: [
            [{ model: JournalEntry, as: 'entry' }, 'created_at', 'ASC'],
            ['id', 'ASC'],
        ],
    });

    return {
        account: {
            id: account.id,
            account_no: account.account_no,
            currency: account.currency,
            status: account.status,
        },
        filter: { from: from || null, to: to || null },
        items: lines.map((l) => ({
            id: l.id,
            date: l.entry.created_at,
            description: l.entry.description,
            gl_account: l.gl_account?.code || null,
            dc: l.dc,
            amount: l.amount,
        })),
    };
}
