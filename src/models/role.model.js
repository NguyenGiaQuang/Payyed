import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Role = sequelize.define('role', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        code: { type: DataTypes.STRING, unique: true },
        name: { type: DataTypes.STRING },
    }, { tableName: 'role', timestamps: false });

    const Permission = sequelize.define('permission', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        code: { type: DataTypes.STRING, unique: true },
        description: DataTypes.TEXT,
    }, { tableName: 'permission', timestamps: false });

    const UserRole = sequelize.define('user_role', {
        user_id: { type: DataTypes.UUID, primaryKey: true },
        role_id: { type: DataTypes.UUID, primaryKey: true },
    }, { tableName: 'user_role', timestamps: false });

    return { Role, Permission, UserRole };
};