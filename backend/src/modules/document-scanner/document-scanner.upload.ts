import multer from "multer";

// Buffered in memory, not written to disk - nothing here needs to persist
// the file itself, only the text extracted from it.
export const uploadScannedDocument = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Seuls les fichiers PDF sont acceptés"));
        }
    },
}).single("file");
