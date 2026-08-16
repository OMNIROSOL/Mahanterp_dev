import request from 'supertest';
import app from '../index';
import { prisma } from '../index';

describe('Accounts API', () => {
  let createdAccountId: string;

  afterAll(async () => {
    // Cleanup the created test account
    if (createdAccountId) {
      await prisma.chartOfAccount.delete({
        where: { id: createdAccountId }
      });
    }
    await prisma.$disconnect();
  });

  it('should fetch all accounts', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    // At least the Suspense account or Expense Claims Payable should exist by now
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should create a new account', async () => {
    const newAccount = {
      name: 'TEST_ACCOUNT_' + Date.now(),
      code: 'TEST_' + Date.now(),
      type: 'Asset',
      isPaymentAccount: false
    };

    const res = await request(app).post('/api/accounts').send(newAccount);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(newAccount.name);
    
    createdAccountId = res.body.id;
  });
});
