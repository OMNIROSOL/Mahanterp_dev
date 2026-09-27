import { Express } from 'express';
import { getControlAccount, postPayslip, reverseJournal, round2 } from './ledger';

let payrollReady = false;

const ACCOUNT_SPECS = [
  { code: '6100', name: 'Wages & salaries', accountType: 'Expense' },
  { code: '6110', name: 'Employer payroll contributions', accountType: 'Expense' },
  { code: '2160', name: 'PAYE payable', accountType: 'Liability' },
  { code: '2161', name: 'NAPSA payable', accountType: 'Liability' },
  { code: '2162', name: 'NHIMA payable', accountType: 'Liability' },
];

async function ensureAccount(db: any, spec: { code: string; name: string; accountType: string }) {
  const found = await db.chartOfAccount.findFirst({
    where: { OR: [{ code: spec.code }, { name: { equals: spec.name, mode: 'insensitive' } }] },
  });
  if (found) return found;
  return db.chartOfAccount.create({
    data: { code: spec.code, name: spec.name, accountType: spec.accountType, currency: 'ZMW' },
  });
}

export async function ensurePayrollTables(db: any) {
  if (payrollReady) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS master.payslip_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      item_type TEXT NOT NULL,
      expense_account_id UUID,
      liability_account_id UUID,
      inactive BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS finance.payslips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      reference TEXT UNIQUE,
      description TEXT,
      employee_id UUID NOT NULL,
      gross_pay DECIMAL(15, 2) DEFAULT 0,
      deduction DECIMAL(15, 2) DEFAULT 0,
      net_pay DECIMAL(15, 2) DEFAULT 0,
      contribution DECIMAL(15, 2) DEFAULT 0,
      show_period_totals BOOLEAN DEFAULT false,
      custom_title BOOLEAN DEFAULT false,
      custom_title_value TEXT,
      use_footer BOOLEAN DEFAULT false,
      footer_value TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS finance.payslip_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payslip_id UUID NOT NULL REFERENCES finance.payslips(id) ON DELETE CASCADE,
      line_type TEXT NOT NULL,
      item_id UUID,
      description TEXT,
      units DECIMAL(15, 4),
      unit_price DECIMAL(15, 2),
      amount DECIMAL(15, 2) DEFAULT 0,
      division TEXT
    )`,
  ];
  for (const sql of statements) {
    await db.$executeRawUnsafe(sql);
  }
  await getControlAccount(db, 'EMPLOYEE_CLEARING');
  const accounts: Record<string, any> = {};
  for (const spec of ACCOUNT_SPECS) {
    accounts[spec.code] = await ensureAccount(db, spec);
  }
  const count = await db.payslipItem.count();
  if (count === 0) {
    await db.payslipItem.createMany({
      data: [
        { name: 'Basic salary', itemType: 'earning', expenseAccountId: accounts['6100'].id },
        { name: 'PAYE', itemType: 'deduction', liabilityAccountId: accounts['2160'].id },
        { name: 'NAPSA employee', itemType: 'deduction', liabilityAccountId: accounts['2161'].id },
        { name: 'NHIMA employee', itemType: 'deduction', liabilityAccountId: accounts['2162'].id },
        { name: 'NAPSA employer', itemType: 'contribution', expenseAccountId: accounts['6110'].id, liabilityAccountId: accounts['2161'].id },
        { name: 'NHIMA employer', itemType: 'contribution', expenseAccountId: accounts['6110'].id, liabilityAccountId: accounts['2162'].id },
      ],
    });
  }
  payrollReady = true;
}

function lineAmount(line: any) {
  if (line.lineType === 'earning') {
    const units = Number(line.units);
    const price = Number(line.unitPrice);
    if (Number.isFinite(units) && Number.isFinite(price)) return round2(units * price);
  }
  return round2(Number(line.amount) || 0);
}

function cleanLines(lines: any[]) {
  return (lines || [])
    .map((line) => {
      const lineType = String(line.lineType || '').trim();
      const amount = lineAmount({ ...line, lineType });
      return {
        lineType,
        itemId: line.itemId || null,
        description: line.description ? String(line.description).trim() : null,
        units: lineType === 'earning' ? Number(line.units) || 0 : null,
        unitPrice: lineType === 'earning' ? Number(line.unitPrice) || 0 : null,
        amount,
        division: line.division ? String(line.division).trim() : null,
      };
    })
    .filter((line) => line.itemId && line.lineType && line.amount !== 0);
}

function headerData(body: any, totals: { grossPay: number; deduction: number; netPay: number; contribution: number }) {
  const reference = body.reference ? String(body.reference).trim() : '';
  return {
    date: new Date(body.date),
    reference: reference || null,
    description: body.description ? String(body.description).trim() : null,
    employeeId: body.employeeId,
    grossPay: totals.grossPay,
    deduction: totals.deduction,
    netPay: totals.netPay,
    contribution: totals.contribution,
    showPeriodTotals: Boolean(body.showPeriodTotals),
    customTitle: Boolean(body.customTitle),
    customTitleValue: body.customTitle ? String(body.customTitleValue || '').trim() : null,
    useFooter: Boolean(body.useFooter),
    footerValue: body.useFooter ? String(body.footerValue || '') : null,
  };
}

async function periodTotals(db: any, employeeId: string, date: Date) {
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const slips = await db.payslip.findMany({
    where: { employeeId, date: { gte: start, lte: date } },
    include: { lines: { include: { item: true } } },
  });
  const buckets: Record<string, Record<string, number>> = { earning: {}, deduction: {}, contribution: {} };
  for (const slip of slips) {
    for (const line of slip.lines) {
      const name = line.item?.name || line.description || line.lineType;
      const bag = buckets[line.lineType] || (buckets[line.lineType] = {});
      bag[name] = round2((bag[name] || 0) + Number(line.amount || 0));
    }
  }
  const pack = (type: string) => Object.entries(buckets[type] || {}).map(([name, amount]) => ({ name, amount }));
  const sum = (rows: { amount: number }[]) => round2(rows.reduce((s, r) => s + r.amount, 0));
  const earnings = pack('earning');
  const deductions = pack('deduction');
  const contributions = pack('contribution');
  const gross = sum(earnings);
  const deduction = sum(deductions);
  return {
    earnings,
    deductions,
    contributions,
    grossPay: gross,
    deduction,
    netPay: round2(gross - deduction),
    contribution: sum(contributions),
  };
}

const includeSlip = { employee: true, lines: { include: { item: true } } };

export function registerPayrollRoutes(app: Express, prisma: any) {
  app.get('/api/payslip-items', async (_req, res) => {
    try {
      await ensurePayrollTables(prisma);
      const items = await prisma.payslipItem.findMany({ orderBy: [{ itemType: 'asc' }, { name: 'asc' }] });
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/payslip-items', async (req, res) => {
    try {
      await ensurePayrollTables(prisma);
      const { name, itemType, expenseAccountId, liabilityAccountId } = req.body;
      if (!name || !itemType) return res.status(400).json({ error: 'Name and type are required' });
      const item = await prisma.payslipItem.create({
        data: {
          name: String(name).trim(),
          itemType,
          expenseAccountId: expenseAccountId || null,
          liabilityAccountId: liabilityAccountId || null,
        },
      });
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/payslip-items/:id', async (req, res) => {
    try {
      await ensurePayrollTables(prisma);
      const { name, itemType, expenseAccountId, liabilityAccountId, inactive } = req.body;
      const item = await prisma.payslipItem.update({
        where: { id: req.params.id },
        data: {
          name: name != null ? String(name).trim() : undefined,
          itemType: itemType || undefined,
          expenseAccountId: expenseAccountId === '' ? null : expenseAccountId,
          liabilityAccountId: liabilityAccountId === '' ? null : liabilityAccountId,
          inactive: typeof inactive === 'boolean' ? inactive : undefined,
        },
      });
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/payslips', async (_req, res) => {
    try {
      await ensurePayrollTables(prisma);
      const slips = await prisma.payslip.findMany({
        include: { employee: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      res.json(slips);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/payslips/:id', async (req, res) => {
    try {
      await ensurePayrollTables(prisma);
      const slip = await prisma.payslip.findUnique({ where: { id: req.params.id }, include: includeSlip });
      if (!slip) return res.status(404).json({ error: 'Payslip not found' });
      const totals = slip.showPeriodTotals ? await periodTotals(prisma, slip.employeeId, new Date(slip.date)) : null;
      res.json({ ...slip, periodTotals: totals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  async function persistPayslip(db: any, id: string | null, body: any) {
    if (!body.employeeId) throw new Error('Employee is required');
    const lines = cleanLines(body.lines);
    if (!lines.some((l) => l.lineType === 'earning')) throw new Error('Add at least one earnings line');
    const data = headerData(body, { grossPay: 0, deduction: 0, netPay: 0, contribution: 0 });
    return id
      ? db.payslip.update({
          where: { id },
          data: { ...data, lines: { deleteMany: {}, create: lines } },
          include: includeSlip,
        })
      : db.payslip.create({
          data: { ...data, lines: { create: lines } },
          include: includeSlip,
        });
  }

  async function saveAndPost(id: string | null, body: any) {
    const slip = await prisma.$transaction((tx: any) => persistPayslip(tx, id, body));
    const totals = await postPayslip(prisma, slip);
    return prisma.payslip.update({
      where: { id: slip.id },
      data: totals,
      include: includeSlip,
    });
  }

  app.post('/api/payslips', async (req, res) => {
    try {
      await ensurePayrollTables(prisma);
      res.json(await saveAndPost(null, req.body));
    } catch (err: any) {
      const message = String(err.message || '');
      const status = message.includes('Unique constraint') ? 400 : 500;
      res.status(status).json({ error: message.includes('Unique constraint') ? 'That reference is already used' : message });
    }
  });

  app.put('/api/payslips/:id', async (req, res) => {
    try {
      await ensurePayrollTables(prisma);
      res.json(await saveAndPost(String(req.params.id), req.body));
    } catch (err: any) {
      const message = String(err.message || '');
      const status = message.includes('Unique constraint') ? 400 : 500;
      res.status(status).json({ error: message.includes('Unique constraint') ? 'That reference is already used' : message });
    }
  });

  app.delete('/api/payslips/:id', async (req, res) => {
    try {
      await ensurePayrollTables(prisma);
      await reverseJournal(prisma, req.params.id);
      await prisma.payslip.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
