import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import exceljs from 'exceljs';
import { currencyCode } from './currency';
import { postPayment, postReceipt, postJournal } from './ledger';

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
    `ALTER TABLE master.suppliers ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE master.suppliers ADD COLUMN IF NOT EXISTS product_categories JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE master.suppliers ADD COLUMN IF NOT EXISTS tpin TEXT`,
    `CREATE TABLE IF NOT EXISTS master.system_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS finance.bank_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pattern TEXT NOT NULL,
      account_name TEXT NOT NULL,
      target_type TEXT DEFAULT 'Payment',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS finance.fixed_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_code TEXT UNIQUE NOT NULL,
      asset_name TEXT NOT NULL,
      description TEXT,
      purchase_date DATE,
      purchase_cost DECIMAL(15,2) DEFAULT 0,
      depreciation_rate DECIMAL(5,2) DEFAULT 0,
      depreciation_method TEXT DEFAULT 'Straight Line',
      accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
      book_value DECIMAL(15,2) DEFAULT 0,
      asset_account_id UUID,
      expense_account_id UUID,
      status TEXT DEFAULT 'Active',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS finance.depreciation_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID NOT NULL REFERENCES finance.fixed_assets(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
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
        const isCharge = req.body.account?.toLowerCase().includes('charge') || 
                         /charge|fee|comm|tariff|duty|vat|sms|maint/i.test(line.description || '');
        const targetAccount = req.body.account || (isCharge ? 'Bank Charges' : undefined);
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
            items: targetAccount ? [
              {
                item: '',
                account: targetAccount,
                description: line.description || 'Bank charge',
                amount: amt,
                total: amt
              }
            ] : undefined
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
      const isInterest = req.body.account?.toLowerCase().includes('interest') ||
                         /interest|yield/i.test(line.description || '');
      const targetIncomeAccount = req.body.account || (isInterest ? 'Interest Income' : undefined);
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
          items: targetIncomeAccount ? [
            {
              item: '',
              account: targetIncomeAccount,
              description: line.description || 'Bank credit',
              amount: amt,
              total: amt
            }
          ] : undefined
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

  // --- LOCK DATE SETTINGS ---
  app.get('/api/settings/lock-date', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT value FROM master.system_settings WHERE key = 'lock_date'`
      );
      res.json(rows[0]?.value || { lockDate: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings/lock-date', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const { lockDate } = req.body;
      await prisma.$executeRawUnsafe(
        `INSERT INTO master.system_settings (key, value, updated_at)
         VALUES ('lock_date', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        JSON.stringify({ lockDate: lockDate || null })
      );
      res.json({ success: true, lockDate: lockDate || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- STARTING BALANCES SETTINGS ---
  app.get('/api/settings/starting-balances', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT value FROM master.system_settings WHERE key = 'starting_balances'`
      );
      res.json(rows[0]?.value || { startingDate: null, balances: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings/starting-balances', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const { startingDate, balances } = req.body;
      await prisma.$executeRawUnsafe(
        `INSERT INTO master.system_settings (key, value, updated_at)
         VALUES ('starting_balances', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        JSON.stringify({ startingDate, balances: balances || [] })
      );
      res.json({ success: true, startingDate, balances });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- BANK RULES ---
  app.get('/api/bank-rules', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, pattern, account_name AS "accountName", target_type AS "targetType", created_at AS "createdAt"
         FROM finance.bank_rules ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bank-rules', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const { pattern, accountName, targetType } = req.body;
      if (!pattern || !accountName) return res.status(400).json({ error: 'pattern and accountName are required' });
      const idRow = await prisma.$queryRawUnsafe(`SELECT gen_random_uuid() AS id`);
      const id = idRow[0].id;
      await prisma.$executeRawUnsafe(
        `INSERT INTO finance.bank_rules (id, pattern, account_name, target_type)
         VALUES ($1::uuid, $2, $3, $4)`,
        id, pattern, accountName, targetType || 'Payment'
      );
      res.json({ id, pattern, accountName, targetType: targetType || 'Payment' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/bank-rules/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const { pattern, accountName, targetType } = req.body;
      await prisma.$executeRawUnsafe(
        `UPDATE finance.bank_rules
         SET pattern = $2, account_name = $3, target_type = $4
         WHERE id = $1::uuid`,
        req.params.id, pattern, accountName, targetType || 'Payment'
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/bank-rules/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      await prisma.$executeRawUnsafe(`DELETE FROM finance.bank_rules WHERE id = $1::uuid`, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- FIXED ASSETS ---
  app.get('/api/fixed-assets', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT fa.id, fa.asset_code AS "assetCode", fa.asset_name AS "assetName",
                fa.description, fa.purchase_date AS "purchaseDate", fa.purchase_cost AS "purchaseCost",
                fa.depreciation_rate AS "depreciationRate", fa.depreciation_method AS "depreciationMethod",
                fa.accumulated_depreciation AS "accumulatedDepreciation", fa.book_value AS "bookValue",
                fa.asset_account_id AS "assetAccountId", fa.expense_account_id AS "expenseAccountId",
                fa.status, fa.created_at AS "createdAt",
                coa1.name AS "assetAccountName", coa2.name AS "expenseAccountName"
         FROM finance.fixed_assets fa
         LEFT JOIN finance.chart_of_accounts coa1 ON coa1.id = fa.asset_account_id
         LEFT JOIN finance.chart_of_accounts coa2 ON coa2.id = fa.expense_account_id
         ORDER BY fa.asset_code ASC`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fixed-assets', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const {
        assetCode, assetName, description, purchaseDate, purchaseCost,
        depreciationRate, depreciationMethod, assetAccountId, expenseAccountId
      } = req.body;
      if (!assetCode || !assetName) return res.status(400).json({ error: 'Asset code and name are required' });
      const cost = Number(purchaseCost) || 0;
      const rate = Number(depreciationRate) || 0;
      const idRow = await prisma.$queryRawUnsafe(`SELECT gen_random_uuid() AS id`);
      const id = idRow[0].id;
      const pDate = purchaseDate || new Date().toISOString().slice(0, 10);
      await prisma.$executeRawUnsafe(
        `INSERT INTO finance.fixed_assets (
          id, asset_code, asset_name, description, purchase_date, purchase_cost,
          depreciation_rate, depreciation_method, accumulated_depreciation, book_value,
          asset_account_id, expense_account_id, status
        ) VALUES (
          $1::uuid, $2, $3, $4, $5::date, $6, $7, $8, 0, $6, $9::uuid, $10::uuid, 'Active'
        )`,
        id, assetCode, assetName, description || null, pDate,
        cost, rate, depreciationMethod || 'Straight Line',
        assetAccountId || null, expenseAccountId || null
      );
      res.json({ id, assetCode, assetName, purchaseCost: cost, bookValue: cost });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/fixed-assets/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT fa.id, fa.asset_code AS "assetCode", fa.asset_name AS "assetName",
                fa.description, fa.purchase_date AS "purchaseDate", fa.purchase_cost AS "purchaseCost",
                fa.depreciation_rate AS "depreciationRate", fa.depreciation_method AS "depreciationMethod",
                fa.accumulated_depreciation AS "accumulatedDepreciation", fa.book_value AS "bookValue",
                fa.asset_account_id AS "assetAccountId", fa.expense_account_id AS "expenseAccountId",
                fa.status, coa1.name AS "assetAccountName", coa2.name AS "expenseAccountName"
         FROM finance.fixed_assets fa
         LEFT JOIN finance.chart_of_accounts coa1 ON coa1.id = fa.asset_account_id
         LEFT JOIN finance.chart_of_accounts coa2 ON coa2.id = fa.expense_account_id
         WHERE fa.id = $1::uuid`,
        req.params.id
      );
      if (!rows.length) return res.status(404).json({ error: 'Fixed asset not found' });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/fixed-assets/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const {
        assetCode, assetName, description, purchaseDate, purchaseCost,
        depreciationRate, depreciationMethod, assetAccountId, expenseAccountId, status
      } = req.body;
      const cost = Number(purchaseCost) || 0;
      await prisma.$executeRawUnsafe(
        `UPDATE finance.fixed_assets
         SET asset_code = $2, asset_name = $3, description = $4,
             purchase_date = $5::date, purchase_cost = $6,
             depreciation_rate = $7, depreciation_method = $8,
             asset_account_id = $9::uuid, expense_account_id = $10::uuid,
             status = $11, book_value = $6 - accumulated_depreciation
         WHERE id = $1::uuid`,
        req.params.id, assetCode, assetName, description || null,
        purchaseDate, cost, Number(depreciationRate) || 0,
        depreciationMethod || 'Straight Line',
        assetAccountId || null, expenseAccountId || null, status || 'Active'
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/fixed-assets/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      await prisma.$executeRawUnsafe(`DELETE FROM finance.fixed_assets WHERE id = $1::uuid`, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- DEPRECIATION ENTRIES ---
  app.get('/api/depreciation-entries', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT de.id, de.asset_id AS "assetId", de.entry_date AS "entryDate",
                de.amount, de.description, de.created_at AS "createdAt",
                fa.asset_code AS "assetCode", fa.asset_name AS "assetName"
         FROM finance.depreciation_entries de
         JOIN finance.fixed_assets fa ON fa.id = de.asset_id
         ORDER BY de.entry_date DESC`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/depreciation-entries', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const { assetId, entryDate, amount, description } = req.body;
      const amt = Number(amount) || 0;
      if (!assetId || amt <= 0) return res.status(400).json({ error: 'Asset and positive amount required' });

      const assetRows = await prisma.$queryRawUnsafe(
        `SELECT id, asset_code AS "assetCode", asset_name AS "assetName",
                asset_account_id AS "assetAccountId", expense_account_id AS "expenseAccountId"
         FROM finance.fixed_assets WHERE id = $1::uuid`,
        assetId
      );
      if (!assetRows.length) return res.status(404).json({ error: 'Asset not found' });
      const asset = assetRows[0];

      const idRow = await prisma.$queryRawUnsafe(`SELECT gen_random_uuid() AS id`);
      const id = idRow[0].id;
      const dateVal = entryDate || new Date().toISOString().slice(0, 10);

      await prisma.$executeRawUnsafe(
        `INSERT INTO finance.depreciation_entries (id, asset_id, entry_date, amount, description)
         VALUES ($1::uuid, $2::uuid, $3::date, $4, $5)`,
        id, assetId, dateVal, amt, description || `Depreciation for ${asset.assetName}`
      );

      await prisma.$executeRawUnsafe(
        `UPDATE finance.fixed_assets
         SET accumulated_depreciation = accumulated_depreciation + $2,
             book_value = purchase_cost - (accumulated_depreciation + $2)
         WHERE id = $1::uuid`,
        assetId, amt
      );

      if (asset.expenseAccountId && asset.assetAccountId) {
        try {
          await postJournal(prisma, {
            sourceDocumentId: id,
            transactionType: `Depreciation ${asset.assetCode}`,
            date: new Date(dateVal),
            lines: [
              { accountId: asset.expenseAccountId, debit: amt, credit: 0, description: `Depreciation - ${asset.assetName}` },
              { accountId: asset.assetAccountId, debit: 0, credit: amt, description: `Accumulated Depreciation - ${asset.assetName}` }
            ]
          });
        } catch (glErr) {
          console.error('Failed to post depreciation GL journal:', glErr);
        }
      }

      res.json({ id, assetId, entryDate: dateVal, amount: amt });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/depreciation-entries/:id', async (req, res) => {
    try {
      await ensurePhase5Tables(prisma);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT asset_id AS "assetId", amount FROM finance.depreciation_entries WHERE id = $1::uuid`,
        req.params.id
      );
      if (rows.length) {
        const { assetId, amount } = rows[0];
        await prisma.$executeRawUnsafe(
          `UPDATE finance.fixed_assets
           SET accumulated_depreciation = GREATEST(0, accumulated_depreciation - $2),
               book_value = purchase_cost - GREATEST(0, accumulated_depreciation - $2)
           WHERE id = $1::uuid`,
          assetId, Number(amount)
        );
        await prisma.$executeRawUnsafe(`DELETE FROM finance.ledger_entries WHERE source_document_id = $1::uuid`, req.params.id);
        await prisma.$executeRawUnsafe(`DELETE FROM finance.depreciation_entries WHERE id = $1::uuid`, req.params.id);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- MANAGER.IO REPORTS ---
  // 1. Aged Payables
  app.get('/api/reports/aged-payables', async (req, res) => {
    try {
      const suppliers = await prisma.suppliers.findMany({ orderBy: { name: 'asc' } });
      const invoices = await prisma.invoices.findMany({
        where: { status: { notIn: ['Draft', 'Paid'] } },
        orderBy: { created_at: 'asc' }
      });

      const today = new Date();
      const rows = suppliers.map((sup: any) => {
        const supInvoices = invoices.filter((i: any) => i.supplier_id === sup.id);
        let current = 0, d1_30 = 0, d31_60 = 0, d61_90 = 0, d90Plus = 0;

        for (const inv of supInvoices) {
          const amt = Number(inv.grand_total || 0);
          const due = new Date(inv.due_date || inv.created_at || Date.now());
          const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);

          if (diff <= 0) current += amt;
          else if (diff <= 30) d1_30 += amt;
          else if (diff <= 60) d31_60 += amt;
          else if (diff <= 90) d61_90 += amt;
          else d90Plus += amt;
        }

        const total = current + d1_30 + d31_60 + d61_90 + d90Plus;
        return {
          id: sup.id,
          supplier: sup.name,
          code: sup.code || '',
          currency: sup.currency || 'ZMW',
          current: Math.round(current * 100) / 100,
          days1_30: Math.round(d1_30 * 100) / 100,
          days31_60: Math.round(d31_60 * 100) / 100,
          days61_90: Math.round(d61_90 * 100) / 100,
          days90Plus: Math.round(d90Plus * 100) / 100,
          total: Math.round(total * 100) / 100,
        };
      }).filter((r: any) => r.total > 0);

      const totals = rows.reduce((acc: any, r: any) => ({
        current: acc.current + r.current,
        days1_30: acc.days1_30 + r.days1_30,
        days31_60: acc.days31_60 + r.days31_60,
        days61_90: acc.days61_90 + r.days61_90,
        days90Plus: acc.days90Plus + r.days90Plus,
        total: acc.total + r.total,
      }), { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0, total: 0 });

      res.json({ rows, totals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Supplier Summary
  app.get('/api/reports/supplier-summary', async (req, res) => {
    try {
      const suppliers = await prisma.suppliers.findMany({ orderBy: { name: 'asc' } });
      const [invoices, payments, debitNotes] = await Promise.all([
        prisma.invoices.findMany({ where: { status: { not: 'Draft' } } }),
        prisma.payment.findMany(),
        prisma.debitNote.findMany()
      ]);

      const rows = suppliers.map((sup: any) => {
        const supInvoices = invoices.filter((i: any) => i.supplier_id === sup.id);
        const supPayments = payments.filter((p: any) => p.paidToContact === sup.name);
        const supDebits = debitNotes.filter((d: any) => d.supplierId === sup.id);

        const totalBilled = supInvoices.reduce((s: number, i: any) => s + Number(i.grand_total || 0), 0);
        const totalPaid = supPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) +
                          supDebits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
        const balance = totalBilled - totalPaid;

        return {
          id: sup.id,
          code: sup.code || '',
          name: sup.name,
          currency: sup.currency || 'ZMW',
          tpin: sup.tpin || '',
          phone: sup.phone || '',
          email: sup.email || '',
          totalBilled: Math.round(totalBilled * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        };
      });

      const totals = rows.reduce((acc: any, r: any) => ({
        totalBilled: acc.totalBilled + r.totalBilled,
        totalPaid: acc.totalPaid + r.totalPaid,
        balance: acc.balance + r.balance,
      }), { totalBilled: 0, totalPaid: 0, balance: 0 });

      res.json({ rows, totals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. General Ledger Summary
  app.get('/api/reports/gl-summary', async (req, res) => {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;
      if (to) to.setHours(23, 59, 59, 999);

      const accounts = await prisma.chartOfAccount.findMany({
        include: { ledgerEntries: true },
        orderBy: { code: 'asc' }
      });

      const rows = accounts.map((acc: any) => {
        const entries = acc.ledgerEntries || [];
        let opening = 0;
        let debitMovement = 0;
        let creditMovement = 0;

        for (const e of entries) {
          const d = new Date(e.transactionDate || e.createdAt);
          const deb = Number(e.debit || 0);
          const cred = Number(e.credit || 0);

          if (from && d < from) {
            opening += (acc.accountType === 'Asset' || acc.accountType === 'Expense') ? (deb - cred) : (cred - deb);
          } else if (!to || d <= to) {
            debitMovement += deb;
            creditMovement += cred;
          }
        }

        const net = (acc.accountType === 'Asset' || acc.accountType === 'Expense')
          ? (debitMovement - creditMovement)
          : (creditMovement - debitMovement);
        const closing = opening + net;

        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          accountType: acc.accountType,
          currency: acc.currency || 'ZMW',
          openingBalance: Math.round(opening * 100) / 100,
          debitMovement: Math.round(debitMovement * 100) / 100,
          creditMovement: Math.round(creditMovement * 100) / 100,
          netMovement: Math.round(net * 100) / 100,
          closingBalance: Math.round(closing * 100) / 100,
        };
      });

      const totals = rows.reduce((acc: any, r: any) => ({
        debitMovement: acc.debitMovement + r.debitMovement,
        creditMovement: acc.creditMovement + r.creditMovement,
      }), { debitMovement: 0, creditMovement: 0 });

      res.json({ rows, totals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Tax Summary (VAT 16%)
  app.get('/api/reports/tax-summary', async (req, res) => {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;
      if (to) to.setHours(23, 59, 59, 999);

      const [invoices, purchases, creditNotes, debitNotes] = await Promise.all([
        prisma.invoice.findMany({ where: { status: { not: 'Draft' } } }),
        prisma.invoices.findMany({ where: { status: { not: 'Draft' } } }),
        prisma.creditNote.findMany(),
        prisma.debitNote.findMany()
      ]);

      let outputTaxableSales = 0;
      let outputVat = 0;
      let inputTaxablePurchases = 0;
      let inputVat = 0;

      for (const inv of invoices) {
        const d = new Date(inv.issueDate || inv.createdAt);
        if ((from && d < from) || (to && d > to)) continue;
        const total = Number(inv.grandTotal || 0);
        const vat = Number((inv.docOptions as any)?.taxAmount || 0);
        outputTaxableSales += (total - vat);
        outputVat += vat;
      }

      for (const cn of creditNotes) {
        const d = new Date(cn.issueDate || cn.createdAt);
        if ((from && d < from) || (to && d > to)) continue;
        const total = Number(cn.grandTotal || 0);
        const vat = Number((cn.docOptions as any)?.taxAmount || 0);
        outputTaxableSales -= (total - vat);
        outputVat -= vat;
      }

      for (const pinv of purchases) {
        const d = new Date(pinv.created_at || Date.now());
        if ((from && d < from) || (to && d > to)) continue;
        const total = Number(pinv.grand_total || 0);
        const vat = Number((pinv.docOptions as any)?.taxAmount || 0);
        inputTaxablePurchases += (total - vat);
        inputVat += vat;
      }

      for (const dn of debitNotes) {
        const d = new Date(dn.issueDate || dn.createdAt);
        if ((from && d < from) || (to && d > to)) continue;
        const total = Number(dn.amount || 0);
        const vat = 0;
        inputTaxablePurchases -= (total - vat);
        inputVat -= vat;
      }

      const netTaxPayable = outputVat - inputVat;

      res.json({
        outputTaxableSales: Math.round(outputTaxableSales * 100) / 100,
        outputVat: Math.round(outputVat * 100) / 100,
        inputTaxablePurchases: Math.round(inputTaxablePurchases * 100) / 100,
        inputVat: Math.round(inputVat * 100) / 100,
        netTaxPayable: Math.round(netTaxPayable * 100) / 100,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Cash Flow Statement
  app.get('/api/reports/cash-flow', async (req, res) => {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;
      if (to) to.setHours(23, 59, 59, 999);

      const [receipts, payments, expenseClaims] = await Promise.all([
        prisma.receipt.findMany(),
        prisma.payment.findMany(),
        prisma.expenseClaim.findMany()
      ]);

      let customerReceipts = 0;
      let supplierPayments = 0;
      let operationalExpenses = 0;

      for (const r of receipts) {
        const d = new Date(r.date || r.createdAt);
        if ((from && d < from) || (to && d > to)) continue;
        customerReceipts += Number(r.amount || 0);
      }

      for (const p of payments) {
        const d = new Date(p.date || p.createdAt);
        if ((from && d < from) || (to && d > to)) continue;
        supplierPayments += Number(p.amount || 0);
      }

      for (const ec of expenseClaims) {
        const d = new Date(ec.date || ec.createdAt);
        if ((from && d < from) || (to && d > to)) continue;
        operationalExpenses += Number(ec.amount || 0);
      }

      const netOperating = customerReceipts - supplierPayments - operationalExpenses;

      res.json({
        operatingActivities: {
          customerReceipts: Math.round(customerReceipts * 100) / 100,
          supplierPayments: Math.round(supplierPayments * 100) / 100,
          operationalExpenses: Math.round(operationalExpenses * 100) / 100,
          netOperating: Math.round(netOperating * 100) / 100,
        },
        investingActivities: {
          purchaseOfFixedAssets: 0,
          saleOfFixedAssets: 0,
          netInvesting: 0,
        },
        financingActivities: {
          capitalContributions: 0,
          drawings: 0,
          netFinancing: 0,
        },
        netCashMovement: Math.round(netOperating * 100) / 100,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Inventory Value Summary
  app.get('/api/reports/inventory-value-summary', async (req, res) => {
    try {
      const items = await prisma.item.findMany({ orderBy: { itemCode: 'asc' } });
      const rows = items.map((it: any) => {
        const qty = Number(it.qtyOnHand || 0);
        const cost = Number(it.purchasePrice || 0);
        const value = Math.round(qty * cost * 100) / 100;
        return {
          id: it.id,
          code: it.itemCode,
          name: it.itemName,
          category: it.category || 'General',
          unit: it.unitName || 'Pcs',
          qtyOnHand: qty,
          unitCost: cost,
          totalValue: value,
        };
      });

      const totalValue = rows.reduce((s: number, r: any) => s + r.totalValue, 0);
      const totalQty = rows.reduce((s: number, r: any) => s + r.qtyOnHand, 0);

      res.json({
        rows,
        totals: {
          totalQty,
          totalValue: Math.round(totalValue * 100) / 100
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

export async function checkLockDate(prisma: any, dateInput: any) {
  if (!dateInput) return;
  const targetDate = new Date(dateInput);
  if (isNaN(targetDate.getTime())) return;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT value FROM master.system_settings WHERE key = 'lock_date'`
  ).catch(() => []);
  if (!rows || !rows.length || !rows[0].value?.lockDate) return;

  const lockDate = new Date(rows[0].value.lockDate);
  lockDate.setHours(23, 59, 59, 999);

  if (targetDate <= lockDate) {
    const formatted = rows[0].value.lockDate;
    const err: any = new Error(`Period is locked: Transactions on or before ${formatted} cannot be created or modified.`);
    err.statusCode = 403;
    throw err;
  }
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
