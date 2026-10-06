// Borra la base SQLite local. En el proximo arranque el servidor la recrea
// y la vuelve a poblar con el seed deterministico.
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "devpanel.db");

for (const suffix of ["", "-shm", "-wal"]) {
  const file = dbPath + suffix;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`borrado ${file}`);
  }
}

console.log("Base de datos reseteada. Corre `npm run dev` para regenerarla.");
