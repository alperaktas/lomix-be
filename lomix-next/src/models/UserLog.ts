import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';
import User from './User';

interface UserLogAttributes {
    id: number;
    userId: number;
    action: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserLogCreationAttributes extends Optional<UserLogAttributes, 'id'> { }

class UserLog extends Model<UserLogAttributes, UserLogCreationAttributes> implements UserLogAttributes {
    public id!: number;
    public userId!: number;
    public action!: string;
    public ipAddress!: string | null;
    public userAgent!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

UserLog.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ipAddress: {
        type: DataTypes.STRING,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.STRING,
        field: 'user_agent'
    }
}, {
    sequelize,
    tableName: 'user_logs',
    timestamps: true,
    underscored: true
});

// Association'ı burada tanımlamak yerine, modellerin kullanıldığı yerde (ilişki kurulacağı zaman) yapmak daha güvenlidir, 
// veya ayrı bir 'associations.ts' dosyasında hepsi birleştirilebilir.
// Ancak Sequelize'de genelde model içinde tanımlanır, döngüsel bağımlılığa dikkat edilmeli.
// Şimdilik sadece UserLog -> belongsTo -> User yeterli olacaktır.
UserLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default UserLog;
