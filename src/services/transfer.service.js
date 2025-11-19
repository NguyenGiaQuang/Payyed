import createError from 'http-errors';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
    Account,
    Transfer,
    Customer,
    Role,
    UserRole,
} from '../models/index.js';

// =====================
// Helpers
// =====================

async function getUserRoleCodes(userId) {
    const rows = await UserRole.findAll({
        where: { user_id: userId },
        include: [{ model: Role }],
    });
    return rows.map((r) => r.role?.code).filter(Boolean);
}

async function getCustomerAndAccountsByUser(userId, tx) {
    const customer = await Customer.findOne({
        where: { user_id: userId },
        transaction: tx,
    });
    if (!customer) return { customer: null, accountIds: [] };

    const accounts = await Account.findAll({
        where: { customer_id: customer.id },
        attributes: ['id'],
        transaction: tx,
    });
    const accountIds = accounts.map((a) => a.id);
    return { customer, accountIds };
}

// =====================
// 18) Internal transfer
// =====================

export async function createInternalTransfer(userId, payload) {
    const { from_account_no, to_account_no, amount, fee = 0, description, idem_key } = payload;

    return sequelize.transaction(async (tx) => {
        // Idempotency: nếu đã có transfer cùng idem_key thì trả lại luôn
        const existed = await Transfer.findOne({
            where: { idem_key },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (existed) return existed;

        // Lấy customer + account của user
        const { customer } = await getCustomerAndAccountsByUser(userId, tx);
        if (!customer) throw createError(403, 'Không tìm thấy khách hàng của user');

        const fromAcc = await Account.findOne({
            where: { account_no: from_account_no },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        const toAcc = await Account.findOne({
            where: { account_no: to_account_no },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });

        if (!fromAcc) throw createError(404, 'Tài khoản nguồn không tồn tại');
        if (!toAcc) throw createError(404, 'Tài khoản đích không tồn tại');

        // Chỉ cho phép chuyển từ tài khoản thuộc về chính customer này
        if (fromAcc.customer_id !== customer.id) {
            throw createError(403, 'Không được phép chuyển tiền từ tài khoản không thuộc sở hữu');
        }

        if (fromAcc.currency !== toAcc.currency) {
            throw createError(400, 'Hai tài khoản phải cùng loại tiền tệ');
        }
        if (fromAcc.status !== 'ACTIVE' || toAcc.status !== 'ACTIVE') {
            throw createError(400, 'Tài khoản phải ở trạng thái ACTIVE');
        }

        const totalDebit = Number(amount) + Number(fee);
        const currentBalance = Number(fromAcc.balance || 0);

        if (currentBalance < totalDebit) {
            throw createError(400, 'Số dư không đủ để thực hiện giao dịch');
        }

        // Cập nhật số dư
        fromAcc.balance = currentBalance - totalDebit;
        toAcc.balance = Number(toAcc.balance || 0) + Number(amount);

        await fromAcc.save({ transaction: tx });
        await toAcc.save({ transaction: tx });

        // Tạo bản ghi transfer
        const now = new Date();
        const tr = await Transfer.create(
            {
                from_account_id: fromAcc.id,
                to_account_id: toAcc.id,
                to_external_account_no: null,
                to_external_bank_code: null,
                currency: fromAcc.currency,
                amount,
                fee,
                idem_key,
                status: 'COMPLETED',
                created_at: now,
                completed_at: now,
            },
            { transaction: tx },
        );

        // TODO: nếu muốn, có thể ghi thêm journal_entry / journal_line ở đây

        return tr;
    });
}

// =====================
// 22) External transfer
// =====================

export async function createExternalTransfer(userId, payload) {
    const {
        from_account_no,
        to_external_account_no,
        to_external_bank_code,
        amount,
        fee = 0,
        description,
        idem_key,
    } = payload;

    return sequelize.transaction(async (tx) => {
        const existed = await Transfer.findOne({
            where: { idem_key },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (existed) return existed;

        const { customer } = await getCustomerAndAccountsByUser(userId, tx);
        if (!customer) throw createError(403, 'Không tìm thấy khách hàng của user');

        const fromAcc = await Account.findOne({
            where: { account_no: from_account_no },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (!fromAcc) throw createError(404, 'Tài khoản nguồn không tồn tại');

        if (fromAcc.customer_id !== customer.id) {
            throw createError(403, 'Không được phép chuyển tiền từ tài khoản không thuộc sở hữu');
        }

        if (fromAcc.status !== 'ACTIVE') {
            throw createError(400, 'Tài khoản phải ở trạng thái ACTIVE');
        }

        const totalDebit = Number(amount) + Number(fee);
        const currentBalance = Number(fromAcc.balance || 0);

        if (currentBalance < totalDebit) {
            throw createError(400, 'Số dư không đủ để thực hiện giao dịch');
        }

        // Giao dịch external: chỉ trừ ở tài khoản nguồn
        fromAcc.balance = currentBalance - totalDebit;
        await fromAcc.save({ transaction: tx });

        const now = new Date();
        const tr = await Transfer.create(
            {
                from_account_id: fromAcc.id,
                to_account_id: null,
                to_external_account_no,
                to_external_bank_code,
                currency: fromAcc.currency,
                amount,
                fee,
                idem_key,
                status: 'COMPLETED',
                created_at: now,
                completed_at: now,
            },
            { transaction: tx },
        );

        return tr;
    });
}

// =====================
// 19) Danh sách giao dịch
// =====================

export async function listTransfers(userId, filters) {
    const { from, to, status, account_id } = filters;
    const codes = await getUserRoleCodes(userId);
    const isStaff = codes.includes('STAFF') || codes.includes('ADMIN');

    const where = {};

    if (status) {
        where.status = status;
    }

    if (from || to) {
        where.created_at = {};
        if (from) where.created_at[Op.gte] = new Date(from);
        if (to) where.created_at[Op.lte] = new Date(to);
    }

    if (isStaff) {
        // Staff có thể xem theo toàn hệ thống hoặc lọc account_id nếu có
        if (account_id) {
            where[Op.or] = [
                { from_account_id: account_id },
                { to_account_id: account_id },
            ];
        }
    } else {
        // Customer chỉ xem được giao dịch liên quan tới tài khoản của mình
        const { accountIds } = await getCustomerAndAccountsByUser(userId);
        if (!accountIds.length) return [];
        where[Op.or] = [
            { from_account_id: { [Op.in]: accountIds } },
            { to_account_id: { [Op.in]: accountIds } },
        ];
    }

    const transfers = await Transfer.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 200,
    });

    return transfers;
}

// =====================
// 20) Chi tiết giao dịch
// =====================

export async function getTransferDetail(transferId, userId) {
    const tr = await Transfer.findByPk(transferId);
    if (!tr) throw createError(404, 'Không tìm thấy giao dịch');

    const codes = await getUserRoleCodes(userId);
    const isStaff = codes.includes('STAFF') || codes.includes('ADMIN');
    if (isStaff) return tr;

    // Customer: phải là chủ của from/to account
    const { accountIds } = await getCustomerAndAccountsByUser(userId);
    if (!accountIds.length) throw createError(403, 'Không có quyền xem giao dịch này');

    const related = accountIds.includes(tr.from_account_id) || accountIds.includes(tr.to_account_id);
    if (!related) throw createError(403, 'Không có quyền xem giao dịch này');

    return tr;
}

// =====================
// 21) Verify OTP (mock)
// =====================

export async function verifyTransferOtp(userId, otp_code) {
    // Ở đây triển khai đơn giản: OTP = '123456' là hợp lệ
    // Nếu bạn muốn dùng bảng otp trong DB, có thể thay bằng logic truy vấn & so sánh hash.
    if (otp_code !== '123456') {
        throw createError(400, 'OTP không đúng');
    }
    return { ok: true, message: 'OTP hợp lệ (demo)' };
}

// =====================
// 23) Tính phí tạm tính
// =====================

export function calcTransferFee(type, amount) {
    const amt = Number(amount);

    let fee = 0;
    if (type === 'INTERNAL') {
        // Ví dụ: nội bộ miễn phí dưới 5 triệu, trên 5 triệu phí 3,000
        if (amt > 5_000_000) fee = 3000;
    } else if (type === 'EXTERNAL') {
        // Ví dụ: liên ngân hàng phí cố định 7,000
        fee = 7000;
    }

    return {
        type,
        amount: amt,
        fee,
        total_debit: amt + fee,
    };
}
