import request from 'supertest';
import app from '../index';
import { prisma } from '../index';

describe('Receipts API', () => {
  let createdReceiptId: string;
  let testReference = 'TEST_RCP_' + Date.now();

  afterAll(async () => {
    // Cleanup the created test receipt
    if (createdReceiptId) {
      await prisma.receipt.delete({
        where: { id: createdReceiptId }
      });
    }
    await prisma.$disconnect();
  });

  it('should create a new receipt', async () => {
    const newReceipt = {
      reference: testReference,
      date: new Date().toISOString(),
      paidByContact: 'Test Customer',
      receivedInAccount: 'Test Bank Account',
      description: 'Test receipt description',
      amount: 1500.50,
      currency: 'ZMW',
      status: 'Completed',
      items: [{ description: 'Payment for invoice', amount: 1500.50 }]
    };

    const res = await request(app).post('/api/receipts').send(newReceipt);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.reference).toBe(newReceipt.reference);
    
    createdReceiptId = res.body.id;
  });

  it('should fetch all receipts', async () => {
    const res = await request(app).get('/api/receipts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
    
    const found = res.body.find((r: any) => r.id === createdReceiptId);
    expect(found).toBeDefined();
  });

  it('should fetch a single receipt by id', async () => {
    const res = await request(app).get(`/api/receipts/${createdReceiptId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdReceiptId);
    expect(res.body.reference).toBe(testReference);
  });

  it('should update a receipt', async () => {
    const updatedAmount = 2000.00;
    const res = await request(app)
      .put(`/api/receipts/${createdReceiptId}`)
      .send({
        reference: testReference,
        amount: updatedAmount,
        paidByContact: 'Test Customer Updated',
        receivedInAccount: 'Test Bank Account Updated'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdReceiptId);
    expect(Number(res.body.amount)).toBe(updatedAmount);
    expect(res.body.paidByContact).toBe('Test Customer Updated');
  });
});
