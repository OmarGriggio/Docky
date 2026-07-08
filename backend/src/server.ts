// ceci est un test
import "dotenv/config";
import app from "./app";



const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import { pool } from "./config/database";

pool.query("SELECT NOW()")
  .then(res => console.log("DB OK:", res.rows[0]))
  .catch(err => console.error("DB ERROR:", err));