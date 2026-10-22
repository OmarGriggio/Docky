import "dotenv/config";
import { deleteFilesWithPrefixServ } from "./storage.service";

// One-off command, not part of the server: deletes every stored file of one
// company (logo, header image, project attachments - all under
// companies/{id}/). Run by scripts/reset-demo-cron.sh right after
// reset-demo-company.sql, which already cleared the rows pointing at them -
// otherwise a demo visitor's uploads would pile up in MinIO forever.
//   node dist/shared/storage/purge-company-files.js 2
const companyId = Number(process.argv[2]);

if (!Number.isInteger(companyId) || companyId <= 0) {
  console.error("Usage: purge-company-files <companyId>");
  process.exit(1);
}

deleteFilesWithPrefixServ(`companies/${companyId}/`)
  .then(deleted => console.log(`Deleted ${deleted} file(s) of company ${companyId}`))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
