export const BASE_CURRENCY = 'ZMW';

export function currencyCode(raw?: string | null): string {
  if (!raw) return BASE_CURRENCY;
  const code = String(raw).trim().split(/[\s\-\/]/)[0].toUpperCase();
  return code || BASE_CURRENCY;
}

export function isBaseCurrency(raw?: string | null): boolean {
  return currencyCode(raw) === BASE_CURRENCY;
}

export function fxRate(currency?: string | null, rate?: number | null): number {
  if (isBaseCurrency(currency)) return 1;
  const r = Number(rate);
  return r > 0 ? r : 1;
}

export function documentFx(doc: any): { currency: string; rate: number } {
  const opts = doc?.docOptions && typeof doc.docOptions === 'object' ? doc.docOptions : {};
  const currency = currencyCode(doc?.currency || opts.currency);
  const rate = fxRate(currency, doc?.exchangeRate ?? opts.exchangeRate ?? opts.rate);
  return { currency, rate };
}

export async function resolveRateAtDate(db: any, date: Date | string | null | undefined, currency?: string | null): Promise<number> {
  const code = currencyCode(currency);
  if (code === BASE_CURRENCY) return 1;
  const when = date ? new Date(date) : new Date();
  try {
    const row = await db.exchangeRate.findFirst({
      where: { currencyCode: code, date: { lte: when } },
      orderBy: { date: 'desc' },
    });
    if (row) return Number(row.rate) || 1;
    const latest = await db.exchangeRate.findFirst({
      where: { currencyCode: code },
      orderBy: { date: 'desc' },
    });
    return Number(latest?.rate) || 1;
  } catch {
    return 1;
  }
}

let multiCurrencyReady = false;

export async function ensureMultiCurrencyColumns(db: any) {
  if (multiCurrencyReady) return;
  const statements = [
    `ALTER TABLE finance.ledger_entries ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZMW'`,
    `ALTER TABLE finance.ledger_entries ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE finance.ledger_entries ADD COLUMN IF NOT EXISTS foreign_debit DECIMAL(15, 2) DEFAULT 0`,
    `ALTER TABLE finance.ledger_entries ADD COLUMN IF NOT EXISTS foreign_credit DECIMAL(15, 2) DEFAULT 0`,
    `ALTER TABLE finance.chart_of_accounts ADD COLUMN IF NOT EXISTS currency VARCHAR(12) DEFAULT 'ZMW'`,
    `ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE sales.receipts ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE finance.payments ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE purchase.invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(12) DEFAULT 'ZMW'`,
    `ALTER TABLE purchase.invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE sales.sales_quotes ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE sales.sales_orders ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE sales.credit_notes ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE purchase.debit_notes ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE finance.inter_account_transfers ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE purchase.purchase_orders ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE purchase.purchase_enquiries ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS master.currencies (
      code VARCHAR(3) PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      is_system BOOLEAN DEFAULT false,
      decimal_places INTEGER DEFAULT 2
    )`,
    `CREATE TABLE IF NOT EXISTS master.exchange_rates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL,
      currency_code VARCHAR(3) NOT NULL REFERENCES master.currencies(code),
      rate DECIMAL(15, 6) NOT NULL,
      is_current BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (date, currency_code)
    )`,
    `ALTER TABLE master.exchange_rates ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false`,
    `ALTER TABLE purchase.shipments ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID`,
    `ALTER TABLE purchase.shipments ADD COLUMN IF NOT EXISTS charge_currencies JSONB`,
    `ALTER TABLE purchase.procurement_costing ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID`,
    `ALTER TABLE purchase.procurement_costing ADD COLUMN IF NOT EXISTS shipment_id UUID`,
    `ALTER TABLE purchase.procurement_costing ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1`,
    `ALTER TABLE purchase.procurement_costing ADD COLUMN IF NOT EXISTS costing_meta JSONB`,
    `ALTER TABLE master.items ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5, 2) DEFAULT 0`,
    `ALTER TABLE master.item_categories ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5, 2) DEFAULT 0`,
    `ALTER TABLE sales.credit_notes ADD COLUMN IF NOT EXISTS grand_total DECIMAL(15, 2) DEFAULT 0`,
    `ALTER TABLE sales.credit_notes ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0`,
  ];
  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (err) {
      console.error('[currency] column ensure failed:', sql, err);
    }
  }
  try {
    await db.$executeRawUnsafe(`
      INSERT INTO master.currencies (code, name, symbol, is_system, decimal_places)
      VALUES
        ('ZMW', 'Zambian Kwacha', 'K', true, 2),
        ('USD', 'US Dollar', '$', true, 2),
        ('EUR', 'Euro', '€', true, 2),
        ('GBP', 'British Pound', '£', true, 2),
        ('ZAR', 'South African Rand', 'R', true, 2)
      ON CONFLICT (code) DO NOTHING
    `);
  } catch (err) {
    console.error('[currency] seed currencies failed', err);
  }
  multiCurrencyReady = true;
}
