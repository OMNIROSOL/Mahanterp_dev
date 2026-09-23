import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import exceljs from 'exceljs';
import { currencyCode } from './currency';
import { postPayment, postReceipt } from './ledger';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.xls', '.xlsx', '.csv']);
const MAX_BYTES = 10 * 1024 * 1024;
const ACCOUNT_TYPES = new Set(['Asset', 'Liability', 'Equity', 'Income', 'Expense']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

let phase5Ready = false;

export async function ensurePhase5Tables(db: any) {
  if (phase5Ready) return;
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const statements = [
    `CREATE TABLE IF NOT EXISTS finance.document_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_type TEXT NOT NULL,
      document_id UUID NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      storage_path TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_doc_attachments_doc ON finance.document_attachments (document_type, document_id)`,
    `CREATE TABLE IF NOT EXISTS finance.bank_statements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID,
      account_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      imported_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS finance.bank_statement_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_id UUID NOT NULL REFERENCES finance.bank_statements(id) ON DELETE CASCADE,
      line_date DATE NOT NULL,
      description TEXT,
      amount DECIMAL(15,2) NOT NULL,
      reference TEXT,
      status TEXT DEFAULT 'unmatched',
      matched_type TEXT,
      matched_id UUID,
      matched_reference TEXT
    )`,
  ];
  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (err) {
      console.error('[phase5] ensure failed:', sql, err);
    }
  }
  phase5Ready = true;
}

function normKey(k: string) {
  return String(k || '').trim().toLowerCase().replace(/[\s_\-./]+/g, '');
}

function pick(row: Record<string, any>, ...names: string[]) {
  const map: Record<string, any> = {};
  Object.keys(row || {}).forEach((k) => { map[normKey(k)] = row[k]; });
  for (const n of names) {
    const v = map[normKey(n)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseDate(raw: string) {
  if (!raw) return null;
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseNumber(raw: any) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] || '').trim(); });
    return row;
  });
}

async function parseSpreadsheet(file: Express.Multer.File) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.csv' || (file.mimetype || '').includes('csv')) {
    return parseCsv(file.buffer.toString('utf8').replace(/^\uFEFF/, ''));
  }
  const wb = new exceljs.Workbook();
  await wb.xlsx.load(file.buffer as any);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, col) => { headers[col] = String(cell.value ?? '').trim(); });
  const rows: Record<string, any>[] = [];
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    const obj: Record<string, any> = {};
    let empty = true;
    headers.forEach((h, col) => {
      if (!h) return;
      const cell = row.getCell(col);
      let val: any = cell.value;
      if (val && typeof val === 'object' && 'text' in val) val = (val as any).text;
      if (val && typeof val === 'object' && 'result' in val) val = (val as any).result;
      if (val instanceof Date) val = val.toISOString().slice(0, 10);
      obj[h] = val == null ? '' : String(val);
      if (String(obj[h]).trim()) empty = false;
    });
    if (!empty) rows.push(obj);
  });
  return rows;
}

function csvEscape(v: any) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const IMPORT_TYPES: Record<string, { label: string; columns: string[]; sample: string[] }> = {
  customers: {
    label: 'Customers',
    columns: ['code', 'name', 'email', 'currency', 'billingAddress', 'tpin', 'division', 'creditDays', 'creditLimit'],
    sample: ['CUST-0100', 'Sample Customer', 'ap@example.com', 'ZMW', 'Lusaka', '', 'General', '30', '0'],
  },
  suppliers: {
    label: 'Suppliers',
    columns: ['code', 'name', 'email', 'currency', 'billingAddress', 'tpin', 'division'],
    sample: ['SUP-0100', 'Sample Supplier', 'ap@example.com', 'USD', 'Lusaka', '', 'General'],
  },
  items: {
    label: 'Inventory items',
    columns: ['itemCode', 'itemName', 'unitName', 'category', 'purchasePrice', 'sellingPrice', 'qtyOnHand'],
    sample: ['ITM-0100', 'Sample Item', 'Pcs', 'General', '100', '150', '0'],
  },
  accounts: {
    label: 'Chart of accounts',
    columns: ['code', 'name', 'type', 'currency', 'isPaymentAccount'],
    sample: ['1999', 'Sample Asset', 'Asset', 'ZMW', 'false'],
  },
  receipts: {
    label: 'Receipts',
    columns: ['date', 'reference', 'paidByContact', 'receivedInAccount', 'amount', 'currency', 'description'],
    sample: ['2026-09-21', 'RCP-0100', 'Sample Customer', 'Petty Cash', '100', 'ZMW', 'Imported receipt'],
  },
  payments: {
    label: 'Payments',
    columns: ['date', 'reference', 'paidToContact', 'paidFromAccount', 'amount', 'currency', 'description'],
    sample: ['2026-09-21', 'PAY-0100', 'Sample Supplier', 'Petty Cash', '100', 'ZMW', 'Imported payment'],
  },
};

