import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Customer = sequelize.define('customer', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        user_id: { type: DataTypes.UUID, unique: true },
        full_name: { type: DataTypes.STRING, allowNull: false },
        dob: DataTypes.DATEONLY,
        national_id: DataTypes.STRING,
        address: DataTypes.TEXT,
        kyc: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'PENDING' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, { tableName: 'customer', timestamps: false });

    return Customer;
};