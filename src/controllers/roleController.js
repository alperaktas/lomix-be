const { Op } = require('sequelize');
const sequelize = require('../config/db');

// Model server.js'de init edildiği için sequelize.models üzerinden erişiyoruz
const getRoleModel = () => sequelize.models.Role;
const getUserModel = () => sequelize.models.User;

exports.getAll = async (req, res) => {
    try {
        const roles = await getRoleModel().findAll();

        const rolesWithCount = await Promise.all(roles.map(async (role) => {
            const count = await getUserModel().count({ 
                where: { 
                    role: { [Op.iLike]: role.name } 
                } 
            });
            return {
                ...role.toJSON(),
                userCount: count
            };
        }));
        res.json(rolesWithCount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const role = await getRoleModel().create(req.body);
        res.json(role);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Bu rol zaten mevcut' });
        }
        res.status(500).json({ message: error.message || 'Sunucu hatası' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        await getRoleModel().update(req.body, { where: { id } });
        res.json({ message: 'Rol güncellendi' });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Bu rol zaten mevcut' });
        }
        res.status(500).json({ message: error.message || 'Sunucu hatası' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await getRoleModel().findByPk(id);
        if (!role) {
            return res.status(404).json({ message: 'Rol bulunamadı' });
        }

        const userCount = await getUserModel().count({ where: { role: { [Op.iLike]: role.name } } });
        if (userCount > 0) {
            return res.status(400).json({ message: 'Bu role sahip kullanıcılar var, silinemez.' });
        }

        await role.destroy();
        res.json({ message: 'Rol silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};