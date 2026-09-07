import request from 'supertest';
import app from '../index';
import { prisma } from '../index';

describe('Expense Claims API', () => {
  let createdPayerId: string;
  let createdAccountId: string;
  let createdExpenseClaimId: string;

  beforeAll(async () => {
    // Setup necessary dependencies: Payer and an Expense Account
    const payer = await prisma.expenseClaimPayer.create({
      data: { name: 'TEST_PAYER', code: 'TEST_P_' + Date.now() }
    });
    createdPayerId = payer.id;

    const account = await prisma.chartOfAccount.create({
      data: { name: 'TEST_EXPENSE', code: 'TEST_E_' + Date.now(), accountType: 'Expense', isPaymentAccount: false }
    });
    createdAccountId = account.id;
  });

  afterAll(async () => {
    // Teardown everything
    if (createdExpenseClaimId) {
      await prisma.ledgerEntry.deleteMany({ where: { source_document_id: createdExpenseClaimId } });
      await prisma.expenseClaimLine.deleteMany({ where: { expenseClaimId: createdExpenseClaimId } });
      await prisma.expenseClaim.delete({ where: { id: createdExpenseClaimId } });
    }
    
    await prisma.ledgerEntry.deleteMany({ where: { accountId: createdAccountId } });

    if (createdAccountId) {
      await prisma.chartOfAccount.delete({ where: { id: createdAccountId } });
    }
    if (createdPayerId) {
      await prisma.expenseClaimPayer.delete({ where: { id: createdPayerId } });
    }

    await prisma.$disconnect();
  });

  it('should fetch expense claims', async () => {
    const res = await request(app).get('/api/expense-claims');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it('should create a new expense claim and post to ledger', async () => {
    const newClaim = {
      date: new Date().toISOString(),
      reference: 'TEST_REF_' + Date.now(),
      payerId: createdPayerId,
      payee: 'TEST_PAYEE',
      currency: 'ZMW',
      description: 'Test claim',
      amountsAreTaxInclusive: false,
      items: [
        {
          account: createdAccountId,
          description: 'Line item 1',
          qty: 2,
          unitPrice: 50
        }
      ]
    };

    const res = await request(app).post('/api/expense-claims').send(newClaim);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.reference).toBe(newClaim.reference);
    
    createdExpenseClaimId = res.body.id;

    // Verify Ledger Entries were created
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { accountId: createdAccountId }
    });

    // We should have 1 debit entry for 100 on the expense account
    expect(ledgerEntries.length).toBe(1);
    expect(Number(ledgerEntries[0].debit)).toBe(100);
  });
});
