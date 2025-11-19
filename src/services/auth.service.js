import createError from 'http-errors';
import { User, Customer } from '../models/index.js';
import { hashPassword, comparePassword, signJwt } from '../utils/crypto.util.js';

export async function register({ email, password, full_name }) {
    const exists = await User.findOne({ where: { email } });
    if (exists) throw createError(409, 'Email đã tồn tại');
    const password_hash = await hashPassword(password);
    const user = await User.create({ email, password_hash, is_active: true });
    const customer = await Customer.create({ user_id: user.id, full_name, kyc: 'APPROVED' });
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