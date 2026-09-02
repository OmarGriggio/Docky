import fs from "fs";
import path from "path";
import multer from "multer";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

const EXTENSION_BY_MIME: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(UPLOADS_ROOT, "companies", String(req.params.id));
        fs.mkdirSync(dir, { recursive: true });

        // Remove any previous logo so a format change (e.g. jpg -> png) doesn't leave an orphaned file behind.
        for (const existing of fs.readdirSync(dir)) {
            if (existing.startsWith("logo.")) {
                fs.unlinkSync(path.join(dir, existing));
            }
        }

        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `logo${EXTENSION_BY_MIME[file.mimetype]}`);
    },
});

export const uploadLogo = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype in EXTENSION_BY_MIME) {
            cb(null, true);
        } else {
            cb(new Error("Seuls les fichiers JPG et PNG sont acceptés"));
        }
    },
}).single("logo");
