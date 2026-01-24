import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';

interface GroupAttributes {
    id: number;
    name: string;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface GroupCreationAttributes extends Optional<GroupAttributes, 'id'> { }

class Group extends Model<GroupAttributes, GroupCreationAttributes> implements GroupAttributes {
    public id!: number;
    public name!: string;
    public description!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Group.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'groups',
    timestamps: true,
    underscored: true
});

// Many-to-Many ilişki UserGroup modeli üzerinden kurulacak, şimdilik burada kalsın.

export default Group;
