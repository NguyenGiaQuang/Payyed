import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const { DATABASE } = process.env;
if (!DATABASE) {
    throw new Error("ENV DATABASE is missing. Hãy thêm DATABASE=postgres://user:pass@host:5432/db vào .env");
}

export const sequelize = new Sequelize(DATABASE, {
    logging: false, // bật nếu cần debug SQL
    dialectOptions: { application_name: 'bank-app' },
});

export async function assertDbConnection() {
    await sequelize.authenticate();
}