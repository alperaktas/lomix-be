const sequelize = require('../config/db');

// Model server.js'de init edildiği için sequelize.models üzerinden erişiyoruz
const getEndpointModel = () => sequelize.models.Endpoint;

exports.getAll = async (req, res) => {
    try {
        const endpoints = await getEndpointModel().findAll({ order: [['category', 'ASC'], ['path', 'ASC']] });
        res.json(endpoints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};