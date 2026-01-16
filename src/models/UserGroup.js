module.exports = (sequelize, DataTypes) => {
    const UserGroup = sequelize.define("UserGroup", {
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
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        groupId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'group_id',
            references: {
                model: 'groups',
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'user_groups',
        timestamps: true,
        underscored: true
    });

    return UserGroup;
};