import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';
import Group from './Group';
import User from './User';

interface UserGroupAttributes {
    id: number;
    userId: number;
    groupId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserGroupCreationAttributes extends Optional<UserGroupAttributes, 'id'> { }

class UserGroup extends Model<UserGroupAttributes, UserGroupCreationAttributes> implements UserGroupAttributes {
    public id!: number;
    public userId!: number;
    public groupId!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

UserGroup.init({
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
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'group_id',
        references: {
            model: Group,
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    sequelize,
    tableName: 'user_groups',
    timestamps: true,
    underscored: true
});

// İlişkileri Kuralım
User.belongsToMany(Group, { through: UserGroup, foreignKey: 'userId', otherKey: 'groupId', as: 'groups' });
Group.belongsToMany(User, { through: UserGroup, foreignKey: 'groupId', otherKey: 'userId', as: 'users' });

export default UserGroup;
