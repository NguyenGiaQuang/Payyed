import { sequelize } from '../config/database.js';
import defineUser from './user.model.js';
import defineRole from './role.model.js';
import defineCustomer from './customer.model.js';
import defineAccount from './account.model.js';
import defineGL from './gl.model.js';
import defineTransfer from './transfer.model.js';
import defineMisc from './misc.model.js';


// Khởi tạo models
export const User = defineUser(sequelize);
export const { Role, Permission, UserRole } = defineRole(sequelize);
export const Customer = defineCustomer(sequelize, { User });
export const { Account, AccountLimit, Beneficiary } = defineAccount(sequelize, { Customer });
export const { GLAccount, JournalEntry, JournalLine } = defineGL(sequelize, { Account });
export const { Transfer, IdempotencyKey } = defineTransfer(sequelize, { Account });
export const Misc = defineMisc; // (nếu cần mở rộng)


// Associations tối thiểu
User.hasOne(Customer, { foreignKey: 'user_id' });
Customer.belongsTo(User, { foreignKey: 'user_id' });


Customer.hasMany(Account, { foreignKey: 'customer_id' });
Account.belongsTo(Customer, { foreignKey: 'customer_id' });

// RBAC m:n
UserRole.belongsTo(User, { foreignKey: 'user_id' });
UserRole.belongsTo(Role, { foreignKey: 'role_id' });
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id' });
JournalLine.belongsTo(JournalEntry, { foreignKey: 'entry_id', as: 'entry' });
JournalLine.belongsTo(GLAccount, { foreignKey: 'gl_account_id', as: 'gl_account' });

// ready to use
export default {
    sequelize,
    User, Role, Permission, UserRole,
    Customer, Account, AccountLimit, Beneficiary,
    GLAccount, JournalEntry, JournalLine,
    Transfer, IdempotencyKey,
};