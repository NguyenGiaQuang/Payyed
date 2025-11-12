import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


const { BCRYPT_ROUNDS = 10, JWT_SECRET = 'secret', JWT_EXPIRES = '2d' } = process.env;


export async function hashPassword(pw) {
    const salt = await bcrypt.genSalt(Number(BCRYPT_ROUNDS));
    return bcrypt.hash(pw, salt);
}
export async function comparePassword(pw, hash) { return bcrypt.compare(pw, hash); }


export function signJwt(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
export function verifyJwt(token) { return jwt.verify(token, JWT_SECRET); }