/**
 * General ledger posting for the ERP.
 * Documents write balanced Debit + Credit rows; Summary / Trial Balance
 * recalculate from these lines. Edit/delete clears by source_document_id then re-posts.
 */

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

let allocationTablesReady = false;

export async function ensureAllocationTables(db: any) {
  if (allocationTablesReady) return;
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS sales.receipt_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id UUID NOT NULL,
        invoice_id UUID NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS finance.payment_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL,
        invoice_id UUID NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    allocationTablesReady = true;
  } catch (err) {
    console.error('[ledger] could not ensure allocation tables', err);
  }
}

export async function listReceiptAllocations(db: any, receiptId?: string, invoiceId?: string) {
  await ensureAllocationTables(db);
  if (receiptId) {
    return db.$queryRawUnsafe(
      `SELECT id, receipt_id AS "receiptId", invoice_id AS "invoiceId", amount, created_at AS "createdAt"
       FROM sales.receipt_allocations WHERE receipt_id = $1::uuid`,
      receiptId
    );
  }
  if (invoiceId) {
    return db.$queryRawUnsafe(
      `SELECT id, receipt_id AS "receiptId", invoice_id AS "invoiceId", amount, created_at AS "createdAt"
       FROM sales.receipt_allocations WHERE invoice_id = $1::uuid ORDER BY created_at ASC`,
      invoiceId
    );
  }
  return [];
}

