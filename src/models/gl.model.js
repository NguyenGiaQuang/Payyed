import { DataTypes } from 'sequelize';


export default (sequelize) => {
    const GLAccount = sequelize.define('gl_account', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        code: { type: DataTypes.STRING, unique: true },
        name: DataTypes.STRING,
        type: { type: DataTypes.ENUM('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY') },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, { tableName: 'gl_account', timestamps: false });

    const JournalEntry = sequelize.define('journal_entry', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        ref: { type: DataTypes.STRING, unique: true },
        description: DataTypes.TEXT,
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, { tableName: 'journal_entry', timestamps: false });

    const JournalLine = sequelize.define('journal_line', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        entry_id: { type: DataTypes.UUID, allowNull: false },
        gl_account_id: { type: DataTypes.UUID, allowNull: false },
        customer_account_id: { type: DataTypes.UUID },
        dc: { type: DataTypes.ENUM('DEBIT', 'CREDIT'), allowNull: false },
        amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    }, { tableName: 'journal_line', timestamps: false });

    return { GLAccount, JournalEntry, JournalLine };
};