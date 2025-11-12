import { IdempotencyKey } from '../models/index.js';


export async function ensureIdempotency(key, purpose, t) {
    // sẽ throw nếu trùng key (unique)
    await IdempotencyKey.create({ key, purpose }, { transaction: t });
}