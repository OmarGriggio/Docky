import multer from "multer";

// PDF only for now - docx/xlsx planned later (see CLAUDE.md), just add their
// mimetypes here when that's built, nothing else needs to change.
export const ALLOWED_ATTACHMENT_MIMES = ["application/pdf"];

// Buffered in memory, not written to disk - project_attachment.controller.ts
// uploads the buffer to MinIO/S3 (see shared/storage/storage.service.ts).
export const uploadAttachment = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_ATTACHMENT_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Seuls les fichiers PDF sont acceptés"));
        }
    },
}).single("file");
