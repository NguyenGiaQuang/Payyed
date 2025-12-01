import createError from 'http-errors';
import { User, Customer, Role, UserRole } from '../models/index.js';
import { hashPassword, comparePassword, signJwt } from '../utils/crypto.util.js';

export async function register({ email, password, full_name }) {
    // 1. Kiểm tra email trùng
    const exists = await User.findOne({ where: { email } });
    if (exists) throw createError(409, 'Email đã tồn tại');

    // 2. Hash mật khẩu
    const password_hash = await hashPassword(password);

    // 3. Tạo user
    const user = await User.create({
        email,
        password_hash,
        is_active: true,
    });

    // 4. Tạo customer gắn với user
    const customer = await Customer.create({
        user_id: user.id,
        full_name,
        kyc: 'PENDING', // hoặc 'PENDING' nếu bạn muốn KYC riêng
    });

    // 5. GÁN ROLE CUSTOMER CHO USER MỚI
    const customerRole = await Role.findOne({ where: { code: 'CUSTOMER' } });

    if (!customerRole) {
        // Nếu không tìm thấy role, báo lỗi để bạn seed lại DB cho đúng
        throw createError(500, 'Role CUSTOMER không tồn tại. Hãy kiểm tra dữ liệu seed bảng role.');
    }

    await UserRole.create({
        user_id: user.id,
        role_id: customerRole.id,
    });

    // 6. Tạo token đăng nhập luôn
    const token = signJwt({ sub: user.id, email });

    return { user, customer, token };
}

export async function login({ email, password }) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw createError(401, 'Sai thông tin');

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) throw createError(401, 'Sai thông tin');

    const token = signJwt({ sub: user.id, email });
    return { token };
}
