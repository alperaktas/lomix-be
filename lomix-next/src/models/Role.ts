import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';

interface RoleAttributes {
    id: number;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'id'> { }

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
    public id!: number;
    public name!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Role.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING, // VARCHAR(50)
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'roles',
    timestamps: true,
    underscored: true
});

export default Role;
