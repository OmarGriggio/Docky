import { ImportField } from './import-columns';

// What POST /client/import answers (backend client-import.ts): every row
// sent, judged - the client and address it becomes, what blocks it, what's
// worth a look.
export interface ImportIssue {
  field: ImportField;
  // Translated as clients.import.issues.<code>.
  code: string;
  params?: Record<string, string | number>;
}

export interface ImportRowResult {
  client: {
    // Null: one is generated at the import.
    client_number: string | null;
    type: 'PROFESSIONAL' | 'INDIVIDUAL';
    company_name: string | null;
    last_name: string | null;
  };
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

export interface ImportReport {
  rows: ImportRowResult[];
  created: number;
}
