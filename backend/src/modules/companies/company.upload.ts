import multer from "multer";

export const EXTENSION_BY_MIME: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
};

// Buffered in memory, not written to disk - company.controller.ts uploads
// the buffer to MinIO/S3 (see shared/storage/storage.service.ts).
export const uploadLogo = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype in EXTENSION_BY_MIME) {
            cb(null, true);
        } else {
            cb(new Error("Seuls les fichiers JPG et PNG sont acceptés"));
        }
    },
}).single("logo");
