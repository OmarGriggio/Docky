// ceci est un test
import "dotenv/config";
import app from "./app";



const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import { pool } from "./shared/config/database";

pool.query("SELECT NOW()")
  .then(res => console.log("DB OK:", res.rows[0]))
  .catch(err => console.error("DB ERROR:", err));

import { ensureBucketExistsServ } from "./shared/storage/storage.service";

ensureBucketExistsServ()
  .then(() => console.log("S3 bucket OK"))
  .catch(err => console.error("S3 ERROR:", err));