/** Employee master used by expense claims. Payroll (PAYE/NAPSA/NHIMA) is out of scope. */

let hrReady = false;

export async function ensureHrTables(db: any) {
  if (hrReady) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS master.employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      job_title TEXT,
      email TEXT,
      phone TEXT,
      bank_name TEXT,
      bank_account TEXT,
      bank_branch TEXT,
      tpin TEXT,
      napsa_number TEXT,
      nhima_number TEXT,
      nrc TEXT,
      inactive BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `ALTER TABLE finance.expense_claim_payers ADD COLUMN IF NOT EXISTS employee_id UUID`,
  ];
  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (err) {
      console.error('[hr] ensure failed:', sql, err);
    }
  }
  hrReady = true;
}

export function employeePayload(body: any) {
  return {
    code: String(body.code || '').trim(),
    name: String(body.name || '').trim(),
    department: body.department ? String(body.department).trim() : null,
    jobTitle: body.jobTitle ? String(body.jobTitle).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    bankName: body.bankName ? String(body.bankName).trim() : null,
    bankAccount: body.bankAccount ? String(body.bankAccount).trim() : null,
    bankBranch: body.bankBranch ? String(body.bankBranch).trim() : null,
    tpin: body.tpin ? String(body.tpin).trim() : null,
    napsaNumber: body.napsaNumber ? String(body.napsaNumber).trim() : null,
    nhimaNumber: body.nhimaNumber ? String(body.nhimaNumber).trim() : null,
    nrc: body.nrc ? String(body.nrc).trim() : null,
    inactive: Boolean(body.inactive),
  };
}
