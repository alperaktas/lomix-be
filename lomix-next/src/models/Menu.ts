import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';

interface MenuAttributes {
    id: number;
    title: string;
    url?: string;
    icon?: string;
    parentId?: number | null;
    order?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MenuCreationAttributes extends Optional<MenuAttributes, 'id'> { }

class Menu extends Model<MenuAttributes, MenuCreationAttributes> implements MenuAttributes {
    public id!: number;
    public title!: string;
    public url!: string;
    public icon!: string;
    public parentId!: number | null;
    public order!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Menu.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'parent_id'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    sequelize,
    tableName: 'menus',
    timestamps: true,
    underscored: false // Bu tabloda camelCase/snake_case karışıklığı olabilir, yedeğe göre ayarlıyoruz
});

// Self-referencing association (Alt menüler için)
Menu.hasMany(Menu, { as: 'children', foreignKey: 'parentId' });
Menu.belongsTo(Menu, { as: 'parent', foreignKey: 'parentId' });

export default Menu;
