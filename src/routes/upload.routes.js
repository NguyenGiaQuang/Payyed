// src/routes/upload.routes.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { UploadController } from '../controllers/upload.controller.js';

const router = Router();

// Lấy đường dẫn gốc project (vì đang dùng ESModule)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Folder lưu file KYC
const uploadDir = path.join(projectRoot, 'uploads', 'kyc');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const safeType = (req.body.doc_type || 'KYC').toUpperCase(); // optional
        const timestamp = Date.now();
        cb(null, `${timestamp}-${safeType}${ext}`);
    },
});

function fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Chỉ cho phép upload file ảnh'), false);
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/uploads/kyc
router.post(
    '/kyc',
    auth(true),
    requireRole(['CUSTOMER']),
    upload.single('file'),        // field name = "file"
    UploadController.uploadKyc
);

export default router;
