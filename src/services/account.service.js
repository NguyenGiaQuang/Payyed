// src/services/account.service.js
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

// Lấy danh sách role code của user
async function getUserRoleCodes(userId) {
    const userRoles = await UserRole.findAll({
        where: { user_id: userId },
        include: [{ model: Role }],
    });
    return userRoles.map((ur) => ur.role?.code).filter(Boolean);
}

// Check quyền xem tài khoản
async function ensureCanViewAccount(account, userId) {
    const codes = await getUserRoleCodes(userId);
    const isStaffOrAdmin = codes.includes('STAFF') || codes.includes('ADMIN');

    if (isStaffOrAdmin) return;

    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
        throw createError(403, 'Không có quyền truy cập tài khoản này');
    }

    if (account.customer_id !== customer.id) {
        throw createError(403, 'Không có quyền truy cập tài khoản này');
    }
}

// Danh sách tài khoản của user hiện tại
export async function listMyAccounts(userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    return Account.findAll({
        where: { customer_id: customer.id },
        order: [['opened_at', 'ASC']],
    });
}

// Chi tiết tài khoản
export async function getAccountDetail(accountId, userId) {
    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    await ensureCanViewAccount(account, userId);
    return account;
}

// ⭐ MỞ TÀI KHOẢN – hỗ trợ cả CUSTOMER và STAFF/ADMIN
export async function openAccount(userId, { customer_id, account_no, type, currency }) {
    const codes = await getUserRoleCodes(userId);
    const isStaffOrAdmin = codes.includes('STAFF') || codes.includes('ADMIN');

    let targetCustomerId = customer_id;

    if (isStaffOrAdmin) {
        // STAFF / ADMIN mở tài khoản → yêu cầu cung cấp customer_id
        if (!customer_id) {
            throw createError(400, 'Thiếu customer_id khi tạo tài khoản');
        }

        const customer = await Customer.findByPk(customer_id);
        if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

        // ⭐ CHECK KYC
        if (customer.kyc !== 'APPROVED') {
            throw createError(403, 'Khách hàng chưa KYC APPROVED, không thể mở tài khoản');
        }

        targetCustomerId = customer.id;
    } else {
        // CUSTOMER tự mở tài khoản cho chính họ
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

        // ⭐ CHECK KYC
        if (customer.kyc !== 'APPROVED') {
            throw createError(403, 'Bạn chưa KYC APPROVED, không thể mở tài khoản');
        }

        targetCustomerId = customer.id;
    }

    // Check trùng số tài khoản
    const exists = await Account.findOne({ where: { account_no } });
    if (exists) throw createError(409, 'Số tài khoản đã tồn tại');

    // Tạo tài khoản mới
    const acc = await Account.create({
        customer_id: targetCustomerId,
        account_no,
        type,
        currency,
        status: 'ACTIVE',
        balance: 0,
        opened_at: new Date(),
    });

    // account_limit nếu có
    await AccountLimit.create({ account_id: acc.id }).catch(() => { });

    return acc;
}