export async function listPaymentAllocations(db: any, paymentId?: string) {
  await ensureAllocationTables(db);
  if (!paymentId) {
    return db.$queryRawUnsafe(
      `SELECT invoice_id AS "invoiceId", COALESCE(SUM(amount), 0) AS amount
       FROM finance.payment_allocations GROUP BY invoice_id`
    );
  }
  return db.$queryRawUnsafe(
    `SELECT id, payment_id AS "paymentId", invoice_id AS "invoiceId", amount, created_at AS "createdAt"
     FROM finance.payment_allocations WHERE payment_id = $1::uuid`,
    paymentId
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type JournalLine = {
  accountId: string;
  debit?: number;
  credit?: number;
};

export type ControlKey = 'AR' | 'AP' | 'SALES' | 'INVENTORY' | 'SUSPENSE' | 'EXPENSE_CLAIMS';

const CONTROL: Record<ControlKey, { names: string[]; code: string; type: string; payment?: boolean }> = {
  AR: { names: ['Accounts Receivable', 'Trade Receivables'], code: '1100', type: 'Asset' },
  AP: { names: ['Accounts Payable', 'Trade Payables'], code: '2100', type: 'Liability' },
  SALES: { names: ['Sales', 'Sales Income', 'Inventory Sales', 'Revenue'], code: '4100', type: 'Income' },
  INVENTORY: { names: ['Inventory', 'Inventory on hand', 'Inventory on Hand'], code: '1200', type: 'Asset' },
  SUSPENSE: { names: ['Suspense'], code: '1900', type: 'Asset' },
  EXPENSE_CLAIMS: { names: ['Expense Claims Payable'], code: 'LIAB-EXP-CLAIMS', type: 'Liability' },
};

export function signedBalance(accountType: string, debit: number, credit: number) {
  if (['Asset', 'Expense'].includes(accountType)) return round2(debit - credit);
  return round2(credit - debit);
}

export async function getControlAccount(db: any, key: ControlKey) {
  const spec = CONTROL[key];
  const found = await db.chartOfAccount.findFirst({
    where: {
      OR: [
        ...spec.names.map((name) => ({ name: { equals: name, mode: 'insensitive' } })),
        { code: spec.code },
      ],
    },
  });
  if (found) return found;
  return db.chartOfAccount.create({
    data: {
      name: spec.names[0],
      code: spec.code,
      accountType: spec.type,
      isPaymentAccount: spec.payment || false,
    },
  });
}

export async function resolveAccount(db: any, identifier?: string | null) {
  const raw = (identifier || '').trim();
  if (!raw) return getControlAccount(db, 'SUSPENSE');

  if (UUID_RE.test(raw)) {
    const byId = await db.chartOfAccount.findUnique({ where: { id: raw } });
    if (byId) return byId;
  }

  const match = await db.chartOfAccount.findFirst({
    where: {
      OR: [
        { name: { equals: raw, mode: 'insensitive' } },
        { code: { equals: raw, mode: 'insensitive' } },
      ],
    },
  });
  if (match) return match;

  return getControlAccount(db, 'SUSPENSE');
}

export async function reverseJournal(db: any, sourceDocumentId: string) {
  if (!sourceDocumentId) return;
  await db.ledgerEntry.deleteMany({ where: { source_document_id: sourceDocumentId } });
}

export async function postJournal(
  db: any,
  opts: {
    sourceDocumentId: string;
    transactionType: string;
    date?: Date | null;
    lines: JournalLine[];
  }
) {
  await reverseJournal(db, opts.sourceDocumentId);

  const lines = (opts.lines || [])
    .map((l) => ({
      accountId: l.accountId,
      debit: round2(l.debit || 0),
      credit: round2(l.credit || 0),
    }))
    .filter((l) => l.accountId && (l.debit > 0.0001 || l.credit > 0.0001));

  if (!lines.length) return;

  const debit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const credit = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(debit - credit) > 0.05) {
    throw new Error(`Unbalanced journal (${opts.transactionType}): Dr ${debit.toFixed(2)} Cr ${credit.toFixed(2)}`);
  }

  // Absorb rounding leftover on the last credit or debit line
  const drift = round2(debit - credit);
  if (Math.abs(drift) > 0 && Math.abs(drift) <= 0.05) {
    const last = lines[lines.length - 1];
    if (drift > 0) last.credit = round2(last.credit + drift);
    else last.debit = round2(last.debit - drift);
  }

  await db.ledgerEntry.createMany({
    data: lines.map((l) => ({
      accountId: l.accountId,
      transactionDate: opts.date || new Date(),
      debit: l.debit,
      credit: l.credit,
      transactionType: opts.transactionType,
      source_document_id: opts.sourceDocumentId,
    })),
  });
}

function lineAmount(item: any) {
  const total = Number(item?.total ?? item?.totalAmount ?? 0);
  if (total) return round2(total);
  const qty = Number(item?.qty || 1);
  const price = Number(item?.amount ?? item?.unitPrice ?? 0);
  const discount = Number(item?.discount || 0);
  const gross = qty * price;
  const discounted = discount > 0 && discount <= 100 ? gross * (1 - discount / 100) : gross - (discount > 100 ? 0 : 0);
  return round2(discounted);
}

function invoiceStatus(grandTotal: number, balanceDue: number) {
  if (balanceDue <= 0.01) return 'Paid';
  if (balanceDue < grandTotal - 0.01) return 'Partial';
  return 'Unpaid';
}

export async function postSalesInvoice(db: any, invoice: any) {
  const amount = round2(Number(invoice.grandTotal || invoice.grand_total || 0));
  if (amount <= 0) {
    await reverseJournal(db, invoice.id);
    return;
  }
  const ar = await getControlAccount(db, 'AR');
  const sales = await getControlAccount(db, 'SALES');
  await postJournal(db, {
    sourceDocumentId: invoice.id,
    transactionType: `Sales Invoice ${invoice.reference || ''}`.trim(),
    date: invoice.issueDate || invoice.createdAt || new Date(),
    lines: [
      { accountId: ar.id, debit: amount },
      { accountId: sales.id, credit: amount },
    ],
  });
}

export async function postPurchaseInvoice(db: any, invoice: any) {
  const items = invoice.items || [];
  const lines: JournalLine[] = [];
  let debitTotal = 0;
  for (const item of items) {
    const amt = lineAmount(item);
    if (amt <= 0) continue;
    const acc = await resolveAccount(db, item.account || 'Inventory');
    lines.push({ accountId: acc.id, debit: amt });
    debitTotal = round2(debitTotal + amt);
  }
  const amount = round2(Number(invoice.grand_total || invoice.grandTotal || debitTotal || 0));
  if (amount <= 0 && !lines.length) {
    await reverseJournal(db, invoice.id);
    return;
  }
  if (!lines.length) {
    const inventory = await getControlAccount(db, 'INVENTORY');
    lines.push({ accountId: inventory.id, debit: amount });
    debitTotal = amount;
  }
  const ap = await getControlAccount(db, 'AP');
  const creditAmt = debitTotal || amount;
  lines.push({ accountId: ap.id, credit: creditAmt });
  await postJournal(db, {
    sourceDocumentId: invoice.id,
    transactionType: `Purchase Invoice ${invoice.reference || ''}`.trim(),
    date: invoice.created_at || invoice.issueDate || new Date(),
    lines,
  });
}

export async function reverseReceiptAllocations(db: any, receiptId: string) {
  const allocs = await listReceiptAllocations(db, receiptId);
  for (const a of allocs) {
    const inv = await db.invoice.findUnique({ where: { id: a.invoiceId } }).catch(() => null);
    if (!inv) continue;
    const grand = round2(Number(inv.grandTotal || 0));
    const newBalance = round2(Number(inv.balanceDue || 0) + Number(a.amount));
    await db.invoice.update({
      where: { id: inv.id },
      data: { balanceDue: newBalance, status: invoiceStatus(grand, newBalance) },
    });
  }
  await db.$executeRawUnsafe(`DELETE FROM sales.receipt_allocations WHERE receipt_id = $1::uuid`, receiptId);
}

export async function applyReceiptAllocations(
  db: any,
  receiptId: string,
  allocations: { invoiceId: string; amount: number }[]
) {
  await ensureAllocationTables(db);
  for (const a of allocations || []) {
    const amt = round2(Number(a.amount || 0));
    if (!a.invoiceId || amt <= 0) continue;
    await db.$executeRawUnsafe(
      `INSERT INTO sales.receipt_allocations (receipt_id, invoice_id, amount) VALUES ($1::uuid, $2::uuid, $3)`,
      receiptId,
      a.invoiceId,
      amt
    );
    const inv = await db.invoice.findUnique({ where: { id: a.invoiceId } }).catch(() => null);
    if (!inv) continue;
    const grand = round2(Number(inv.grandTotal || 0));
    const newBalance = Math.max(0, round2(Number(inv.balanceDue ?? grand) - amt));
    await db.invoice.update({
      where: { id: inv.id },
      data: { balanceDue: newBalance, status: invoiceStatus(grand, newBalance) },
    });
  }
}

async function autoAllocateSalesInvoices(db: any, customerName: string, amount: number) {
  const allocations: { invoiceId: string; amount: number }[] = [];
  if (!customerName || amount <= 0.01) return allocations;
  const customer = await db.customer.findFirst({
    where: { name: { equals: customerName, mode: 'insensitive' } },
  });
  if (!customer) return allocations;
  const invoices = await db.invoice.findMany({
    where: { customerId: customer.id },
    orderBy: { issueDate: 'asc' },
  });
  let remaining = round2(amount);
  for (const inv of invoices) {
    if (remaining <= 0.01) break;
    const due = round2(Number(inv.balanceDue ?? inv.grandTotal ?? 0));
    if (due <= 0.01) continue;
    const apply = Math.min(due, remaining);
    allocations.push({ invoiceId: inv.id, amount: round2(apply) });
    remaining = round2(remaining - apply);
  }
  return allocations;
}

export async function postReceipt(db: any, receipt: any, allocations?: { invoiceId: string; amount: number }[]) {
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const bank = await resolveAccount(db, receipt.receivedInAccount);
  const ar = await getControlAccount(db, 'AR');
  const lines: JournalLine[] = [];
  let creditTotal = 0;
  let arCredit = 0;

  for (const item of items) {
    const amt = lineAmount(item);
    if (amt <= 0) continue;
    const acc = await resolveAccount(db, item.account);
    lines.push({ accountId: acc.id, credit: amt });
    creditTotal = round2(creditTotal + amt);
    if (acc.id === ar.id || (item.account || '').toLowerCase().includes('receivable')) {
      arCredit = round2(arCredit + amt);
    }
  }

  const amount = round2(Number(receipt.amount || creditTotal || 0));
  if (amount <= 0) {
    await reverseJournal(db, receipt.id);
    await reverseReceiptAllocations(db, receipt.id);
    return;
  }

  if (!lines.length) {
    lines.push({ accountId: ar.id, credit: amount });
    creditTotal = amount;
    arCredit = amount;
  }

  lines.unshift({ accountId: bank.id, debit: creditTotal || amount });

  await postJournal(db, {
    sourceDocumentId: receipt.id,
    transactionType: `Receipt ${receipt.reference || ''}`.trim(),
    date: receipt.date || new Date(),
    lines,
  });

  await reverseReceiptAllocations(db, receipt.id);
  let toApply = allocations;
  if (!toApply || !toApply.length) {
    toApply = await autoAllocateSalesInvoices(db, receipt.paidByContact, arCredit || amount);
  }
  await applyReceiptAllocations(db, receipt.id, toApply);
}

export async function reversePaymentAllocations(db: any, paymentId: string) {
  const allocs = await listPaymentAllocations(db, paymentId);
  await db.$executeRawUnsafe(`DELETE FROM finance.payment_allocations WHERE payment_id = $1::uuid`, paymentId);
  for (const a of allocs) {
    const inv = await db.invoices.findUnique({ where: { id: a.invoiceId } }).catch(() => null);
    if (!inv) continue;
    const paid = await sumPaymentAllocations(db, inv.id);
    const grand = round2(Number(inv.grand_total || 0));
    const outstanding = Math.max(0, round2(grand - paid));
    await db.invoices.update({
      where: { id: inv.id },
      data: { status: invoiceStatus(grand, outstanding) },
    });
  }
}

export async function applyPaymentAllocations(
  db: any,
  paymentId: string,
  allocations: { invoiceId: string; amount: number }[]
) {
  await ensureAllocationTables(db);
  for (const a of allocations || []) {
    const amt = round2(Number(a.amount || 0));
    if (!a.invoiceId || amt <= 0) continue;
    await db.$executeRawUnsafe(
      `INSERT INTO finance.payment_allocations (payment_id, invoice_id, amount) VALUES ($1::uuid, $2::uuid, $3)`,
      paymentId,
      a.invoiceId,
      amt
    );
    const inv = await db.invoices.findUnique({ where: { id: a.invoiceId } }).catch(() => null);
    if (!inv) continue;
    const paid = await sumPaymentAllocations(db, inv.id);
    const grand = round2(Number(inv.grand_total || 0));
    const outstanding = Math.max(0, round2(grand - paid));
    await db.invoices.update({
      where: { id: inv.id },
      data: { status: invoiceStatus(grand, outstanding) },
    });
  }
}

export async function sumPaymentAllocations(db: any, invoiceId: string) {
  await ensureAllocationTables(db);
  const rows = await db.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0) AS amount FROM finance.payment_allocations WHERE invoice_id = $1::uuid`,
    invoiceId
  );
  return round2(Number(rows?.[0]?.amount || 0));
}

async function autoAllocatePurchaseInvoices(db: any, supplierName: string, amount: number) {
  const allocations: { invoiceId: string; amount: number }[] = [];
  if (!supplierName || amount <= 0.01) return allocations;
  const supplier = await db.suppliers.findFirst({
    where: { name: { equals: supplierName, mode: 'insensitive' } },
  });
  if (!supplier) return allocations;
  const invoices = await db.invoices.findMany({
    where: { supplier_id: supplier.id },
    orderBy: { created_at: 'asc' },
  });
  let remaining = round2(amount);
  for (const inv of invoices) {
    if (remaining <= 0.01) break;
    const grand = round2(Number(inv.grand_total || 0));
    const paid = await sumPaymentAllocations(db, inv.id);
    const due = Math.max(0, round2(grand - paid));
    if (due <= 0.01) continue;
    const apply = Math.min(due, remaining);
    allocations.push({ invoiceId: inv.id, amount: round2(apply) });
    remaining = round2(remaining - apply);
  }
  return allocations;
}

export async function postPayment(db: any, payment: any, allocations?: { invoiceId: string; amount: number }[]) {
  const items = Array.isArray(payment.items) ? payment.items : [];
  const bank = await resolveAccount(db, payment.paidFromAccount);
  const ap = await getControlAccount(db, 'AP');
  const lines: JournalLine[] = [];
  let debitTotal = 0;
  let apDebit = 0;

  for (const item of items) {
    const amt = lineAmount(item);
    if (amt <= 0) continue;
    const acc = await resolveAccount(db, item.account);
    lines.push({ accountId: acc.id, debit: amt });
    debitTotal = round2(debitTotal + amt);
    if (acc.id === ap.id || (item.account || '').toLowerCase().includes('payable')) {
      apDebit = round2(apDebit + amt);
    }
  }

  const amount = round2(Number(payment.amount || debitTotal || 0));
  if (amount <= 0) {
    await reverseJournal(db, payment.id);
    await reversePaymentAllocations(db, payment.id);
    return;
  }

  if (!lines.length) {
    lines.push({ accountId: ap.id, debit: amount });
    debitTotal = amount;
    apDebit = amount;
  }

  lines.push({ accountId: bank.id, credit: debitTotal || amount });

  await postJournal(db, {
    sourceDocumentId: payment.id,
    transactionType: `Payment ${payment.reference || ''}`.trim(),
    date: payment.date || new Date(),
    lines,
  });

  await reversePaymentAllocations(db, payment.id);
  let toApply = allocations;
  if (!toApply || !toApply.length) {
    toApply = await autoAllocatePurchaseInvoices(db, payment.paidToContact, apDebit || amount);
  }
  await applyPaymentAllocations(db, payment.id, toApply);
}

export async function postTransfer(db: any, transfer: any) {
  const amount = round2(Number(transfer.amount || 0));
  if (amount <= 0) {
    await reverseJournal(db, transfer.id);
    return;
  }
  const from = await resolveAccount(db, transfer.paidFromAccount);
  const to = await resolveAccount(db, transfer.receivedInAccount);
  await postJournal(db, {
    sourceDocumentId: transfer.id,
    transactionType: `Inter Account Transfer ${transfer.reference || ''}`.trim(),
    date: transfer.date || new Date(),
    lines: [
      { accountId: from.id, credit: amount },
      { accountId: to.id, debit: amount },
    ],
  });
}

export async function postExpenseClaim(db: any, claim: any) {
  const items = claim.items || [];
  const lines: JournalLine[] = [];
  let total = 0;
  for (const item of items) {
    if (!item.accountId && !item.account) continue;
    const qty = Number(item.qty || 1);
    const price = Number(item.unitPrice || 0);
    const tax = Number(item.taxAmount || 0);
    const lineTotal = round2(qty * price + (claim.amountsAreTaxInclusive ? 0 : tax));
    if (lineTotal <= 0) continue;
    const acc = await resolveAccount(db, item.accountId || item.account);
    lines.push({ accountId: acc.id, debit: lineTotal });
    total = round2(total + lineTotal);
  }
  if (total <= 0) {
    await reverseJournal(db, claim.id);
    return;
  }
  const liability = await getControlAccount(db, 'EXPENSE_CLAIMS');
  lines.push({ accountId: liability.id, credit: total });
  await postJournal(db, {
    sourceDocumentId: claim.id,
    transactionType: `Expense Claim ${claim.reference || ''}`.trim(),
    date: claim.date || new Date(),
    lines,
  });
}

export async function postCreditNote(db: any, note: any) {
  const amount = round2(Number(note.grandTotal || note.amount || 0));
  if (amount <= 0) {
    await reverseJournal(db, note.id);
    return;
  }
  const ar = await getControlAccount(db, 'AR');
  const sales = await getControlAccount(db, 'SALES');
  await postJournal(db, {
    sourceDocumentId: note.id,
    transactionType: `Credit Note ${note.reference || ''}`.trim(),
    date: note.issueDate || new Date(),
    lines: [
      { accountId: sales.id, debit: amount },
      { accountId: ar.id, credit: amount },
    ],
  });
}

export async function postDebitNote(db: any, note: any) {
  const items = note.items || [];
  const lines: JournalLine[] = [];
  let total = 0;
  for (const item of items) {
    const amt = lineAmount(item);
    if (amt <= 0) continue;
    const acc = await resolveAccount(db, item.account || 'Inventory');
    lines.push({ accountId: acc.id, credit: amt });
    total = round2(total + amt);
  }
  const amount = round2(Number(note.amount || total || 0));
  if (amount <= 0 && !lines.length) {
    await reverseJournal(db, note.id);
    return;
  }
  if (!lines.length) {
    const inventory = await getControlAccount(db, 'INVENTORY');
    lines.push({ accountId: inventory.id, credit: amount });
    total = amount;
  }
  const counter = note.supplierId
    ? await getControlAccount(db, 'AP')
    : await getControlAccount(db, 'AR');
  lines.push({ accountId: counter.id, debit: total || amount });
  await postJournal(db, {
    sourceDocumentId: note.id,
    transactionType: `Debit Note ${note.reference || ''}`.trim(),
    date: note.issueDate || new Date(),
    lines,
  });
}

export async function postInventoryWriteOff(db: any, writeOff: any) {
  const amount = round2(Number(writeOff.amount || 0));
  if (!writeOff.status || writeOff.status === 'Draft' || amount <= 0) {
    await reverseJournal(db, writeOff.id);
    return;
  }
  const expense = await resolveAccount(db, writeOff.account);
  const inventory = await getControlAccount(db, 'INVENTORY');
  await postJournal(db, {
    sourceDocumentId: writeOff.id,
    transactionType: `Inventory Write-Off ${writeOff.reference || ''}`.trim(),
    date: writeOff.date || new Date(),
    lines: [
      { accountId: expense.id, debit: amount },
      { accountId: inventory.id, credit: amount },
    ],
  });
}

async function alreadyPosted(db: any, sourceId: string) {
  const count = await db.ledgerEntry.count({ where: { source_document_id: sourceId } });
  return count > 0;
}

export async function backfillUnpostedDocuments(db: any) {
  const posted = { invoices: 0, purchaseInvoices: 0, receipts: 0, payments: 0, creditNotes: 0, transfers: 0, expenses: 0 };
  const errors: string[] = [];

  const invoices = await db.invoice.findMany({ include: { items: true } });
  for (const inv of invoices) {
    if (await alreadyPosted(db, inv.id)) continue;
    try {
      await postSalesInvoice(db, inv);
      posted.invoices += 1;
    } catch (e: any) {
      errors.push(`Invoice ${inv.reference}: ${e.message}`);
    }
  }

  const purchaseInvoices = await db.invoices.findMany({ include: { items: true } });
  for (const inv of purchaseInvoices) {
    if (await alreadyPosted(db, inv.id)) continue;
    try {
      await postPurchaseInvoice(db, inv);
      posted.purchaseInvoices += 1;
    } catch (e: any) {
      errors.push(`Purchase Invoice ${inv.reference}: ${e.message}`);
    }
  }

  const receipts = await db.receipt.findMany();
  for (const r of receipts) {
    if (await alreadyPosted(db, r.id)) continue;
    try {
      await postReceipt(db, r);
      posted.receipts += 1;
    } catch (e: any) {
      errors.push(`Receipt ${r.reference}: ${e.message}`);
    }
  }

  const payments = await db.payment.findMany();
  for (const p of payments) {
    if (await alreadyPosted(db, p.id)) continue;
    try {
      await postPayment(db, p);
      posted.payments += 1;
    } catch (e: any) {
      errors.push(`Payment ${p.reference}: ${e.message}`);
    }
  }

  try {
    const creditNotes = await db.creditNote.findMany({ include: { items: true } });
    for (const n of creditNotes) {
      if (await alreadyPosted(db, n.id)) continue;
      try {
        await postCreditNote(db, n);
        posted.creditNotes += 1;
      } catch (e: any) {
        errors.push(`Credit Note ${n.reference}: ${e.message}`);
      }
    }
  } catch (e: any) {
    errors.push(`Credit notes skipped: ${e.message}`);
  }

  const transfers = await db.interAccountTransfer.findMany();
  for (const t of transfers) {
    if (await alreadyPosted(db, t.id)) continue;
    try {
      await postTransfer(db, t);
      posted.transfers += 1;
    } catch (e: any) {
      errors.push(`Transfer ${t.reference}: ${e.message}`);
    }
  }

  const claims = await db.expenseClaim.findMany({ include: { items: true } });
  for (const c of claims) {
    if (await alreadyPosted(db, c.id)) continue;
    try {
      await postExpenseClaim(db, c);
      posted.expenses += 1;
    } catch (e: any) {
      errors.push(`Expense ${c.reference}: ${e.message}`);
    }
  }

  return { posted, errors };
}
