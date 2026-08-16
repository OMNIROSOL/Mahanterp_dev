import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import cors from 'cors';

const app = express();
console.log('Connecting to DB:', process.env.DATABASE_URL ? 'URL found' : 'URL MISSING');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // Increased timeout
  idleTimeoutMillis: 30000,
  max: 20 // Increased pool size
});

pool.on('connect', (client) => {
  // Optional: log which request this client belongs to if possible, 
  // but for now just general log
  console.log('Database pool: New client connected');
});

pool.on('error', (err) => {
  console.error('CRITICAL: Database pool error:', err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 3001;

const formatDate = (date: Date | null | undefined) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatDateTime = (date: Date | null | undefined) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + ampm;

  return `${day}.${month}.${year} ${strTime}`;
};

const parseDate = (d: any) => {
  if (!d) return undefined;
  if (typeof d === 'string' && d.includes('.')) {
    const [day, month, year] = d.split('.').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(d);
  return isNaN(date.getTime()) ? undefined : date;
};

app.use(cors());
app.use(express.json());

// Add a simple request tracker
let requestId = 0;
app.use((req, res, next) => {
  const id = ++requestId;
  (req as any).requestId = id;
  const start = Date.now();
  console.log(`[REQ ${id}] ${req.method} ${req.url}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[REQ ${id}] Finished in ${duration}ms with status ${res.statusCode}`);
  });
  next();
});

app.get('/api/users', (req, res) => res.json([]));

app.get('/api/test-patch-route', (req, res) => {
  res.json({ message: 'PATCH test route is reachable' });
});

app.get('/api/ping', (req, res) => res.json({ pong: true }));

// Removed duplicate purchase-invoice routes



app.patch('/api/delivery-notes/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  console.log(`PATCH DELIVERY NOTE STATUS HIT: ID=${id}, Status=${status}`);
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    console.log(`ID type check: isUuid=${isUuid}`);

    const existing = await prisma.deliveryNote.findFirst({
      where: {
        OR: [
          { id: isUuid ? id : undefined },
          { reference: id }
        ]
      }
    });

    if (!existing) {
      console.warn(`Delivery note not found for status update: ${id}`);
      return res.status(404).json({ error: 'Delivery note not found' });
    }

    console.log(`Found existing note: ${existing.id} (${existing.reference})`);

    const result = await prisma.deliveryNote.update({
      where: { id: existing.id },
      data: { status }
    });
    console.log('PATCH DELIVERY NOTE STATUS SUCCESS:', result.id);
    res.json(result);
  } catch (err: any) {
    console.error('PATCH DELIVERY NOTE STATUS ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

const generateNextReference = async (type: string, tx: any = prisma) => {
  let count = 0;
  let prefix = '';

  console.log(`[REF GEN] Generating next reference for type: ${type}`);

  const getNextNum = async (model: any, pref: string) => {
    const records = await model.findMany({
      where: { reference: { startsWith: pref, mode: 'insensitive' } },
      select: { reference: true }
    });
    console.log(`[REF GEN] Found ${records.length} records starting with ${pref}`);
    let max = 0;
    records.forEach((r: any) => {
      const parts = r.reference.split('-');
      const num = parseInt(parts[parts.length - 1]);
      if (!isNaN(num) && num > max) max = num;
    });
    return max;
  };

  const getNextCodeNum = async (model: any, pref: string) => {
    const records = await model.findMany({
      where: { code: { startsWith: pref, mode: 'insensitive' } },
      select: { code: true }
    });
    let max = 0;
    records.forEach((r: any) => {
      const parts = r.code.split('-');
      const num = parseInt(parts[parts.length - 1]);
      if (!isNaN(num) && num > max) max = num;
    });
    return max;
  };

  switch (type) {
    case 'invoice': count = await getNextNum(tx.invoice, 'INV-'); prefix = 'INV'; break;
    case 'quote': count = await getNextNum(tx.salesQuote, 'SQ-'); prefix = 'SQ'; break;
    case 'order': count = await getNextNum(tx.salesOrder, 'SO-'); prefix = 'SO'; break;
    case 'delivery': count = await getNextNum(tx.deliveryNote, 'DN-'); prefix = 'DN'; break;
    case 'receipt': count = await getNextNum(tx.receipt, 'RCP-'); prefix = 'RCP'; break;
    case 'purchase-quote':
    case 'purchase-enquiry': count = await getNextNum(tx.purchaseEnquiry, 'PE-'); prefix = 'PE'; break;
    case 'purchase-order': count = await getNextNum(tx.purchaseOrder, 'PO-'); prefix = 'PO'; break;
    case 'purchase-invoice': count = await getNextNum(tx.invoices, 'PINV-'); prefix = 'PINV'; break;
    case 'customer': count = await getNextCodeNum(tx.customer, 'CUST-'); prefix = 'CUST'; break;
    case 'supplier': count = await getNextCodeNum(tx.suppliers, 'SUP-'); prefix = 'SUP'; break;
    case 'inventory-transfer': count = await getNextNum(tx.inventoryTransfer, 'TR-'); prefix = 'TR'; break;
    case 'inventory-write-off': count = await getNextNum(tx.inventoryWriteOff, 'WO-'); prefix = 'WO'; break;
    case 'goods-received-note': count = await getNextNum(tx.goodsReceivedNote, 'GRN-'); prefix = 'GRN'; break;
    case 'debit-note': prefix = 'DN'; count = Math.floor(Math.random() * 1000); break;
    case 'credit-note': prefix = 'CN'; count = Math.floor(Math.random() * 1000); break;
    default: throw new Error('Invalid document type');
  }

  const nextRef = `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
  console.log(`[REF GEN] Result: ${nextRef}`);
  return nextRef;
};

// Root endpoint
app.get('/', (req, res) => {
  res.send('🚀 ERP Backend is running');
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, now: result.rows[0].now });
  } catch (err: any) {
    console.error('DB Test Failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- MASTER DATA ---
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const [invoices, receipts] = await Promise.all([
      prisma.invoice.findMany({ select: { customerId: true, grandTotal: true } }),
      prisma.receipt.findMany({ select: { paidByContact: true, amount: true } })
    ]);
    const customersWithBalance = customers.map(customer => {
      const customerInvoices = invoices.filter(i => i.customerId === customer.id);
      const customerReceipts = receipts.filter(r => r.paidByContact === customer.name);

      const totalInvoiced = customerInvoices.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
      const totalPaid = customerReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const balance = totalInvoiced - totalPaid;

      return {
        ...customer,
        balance,
        status: customer.inactive ? 'Inactive' : (balance <= 0 ? 'Paid' : 'Unpaid')
      };
    });

    res.json(customersWithBalance);
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [invoices, receipts] = await Promise.all([
      prisma.invoice.findMany({ where: { customerId: id }, select: { grandTotal: true } }),
      prisma.receipt.findMany({ where: { paidByContact: customer.name }, select: { amount: true } })
    ]);

    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
    const totalPaid = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const balance = totalInvoiced - totalPaid;

    res.json({
      ...customer,
      balance,
      status: customer.inactive ? 'Inactive' : (balance <= 0 ? 'Paid' : 'Unpaid')
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/customers', async (req, res) => {
  const data = req.body;
  try {
    const result = await prisma.customer.create({
      data: {
        code: data.code,
        name: data.name,
        email: data.email,
        currency: data.currency,
        billingAddress: data.billingAddress,
        deliveryAddress: data.deliveryAddress,
        tpin: data.tpin,
        division: data.division,
        salesPerson: data.salesPerson,
        creditDays: data.creditDays ? parseInt(data.creditDays.toString()) : undefined,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit.toString()) : undefined,
        documentation: data.documentation,
        inactive: data.inactive || false,
        status: data.status || 'Active',
      }
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const result = await prisma.customer.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        email: data.email,
        currency: data.currency,
        billingAddress: data.billingAddress,
        deliveryAddress: data.deliveryAddress,
        tpin: data.tpin,
        division: data.division,
        salesPerson: data.salesPerson,
        creditDays: data.creditDays ? parseInt(data.creditDays.toString()) : undefined,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit.toString()) : undefined,
        documentation: data.documentation,
        inactive: data.inactive,
        status: data.status
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await prisma.item.findMany();
    res.json(items);
  } catch (err: any) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.item.findUnique({
      where: { id }
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/items', async (req, res) => {
  const { itemCode, itemName, unitName, sellingPrice, purchasePrice, qtyOnHand, description, imageUrl } = req.body;
  try {
    const result = await prisma.item.create({
      data: { itemCode, itemName, unitName, sellingPrice, purchasePrice, qtyOnHand, description, imageUrl }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { itemCode, itemName, unitName, sellingPrice, purchasePrice, qtyOnHand, description, imageUrl } = req.body;
  try {
    const result = await prisma.item.update({
      where: { id },
      data: { itemCode, itemName, unitName, sellingPrice, purchasePrice, qtyOnHand, description, imageUrl }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- DIVISIONS ---
app.get('/api/divisions', async (req, res) => {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(divisions);
  } catch (err: any) {
    console.error('Error fetching divisions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/divisions', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await prisma.division.create({
      data: { name, description }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/divisions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.division.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- SALES ---
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (err: any) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, items: { include: { item: true, tax_codes: true } } }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/invoices', async (req, res) => {
  const { customerId, reference, items, grandTotal, balanceDue, docOptions, dueDate, issueDate, description } = req.body;
  try {
    const result = await prisma.invoice.create({
      data: {
        customerId,
        reference,
        grandTotal,
        balanceDue,
        issueDate: parseDate(issueDate),
        dueDate: parseDate(dueDate),
        docOptions: { ...(docOptions || {}), description },
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount,
            division: item.division,
            tax_code_id: item.tax_code_id,
            totalAmount: item.totalAmount
          }))
        }
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;
  const { customerId, reference, items, grandTotal, balanceDue, docOptions, dueDate, issueDate, description } = req.body;
  try {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    const result = await prisma.invoice.update({
      where: { id },
      data: {
        customerId,
        reference,
        grandTotal,
        balanceDue,
        issueDate: parseDate(issueDate),
        dueDate: parseDate(dueDate),
        docOptions: { ...(docOptions || {}), description },
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount,
            division: item.division,
            tax_code_id: item.tax_code_id,
            totalAmount: item.totalAmount
          }))
        }
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await prisma.invoice.update({
      where: { id },
      data: { status }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Sales Quotes
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await prisma.salesQuote.findMany({
      include: { customer: true, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotes);
  } catch (err: any) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const quote = await prisma.salesQuote.findUnique({
      where: { id },
      include: { customer: true, items: { include: { item: true } } }
    });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/quotes', async (req, res) => {
  const { customerId, reference, items, amount, currency, description, billingAddress, expiryDays, docOptions, issueDate, status } = req.body;
  try {
    const result = await prisma.salesQuote.create({
      data: {
        customerId,
        reference,
        amount,
        currency,
        description,
        billingAddress,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        status: status || 'Active',
        expiryDays: parseInt(expiryDays) || 30,
        docOptions: docOptions || {},
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount,
            division: item.division,
            taxCode: item.taxCode,
            totalAmount: item.totalAmount
          }))
        }
      }
    });
    res.json(result);
  } catch (err) {
    console.error('Error creating quote:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});


app.patch('/api/quotes/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await prisma.salesQuote.update({
      where: { id },
      data: { status }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  const { id } = req.params;
  const { customerId, reference, items, amount, currency, description, billingAddress, expiryDays, docOptions, status } = req.body;
  try {
    await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
    const result = await prisma.salesQuote.update({
      where: { id },
      data: {
        customerId,
        reference,
        amount,
        currency,
        description,
        billingAddress,
        expiryDays: parseInt(expiryDays) || 30,
        docOptions: docOptions || {},
        status: status || 'Active',
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount,
            division: item.division,
            taxCode: item.taxCode,
            totalAmount: item.totalAmount
          }))
        }
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/quotes/:id/convert', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.salesQuote.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!quote) throw new Error('Quote not found');

      const order = await tx.salesOrder.create({
        data: {
          customerId: quote.customerId,
          reference: quote.reference,
          amount: Number(quote.amount),
          currency: quote.currency,
          description: quote.description,
          billingAddress: quote.billingAddress,
          orderDate: new Date(),
          expiryDate: (quote.issueDate && quote.expiryDays)
            ? new Date(new Date(quote.issueDate).getTime() + quote.expiryDays * 24 * 60 * 60 * 1000)
            : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
          status: 'Ordered',
          docOptions: quote.docOptions || {},
          items: {
            create: quote.items.map((item: any) => ({
              itemId: item.itemId,
              description: item.description,
              qty: Number(item.qty),
              unitPrice: Number(item.unitPrice),
              discount: Number(item.discount || 0),
              division: item.division,
              taxCode: item.taxCode,
              totalAmount: Number(item.totalAmount)
            }))
          }
        }
      });

      await tx.salesQuote.update({
        where: { id },
        data: { status: 'Accepted' }
      });

      return order;
    });

    res.json(result);
  } catch (err: any) {
    console.error('Conversion error:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'A sales order with this reference already exists.' });
    }
    res.status(500).json({ error: err.message || 'Failed to convert quote' });
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.salesQuote.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// Sales Orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: { customer: true, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const ordersWithQty = orders.map(o => ({
      ...o,
      qtyReserved: o.items.reduce((sum, item) => sum + Number(item.qty), 0)
    }));
    res.json(ordersWithQty);
  } catch (err: any) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true, items: { include: { item: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const orderWithQty = {
      ...order,
      qtyReserved: order.items.reduce((sum, item) => sum + Number(item.qty), 0)
    };
    res.json(orderWithQty);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customerId, reference, items, amount, currency, description, billingAddress, docOptions, orderDate, expiryDate } = req.body;
  console.log('--- CREATE ORDER REQUEST ---');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  try {
    console.log('Validating items...');
    if (!items || !Array.isArray(items)) throw new Error('Items must be an array');

    const prismaData: any = {
      customerId,
      reference,
      amount: Number(amount || 0),
      currency: currency || 'ZMW',
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      description,
      billingAddress,
      orderDate: (orderDate && !isNaN(new Date(orderDate).getTime())) ? new Date(orderDate) : new Date(),
      docOptions: docOptions || {},
      items: {
        create: items.map((item: any, idx: number) => {
          if (!item.itemId) {
            console.error(`Item at index ${idx} is missing itemId`, item);
            throw new Error(`Item at index ${idx} is missing itemId`);
          }
          return {
            itemId: item.itemId,
            description: item.description,
            qty: Number(item.qty || 0),
            unitPrice: Number(item.unitPrice || 0),
            discount: Number(item.discount || 0),
            division: item.division || 'General',
            taxCode: item.taxCode || 'No tax',
            totalAmount: Number(item.totalAmount || 0)
          };
        })
      }
    };

    console.log('Sending to Prisma:', JSON.stringify(prismaData, (key, value) =>
      key === 'items' ? undefined : value, 2)); // Hide items to keep log clean
    console.log('Items count:', prismaData.items.create.length);

    const result = await prisma.salesOrder.create({
      data: prismaData
    });
    res.json(result);
  } catch (err: any) {
    console.error('CREATE ORDER ERROR:', err);
    res.status(500).json({ error: err.message, detailed: err });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { customerId, reference, items, amount, currency, description, billingAddress, docOptions, status, orderDate, expiryDate } = req.body;
  console.log('--- UPDATE ORDER REQUEST ---');
  console.log('ID:', id);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  try {
    await prisma.quoteItem.deleteMany({ where: { orderId: id } });
    const result = await prisma.salesOrder.update({
      where: { id },
      data: {
        customerId,
        reference,
        amount: Number(amount),
        currency,
        description,
        billingAddress,
        status: status || 'Ordered',
        orderDate: orderDate ? new Date(orderDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        docOptions: docOptions || {},
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount || 0),
            division: item.division,
            taxCode: item.taxCode,
            totalAmount: Number(item.totalAmount)
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('UPDATE ORDER ERROR:', err);
    res.status(500).json({ error: err.message, detailed: err });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await prisma.salesOrder.update({
      where: { id },
      data: { status }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Delivery Notes
app.get('/api/delivery-notes', async (req, res) => {
  try {
    const notes = await prisma.deliveryNote.findMany({
      include: {
        customer: true,
        items: { include: { item: true } }
      },
      orderBy: { timestamp: 'desc' }
    });
    res.json(notes);
  } catch (err: any) {
    console.error('Fetch delivery notes error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/delivery-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let note = await prisma.deliveryNote.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { item: true } }
      }
    });

    if (!note) {
      note = await prisma.deliveryNote.findUnique({
        where: { reference: id },
        include: {
          customer: true,
          items: { include: { item: true } }
        }
      });
    }

    if (!note) return res.status(404).json({ error: 'Delivery note not found' });
    res.json(note);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



app.post('/api/delivery-notes', async (req, res) => {
  const { customerId, reference, items, description, inventoryLocation, deliveryDate, orderNumber, invoiceNumber, status, docOptions, customTitle, footer, columnLineNumber, deliveryAddress } = req.body;
  try {
    const result = await prisma.deliveryNote.create({
      data: {
        customerId,
        reference,
        description,
        deliveryAddress,
        inventoryLocation,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        orderNumber,
        invoiceNumber,
        status: status || 'Pending',
        docOptions: docOptions || {},
        customTitle,
        footer,
        columnLineNumber,
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: Number(item.qty)
          }))
        }
      }
    });
    res.json(result);
  } catch (err) {
    console.error('CREATE DELIVERY NOTE ERROR:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/delivery-notes/:id', async (req, res) => {
  console.log('PUT DELIVERY NOTE HIT:', req.params.id);
  const { id } = req.params;
  const { customerId, reference, items, description, inventoryLocation, deliveryDate, orderNumber, invoiceNumber, status, docOptions, customTitle, footer, columnLineNumber, deliveryAddress } = req.body;
  try {
    // Resolve UUID if 'id' is a reference
    let targetId = id;
    const existing = await prisma.deliveryNote.findFirst({
      where: {
        OR: [
          { id: id.length === 36 ? id : undefined }, // Try as UUID
          { reference: id }
        ]
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Delivery note not found' });
    }
    targetId = existing.id;

    // Delete existing items ONLY if new items are provided
    if (items) {
      await prisma.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: targetId } });
    }

    const result = await prisma.deliveryNote.update({
      where: { id: targetId },
      data: {
        customerId: customerId || existing.customerId,
        reference: reference || existing.reference,
        description: description !== undefined ? description : existing.description,
        deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
        inventoryLocation: inventoryLocation !== undefined ? inventoryLocation : existing.inventoryLocation,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : existing.deliveryDate,
        orderNumber: orderNumber !== undefined ? orderNumber : existing.orderNumber,
        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : existing.invoiceNumber,
        status: status || existing.status,
        docOptions: docOptions || existing.docOptions || {},
        customTitle: customTitle !== undefined ? customTitle : existing.customTitle,
        footer: footer !== undefined ? footer : existing.footer,
        columnLineNumber: columnLineNumber !== undefined ? columnLineNumber : existing.columnLineNumber,
        items: items ? {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: Number(item.qty)
          }))
        } : undefined
      }
    });
    res.json(result);
  } catch (err) {
    console.error('UPDATE DELIVERY NOTE ERROR:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- SUPPLIERS ---
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await prisma.suppliers.findMany({
      include: {
        purchaseEnquiries: {
          select: { status: true }
        },
        purchaseOrders: {
          select: { status: true }
        },
        invoices: {
          select: { id: true }
        },
        goodsReceivedNotes: {
          select: { id: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    const suppliersWithCounts = suppliers.map(supplier => {
      const activeEnquiries = (supplier.purchaseEnquiries || []).filter((q: any) => {
        const status = (q.status || '').toLowerCase();
        return status !== 'accepted' && status !== 'rejected';
      }).length;

      const activeOrders = (supplier.purchaseOrders || []).filter((o: any) => {
        const status = (o.status || '').toLowerCase();
        return status !== 'invoiced' && status !== 'rejected' && status !== 'closed';
      }).length;

      return {
        ...supplier,
        purchaseEnquiries: activeEnquiries,
        purchaseOrders: activeOrders,
        purchaseInvoices: (supplier.invoices || []).length,
        goodsReceipts: (supplier.goodsReceivedNotes || []).length,
        debitNotes: 0, // Debit Notes model is currently missing from schema
        status: supplier.inactive ? 'Inactive' : supplier.status
      };
    });
    res.json(suppliersWithCounts);
  } catch (err: any) {
    console.error('Fetch suppliers error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await prisma.suppliers.findUnique({
      where: { id }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json({
      ...supplier,
      status: supplier.inactive ? 'Inactive' : supplier.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase invoice routes moved earlier

app.post('/api/suppliers', async (req, res) => {
  const { code, name, email, currency, billingAddress, status, division, tpin, controlAccount } = req.body;
  try {
    const result = await prisma.suppliers.create({
      data: {
        code,
        name,
        email,
        currency,
        billingAddress,
        status: status || 'Paid',
        division,
        tpin,
        controlAccount: controlAccount || 'Accounts Payable'
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name, email, currency, billingAddress, status, division, tpin, inactive, controlAccount } = req.body;
  try {
    const result = await prisma.suppliers.update({
      where: { id },
      data: { code, name, email, currency, billingAddress, status, division, tpin, inactive, controlAccount }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- RECEIPTS ---
app.get('/api/receipts', async (req, res) => {
  try {
    const receipts = await prisma.receipt.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(receipts);
  } catch (err: any) {
    console.error('Fetch receipts error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/receipts', async (req, res) => {
  const { reference, date, paidByContact, receivedInAccount, description, amount, currency, status } = req.body;
  try {
    const result = await prisma.receipt.create({
      data: {
        reference,
        date: date ? new Date(date) : undefined,
        paidByContact,
        receivedInAccount,
        description,
        amount,
        currency,
        status: status || 'Completed'
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- TAX CODES ---
app.get('/api/tax-codes', async (req, res) => {
  try {
    const codes = await prisma.tax_codes.findMany();
    res.json(codes);
  } catch (err: any) {
    console.error('Fetch tax codes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- REFERENCE GENERATION ---
app.get('/api/reference/next/:type', async (req, res) => {
  const { type } = req.params;
  try {
    const nextRef = await generateNextReference(type);
    res.json({ nextRef });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FINANCE ---
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bank-accounts', async (req, res) => {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { isPaymentAccount: true },
      orderBy: { name: 'asc' }
    });
    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MASTER ---
app.get('/api/divisions', async (req, res) => {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(divisions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/divisions', async (req, res) => {
  try {
    const result = await prisma.division.create({ data: req.body });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/divisions/:id', async (req, res) => {
  try {
    await prisma.division.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tax-codes', async (req, res) => {
  try {
    const codes = await prisma.tax_codes.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(codes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVENTORY ---
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory-transfers', async (req, res) => {
  try {
    const transfers = await prisma.inventoryTransfer.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transfers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory-transfers/:id', async (req, res) => {
  try {
    const transfer = await prisma.inventoryTransfer.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json(transfer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory-transfers', async (req, res) => {
  const { reference, date, fromLocation, toLocation, description, status, items } = req.body;
  try {
    const result = await prisma.inventoryTransfer.create({
      data: {
        reference,
        date: parseDate(date),
        fromLocation,
        toLocation,
        description,
        status: status || 'Draft',
        items: {
          create: items.map((item: any) => ({
            inventoryItem: item.inventoryItem,
            qty: Number(item.qty)
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('CREATE TRANSFER ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory-transfers/:id', async (req, res) => {
  const { id } = req.params;
  const { reference, date, fromLocation, toLocation, description, status, items } = req.body;
  try {
    await prisma.inventoryTransferItem.deleteMany({ where: { inventoryTransferId: id } });
    const result = await prisma.inventoryTransfer.update({
      where: { id },
      data: {
        reference,
        date: parseDate(date),
        fromLocation,
        toLocation,
        description,
        status: status || 'Draft',
        items: {
          create: items.map((item: any) => ({
            inventoryItem: item.inventoryItem,
            qty: Number(item.qty)
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory-write-offs', async (req, res) => {
  try {
    const writeOffs = await prisma.inventoryWriteOff.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(writeOffs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory-write-offs/:id', async (req, res) => {
  try {
    const wo = await prisma.inventoryWriteOff.findUnique({
      where: { id: req.params.id }
    });
    if (!wo) return res.status(404).json({ error: 'Write-off not found' });
    res.json(wo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory-write-offs', async (req, res) => {
  const { reference, date, inventoryItem, qty, account, allocation, taxCode, division, description, amount, status } = req.body;
  try {
    const result = await prisma.inventoryWriteOff.create({
      data: {
        reference,
        date: parseDate(date),
        inventoryItem,
        qty: Number(qty),
        account,
        allocation,
        taxCode,
        division,
        description,
        amount: amount ? Number(amount) : undefined,
        status: status || 'Draft'
      }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory-write-offs/:id', async (req, res) => {
  const { id } = req.params;
  const { reference, date, inventoryItem, qty, account, allocation, taxCode, division, description, amount, status } = req.body;
  try {
    const result = await prisma.inventoryWriteOff.update({
      where: { id },
      data: {
        reference,
        date: parseDate(date),
        inventoryItem,
        qty: Number(qty),
        account,
        allocation,
        taxCode,
        division,
        description,
        amount: amount ? Number(amount) : undefined,
        status: status || 'Draft'
      }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debit-notes', (req, res) => res.json([]));
app.get('/api/credit-notes', (req, res) => res.json([]));

// --- PROCUREMENT ---
app.get('/api/purchase-enquiries', async (req, res) => {
  try {
    const enquiries = await prisma.purchaseEnquiry.findMany({
      include: {
        supplier: true,
        items: {
          include: { item: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[ENQUIRY GET] Fetched ${enquiries.length} enquiries`);
    res.json(enquiries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchase-enquiries/:id', async (req, res) => {
  try {
    const enquiry = await prisma.purchaseEnquiry.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: {
          include: { item: true }
        }
      }
    });
    if (!enquiry) return res.status(404).json({ error: 'Purchase enquiry not found' });
    res.json(enquiry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/purchase-enquiries', async (req, res) => {
  const { supplierId, reference, items, amount, currency, description, issueDate, status, docOptions } = req.body;
  try {
    const result = await prisma.purchaseEnquiry.create({
      data: {
        supplierId,
        reference,
        amount: Number(amount),
        currency,
        description,
        issueDate: issueDate ? parseDate(issueDate) : undefined,
        status: status || 'Active',
        docOptions: docOptions || {},
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId || null,
            description: item.description,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
            taxCode: item.taxCode || 'VAT 16%',
            unit: item.unit || '',
            totalAmount: Number(item.totalAmount),
            discount: item.discount || '',
            division: item.division || 'General'
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('[PURCHASE ENQUIRY CREATE ERROR]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-enquiries/:id', async (req, res) => {
  const { id } = req.params;
  const { supplierId, reference, items, amount, currency, description, issueDate, status, docOptions } = req.body;
  try {
    await prisma.purchaseEnquiryItem.deleteMany({ where: { purchaseEnquiryId: id } });
    const result = await prisma.purchaseEnquiry.update({
      where: { id },
      data: {
        supplierId,
        reference,
        amount: Number(amount),
        currency,
        description,
        issueDate: issueDate ? parseDate(issueDate) : undefined,
        status: status || 'Active',
        docOptions: docOptions || {},
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId || null,
            description: item.description,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
            taxCode: item.taxCode || 'VAT 16%',
            unit: item.unit || '',
            totalAmount: Number(item.totalAmount),
            discount: item.discount || '',
            division: item.division || 'General'
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/purchase-enquiries/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Enquiry Status
      const enquiry = await tx.purchaseEnquiry.update({
        where: { id },
        data: { status },
        include: { items: true }
      });

      // 2. If Accepted, create or update a PO
      if (status === 'Accepted') {
        console.log(`>>> [ENQUIRY APPROVE] Converting Enquiry ${id} (${enquiry.reference}) to PO`);

        // Check if PO already exists by Link or by Reference to prevent collisions
        const existingPO = await tx.purchaseOrder.findFirst({
          where: {
            OR: [
              { sourceEnquiryId: id },
              { reference: enquiry.reference }
            ]
          }
        });

        if (existingPO) {
          console.log(`[ENQUIRY APPROVE] PO already exists (${existingPO.reference}). Updating...`);
          // Sync existing PO
          await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: existingPO.id } });
          await tx.purchaseOrder.update({
            where: { id: existingPO.id },
            data: {
              sourceEnquiryId: id, // Ensure it's linked
              supplierId: enquiry.supplierId,
              description: `Updated from Enquiry ${enquiry.reference}. ${enquiry.description || ''}`,
              currency: enquiry.currency,
              amount: enquiry.amount,
              docOptions: enquiry.docOptions || {},
              items: {
                create: enquiry.items.map(item => ({
                  itemId: item.itemId,
                  description: item.description,
                  qty: item.qty,
                  unitPrice: item.unitPrice,
                  totalAmount: item.totalAmount,
                  division: item.division,
                  taxCode: item.taxCode,
                  discount: item.discount
                }))
              }
            }
          });
        } else {
          // Create new PO with original reference format
          const poReference = enquiry.reference || `PO-${Date.now()}`;
          console.log(`[ENQUIRY APPROVE] Creating new PO: ${poReference}`);

          await tx.purchaseOrder.create({
            data: {
              reference: poReference,
              orderDate: new Date(),
              supplierId: enquiry.supplierId,
              description: `Generated from Enquiry ${enquiry.reference}. ${enquiry.description || ''}`,
              currency: enquiry.currency,
              amount: enquiry.amount,
              status: 'Open',
              sourceEnquiryId: id,
              docOptions: enquiry.docOptions || {},
              items: {
                create: enquiry.items.map(item => ({
                  itemId: item.itemId,
                  description: item.description,
                  qty: item.qty,
                  unitPrice: item.unitPrice,
                  totalAmount: item.totalAmount,
                  division: item.division,
                  taxCode: item.taxCode,
                  discount: item.discount
                }))
              }
            }
          });
        }
        console.log(`[ENQUIRY APPROVE] Done.`);
      }
      return enquiry;
    });

    res.json(result);
  } catch (err: any) {
    console.error('PATCH PURCHASE ENQUIRY ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchase-orders', async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: { item: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const ordersWithQty = orders.map(o => ({
      ...o,
      qtyOnDeliver: (o.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)
    }));
    console.log(`[PO GET] Fetched ${orders.length} orders:`, ordersWithQty.map(o => ({ ref: o.reference, status: o.status, qty: o.qtyOnDeliver })));
    res.json(ordersWithQty);
  } catch (err: any) {
    console.error('GET PURCHASE ORDERS ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchase-orders/:id', async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: {
          include: { item: true }
        }
      }
    });
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status === 'Approved' || status === 'Ordered' || status === 'Invoiced') {
      // Use a transaction: create invoice from PO data, then mark PO as Invoiced
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch the full PO with items - use broad include
        const order = await tx.purchaseOrder.findUnique({
          where: { id },
          include: {
            items: {
              include: { item: true }
            },
            supplier: true
          }
        });
        if (!order) throw new Error('Purchase order not found');

        const sourceItems = order.items || [];
        console.log(`[PO->PI] Found ${sourceItems.length} source items for PO ${order.reference}`);

        // 2. Create Purchase Invoice
        const baseDate = order.orderDate || new Date();
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + 30);

        const newInvoice = await tx.invoices.create({
          data: {
            reference: order.reference,
            supplier_id: order.supplierId,
            grand_total: order.amount || 0,
            status: 'Unpaid',
            due_date: dueDate,
            description: order.description || `Generated from ${order.reference}`,
            docOptions: order.docOptions || {},
            items: {
              create: sourceItems.map((it: any) => ({
                itemId: it.itemId || it.item_id || it.item?.id,
                description: it.description || it.item?.itemName || it.itemName || it.item_name || 'No Description',
                qty: Number(it.qty || it.quantity) || 1,
                unitPrice: Number(it.unitPrice || it.unit_price || it.price) || 0,
                totalAmount: Number(it.totalAmount) || (Number(it.qty || it.quantity || 1) * Number(it.unitPrice || it.unit_price || 0)) || 0,
                taxCode: it.taxCode || it.tax_code || 'VAT 16%',
                discount: it.discount || '',
                division: it.division || 'General',
                account: it.account || 'Inventory'
              }))
            }
          },
          include: { items: true }
        });
        console.log(`[PO->PI] Success. Created Invoice ID: ${newInvoice.id} with ${newInvoice.items?.length} items.`);

        // 3. Mark PO as Invoiced (hides from PO list)
        const updated = await tx.purchaseOrder.update({
          where: { id },
          data: { status: 'Invoiced' }
        });

        return updated;
      });
      return res.json(result);
    }

    // For all other status changes (Rejected, etc.)
    const result = await prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    });
    res.json(result);
  } catch (err: any) {
    console.error('PATCH PURCHASE ORDER ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- PURCHASE INVOICES ---
app.get('/api/purchase-invoices', async (req, res) => {
  try {
    const invs = await prisma.invoices.findMany({
      include: {
        suppliers: true,
        items: {
          include: { item: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    const mapped = invs.map(inv => {
      const itemsTotal = (inv.items || []).reduce((sum, item) => {
        const itemTotal = Number(item.totalAmount) || 0;
        return sum + itemTotal;
      }, 0);
      const totalDiscount = (inv.items || []).reduce((sum, item) => sum + (parseFloat(item.discount as string) || 0), 0);
      return {
        ...inv,
        description: inv.description || '',
        dueDate: inv.due_date ? formatDate(inv.due_date) : null,
        timestamp: inv.created_at ? formatDateTime(inv.created_at) : null,
        invoiceAmount: itemsTotal,
        balanceDue: itemsTotal,
        supplier: inv.suppliers?.name || 'Unknown',
        supplierId: inv.supplier_id,
        currency: (inv.docOptions as any)?.currency || (inv.suppliers as any)?.currency?.split(' - ')[0] || 'ZMW',
        discount: totalDiscount
      };
    });
    res.json(mapped);
  } catch (err: any) {
    console.error('Fetch purchase invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchase-invoices/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[PI GET /:id] Fetching purchase invoice: ${id}`);
  try {
    const inv = await prisma.invoices.findUnique({
      where: { id },
      include: {
        suppliers: true,
        items: {
          include: { item: true }
        }
      }
    });
    if (!inv) return res.status(404).json({ error: 'Purchase invoice not found' });

    console.log(`[PI GET /:id] Raw inv keys: ${Object.keys(inv)}`);
    console.log(`[PI GET /:id] description: ${inv.description}`);
    console.log(`[PI GET /:id] items count: ${inv.items?.length}`);

    const totalDiscount = (inv.items || []).reduce((sum, item) => sum + (parseFloat(item.discount as string) || 0), 0);
    const itemsTotal = (inv.items || []).reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
    const mapped = {
      ...inv,
      description: inv.description || '',
      discount: totalDiscount,
      items: (inv.items || []).map((i: any) => ({
        ...i,
        itemName: i.item?.itemName || '',
        qty: Number(i.qty),
        unitPrice: Number(i.unitPrice),
        totalAmount: Number(i.totalAmount)
      })),
      dueDate: inv.due_date ? formatDate(inv.due_date) : null,
      issueDate: inv.created_at ? inv.created_at.toISOString().split('T')[0] : null,
      grandTotal: itemsTotal,
      invoiceAmount: itemsTotal,
      currency: (inv.docOptions as any)?.currency || (inv.suppliers as any)?.currency?.split(' - ')[0] || 'ZMW',
      supplier: inv.suppliers?.name || 'Unknown',
      supplierId: inv.supplier_id
    };
    res.json(mapped);
  } catch (err: any) {
    console.error('[PI GET /:id] ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase-invoices', async (req, res) => {
  const { supplierId, reference, grandTotal, dueDate, issueDate, status, description, items, docOptions } = req.body;
  console.log(`[PI POST] Body items:`, items?.length);
  try {
    const result = await prisma.invoices.create({
      data: {
        supplier_id: supplierId,
        reference: reference || `PI-${Date.now()}`,
        grand_total: Number(grandTotal) || 0,
        status: status || 'Unpaid',
        due_date: dueDate ? parseDate(dueDate) : undefined,
        created_at: issueDate ? parseDate(issueDate) : undefined,
        description: description || '',
        docOptions: docOptions || {},
        items: {
          create: (items || []).map((i: any) => ({
            itemId: i.itemId,
            description: i.description || '',
            qty: Number(i.qty) || 0,
            unitPrice: Number(i.unitPrice) || 0,
            totalAmount: Number(i.totalAmount) || 0,
            taxCode: i.taxCode || 'VAT 16%',
            discount: i.discount || '',
            division: i.division || 'General',
            account: i.account || 'Inventory'
          }))
        }
      },
      include: { items: true }
    });
    console.log(`[PI POST] Success. Created ID: ${result.id}, Items: ${result.items?.length}`);
    res.json(result);
  } catch (err: any) {
    console.error('[PURCHASE INVOICE CREATE ERROR]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-invoices/:id', async (req, res) => {
  const { id } = req.params;
  const { supplierId, reference, grandTotal, dueDate, issueDate, status, description, items, docOptions } = req.body;
  console.log(`>>> [PURCHASE INVOICE PUT] UPDATING ID: ${id}`, JSON.stringify(req.body, null, 2));
  try {
    const result = await prisma.invoices.update({
      where: { id },
      data: {
        supplier_id: supplierId,
        reference: reference,
        grand_total: Number(grandTotal) || 0,
        status: status || 'Unpaid',
        due_date: dueDate ? parseDate(dueDate) : undefined,
        created_at: issueDate ? parseDate(issueDate) : undefined,
        description: description || '',
        docOptions: docOptions || {},
        items: {
          deleteMany: {},
          create: (items || []).map((i: any) => ({
            itemId: i.itemId,
            description: i.description || '',
            qty: Number(i.qty) || 0,
            unitPrice: Number(i.unitPrice) || 0,
            totalAmount: Number(i.totalAmount) || 0,
            taxCode: i.taxCode || 'VAT 16%',
            discount: i.discount || '',
            division: i.division || 'General',
            account: i.account || 'Inventory'
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('[PURCHASE INVOICE UPDATE ERROR]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase-orders', async (req, res) => {
  console.log('>>> [PURCHASE ORDER POST] RECEIVED REQUEST');
  console.log('[PO CREATE BODY]:', JSON.stringify(req.body, null, 2));
  const { supplierId, reference, items, amount, currency, description, orderDate, status, docOptions } = req.body;
  try {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { reference }
    });
    if (existing) {
      return res.status(400).json({ error: `A purchase order with reference ${reference} already exists.` });
    }
    const result = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        reference,
        amount: Number(amount) || 0,
        currency: currency || 'ZMW',
        description: description || '',
        orderDate: orderDate ? parseDate(orderDate) : undefined,
        status: status || 'Open',
        docOptions: docOptions || {},
        items: {
          create: (items || []).map((item: any) => ({
            itemId: item.itemId || undefined,
            description: item.description || '',
            qty: Number(item.qty) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            totalAmount: Number(item.totalAmount) || 0,
            taxCode: item.taxCode || 'VAT 16%',
            discount: item.discount || '',
            division: item.division || 'General'
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('[PURCHASE ORDER CREATE ERROR]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`>>> [PURCHASE ORDER PUT] UPDATING ID: ${id}`);
  const { supplierId, reference, items, amount, currency, description, orderDate, status, docOptions } = req.body;
  try {
    const result = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId,
        reference,
        amount: Number(amount) || 0,
        currency: currency || 'ZMW',
        description: description || '',
        orderDate: orderDate ? parseDate(orderDate) : undefined,
        status: status || 'Open',
        docOptions: docOptions || {},
        items: {
          deleteMany: {}, // Atomically delete all existing items for this PO
          create: (items || []).map((item: any) => ({
            itemId: item.itemId || undefined,
            description: item.description || '',
            qty: Number(item.qty) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            totalAmount: Number(item.totalAmount) || 0,
            taxCode: item.taxCode || 'VAT 16%',
            discount: item.discount || '',
            division: item.division || 'General'
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('[PURCHASE ORDER UPDATE ERROR]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Routes moved to earlier in the file to ensure registration and proper mapping

// --- GOODS RECEIVED NOTES ---
app.get('/api/goods-received-notes', async (req, res) => {
  try {
    const grns = await prisma.goodsReceivedNote.findMany({
      include: {
        supplier: true,
        purchaseOrder: true,
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const mapped = grns.map(grn => ({
      ...grn,
      supplier: grn.supplier?.name || 'Unknown',
      purchaseOrder: grn.purchaseOrder?.reference || '—',
      receivedDate: formatDate(grn.receivedDate)
    }));
    res.json(mapped);
  } catch (err: any) {
    console.error('Fetch GRNs error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/goods-received-notes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const grn = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: { include: { item: true } }
      }
    });
    if (!grn) return res.status(404).json({ error: 'GRN not found' });
    res.json({
      ...grn,
      supplier: grn.supplier?.name || 'Unknown',
      purchaseOrder: grn.purchaseOrder?.reference || '—',
      receivedDate: formatDate(grn.receivedDate)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goods-received-notes', async (req, res) => {
  const { supplierId, reference, items, description, inventoryLocation, receivedDate, purchaseOrderId, status } = req.body;
  try {
    const result = await prisma.goodsReceivedNote.create({
      data: {
        supplierId,
        reference,
        description,
        inventoryLocation,
        receivedDate: receivedDate ? parseDate(receivedDate) : undefined,
        purchaseOrderId,
        status: status || 'Received',
        items: {
          create: (items || []).map((item: any) => ({
            itemId: item.itemId,
            description: item.description,
            qty: Number(item.qty)
          }))
        }
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('CREATE GRN ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- FOOTERS ---
app.get('/api/footers', async (req, res) => {
  try {
    const footers = await prisma.footer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(footers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/footers', async (req, res) => {
  try {
    const result = await prisma.footer.create({ data: req.body });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/footers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content } = req.body;
    const result = await prisma.footer.update({
      where: { id },
      data: { name, content }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/footers/:id', async (req, res) => {
  try {
    await prisma.footer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.url
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ERP Backend running at http://localhost:${PORT}`);
});