function daysBetween(a: Date, b: Date) {
  return Math.abs((a.getTime() - b.getTime()) / 86400000);
}

async function autoMatchLine(db: any, accountName: string, line: { date: string; amount: number; description: string; reference: string }) {
  const amt = Math.abs(Number(line.amount) || 0);
  if (amt <= 0) return null;
  const when = new Date(line.date);
  const from = new Date(when.getTime() - 5 * 86400000);
  const to = new Date(when.getTime() + 5 * 86400000);
  const isOutflow = Number(line.amount) < 0;
  if (isOutflow) {
    const payments = await db.payment.findMany({
      where: { paidFromAccount: accountName, date: { gte: from, lte: to } },
      select: { id: true, reference: true, amount: true, date: true, description: true },
    });
    const hit = (payments || []).find((p: any) =>
      Math.abs(Number(p.amount) - amt) < 0.02 && daysBetween(new Date(p.date), when) <= 5
    );
    if (hit) return { type: 'payment', id: hit.id, reference: hit.reference };
  } else {
    const receipts = await db.receipt.findMany({
      where: { receivedInAccount: accountName, date: { gte: from, lte: to } },
      select: { id: true, reference: true, amount: true, date: true, description: true },
    });
    const hit = (receipts || []).find((r: any) =>
      Math.abs(Number(r.amount) - amt) < 0.02 && daysBetween(new Date(r.date), when) <= 5
    );
    if (hit) return { type: 'receipt', id: hit.id, reference: hit.reference };
  }
  return null;
}

