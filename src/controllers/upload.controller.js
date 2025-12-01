// src/controllers/upload.controller.js
export const UploadController = {
    async uploadKyc(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Thiếu file upload' });
            }

            // Base URL (lấy từ ENV hoặc mặc định localhost:5000)
            const baseUrl =
                process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

            const url = `${baseUrl}/uploads/kyc/${req.file.filename}`;

            return res.status(201).json({ url });
        } catch (err) {
            next(err);
        }
    },
};