// Cập nhật trạng thái tài khoản
export async function updateAccountStatus(accountId, status) {
    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    if (account.status === status) {
        return account;
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

// Sao kê tài khoản (có số dư đầu kỳ, cuối kỳ, running balance)
export async function getAccountStatement(accountId, { from, to }, userId) {
    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    await ensureCanViewAccount(account, userId);

    // Chuẩn hóa thời gian
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    // 1) Lấy tất cả journal line của account để tính opening/closing balance
    const whereEntryForBalance = {};
    if (toDate) {
        whereEntryForBalance.created_at = { [Op.lte]: toDate };
    }

    const linesForBalance = await JournalLine.findAll({
        where: { customer_account_id: account.id },
        include: [
            {
                model: JournalEntry,
                as: 'entry',
                required: true,
                where: Object.keys(whereEntryForBalance).length
                    ? whereEntryForBalance
                    : undefined,
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

    let openingBalance = 0;
    let closingBalance = 0;

    for (const l of linesForBalance) {
        const glCode = l.gl_account?.code || null;
        // Chỉ tính cho tài khoản tiền gửi khách hàng
        if (glCode !== '201001') continue;

        const amountNum = Number(l.amount || 0);
        let delta = 0;
        if (l.dc === 'CREDIT') delta = amountNum;
        else if (l.dc === 'DEBIT') delta = -amountNum;

        const entryDate = l.entry.created_at;

        // Luôn cộng vào closingBalance (tất cả đến toDate)
        closingBalance += delta;

        // Nếu có fromDate: openingBalance là số dư trước from
        if (fromDate && entryDate < fromDate) {
            openingBalance += delta;
        }
    }

    // 2) Lấy các dòng trong khoảng [from, to] để trả về cho client
    const whereEntryForItems = {};
    if (fromDate) {
        whereEntryForItems.created_at = { [Op.gte]: fromDate };
    }
    if (toDate) {
        whereEntryForItems.created_at = {
            ...(whereEntryForItems.created_at || {}),
            [Op.lte]: toDate,
        };
    }

    const linesInRange = await JournalLine.findAll({
        where: { customer_account_id: account.id },
        include: [
            {
                model: JournalEntry,
                as: 'entry',
                required: true,
                where: Object.keys(whereEntryForItems).length
                    ? whereEntryForItems
                    : undefined,
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

    // 3) Tính running balance cho từng dòng
    let runningBalance = openingBalance;
    const items = linesInRange.map((l) => {
        const glCode = l.gl_account?.code || null;
        const amountNum = Number(l.amount || 0);
        let delta = 0;

        if (glCode === '201001') {
            if (l.dc === 'CREDIT') delta = amountNum;
            else if (l.dc === 'DEBIT') delta = -amountNum;
        }

        runningBalance += delta;

        let direction = 'NONE';
        if (delta > 0) direction = 'IN';
        else if (delta < 0) direction = 'OUT';

        return {
            id: l.id,
            date: l.entry.created_at,
            description: l.entry.description,
            gl_account: glCode,
            dc: l.dc,
            amount: l.amount,
            direction,
            delta,           // thay đổi số dư do dòng này (có thể bỏ nếu không cần)
            balance_after: runningBalance, // running balance sau dòng này
        };
    });

    return {
        account: {
            id: account.id,
            account_no: account.account_no,
            currency: account.currency,
            status: account.status,
            current_balance: account.balance, // số dư hiện tại trong bảng account
        },
        filter: {
            from: fromDate || null,
            to: toDate || null,
        },
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        items,
    };
}

export async function getRecentTransactions(accountId, limit, userId) {
    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    await ensureCanViewAccount(account, userId);

    const lines = await JournalLine.findAll({
        where: { customer_account_id: account.id },
        include: [
            {
                model: JournalEntry,
                as: 'entry',
                required: true,
            },
            {
                model: GLAccount,
                as: 'gl_account',
                required: false,
            },
        ],
        order: [
            [{ model: JournalEntry, as: 'entry' }, 'created_at', 'DESC'],
            ['id', 'DESC'],
        ],
        limit,
    });

    const items = lines.map((l) => {
        const glCode = l.gl_account?.code || null;
        const amount = Number(l.amount || 0);

        let delta = 0;
        let direction = 'NONE';
        let in_amount = null;
        let out_amount = null;

        // Chỉ áp dụng logic cho GL 201001 (Customer Deposits)
        if (glCode === '201001') {
            if (l.dc === 'CREDIT') {
                delta = amount;
                direction = 'IN';
                in_amount = amount;
            } else if (l.dc === 'DEBIT') {
                delta = -amount;
                direction = 'OUT';
                out_amount = amount;
            }
        }

        return {
            id: l.id,
            date: l.entry.created_at,
            description: l.entry.description,
            gl_account: glCode,
            dc: l.dc,
            amount: amount.toFixed(2),

            // Thông tin mới:
            direction,      // IN / OUT / NONE
            delta,          // +500000 hoặc -300000
            in_amount,      // null hoặc số dương
            out_amount,     // null hoặc số dương
        };
    });

    return {
        account: {
            id: account.id,
            account_no: account.account_no,
            currency: account.currency,
            status: account.status,
        },
        limit,
        items,
    };
}


// Lấy tài khoản mặc định
export async function getDefaultAccount(userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    const account = await Account.findOne({
        where: { customer_id: customer.id, is_default: true },
    });

    if (!account) {
        throw createError(404, 'Chưa cấu hình tài khoản mặc định');
    }

    return account;
}

// Đặt 1 tài khoản là mặc định
export async function setDefaultAccount(userId, accountId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng');

    const account = await Account.findByPk(accountId);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    if (account.customer_id !== customer.id) {
        throw createError(
            403,
            'Không được đặt mặc định cho tài khoản của khách hàng khác',
        );
    }

    return Account.sequelize.transaction(async (t) => {
        await Account.update(
            { is_default: false },
            {
                where: { customer_id: customer.id, is_default: true },
                transaction: t,
            },
        );

        account.is_default = true;
        await account.save({ transaction: t });

        return account;
    });
}