export function registerPhase5Routes(app: express.Express, prisma: any) {
  app.get('/api/attachments', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const documentType = String(req.query.documentType || '');
      const documentId = String(req.query.documentId || '');
      if (!documentType || !documentId) return res.json([]);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, document_type AS "documentType", document_id AS "documentId", file_name AS "fileName",
                mime_type AS "mimeType", file_size AS "fileSize", uploaded_at AS "uploadedAt"
         FROM finance.document_attachments
         WHERE document_type = $1 AND document_id = $2::uuid
         ORDER BY uploaded_at DESC`,
        documentType,
        documentId
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/attachments', upload.single('file'), async (req: any, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const file = req.file;
      const documentType = String(req.body.documentType || '');
      const documentId = String(req.body.documentId || '');
      if (!file) return res.status(400).json({ error: 'No file uploaded' });
      if (!documentType || !documentId) return res.status(400).json({ error: 'documentType and documentId are required' });
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ error: 'Allowed files: PDF, JPG, PNG, Excel, CSV' });
      if (file.size > MAX_BYTES) return res.status(400).json({ error: 'File is larger than 10MB' });
      const idRow = await prisma.$queryRawUnsafe(`SELECT gen_random_uuid() AS id`);
      const id = idRow[0].id;
      const stored = `${id}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, stored), file.buffer);
      await prisma.$executeRawUnsafe(
        `INSERT INTO finance.document_attachments (id, document_type, document_id, file_name, mime_type, file_size, storage_path)
         VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7)`,
        id,
        documentType,
        documentId,
        file.originalname,
        file.mimetype || null,
        file.size,
        stored
      );
      res.json({ id, documentType, documentId, fileName: file.originalname, mimeType: file.mimetype, fileSize: file.size });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/attachments/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT file_name AS "fileName", mime_type AS "mimeType", storage_path AS "storagePath"
         FROM finance.document_attachments WHERE id = $1::uuid`,
        req.params.id
      );
      const row = rows[0];
      if (!row) return res.status(404).json({ error: 'Attachment not found' });
      const full = path.join(UPLOAD_DIR, row.storagePath);
      if (!fs.existsSync(full)) return res.status(404).json({ error: 'File missing on disk' });
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.fileName)}"`);
      if (row.mimeType) res.setHeader('Content-Type', row.mimeType);
      res.sendFile(full);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/attachments/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT storage_path AS "storagePath" FROM finance.document_attachments WHERE id = $1::uuid`,
        req.params.id
      );
      if (rows[0]?.storagePath) {
        const full = path.join(UPLOAD_DIR, rows[0].storagePath);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      }
      await prisma.$executeRawUnsafe(`DELETE FROM finance.document_attachments WHERE id = $1::uuid`, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/bank-statements', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const accountName = String(req.query.accountName || '');
      const rows = await prisma.$queryRawUnsafe(
        accountName
          ? `SELECT s.id, s.account_id AS "accountId", s.account_name AS "accountName", s.file_name AS "fileName", s.imported_at AS "importedAt",
                    COUNT(l.id)::int AS "lineCount",
                    COUNT(*) FILTER (WHERE l.status = 'reconciled')::int AS "reconciledCount"
             FROM finance.bank_statements s
             LEFT JOIN finance.bank_statement_lines l ON l.statement_id = s.id
             WHERE s.account_name = $1
             GROUP BY s.id
             ORDER BY s.imported_at DESC`
          : `SELECT s.id, s.account_id AS "accountId", s.account_name AS "accountName", s.file_name AS "fileName", s.imported_at AS "importedAt",
                    COUNT(l.id)::int AS "lineCount",
                    COUNT(*) FILTER (WHERE l.status = 'reconciled')::int AS "reconciledCount"
             FROM finance.bank_statements s
             LEFT JOIN finance.bank_statement_lines l ON l.statement_id = s.id
             GROUP BY s.id
             ORDER BY s.imported_at DESC`,
        ...(accountName ? [accountName] : [])
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/bank-statements/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const statements = await prisma.$queryRawUnsafe(
        `SELECT id, account_id AS "accountId", account_name AS "accountName", file_name AS "fileName", imported_at AS "importedAt"
         FROM finance.bank_statements WHERE id = $1::uuid`,
        req.params.id
      );
      if (!statements[0]) return res.status(404).json({ error: 'Statement not found' });
      const lines = await prisma.$queryRawUnsafe(
        `SELECT id, line_date AS date, description, amount, reference, status,
                matched_type AS "matchedType", matched_id AS "matchedId", matched_reference AS "matchedReference"
         FROM finance.bank_statement_lines WHERE statement_id = $1::uuid ORDER BY line_date, amount`,
        req.params.id
      );
      res.json({ ...statements[0], lines });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bank-statements/import', upload.single('file'), async (req: any, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const file = req.file;
      const accountName = String(req.body.accountName || '').trim();
      const accountId = req.body.accountId || null;
      if (!file) return res.status(400).json({ error: 'No statement file uploaded' });
      if (!accountName) return res.status(400).json({ error: 'Select a bank or cash account' });
      const rows = await parseSpreadsheet(file);
      if (!rows.length) return res.status(400).json({ error: 'No rows found. Use Date, Description, Amount (or Debit/Credit).' });
      const created = accountId
        ? await prisma.$queryRawUnsafe(
            `INSERT INTO finance.bank_statements (account_id, account_name, file_name)
             VALUES ($1::uuid, $2, $3) RETURNING id`,
            accountId,
            accountName,
            file.originalname
          )
        : await prisma.$queryRawUnsafe(
            `INSERT INTO finance.bank_statements (account_name, file_name)
             VALUES ($1, $2) RETURNING id`,
            accountName,
            file.originalname
          );
      const statementId = created[0].id;
      let imported = 0;
      let matched = 0;
      for (const row of rows) {
        const date = parseDate(pick(row, 'date', 'transactiondate', 'valuedate', 'postingdate'));
        const description = pick(row, 'description', 'narration', 'details', 'particulars', 'memo');
        const reference = pick(row, 'reference', 'ref', 'cheque', 'chequeno', 'id');
        let amount = parseNumber(pick(row, 'amount'));
        const debit = parseNumber(pick(row, 'debit', 'withdrawal', 'moneyout'));
        const credit = parseNumber(pick(row, 'credit', 'deposit', 'moneyin'));
        if (!pick(row, 'amount') && (debit || credit)) amount = credit - debit;
        if (!date || !amount) continue;
        const suggestion = await autoMatchLine(prisma, accountName, { date, amount, description, reference });
        const status = suggestion ? 'matched' : 'unmatched';
        if (suggestion) matched += 1;
        await prisma.$executeRawUnsafe(
          `INSERT INTO finance.bank_statement_lines
            (statement_id, line_date, description, amount, reference, status, matched_type, matched_id, matched_reference)
           VALUES ($1::uuid, $2::date, $3, $4, $5, $6, $7, $8, $9)`,
          statementId,
          date,
          description || null,
          amount,
          reference || null,
          status,
          suggestion?.type || null,
          suggestion?.id || null,
          suggestion?.reference || null
        );
        imported += 1;
      }
      res.json({ id: statementId, imported, matched });
    } catch (err: any) {
      console.error('[bank import]', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bank-statement-lines/:id/match', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const { matchedType, matchedId, matchedReference, status } = req.body;
      await prisma.$executeRawUnsafe(
        `UPDATE finance.bank_statement_lines
         SET status = $2, matched_type = $3, matched_id = $4, matched_reference = $5
         WHERE id = $1::uuid`,
        req.params.id,
        status || (matchedId ? 'matched' : 'unmatched'),
        matchedType || null,
        matchedId || null,
        matchedReference || null
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bank-statements/:id/complete', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      await prisma.$executeRawUnsafe(
        `UPDATE finance.bank_statement_lines SET status = 'reconciled'
         WHERE statement_id = $1::uuid AND status = 'matched'`,
        req.params.id
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bank-statement-lines/:id/create', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT l.id, l.line_date AS date, l.description, l.amount, l.reference, l.status,
                s.account_name AS "accountName"
         FROM finance.bank_statement_lines l
         JOIN finance.bank_statements s ON s.id = l.statement_id
         WHERE l.id = $1::uuid`,
        req.params.id
      );
      const line = rows[0];
      if (!line) return res.status(404).json({ error: 'Statement line not found' });
      if (line.status === 'reconciled') return res.status(400).json({ error: 'Line is already reconciled' });
      const amt = Math.abs(Number(line.amount) || 0);
      if (amt <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
      const isOutflow = Number(line.amount) < 0;
      const contact = String(req.body.contact || line.description || 'Bank statement').slice(0, 120);
      if (isOutflow) {
        const payment = await prisma.payment.create({
          data: {
            reference: `PAY-REC-${Date.now()}`,
            date: new Date(line.date),
            paidToContact: contact,
            paidFromAccount: line.accountName,
            amount: amt,
            currency: 'ZMW',
            description: line.description || 'Created from bank statement',
            status: 'Completed',
          },
        });
        try { await postPayment(prisma, payment); } catch (err) { console.error('[bank create payment]', err); }
        await prisma.$executeRawUnsafe(
          `UPDATE finance.bank_statement_lines
           SET status = 'matched', matched_type = 'payment', matched_id = $2::uuid, matched_reference = $3
           WHERE id = $1::uuid`,
          req.params.id,
          payment.id,
          payment.reference
        );
        return res.json({ type: 'payment', document: payment });
      }
      const receipt = await prisma.receipt.create({
        data: {
          reference: `RCP-REC-${Date.now()}`,
          date: new Date(line.date),
          paidByContact: contact,
          receivedInAccount: line.accountName,
          amount: amt,
          currency: 'ZMW',
          description: line.description || 'Created from bank statement',
          status: 'Completed',
        },
      });
      try { await postReceipt(prisma, receipt); } catch (err) { console.error('[bank create receipt]', err); }
      await prisma.$executeRawUnsafe(
        `UPDATE finance.bank_statement_lines
         SET status = 'matched', matched_type = 'receipt', matched_id = $2::uuid, matched_reference = $3
         WHERE id = $1::uuid`,
        req.params.id,
        receipt.id,
        receipt.reference
      );
      res.json({ type: 'receipt', document: receipt });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/import/types', (_req, res) => {
    res.json(Object.entries(IMPORT_TYPES).map(([id, meta]) => ({ id, label: meta.label, columns: meta.columns })));
  });

  app.get('/api/import/template/:type', (req, res) => {
    const spec = IMPORT_TYPES[req.params.type];
    if (!spec) return res.status(404).json({ error: 'Unknown import type' });
    const csv = [spec.columns.join(','), spec.columns.map((_, i) => csvEscape(spec.sample[i] || '')).join(',')].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-template.csv"`);
    res.send(csv);
  });

  app.post('/api/import/:type', upload.single('file'), async (req: any, res) => {
    try {
      const spec = IMPORT_TYPES[req.params.type];
      if (!spec) return res.status(404).json({ error: 'Unknown import type' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const rows = await parseSpreadsheet(req.file);
      const preview = await validateImport(prisma, req.params.type, rows);
      res.json({ rows: preview, valid: preview.filter((r) => r.ok).length, errors: preview.filter((r) => !r.ok).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/import/:type/commit', async (req, res) => {
    try {
      const spec = IMPORT_TYPES[req.params.type];
      if (!spec) return res.status(404).json({ error: 'Unknown import type' });
      const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
      const result = await commitImport(prisma, req.params.type, rows);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

async function validateImport(db: any, type: string, rows: Record<string, any>[]) {
  const existingCodes = new Set<string>();
  const accountNames = new Set<string>();
  if (type === 'customers') (await db.customer.findMany({ select: { code: true } })).forEach((r: any) => existingCodes.add(String(r.code).toLowerCase()));
  if (type === 'suppliers') (await db.suppliers.findMany({ select: { code: true } })).forEach((r: any) => existingCodes.add(String(r.code).toLowerCase()));
  if (type === 'items') (await db.item.findMany({ select: { itemCode: true } })).forEach((r: any) => existingCodes.add(String(r.itemCode).toLowerCase()));
  if (type === 'accounts') (await db.chartOfAccount.findMany({ select: { code: true } })).forEach((r: any) => existingCodes.add(String(r.code).toLowerCase()));
  if (type === 'receipts' || type === 'payments') {
    (await db.chartOfAccount.findMany({ select: { name: true } })).forEach((r: any) => accountNames.add(String(r.name).toLowerCase()));
    if (type === 'receipts') (await db.receipt.findMany({ select: { reference: true } })).forEach((r: any) => existingCodes.add(String(r.reference).toLowerCase()));
    if (type === 'payments') (await db.payment.findMany({ select: { reference: true } })).forEach((r: any) => existingCodes.add(String(r.reference).toLowerCase()));
  }
  const seen = new Set<string>();
  return rows.map((row, index) => {
    const mapped = mapImportRow(type, row);
    const errors: string[] = [];
    if (!mapped.name && type !== 'items' && type !== 'receipts' && type !== 'payments') errors.push('Name is required');
    if (type === 'items' && !mapped.itemName) errors.push('Item name is required');
    if (type === 'items' && !mapped.itemCode) errors.push('Item code is required');
    if ((type === 'customers' || type === 'suppliers' || type === 'accounts') && !mapped.code) errors.push('Code is required');
    if (type === 'accounts' && mapped.type && !ACCOUNT_TYPES.has(mapped.type)) errors.push('Type must be Asset, Liability, Equity, Income or Expense');
    if (type === 'receipts' || type === 'payments') {
      if (!mapped.amount || Number(mapped.amount) <= 0) errors.push('Amount must be greater than 0');
      if (type === 'receipts' && !mapped.receivedInAccount) errors.push('Received in account is required');
      if (type === 'payments' && !mapped.paidFromAccount) errors.push('Paid from account is required');
      const acct = String((type === 'receipts' ? mapped.receivedInAccount : mapped.paidFromAccount) || '').toLowerCase();
      if (acct && accountNames.size && !accountNames.has(acct)) errors.push('Bank or cash account was not found');
    }
    const codeKey = String(mapped.code || mapped.itemCode || mapped.reference || '').toLowerCase();
    if (codeKey && existingCodes.has(codeKey)) errors.push(type === 'receipts' || type === 'payments' ? 'Reference already exists' : 'Code already exists');
    if (codeKey && seen.has(codeKey)) errors.push('Duplicate code in this file');
    if (codeKey) seen.add(codeKey);
    return { row: index + 2, ok: errors.length === 0, errors, data: mapped };
  });
}

function mapImportRow(type: string, row: Record<string, any>) {
  if (type === 'customers') {
    return {
      code: pick(row, 'code', 'customercode'),
      name: pick(row, 'name', 'customer', 'customername'),
      email: pick(row, 'email'),
      currency: currencyCode(pick(row, 'currency') || 'ZMW'),
      billingAddress: pick(row, 'billingaddress', 'address'),
      tpin: pick(row, 'tpin'),
      division: pick(row, 'division') || 'General',
      creditDays: parseInt(pick(row, 'creditdays') || '30', 10) || 30,
      creditLimit: parseNumber(pick(row, 'creditlimit')),
    };
  }
  if (type === 'suppliers') {
    return {
      code: pick(row, 'code', 'suppliercode'),
      name: pick(row, 'name', 'supplier', 'suppliername'),
      email: pick(row, 'email'),
      currency: currencyCode(pick(row, 'currency') || 'ZMW'),
      billingAddress: pick(row, 'billingaddress', 'address'),
      tpin: pick(row, 'tpin'),
      division: pick(row, 'division') || 'General',
    };
  }
  if (type === 'items') {
    return {
      itemCode: pick(row, 'itemcode', 'code'),
      itemName: pick(row, 'itemname', 'name'),
      unitName: pick(row, 'unitname', 'unit') || 'Pcs',
      category: pick(row, 'category'),
      purchasePrice: parseNumber(pick(row, 'purchaseprice', 'cost')),
      sellingPrice: parseNumber(pick(row, 'sellingprice', 'price')),
      qtyOnHand: parseNumber(pick(row, 'qtyonhand', 'qty', 'stock')),
    };
  }
  if (type === 'accounts') {
    const pay = pick(row, 'ispaymentaccount', 'paymentaccount', 'bank').toLowerCase();
    return {
      code: pick(row, 'code', 'accountcode'),
      name: pick(row, 'name', 'account', 'accountname'),
      type: pick(row, 'type', 'accounttype') || 'Asset',
      currency: currencyCode(pick(row, 'currency') || 'ZMW'),
      isPaymentAccount: pay === 'true' || pay === 'yes' || pay === '1',
    };
  }
  if (type === 'receipts') {
    return {
      date: parseDate(pick(row, 'date')) || new Date().toISOString().slice(0, 10),
      reference: pick(row, 'reference', 'ref'),
      paidByContact: pick(row, 'paidbycontact', 'customer', 'payer'),
      receivedInAccount: pick(row, 'receivedinaccount', 'account', 'bank'),
      amount: parseNumber(pick(row, 'amount')),
      currency: currencyCode(pick(row, 'currency') || 'ZMW'),
      description: pick(row, 'description'),
    };
  }
  return {
    date: parseDate(pick(row, 'date')) || new Date().toISOString().slice(0, 10),
    reference: pick(row, 'reference', 'ref'),
    paidToContact: pick(row, 'paidtocontact', 'supplier', 'payee'),
    paidFromAccount: pick(row, 'paidfromaccount', 'account', 'bank'),
    amount: parseNumber(pick(row, 'amount')),
    currency: currencyCode(pick(row, 'currency') || 'ZMW'),
    description: pick(row, 'description'),
  };
}

async function commitImport(db: any, type: string, rows: any[]) {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const row of rows) {
    const data = row.data || mapImportRow(type, row);
    try {
      if (type === 'customers') {
        await db.customer.create({ data: { ...data, status: 'Active', inactive: false } });
      } else if (type === 'suppliers') {
        await db.suppliers.create({ data: { ...data, status: 'Paid', controlAccount: 'Accounts Payable' } });
      } else if (type === 'items') {
        await db.item.create({ data });
      } else if (type === 'accounts') {
        await db.chartOfAccount.create({
          data: {
            code: data.code,
            name: data.name,
            accountType: data.type,
            currency: data.currency,
            isPaymentAccount: data.isPaymentAccount,
          },
        });
      } else if (type === 'receipts') {
        const receipt = await db.receipt.create({
          data: {
            date: new Date(data.date),
            reference: data.reference || `RCP-IMP-${Date.now()}-${created}`,
            paidByContact: data.paidByContact || 'Imported',
            receivedInAccount: data.receivedInAccount,
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            status: 'Completed',
          },
        });
        try { await postReceipt(db, receipt); } catch (err) { console.error('[import receipt ledger]', err); }
      } else if (type === 'payments') {
        const payment = await db.payment.create({
          data: {
            date: new Date(data.date),
            reference: data.reference || `PAY-IMP-${Date.now()}-${created}`,
            paidToContact: data.paidToContact || 'Imported',
            paidFromAccount: data.paidFromAccount,
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            status: 'Completed',
          },
        });
        try { await postPayment(db, payment); } catch (err) { console.error('[import payment ledger]', err); }
      }
      created += 1;
    } catch (err: any) {
      skipped += 1;
      errors.push(`Row ${row.row || '?'}: ${err.message}`);
    }
  }
  return { created, skipped, errors };
}
