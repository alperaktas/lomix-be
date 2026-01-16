const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const authController = require('../controllers/authController');

// Multer Konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Sadece resim dosyaları (jpeg, jpg, png, gif) yüklenebilir!'));
    }
});

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/auth/change-password', authController.changePassword);

router.put('/auth/profile', (req, res, next) => {
    upload.single('avatarFile')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE' ? 'Dosya boyutu çok büyük (Max 2MB).' : err.message;
            return res.status(400).json({ message });
        }
        next();
    });
}, authController.updateProfile);

module.exports = router;