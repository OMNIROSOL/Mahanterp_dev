import request from 'supertest';
import app from '../index';
import { prisma } from '../index';

describe('Payments API', () => {
  let createdPaymentId: string;
  let testReference = 'TEST_PAY_' + Date.now();

  afterAll(async () => {
    // Cleanup the created test payment
    if (createdPaymentId) {
      // Need to check if it exists in case delete test already removed it
      const existing = await prisma.payment.findUnique({
        where: { id: createdPaymentId }
      });
      if (existing) {
        await prisma.payment.delete({
          where: { id: createdPaymentId }
        });
      }
    }
    await prisma.$disconnect();
  });

  it('should create a new payment', async () => {
    const newPayment = {
      reference: testReference,
      date: new Date().toISOString(),
      paidToContact: 'Test Supplier',
      paidFromAccount: 'Test Bank Account',
      description: 'Test payment description',
      amount: 800.25,
      currency: 'ZMW',
      status: 'Completed',
      items: [{ description: 'Payment for supplies', amount: 800.25 }]
    };

    const res = await request(app).post('/api/payments').send(newPayment);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.reference).toBe(newPayment.reference);
    
    createdPaymentId = res.body.id;
  });

  it('should fetch all payments', async () => {
    const res = await request(app).get('/api/payments');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
    
    const found = res.body.find((p: any) => p.id === createdPaymentId);
    expect(found).toBeDefined();
  });

  it('should fetch a single payment by id', async () => {
    const res = await request(app).get(`/api/payments/${createdPaymentId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdPaymentId);
    expect(res.body.reference).toBe(testReference);
  });

  it('should update a payment', async () => {
    const updatedAmount = 900.50;
    const res = await request(app)
      .put(`/api/payments/${createdPaymentId}`)
      .send({
        reference: testReference,
        amount: updatedAmount,
        paidToContact: 'Test Supplier Updated',
        paidFromAccount: 'Test Bank Account Updated'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdPaymentId);
    expect(Number(res.body.amount)).toBe(updatedAmount);
    expect(res.body.paidToContact).toBe('Test Supplier Updated');
  });

  it('should delete a payment', async () => {
    const res = await request(app).delete(`/api/payments/${createdPaymentId}`);
    expect(res.status).toBe(200);
    
    // Verify it's deleted
    const getRes = await request(app).get(`/api/payments/${createdPaymentId}`);
    expect(getRes.status).toBe(404);
  });
});
