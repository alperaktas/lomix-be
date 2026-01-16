const sequelize = require('../config/db');

// Model server.js'de init edildiği için sequelize.models üzerinden erişiyoruz
const getGroupModel = () => sequelize.models.Group;
const getUserGroupModel = () => sequelize.models.UserGroup;
const getUserModel = () => sequelize.models.User;

exports.getAll = async (req, res) => {
    try {
        const groups = await getGroupModel().findAll({
            order: [['id', 'ASC']]
        });

        const groupsWithCount = await Promise.all(groups.map(async (group) => {
            const count = await getUserGroupModel().count({ where: { groupId: group.id } });
            return {
                ...group.toJSON(),
                userCount: count
            };
        }));
        res.json(groupsWithCount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await getGroupModel().findByPk(id, {
            include: [{
                model: getUserModel(),
                as: 'users',
                attributes: ['id', 'username', 'email', 'role'],
                through: { attributes: [] }
            }]
        });

        if (!group) return res.status(404).json({ message: 'Grup bulunamadı' });
        res.json(group.users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const group = await getGroupModel().create(req.body);
        res.json(group);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Bu grup zaten mevcut' });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        await getGroupModel().update(req.body, { where: { id } });
        res.json({ message: 'Grup güncellendi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        await getGroupModel().destroy({ where: { id } });
        res.json({ message: 'Grup silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};