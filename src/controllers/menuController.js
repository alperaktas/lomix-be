const Menu = require('../models/Menu');

exports.getAll = async (req, res) => {
    try {
        const menus = await Menu.findAll({ order: [['order', 'ASC']] });
        res.json(menus);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const menu = await Menu.create(req.body);
        res.status(201).json(menu);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Menu.update(req.body, { where: { id } });
        if (updated) {
            const updatedMenu = await Menu.findByPk(id);
            res.json(updatedMenu);
        } else {
            res.status(404).json({ error: 'Menu not found' });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Menu.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Menu not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};