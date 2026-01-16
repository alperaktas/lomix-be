const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

// Model server.js'de init edildiği için sequelize.models üzerinden erişiyoruz
const getUserModel = () => sequelize.models.User;
const getGroupModel = () => sequelize.models.Group;
const getUserGroupModel = () => sequelize.models.UserGroup;
const getUserLogModel = () => sequelize.models.UserLog;

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const search = req.query.search;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { username: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const includeOption = [{
            model: getGroupModel(),
            as: 'groups',
            attributes: ['id', 'name'],
            through: { attributes: [] }
        }];

        if (page && limit) {
            const offset = (page - 1) * limit;
            const { count, rows } = await getUserModel().findAndCountAll({
                attributes: { exclude: ['password'] },
                include: includeOption,
                distinct: true, // İlişkili verilerle sayım yaparken doğru sonuç için
                where: whereClause,
                limit,
                offset,
                order: [['id', 'ASC'], [{ model: getGroupModel(), as: 'groups' }, 'name', 'ASC']]
            });
            return res.json({ totalItems: count, users: rows });
        }

        // Şifre alanını hariç tutarak getir
        const users = await getUserModel().findAll({
            attributes: { exclude: ['password'] },
            where: whereClause,
            include: includeOption,
            order: [['id', 'ASC'], [{ model: getGroupModel(), as: 'groups' }, 'name', 'ASC']]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        console.log("GET /api/users/stats isteği alındı."); // Debug için log

        const User = getUserModel();
        const Group = getGroupModel();
        const UserGroup = getUserGroupModel();

        if (!User || !Group || !UserGroup) {
            console.error("Modeller yüklenemedi: User, Group veya UserGroup eksik.");
            return res.status(500).json({ message: 'Veritabanı modelleri yüklenemedi.' });
        }

        // 1. Toplam Kullanıcı Sayısı
        const totalUsers = await User.count();

        // 2. Rol Başına Kullanıcı Sayısı
        const roles = await User.findAll({
            attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['role']
        });

        // 3. Grup Başına Kullanıcı Sayısı
        const allGroups = await Group.findAll();
        const groups = await Promise.all(allGroups.map(async (group) => {
             const count = await UserGroup.count({ where: { groupId: group.id } });
             return { name: group.name, count };
        }));

        res.json({ totalUsers, roles, groups });
    } catch (error) {
        console.error("getStats Hatası:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const { userId, ipAddress, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (userId) {
            whereClause.userId = userId;
        }
        if (ipAddress) {
            whereClause.ipAddress = { [Op.iLike]: `%${ipAddress}%` };
        }
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                whereClause.createdAt[Op.lte] = end;
            }
        }

        const { count, rows } = await getUserLogModel().findAndCountAll({
            where: whereClause,
            include: [{
                model: getUserModel(),
                as: 'user',
                attributes: ['username', 'email']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({ totalItems: count, logs: rows });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        console.log("Kullanıcı Oluşturma İsteği:", req.body); // Gelen veriyi kontrol et

        const { username, password, email, role, groups, avatar, phone, status } = req.body;
        // Şifre hashleme
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await getUserModel().create({
            username,
            email,
            password: hashedPassword,
            role,
            avatar,
            phone,
            status
        });

        if (groups && Array.isArray(groups)) {
            console.log(`Kullanıcı (${user.id}) için gruplar atanıyor:`, groups);
            await user.setGroups(groups);
        }
        
        // Cevap dönerken şifreyi gizle
        const userResponse = user.toJSON();
        delete userResponse.password;
        
        res.json(userResponse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Kullanıcı (${id}) Güncelleme İsteği:`, req.body); // Gelen veriyi kontrol et

        const { username, email, role, password, groups, avatar, phone, status } = req.body;
        const updateData = { username, email, role, avatar, phone, status };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await getUserModel().findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        await user.update(updateData);

        if (groups && Array.isArray(groups)) {
            console.log(`Kullanıcı (${user.id}) için gruplar güncelleniyor:`, groups);
            await user.setGroups(groups);
        }

        res.json({ message: 'Kullanıcı güncellendi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        await getUserModel().destroy({ where: { id } });
        res.json({ message: 'Kullanıcı silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};