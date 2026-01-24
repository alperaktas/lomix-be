import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';

interface LogAttributes {
    id: number;
    level: string;
    message: string;
    meta?: string | null;
    createdAt?: Date;
}

interface LogCreationAttributes extends Optional<LogAttributes, 'id'> { }

class Log extends Model<LogAttributes, LogCreationAttributes> implements LogAttributes {
    public id!: number;
    public level!: string;
    public message!: string;
    public meta!: string | null;

    public readonly createdAt!: Date;
}

Log.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    level: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    meta: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'createdAt'
    }
}, {
    sequelize,
    tableName: 'logs',
    timestamps: false // updatedAt yok
});

export default Log;
