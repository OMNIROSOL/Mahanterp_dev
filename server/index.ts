import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import procurementRouter from './procurement';

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
export const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 3002;

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
    const datePart = d.split(' ')[0];
    const [day, month, year] = datePart.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  const date = new Date(d);
  return isNaN(date.getTime()) ? undefined : date;
};

const adjustItemInventory = async (
  itemId: string,
  qtyChange: number,
  transactionType: string,
  sourceDocumentId: string | null,
  locationNameOrId?: string | null,
  tx: any = prisma
) => {
  console.log(`[INVENTORY ADJUST] ItemID: ${itemId}, QtyChange: ${qtyChange}, Type: ${transactionType}, SrcDoc: ${sourceDocumentId}, Location: ${locationNameOrId}`);
  
  // 1. Update the Item's qtyOnHand
  const updatedItem = await tx.item.update({
    where: { id: itemId },
    data: {
      qtyOnHand: {
        increment: qtyChange
      }
    }
  });
  console.log(`[INVENTORY ADJUST] New qtyOnHand for item ${itemId}: ${updatedItem.qtyOnHand}`);

  // 2. Resolve locationId
  let locationId = '47f9e354-a859-425e-9b2a-235d52805925'; // Default Main Warehouse
  if (locationNameOrId) {
    const loc = await tx.location.findFirst({
      where: {
        OR: [
          { id: locationNameOrId.length === 36 ? locationNameOrId : undefined },
          { name: locationNameOrId }
        ]
      }
    });
    if (loc) {
      locationId = loc.id;
    }
  }
  
  // 2.5. Validate negative stock
  if (qtyChange < 0) {
    const locationStock = await tx.stockLedger.aggregate({
      where: { itemId, locationId },
      _sum: { qtyChange: true }
    });
    const currentQty = Number(locationStock._sum.qtyChange || 0);
    if (currentQty + qtyChange < 0) {
      const item = await tx.item.findUnique({ where: { id: itemId } });
      const loc = await tx.location.findUnique({ where: { id: locationId } });
      throw new Error(`Insufficient stock for ${item?.itemName || itemId} in ${loc?.name || 'location'}. Available: ${currentQty}, Requested: ${Math.abs(qtyChange)}`);
    }
  }

  // 3. Create the StockLedger entry
  await tx.stockLedger.create({
    data: {
      itemId,
      locationId,
      qtyChange,
      transactionType,
      sourceDocumentId
    }
  });
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/procurement', procurementRouter);

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

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretfallbackkey';

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.profiles.findFirst({
      where: {
        OR: [
          { email: email },
          { username: email }
        ]
      },
      include: { roles: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Special case for unseeded passwords (if user hasn't set one up yet)
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account not set up. Contact Administrator.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.roles?.name || 'User', roleId: user.role_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.roles?.name || 'User',
        roleId: user.role_id,
        avatar: user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  // We'll skip token check for some public routes if necessary
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For now, if no token, just proceed but don't set req.user to avoid breaking the whole app instantly
    // In a strict environment, return 401.
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return next();
    req.user = user;
    next();
  });
};

app.use(authenticateToken);

// --- CURRENCIES ---
app.get('/api/currencies', async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(currencies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/currencies', async (req, res) => {
  const { code, name, symbol, isSystem, decimalPlaces } = req.body;
  try {
    const currency = await prisma.currency.create({
      data: {
        code,
        name,
        symbol,
        isSystem: isSystem || false,
        decimalPlaces: decimalPlaces || 2
      }
    });
    res.json(currency);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/currencies/:code', async (req, res) => {
  const { code: paramCode } = req.params;
  const { name, symbol, isSystem, decimalPlaces } = req.body;
  try {
    const currency = await prisma.currency.update({
      where: { code: paramCode },
      data: {
        name,
        symbol,
        isSystem,
        decimalPlaces
      }
    });
    res.json(currency);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/currencies/:code', async (req, res) => {
  const { code } = req.params;
  try {
    await prisma.currency.delete({
      where: { code }
    });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete currency because it is used in other records.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- USERS ---
app.get('/api/exchange-rates', async (req, res) => {
  try {
    const { currency } = req.query;
    const whereClause = currency ? { currencyCode: String(currency) } : {};
    const rates = await prisma.exchangeRate.findMany({
      where: whereClause,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(rates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exchange-rates', async (req, res) => {
  const { date, currencyCode, rate, isCurrent } = req.body;
  try {
    // If setting as current, unset others for this currency
    if (isCurrent) {
      await prisma.exchangeRate.updateMany({
        where: { currencyCode, isCurrent: true },
        data: { isCurrent: false }
      });
    }
    
    const newRate = await prisma.exchangeRate.create({
      data: {
        date: new Date(date),
        currencyCode,
        rate: Number(rate),
        isCurrent: isCurrent || false
      }
    });
    res.json(newRate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exchange-rates/:id', async (req, res) => {
  const { id } = req.params;
  const { date, currencyCode, rate, isCurrent } = req.body;
  try {
    if (isCurrent) {
      await prisma.exchangeRate.updateMany({
        where: { currencyCode, isCurrent: true, id: { not: id } },
        data: { isCurrent: false }
      });
    }

    const updated = await prisma.exchangeRate.update({
      where: { id },
      data: {
        date: new Date(date),
        currencyCode,
        rate: Number(rate),
        isCurrent: isCurrent || false
      }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exchange-rates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.exchangeRate.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- USERS ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.profiles.findMany({ include: { roles: true } });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req: any, res: any) => {
  try {
    // Check if admin (if req.user is set)
    if (req.user && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can create users.' });
    }

    const { email, username, full_name, role_id, password } = req.body;
    
    // Check email uniqueness
    const existingEmail = await prisma.profiles.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check username uniqueness if provided
    if (username) {
      const existingUsername = await prisma.profiles.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ error: 'User with this username already exists' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await prisma.profiles.create({
      data: {
        email,
        username: username || null,
        full_name,
        role_id,
        password_hash,
        is_active: true
      }
    });
    res.json(newUser);
  } catch (err: any) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req: any, res: any) => {
  try {
    if (req.user && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can update users.' });
    }
    const { id } = req.params;
    const { email, username, full_name, role_id, password } = req.body;
    
    // Check username uniqueness if changing
    if (username) {
      const existingUsername = await prisma.profiles.findUnique({ where: { username } });
      if (existingUsername && existingUsername.id !== id) {
        return res.status(400).json({ error: 'User with this username already exists' });
      }
    }

    let updateData: any = { email, username: username || null, full_name, role_id };
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.profiles.update({
      where: { id },
      data: updateData
    });
    res.json(updatedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req: any, res: any) => {
  try {
    if (req.user && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can delete users.' });
    }
    const { id } = req.params;
    await prisma.profiles.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROLES ---
app.get('/api/roles', async (req, res) => {
  try {
    const rolesList = await prisma.roles.findMany({ include: { permissions: true } });
    const formattedRoles = rolesList.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: (r.permissions || []).map((p: any) => ({
        id: p.id,
        screenId: p.screen_id,
        screen_id: p.screen_id,
        view: p.can_view,
        canView: p.can_view,
        can_view: p.can_view,
        add: p.can_add,
        canAdd: p.can_add,
        can_add: p.can_add,
        edit: p.can_edit,
        canEdit: p.can_edit,
        can_edit: p.can_edit,
        delete: p.can_delete,
        canDelete: p.can_delete,
        can_delete: p.can_delete,
        full: p.can_view && p.can_add && p.can_edit && p.can_delete
      }))
    }));
    res.json(formattedRoles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roles', async (req: any, res: any) => {
  try {
    if (req.user && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can create roles.' });
    }
    const { name, description, permissions } = req.body;
    const newRole = await prisma.roles.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions?.map((p: any) => ({
            screen_id: p.screenId || p.screen_id,
            can_view: Boolean(p.view ?? p.canView ?? p.can_view),
            can_add: Boolean(p.add ?? p.canAdd ?? p.can_add),
            can_edit: Boolean(p.edit ?? p.canEdit ?? p.can_edit),
            can_delete: Boolean(p.delete ?? p.canDelete ?? p.can_delete)
          })) || []
        }
      },
      include: { permissions: true }
    });
    res.json(newRole);
  } catch (err: any) {
    console.error('Failed to create role:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/roles/:id', async (req: any, res: any) => {
  try {
    if (req.user && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can modify roles.' });
    }
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    // First, delete existing permissions
    await prisma.permissions.deleteMany({ where: { role_id: id } });

    // Then, update role and recreate permissions
    const updatedRole = await prisma.roles.update({
      where: { id },
      data: {
        name,
        description,
        permissions: {
          create: permissions?.map((p: any) => ({
            screen_id: p.screenId || p.screen_id,
            can_view: Boolean(p.view ?? p.canView ?? p.can_view),
            can_add: Boolean(p.add ?? p.canAdd ?? p.can_add),
            can_edit: Boolean(p.edit ?? p.canEdit ?? p.can_edit),
            can_delete: Boolean(p.delete ?? p.canDelete ?? p.can_delete)
          })) || []
        }
      },
      include: { permissions: true }
    });

    res.json(updatedRole);
  } catch (err: any) {
    console.error('Failed to update role:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-patch-route', (req, res) => {
  res.json({ message: 'PATCH test route is reachable' });
});

app.get('/api/ping', (req, res) => res.json({ pong: true }));

// Removed duplicate purchase-invoice routes
app.get('/api/items/:id/locations', async (req, res) => {
  try {
    const { id } = req.params;
    const stockByLocation = await prisma.stockLedger.groupBy({
      by: ['locationId'],
      where: { itemId: id },
      _sum: { qtyChange: true },
    });
    
    const locationIds = stockByLocation.map(s => s.locationId);
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } }
    });
    
    const locationMap = locations.reduce((acc: any, loc: any) => {
      acc[loc.id] = loc.name;
      return acc;
    }, {});
    
    const result = stockByLocation.map(s => ({
      locationId: s.locationId,
      locationName: locationMap[s.locationId] || 'Unknown Location',
      qty: Number(s._sum.qtyChange) || 0
    }));
    
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching item locations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/items/:id/allocations', async (req, res) => {
  try {
    const { id } = req.params;
    const quoteItems = await prisma.quoteItem.findMany({
      where: {
        itemId: id,
        order: {
          status: 'Ordered'
        }
      },
      include: {
        order: {
          include: { customer: true }
        }
      }
    });
    
    const result = quoteItems.map((qi: any) => ({
      reference: qi.order.reference,
      customerName: qi.order.customer?.name || 'Unknown',
      date: qi.order.orderDate,
      qty: Number(qi.qty) || 0,
      status: qi.order.status
    }));
    
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.patch('/api/delivery-notes/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  console.log(`PATCH DELIVERY NOTE STATUS HIT: ID=${id}, Status=${status}`);
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const existing = await prisma.deliveryNote.findFirst({
      where: {
        OR: [
          { id: isUuid ? id : undefined },
          { reference: id }
        ]
      },
      include: { items: true }
    });

    if (!existing) {
      console.warn(`Delivery note not found for status update: ${id}`);
      return res.status(404).json({ error: 'Delivery note not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Revert old stock deduction if status was 'Delivered'
      if (existing.status === 'Delivered' && status !== 'Delivered') {
        for (const item of existing.items) {
          if (item.itemId) {
            await tx.item.update({
              where: { id: item.itemId },
              data: { qtyOnHand: { increment: Number(item.qty) } }
            });
          }
        }
        await tx.stockLedger.deleteMany({ where: { sourceDocumentId: existing.id } });
      }

      // 2. Perform the update
      const updatedDn = await tx.deliveryNote.update({
        where: { id: existing.id },
        data: { status },
        include: { items: true }
      });

      // 3. Apply new stock deduction if status is 'Delivered'
      if (status === 'Delivered' && existing.status !== 'Delivered') {
        for (const item of updatedDn.items) {
          if (item.itemId) {
            await adjustItemInventory(
              item.itemId,
              -Number(item.qty),
              'Delivery Note',
              updatedDn.id,
              updatedDn.inventoryLocation,
              tx
            );
          }
        }
      }

      return updatedDn;
    });

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
    case 'payment': count = await getNextNum(tx.payment, 'PAY-'); prefix = 'PAY'; break;
    case 'purchase-quote':
    case 'purchase-enquiry': count = await getNextNum(tx.purchaseEnquiry, 'PE-'); prefix = 'PE'; break;
    case 'purchase-order': count = await getNextNum(tx.purchaseOrder, 'PO-'); prefix = 'PO'; break;
    case 'purchase-invoice': count = await getNextNum(tx.invoices, 'PINV-'); prefix = 'PINV'; break;
    case 'customer': count = await getNextCodeNum(tx.customer, 'CUST-'); prefix = 'CUST'; break;
    case 'supplier': count = await getNextCodeNum(tx.suppliers, 'SUP-'); prefix = 'SUP'; break;
    case 'inventory-transfer': count = await getNextNum(tx.inventoryTransfer, 'TR-'); prefix = 'TR'; break;
    case 'inventory-write-off': count = await getNextNum(tx.inventoryWriteOff, 'WO-'); prefix = 'WO'; break;
    case 'goods-received-note': count = await getNextNum(tx.goodsReceivedNote, 'GRN-'); prefix = 'GRN'; break;
    case 'inter-account-transfer': count = await getNextNum(tx.interAccountTransfer, 'IAT-'); prefix = 'IAT'; break;
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

app.get('/api/customers/:id/transactions', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const invoices = await prisma.invoice.findMany({ where: { customerId: id }, orderBy: { createdAt: 'asc' } });
    const receipts = await prisma.receipt.findMany({ where: { paidByContact: customer.name }, orderBy: { createdAt: 'asc' } });
    const creditNotes = await prisma.creditNote.findMany({ where: { customerId: id }, orderBy: { createdAt: 'asc' } });

    const transactions: any[] = [];
    for (const inv of invoices) {
      const invDate = inv.issueDate || inv.createdAt || new Date();
      transactions.push({
        id: inv.id,
        date: formatDate(invDate),
        timestamp: new Date(invDate).getTime(),
        transaction: `Invoice - ${inv.reference || ''}`,
        customer: customer.name,
        bankAccount: null,
        description: '',
        amount: -(Number(inv.grandTotal) || 0),
        currency: inv.currency || customer.currency,
      });
    }

    for (const rec of receipts) {
      const recDate = rec.date || rec.createdAt || new Date();
      transactions.push({
        id: rec.id,
        date: formatDate(recDate),
        timestamp: new Date(recDate).getTime(),
        transaction: `Receipt - ${rec.reference || ''}`,
        customer: customer.name,
        bankAccount: rec.receivedInAccount || '',
        description: rec.description || '',
        amount: Number(rec.amount) || 0,
        currency: rec.currency || customer.currency,
      });
    }

    for (const cn of creditNotes) {
      const cnDate = cn.issueDate || cn.createdAt || new Date();
      transactions.push({
        id: cn.id,
        date: formatDate(cnDate),
        timestamp: new Date(cnDate).getTime(),
        transaction: `Credit Note - ${cn.reference || ''}`,
        customer: customer.name,
        bankAccount: null,
        description: cn.description || '',
        amount: Number(cn.grandTotal) || 0,
        currency: cn.currency || customer.currency,
      });
    }

    transactions.sort((a, b) => a.timestamp - b.timestamp);

    let balance = 0;
    for (const t of transactions) {
      balance += t.amount;
      t.balance = balance;
    }

    transactions.sort((a, b) => b.timestamp - a.timestamp);

    res.json(transactions);
  } catch (err: any) {
    console.error('Customer transactions error:', err);
    res.status(500).json({ error: err.message });
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
    const unitCosts = await prisma.inventoryUnitCost.findMany({
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    // Build a map of itemId -> latest unitCost
    const latestCostMap = new Map<string, number>();
    for (const cost of unitCosts) {
      if (!latestCostMap.has(cost.itemId)) {
        latestCostMap.set(cost.itemId, Number(cost.unitCost) || 0);
      }
    }
    
    const itemsWithAvgCost = items.map(item => {
      const avgCost = latestCostMap.get(item.id) ?? 0;
      const qtyOnHandVal = Number(item.qtyOnHand) || 0;
      return {
        ...item,
        avgCost,
        totalValue: qtyOnHandVal * avgCost
      };
    });
    
    res.json(itemsWithAvgCost);
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
    
    const latestCost = await prisma.inventoryUnitCost.findFirst({
      where: { itemId: item.id },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    const avgCost = latestCost ? (Number(latestCost.unitCost) || 0) : 0;
    const qtyOnHandVal = Number(item.qtyOnHand) || 0;
    
    res.json({
      ...item,
      avgCost,
      totalValue: qtyOnHandVal * avgCost
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/items', async (req, res) => {
  const { itemCode, itemName, unitName, sellingPrice, purchasePrice, marginPercentage, qtyOnHand, description, imageUrl, category } = req.body;
  try {
    const result = await prisma.item.create({
      data: { itemCode, itemName, unitName, sellingPrice, purchasePrice, marginPercentage: marginPercentage ? Number(marginPercentage) : 0, qtyOnHand, description, imageUrl, category }
    });

    if (purchasePrice !== undefined) {
      await prisma.inventoryUnitCost.create({
        data: {
          itemId: result.id,
          itemName: result.itemName,
          unitCost: purchasePrice,
          marginPercent: marginPercentage ? Number(marginPercentage) : 0,
          minSellingPrice: sellingPrice || 0,
          category: result.category,
          division: 'WAREHOUSE'
        }
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { itemCode, itemName, unitName, sellingPrice, purchasePrice, marginPercentage, qtyOnHand, description, imageUrl, category } = req.body;
  try {
    const oldItem = await prisma.item.findUnique({ where: { id } });
    
    const result = await prisma.item.update({
      where: { id },
      data: { itemCode, itemName, unitName, sellingPrice, purchasePrice, marginPercentage: marginPercentage ? Number(marginPercentage) : 0, qtyOnHand, description, imageUrl, category }
    });

    if (oldItem && purchasePrice !== undefined && Number(oldItem.purchasePrice) !== Number(purchasePrice)) {
      await prisma.inventoryUnitCost.create({
        data: {
          itemId: result.id,
          itemName: result.itemName,
          unitCost: purchasePrice,
          marginPercent: marginPercentage ? Number(marginPercentage) : (Number(oldItem.marginPercentage) || 0),
          minSellingPrice: sellingPrice || result.sellingPrice || 0,
          category: result.category,
          division: 'WAREHOUSE'
        }
      });
    }
    
    const latestCost = await prisma.inventoryUnitCost.findFirst({
      where: { itemId: result.id },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    const avgCost = latestCost ? (Number(latestCost.unitCost) || 0) : (Number(result.purchasePrice) || 0);
    const qtyOnHandVal = Number(result.qtyOnHand) || 0;
    
    res.json({
      ...result,
      avgCost,
      totalValue: qtyOnHandVal * avgCost
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.item.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting item:', err);
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete item because it is referenced in transactions or other records.' });
    }
    res.status(500).json({ error: err.message || 'Failed to delete item' });
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

// --- UNITS OF MEASURE ---
app.get('/api/units', async (req, res) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(units);
  } catch (err: any) {
    console.error('Error fetching units:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/units', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await prisma.unit.create({
      data: { name, description }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/units/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await prisma.unit.update({
      where: { id },
      data: { name, description }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/units/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.unit.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- ITEM CATEGORIES ---
app.get('/api/item-categories', async (req, res) => {
  try {
    const categories = await prisma.itemCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/item-categories', async (req, res) => {
  const { name, description, marginPercentage } = req.body;
  try {
    const result = await prisma.itemCategory.create({
      data: { name, description, marginPercentage: marginPercentage ? Number(marginPercentage) : 0 }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/item-categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, marginPercentage } = req.body;
  try {
    const result = await prisma.itemCategory.update({
      where: { id },
      data: { name, description, marginPercentage: marginPercentage ? Number(marginPercentage) : 0 }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/item-categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.itemCategory.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- INVENTORY UNIT COSTS ---
app.get('/api/inventory-unit-costs', async (req, res) => {
  try {
    const costs = await prisma.inventoryUnitCost.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(costs);
  } catch (err: any) {
    console.error('Error fetching unit costs:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory-unit-costs', async (req, res) => {
  const { date, itemId, itemName, unitCost, marginPercent, minSellingPrice, category, division } = req.body;
  try {
    const result = await prisma.inventoryUnitCost.create({
      data: {
        date: parseDate(date) || new Date(),
        itemId,
        itemName,
        unitCost: parseFloat(unitCost) || 0,
        marginPercent: marginPercent !== undefined ? parseFloat(marginPercent) : null,
        minSellingPrice: parseFloat(minSellingPrice) || 0,
        category,
        division
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/inventory-unit-costs/:id', async (req, res) => {
  const { id } = req.params;
  const { date, itemId, itemName, unitCost, marginPercent, minSellingPrice, category, division } = req.body;
  try {
    const result = await prisma.inventoryUnitCost.update({
      where: { id },
      data: {
        date: parseDate(date),
        itemId,
        itemName,
        unitCost: parseFloat(unitCost) || 0,
        marginPercent: marginPercent !== undefined ? parseFloat(marginPercent) : null,
        minSellingPrice: parseFloat(minSellingPrice) || 0,
        category,
        division
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/inventory-unit-costs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.inventoryUnitCost.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/inventory-unit-costs/bulk', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Payload must be an array of records' });
  }
  try {
    const items = await prisma.item.findMany();
    const itemMap = new Map(items.map(item => [item.itemCode.toLowerCase(), item]));
    const creations = [];
    for (const record of records) {
      const { date, itemCode, unitCost, marginPercent, minSellingPrice, division } = record;
      const item = itemMap.get((itemCode || '').toString().trim().toLowerCase());
      if (!item) continue;
      creations.push({
        date: parseDate(date) || new Date(),
        itemId: item.id,
        itemName: `${item.itemCode} - ${item.itemName}`,
        unitCost: parseFloat(unitCost) || 0,
        marginPercent: marginPercent !== undefined && marginPercent !== null ? parseFloat(marginPercent) : null,
        minSellingPrice: parseFloat(minSellingPrice) || 0,
        category: item.category || '',
        division: (division || 'WAREHOUSE').toString().toUpperCase().trim()
      });
    }
    if (creations.length > 0) {
      const result = await prisma.inventoryUnitCost.createMany({
        data: creations
      });
      res.json({ success: true, count: result.count });
    } else {
      res.json({ success: true, count: 0 });
    }
  } catch (err) {
    console.error('Error in bulk import:', err);
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
  const { customerId, reference, items, grandTotal, balanceDue, docOptions, dueDate, issueDate, description, currency } = req.body;
  try {
    const result = await prisma.invoice.create({
      data: {
        customerId,
        reference,
        grandTotal,
        balanceDue,
        currency,
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
  const { customerId, reference, items, grandTotal, balanceDue, docOptions, dueDate, issueDate, description, currency } = req.body;
  try {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    const result = await prisma.invoice.update({
      where: { id },
      data: {
        customerId,
        reference,
        grandTotal,
        balanceDue,
        currency,
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
    const result = await prisma.$transaction(async (tx) => {
      const dn = await tx.deliveryNote.create({
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
        },
        include: { items: true }
      });

      // Deduct stock if marked as Delivered
      if (dn.status === 'Delivered') {
        for (const item of dn.items) {
          if (item.itemId) {
            await adjustItemInventory(item.itemId, -Number(item.qty), 'Delivery Note', dn.id, inventoryLocation, tx);
          }
        }
      }

      return dn;
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
    const result = await prisma.$transaction(async (tx) => {
      // Resolve UUID if 'id' is a reference
      const existing = await tx.deliveryNote.findFirst({
        where: {
          OR: [
            { id: id.length === 36 ? id : undefined },
            { reference: id }
          ]
        },
        include: { items: true }
      });

      if (!existing) {
        throw new Error('Delivery note not found');
      }

      const targetId = existing.id;

      // 1. Revert old stock deduction if status was 'Delivered'
      if (existing.status === 'Delivered') {
        for (const item of existing.items) {
          if (item.itemId) {
            await tx.item.update({
              where: { id: item.itemId },
              data: { qtyOnHand: { increment: Number(item.qty) } }
            });
          }
        }
        await tx.stockLedger.deleteMany({ where: { sourceDocumentId: targetId } });
      }

      // Delete existing items ONLY if new items are provided
      if (items) {
        await tx.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: targetId } });
      }

      // 2. Perform update
      const updatedDn = await tx.deliveryNote.update({
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
        },
        include: { items: true }
      });

      // 3. Apply new stock deduction if status is 'Delivered'
      if (updatedDn.status === 'Delivered') {
        for (const item of updatedDn.items) {
          if (item.itemId) {
            await adjustItemInventory(
              item.itemId,
              -Number(item.qty),
              'Delivery Note',
              updatedDn.id,
              updatedDn.inventoryLocation || inventoryLocation,
              tx
            );
          }
        }
      }

      return updatedDn;
    });

    res.json(result);
  } catch (err: any) {
    console.error('UPDATE DELIVERY NOTE ERROR:', err);
    res.status(500).json({ error: err.message });
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
          select: { id: true, grand_total: true, status: true, docOptions: true }
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

      const balance = (supplier.invoices || []).reduce((sum: number, inv: any) => {
        if (inv.status !== 'Paid') {
          return sum + (parseFloat(inv.grand_total || '0') || 0);
        }
        return sum;
      }, 0);

      const grnsCount = (supplier.goodsReceivedNotes || []).length;
      const piGrnsCount = (supplier.invoices || []).filter((inv: any) => {
        const opts = inv.docOptions as any;
        return opts && opts.actAsGoodReceipt === true;
      }).length;

      return {
        ...supplier,
        balance,
        purchaseEnquiries: activeEnquiries,
        purchaseOrders: activeOrders,
        purchaseInvoices: (supplier.invoices || []).length,
        goodsReceipts: grnsCount + piGrnsCount,
        debitNotes: 0, // Debit Notes model is currently missing from schema
        status: supplier.inactive ? 'Inactive' : (balance < 0 ? 'Overpaid' : (balance === 0 ? 'Paid' : 'Unpaid'))
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

app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const hasOrders = await prisma.purchaseOrder.findFirst({ where: { supplierId: id } });
    const hasInvoices = await prisma.invoices.findFirst({ where: { supplier_id: id } });
    const hasGRNs = await prisma.goodsReceivedNote.findFirst({ where: { supplierId: id } });
    const hasEnquiries = await prisma.purchaseEnquiry.findFirst({ where: { supplierId: id } });

    if (hasOrders || hasInvoices || hasGRNs || hasEnquiries) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier because it is associated with existing purchase orders, invoices, enquiries, or goods received notes.' 
      });
    }

    const result = await prisma.suppliers.delete({
      where: { id }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
  const { reference, date, paidByContact, receivedInAccount, description, amount, currency, status, items } = req.body;
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
        status: status || 'Completed',
        items: items || null
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/receipts/:id', async (req, res) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id }
    });
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.json(receipt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/receipts/:id', async (req, res) => {
  try {
    const { reference, date, paidByContact, receivedInAccount, description, amount, currency, status, items } = req.body;
    const updatedReceipt = await prisma.receipt.update({
      where: { id: req.params.id },
      data: {
        reference,
        date: date ? new Date(date) : undefined,
        paidByContact,
        receivedInAccount,
        description,
        amount,
        currency,
        status: status || 'Completed',
        items: items || null
      }
    });
    res.json(updatedReceipt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      include: {
        ledgerEntries: true
      },
      orderBy: { code: 'asc' }
    });
    const accountsWithTypesAndBalances = accounts.map(a => {
      let balance = 0;
      const sumDebit = a.ledgerEntries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
      const sumCredit = a.ledgerEntries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
      if (['Asset', 'Expense'].includes(a.accountType)) {
        balance = sumDebit - sumCredit;
      } else {
        balance = sumCredit - sumDebit;
      }
      return { ...a, type: a.accountType, balance };
    });
    res.json(accountsWithTypesAndBalances);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounts/:id', async (req, res) => {
  try {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: req.params.id }
    });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    // Calculate balance on the fly since ViewBankAccountView uses it
    let balance = 0;
    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: req.params.id }
    });
    const sumDebit = entries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
    const sumCredit = entries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
    if (['Asset', 'Expense'].includes(account.accountType)) {
      balance = sumDebit - sumCredit;
    } else {
      balance = sumCredit - sumDebit;
    }
    res.json({ ...account, type: account.accountType, balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/summary', async (req, res) => {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      include: {
        ledgerEntries: true
      },
      orderBy: { code: 'asc' }
    });

    const accountsWithBalances = accounts.map(account => {
      let balance = 0;
      const entries = account.ledgerEntries || [];
      const sumDebit = entries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
      const sumCredit = entries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);

      if (['Asset', 'Expense'].includes(account.accountType)) {
        balance = sumDebit - sumCredit;
      } else {
        balance = sumCredit - sumDebit;
      }

      // We remove the raw entries so we don't send huge payloads
      const { ledgerEntries, ...accountData } = account;
      return { ...accountData, balance };
    });

    res.json(accountsWithBalances);
  } catch (err: any) {
    console.error('Summary API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bank-accounts', async (req, res) => {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { isPaymentAccount: true },
      include: {
        ledgerEntries: true
      },
      orderBy: { name: 'asc' }
    });
    const accountsWithTypesAndBalances = accounts.map(a => {
      let balance = 0;
      const sumDebit = a.ledgerEntries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
      const sumCredit = a.ledgerEntries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
      if (['Asset', 'Expense'].includes(a.accountType)) {
        balance = sumDebit - sumCredit;
      } else {
        balance = sumCredit - sumDebit;
      }
      return { ...a, type: a.accountType, balance };
    });
    res.json(accountsWithTypesAndBalances);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const { name, code, type, isPaymentAccount } = req.body;
    const uniqueCode = code || `ACC-${Date.now()}`;
    const result = await prisma.chartOfAccount.create({
      data: {
        name,
        code: uniqueCode,
        accountType: type || 'Asset',
        isPaymentAccount: isPaymentAccount || false
      }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bank-accounts', async (req, res) => {
  try {
    const { name, code, type, isPaymentAccount } = req.body;
    const uniqueCode = code || `BNK-${Date.now()}`;
    const result = await prisma.chartOfAccount.create({
      data: {
        name,
        code: uniqueCode,
        accountType: type || 'Asset',
        isPaymentAccount: isPaymentAccount ?? true
      }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bank-accounts/:id', async (req, res) => {
  try {
    const { name, code, type, isPaymentAccount, inactive } = req.body;
    const dataToUpdate: any = {
      name,
      accountType: type,
      isPaymentAccount,
      inactive
    };
    if (code) {
      dataToUpdate.code = code;
    }
    const result = await prisma.chartOfAccount.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bank-accounts/:id', async (req, res) => {
  try {
    await prisma.chartOfAccount.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    // If it's linked to transactions, it will throw a foreign key error
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete bank account because it has associated transactions.' });
    }
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

app.post('/api/locations', async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await prisma.location.create({
      data: {
        name,
        code: code || undefined
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('CREATE LOCATION ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  try {
    const result = await prisma.location.update({
      where: { id },
      data: {
        name,
        code: code !== undefined ? code : undefined
      }
    });
    res.json(result);
  } catch (err: any) {
    console.error('UPDATE LOCATION ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.location.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE LOCATION ERROR:', err);
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

    // Find internal delivery note id if exists
    const dn = await prisma.deliveryNote.findFirst({
      where: { reference: `INTDN-${transfer.reference}` }
    });

    // Find internal GRN id if exists
    const grn = await prisma.goodsReceivedNote.findFirst({
      where: { reference: `INTGRN-${transfer.reference}` }
    });

    res.json({
      ...transfer,
      deliveryNoteId: dn ? dn.id : null,
      goodsReceivedNoteId: grn ? grn.id : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const adjustTransferInventoryAndDocuments = async (
  transferId: string,
  oldStatus: string,
  newStatus: string,
  tx: any
) => {
  console.log(`[TRANSFER ADJUST] ID=${transferId}, OldStatus=${oldStatus}, NewStatus=${newStatus}`);
  
  const transfer = await tx.inventoryTransfer.findUnique({
    where: { id: transferId },
    include: { items: true }
  });
  if (!transfer) return;

  const isNewDispatched = ['Ready to Dispatch', 'Sent', 'Received'].includes(newStatus || '');
  const isNewReceived = (newStatus === 'Received');

  // 1. Always delete old Transfer Out stock ledger entries for this transfer (so they can be rebuilt)
  await tx.stockLedger.deleteMany({
    where: {
      sourceDocumentId: transferId,
      transactionType: 'Transfer Out'
    }
  });

  // 2. Always delete old internal Delivery Note if it exists (AND REVERT ITS STOCK DEDUCTION)
  const dnRef = `INTDN-${transfer.reference}`;
  const existingDn = await tx.deliveryNote.findFirst({ 
    where: { reference: dnRef },
    include: { items: true } 
  });
  if (existingDn) {
    for (const item of existingDn.items) {
      if (item.itemId) {
        // Revert the decrement that happened when the delivery note was created
        await tx.item.update({
          where: { id: item.itemId },
          data: { qtyOnHand: { increment: Number(item.qty) } }
        });
      }
    }
    await tx.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: existingDn.id } });
    await tx.deliveryNote.delete({ where: { id: existingDn.id } });
    console.log(`[TRANSFER ADJUST] Deleted old internal Delivery Note ${dnRef} and reverted stock`);
  }

  // 3. Always delete old internal GRN and its stock ledger entries if it exists (AND REVERT ITS STOCK ADDITION)
  const grnRef = `INTGRN-${transfer.reference}`;
  const existingGrn = await tx.goodsReceivedNote.findFirst({ 
    where: { reference: grnRef },
    include: { items: true } 
  });
  if (existingGrn) {
    for (const item of existingGrn.items) {
      if (item.itemId) {
        // Revert the increment that happened when the GRN was created
        await tx.item.update({
          where: { id: item.itemId },
          data: { qtyOnHand: { decrement: Number(item.qty) } }
        });
      }
    }
    await tx.stockLedger.deleteMany({ where: { sourceDocumentId: existingGrn.id } });
    await tx.goodsReceivedNoteItem.deleteMany({ where: { goodsReceivedNoteId: existingGrn.id } });
    await tx.goodsReceivedNote.delete({ where: { id: existingGrn.id } });
    console.log(`[TRANSFER ADJUST] Deleted old internal GRN ${grnRef} and reverted stock`);
  }

  // 4. Resolve the current items to prepare for recreation
  const resolvedItems = [];
  for (const item of transfer.items) {
    const resolvedItem = await tx.item.findFirst({
      where: {
        OR: [
          { id: item.inventoryItem.length === 36 ? item.inventoryItem : undefined },
          { itemCode: item.inventoryItem },
          { itemName: item.inventoryItem },
          { itemCode: item.inventoryItem.split(' - ')[0] }
        ]
      }
    });
    if (resolvedItem) {
      resolvedItems.push({
        id: resolvedItem.id,
        itemCode: resolvedItem.itemCode,
        itemName: resolvedItem.itemName,
        qty: Number(item.qty),
        description: item.inventoryItem
      });
    }
  }

  // Find a default customer and supplier to satisfy DB constraints
  const firstCustomer = await tx.customer.findFirst();
  const firstSupplier = await tx.suppliers.findFirst();

  // 5. Create new Delivery Note and record Transfer Out if currently dispatched
  if (isNewDispatched) {
    if (!firstCustomer) {
      throw new Error('No customer found in the database. Cannot create internal Delivery Note.');
    }

    // Create Internal Delivery Note
    await tx.deliveryNote.create({
      data: {
        customerId: firstCustomer.id,
        reference: dnRef,
        description: `Internal Delivery Note for Transfer ${transfer.reference}`,
        inventoryLocation: transfer.fromLocation,
        status: 'Pending', // Keeps it from triggering its own stock ledger entries
        items: {
          create: resolvedItems.map(ri => ({
            itemId: ri.id,
            qty: ri.qty,
            description: ri.description
          }))
        }
      }
    });
    console.log(`[TRANSFER ADJUST] Created new internal Delivery Note ${dnRef}`);

    // Decrement stock from source location
    for (const ri of resolvedItems) {
      await adjustItemInventory(ri.id, -ri.qty, 'Transfer Out', transferId, transfer.fromLocation, tx);
    }
  }

  // 6. Create new GRN (which automatically adjusts stock) if currently received
  if (isNewReceived) {
    if (!firstSupplier) {
      throw new Error('No supplier found in the database. Cannot create internal GRN.');
    }

    const createdGrn = await tx.goodsReceivedNote.create({
      data: {
        supplierId: firstSupplier.id,
        reference: grnRef,
        description: `Internal GRN for Transfer ${transfer.reference}`,
        inventoryLocation: transfer.toLocation,
        status: 'Received',
        items: {
          create: resolvedItems.map(ri => ({
            itemId: ri.id,
            qty: ri.qty,
            description: ri.description
          }))
        }
      },
      include: { items: true }
    });
    console.log(`[TRANSFER ADJUST] Created new internal GRN ${grnRef}`);

    // Apply stock increment at the destination location via the GRN
    for (const item of createdGrn.items) {
      if (item.itemId) {
        await adjustItemInventory(item.itemId, Number(item.qty), 'GRN', createdGrn.id, transfer.toLocation, tx);
      }
    }
  }
};

app.post('/api/inventory-transfers', async (req, res) => {
  const { reference, date, fromLocation, toLocation, description, status, items } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.inventoryTransfer.create({
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
        },
        include: { items: true }
      });

      await adjustTransferInventoryAndDocuments(transfer.id, 'Draft', status || 'Draft', tx);

      return transfer;
    });

    res.json(result);
  } catch (err: any) {
    console.error('CREATE TRANSFER ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/inventory-transfers/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const existing = await prisma.inventoryTransfer.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.inventoryTransfer.update({
        where: { id },
        data: { status: status || 'Draft' },
        include: { items: true }
      });

      await adjustTransferInventoryAndDocuments(id, existing.status || 'Draft', status || 'Draft', tx);

      return updatedTransfer;
    });

    res.json(result);
  } catch (err: any) {
    console.error('PATCH TRANSFER ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory-transfers/:id', async (req, res) => {
  const { id } = req.params;
  const { reference, date, fromLocation, toLocation, description, status, items } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryTransfer.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!existing) {
        throw new Error('Transfer not found');
      }

      await tx.inventoryTransferItem.deleteMany({ where: { inventoryTransferId: id } });

      const updatedTransfer = await tx.inventoryTransfer.update({
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
        },
        include: { items: true }
      });

      await adjustTransferInventoryAndDocuments(id, existing.status || 'Draft', status || 'Draft', tx);

      return updatedTransfer;
    });

    res.json(result);
  } catch (err: any) {
    console.error('UPDATE TRANSFER ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await prisma.stockLedger.findMany({
      where: { itemId: id },
      include: { location: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const enriched = await Promise.all(transactions.map(async (t: any) => {
      let reference = null;
      if (t.sourceDocumentId) {
        if (t.transactionType === 'Delivery Note') {
          const doc = await prisma.deliveryNote.findUnique({ where: { id: t.sourceDocumentId } });
          reference = doc?.reference;
        } else if (t.transactionType === 'GRN') {
          const doc = await prisma.goodsReceivedNote.findUnique({ where: { id: t.sourceDocumentId } });
          reference = doc?.reference;
        } else if (t.transactionType === 'Transfer Out' || t.transactionType === 'Transfer In') {
          const doc = await prisma.inventoryTransfer.findUnique({ where: { id: t.sourceDocumentId } });
          reference = doc?.reference;
        } else if (t.transactionType === 'Write-Off') {
          const doc = await prisma.inventoryWriteOff.findUnique({ where: { id: t.sourceDocumentId } });
          reference = doc?.reference;
        }
      }
      return { ...t, reference };
    }));
    
    res.json(enriched);
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
    const result = await prisma.$transaction(async (tx) => {
      const wo = await tx.inventoryWriteOff.create({
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

      if (wo.status === 'Approved') {
        const item = await tx.item.findFirst({
          where: {
            OR: [
              { id: inventoryItem.length === 36 ? inventoryItem : undefined },
              { itemCode: inventoryItem },
              { itemName: inventoryItem }
            ]
          }
        });
        if (item) {
          await adjustItemInventory(item.id, -Number(qty), 'Write-Off', wo.id, 'Main Warehouse', tx);
        }
      }

      return wo;
    });

    res.json(result);
  } catch (err: any) {
    console.error('CREATE WRITE OFF ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/inventory-write-offs/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const existing = await prisma.inventoryWriteOff.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Write-off not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Revert old stock deduction if status was 'Approved'
      if (existing.status === 'Approved' && status !== 'Approved') {
        const item = await tx.item.findFirst({
          where: {
            OR: [
              { id: existing.inventoryItem.length === 36 ? existing.inventoryItem : undefined },
              { itemCode: existing.inventoryItem },
              { itemName: existing.inventoryItem },
              { itemCode: existing.inventoryItem.split(' - ')[0] }
            ]
          }
        });
        if (item) {
          await tx.item.update({
            where: { id: item.id },
            data: { qtyOnHand: { increment: Number(existing.qty) } }
          });
        }
        await tx.stockLedger.deleteMany({
          where: {
            sourceDocumentId: id,
            transactionType: 'Write-Off'
          }
        });
      }

      // 2. Perform the update
      const updatedWo = await tx.inventoryWriteOff.update({
        where: { id },
        data: { status: status || 'Draft' }
      });

      // 3. Apply new stock deduction if status is 'Approved'
      if (status === 'Approved' && existing.status !== 'Approved') {
        const item = await tx.item.findFirst({
          where: {
            OR: [
              { id: updatedWo.inventoryItem.length === 36 ? updatedWo.inventoryItem : undefined },
              { itemCode: updatedWo.inventoryItem },
              { itemName: updatedWo.inventoryItem },
              { itemCode: updatedWo.inventoryItem.split(' - ')[0] }
            ]
          }
        });
        if (item) {
          await adjustItemInventory(item.id, -Number(updatedWo.qty), 'Write-Off', updatedWo.id, 'Main Warehouse', tx);
        }
      }

      return updatedWo;
    });

    res.json(result);
  } catch (err: any) {
    console.error('PATCH WRITE OFF ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory-write-offs/:id', async (req, res) => {
  const { id } = req.params;
  const { reference, date, inventoryItem, qty, account, allocation, taxCode, division, description, amount, status } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryWriteOff.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new Error('Write-off not found');
      }

      if (existing.status === 'Approved') {
        const oldItem = await tx.item.findFirst({
          where: {
            OR: [
              { id: existing.inventoryItem.length === 36 ? existing.inventoryItem : undefined },
              { itemCode: existing.inventoryItem },
              { itemName: existing.inventoryItem }
            ]
          }
        });
        if (oldItem) {
          await tx.item.update({
            where: { id: oldItem.id },
            data: { qtyOnHand: { increment: Number(existing.qty) } }
          });
        }
        await tx.stockLedger.deleteMany({ where: { sourceDocumentId: id } });
      }

      const updatedWo = await tx.inventoryWriteOff.update({
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

      if (updatedWo.status === 'Approved') {
        const newItem = await tx.item.findFirst({
          where: {
            OR: [
              { id: inventoryItem.length === 36 ? inventoryItem : undefined },
              { itemCode: inventoryItem },
              { itemName: inventoryItem }
            ]
          }
        });
        if (newItem) {
          await adjustItemInventory(newItem.id, -Number(qty), 'Write-Off', updatedWo.id, 'Main Warehouse', tx);
        }
      }

      return updatedWo;
    });

    res.json(result);
  } catch (err: any) {
    console.error('UPDATE WRITE OFF ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debit-notes', async (req, res) => {
  try {
    const notes = await prisma.debitNote.findMany({
      include: {
        supplier: true,
        customer: true,
        items: {
          include: { item: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debit-notes/:id', async (req, res) => {
  try {
    const note = await prisma.debitNote.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        customer: true,
        items: {
          include: { item: true }
        }
      }
    });
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json(note);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/debit-notes', async (req, res) => {
  const { reference, issueDate, supplierId, customerId, amount, description, items, docOptions, status, currency } = req.body;
  try {
    let finalRef = reference;
    if (!finalRef) {
      const count = await prisma.debitNote.count();
      finalRef = `DN-${String(count + 1).padStart(4, '0')}`;
    }

    const debitNote = await prisma.$transaction(async (tx) => {
      const dn = await tx.debitNote.create({
        data: {
          reference: finalRef,
          issueDate: new Date(issueDate),
          supplierId: supplierId || null,
          customerId: customerId || null,
          amount: amount || 0,
          description: description || '',
          docOptions: docOptions || {},
          status: status || 'Draft',
          currency: currency || 'ZMW',
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId || null,
              description: item.description || '',
              account: item.account || 'Inventory on hand',
              qty: item.qty || 1,
              unitPrice: item.unitPrice || 0,
              totalAmount: item.totalAmount || 0,
              taxCode: item.taxCode || null,
              discount: item.discount || 0
            }))
          }
        }
      });

      if (status !== 'Draft') {
        if (supplierId) {
          await tx.suppliers.update({
            where: { id: supplierId },
            data: { balance: { decrement: amount || 0 } }
          });
        }
        if (customerId) {
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { increment: amount || 0 } }
          });
        }

        for (const item of items) {
          if (item.itemId && (item.account === 'Inventory on hand' || !item.account)) {
            await tx.item.update({
              where: { id: item.itemId },
              data: { qtyOnHand: { decrement: item.qty || 0 } }
            });
            await tx.stockLedger.create({
              data: {
                itemId: item.itemId,
                date: new Date(issueDate),
                reference: reference,
                type: 'Debit Note',
                qtyOut: item.qty || 0,
                qtyIn: 0,
                unitCost: item.unitPrice || 0
              }
            });
          }
        }
      }

      return dn;
    });

    res.json(debitNote);
  } catch (err: any) {
    console.error('Error creating debit note:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/credit-notes', async (req, res) => {
  try {
    const creditNotes = await prisma.creditNote.findMany({
      include: {
        customer: true,
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(creditNotes.map(n => ({
      ...n,
      customer: n.customer?.name || 'Unknown',
      amount: n.grandTotal,
      issueDate: formatDate(n.issueDate),
      timestamp: formatDateTime(n.createdAt)
    })));
  } catch (err) {
    console.error('Error fetching credit notes:', err);
    res.status(500).json({ error: 'Failed to fetch credit notes' });
  }
});

app.post('/api/credit-notes', async (req, res) => {
  try {
    const { reference, customerId, issueDate, currency, items, options, description, grandTotal, balance, status } = req.body;
    
    // Auto-generate reference if not provided
    let finalRef = reference;
    if (!finalRef) {
      const count = await prisma.creditNote.count();
      finalRef = `CN-${String(count + 1).padStart(4, '0')}`;
    }

    const newNote = await prisma.creditNote.create({
      data: {
        reference: finalRef,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        customerId,
        description,
        currency: currency || 'ZMW',
        grandTotal: Number(grandTotal) || 0,
        balance: Number(balance) || 0,
        status: status || 'Open',
        docOptions: options || {},
        items: {
          create: items.map((i: any) => ({
            itemId: i.itemId || null,
            description: i.description || i.item || '',
            qty: Number(i.qty) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxCode: i.taxCode || 'VAT 16%',
            discount: Number(i.discount) || 0,
            totalAmount: Number(i.totalAmount) || (Number(i.qty || 1) * Number(i.unitPrice || 0))
          }))
        }
      },
      include: { items: true, customer: true }
    });
    res.json(newNote);
  } catch (err) {
    console.error('Error creating credit note:', err);
    res.status(500).json({ error: 'Failed to create credit note' });
  }
});

app.put('/api/credit-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reference, issueDate, description, currency, items, options, grandTotal, balance, status } = req.body;

    // Delete existing items to recreate
    await prisma.creditNoteItem.deleteMany({ where: { creditNoteId: id } });

    const updatedNote = await prisma.creditNote.update({
      where: { id },
      data: {
        reference,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        description,
        currency,
        grandTotal: Number(grandTotal) || 0,
        balance: Number(balance) || 0,
        status,
        docOptions: options,
        items: {
          create: items.map((i: any) => ({
            itemId: i.itemId || null,
            description: i.description || i.item || '',
            qty: Number(i.qty) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxCode: i.taxCode || 'VAT 16%',
            discount: Number(i.discount) || 0,
            totalAmount: Number(i.totalAmount) || (Number(i.qty || 1) * Number(i.unitPrice || 0))
          }))
        }
      },
      include: { items: true, customer: true }
    });
    res.json(updatedNote);
  } catch (err) {
    console.error('Error updating credit note:', err);
    res.status(500).json({ error: 'Failed to update credit note' });
  }
});

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
  const { status, itemIds } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current items to calculate total amount
      const currentEnquiry = await tx.purchaseEnquiry.findUnique({
        where: { id },
        include: { items: true }
      });
      
      console.log(`[DEBUG PATCH ENQUIRY] items for id ${id}:`, currentEnquiry?.items);
      
      const calculatedAmount = currentEnquiry?.items.reduce((sum, item) => {
        const itemTotal = Number(item.totalAmount || 0);
        if (itemTotal > 0) return sum + itemTotal;
        return sum + (Number(item.qty || 0) * Number(item.unitPrice || 0));
      }, 0) || 0;

      console.log(`[DEBUG PATCH ENQUIRY] calculatedAmount: ${calculatedAmount}`);

      // 2. Update Enquiry Status and Amount
      const enquiry = await tx.purchaseEnquiry.update({
        where: { id },
        data: { status, amount: calculatedAmount },
        include: { items: true }
      });

      // 3. If Accepted or Partially Accepted, create or update a PO
      if (status === 'Accepted' || status === 'Partially Accepted') {
        console.log(`>>> [ENQUIRY APPROVE] Converting Enquiry ${id} (${enquiry.reference}) to PO`);
        
        let itemsToConvert = enquiry.items;
        if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
          itemsToConvert = enquiry.items.filter(item => itemIds.includes(item.itemId!));
        }

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
          console.log(`[ENQUIRY APPROVE] PO already exists (${existingPO.reference}). Updating/Appending...`);
          
          for (const item of itemsToConvert) {
            const existingItem = await tx.purchaseOrderItem.findFirst({
              where: { purchaseOrderId: existingPO.id, itemId: item.itemId }
            });
            if (!existingItem) {
              await tx.purchaseOrderItem.create({
                data: {
                  purchaseOrderId: existingPO.id,
                  itemId: item.itemId,
                  description: item.description,
                  qty: item.qty,
                  unitPrice: item.unitPrice,
                  totalAmount: Number(item.totalAmount) > 0 ? item.totalAmount : (Number(item.qty || 0) * Number(item.unitPrice || 0)),
                  division: item.division,
                  taxCode: item.taxCode,
                  discount: item.discount
                }
              });
            }
          }

          // Recalculate PO total amount
          const updatedPOItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: existingPO.id } });
          const newTotal = updatedPOItems.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

          await tx.purchaseOrder.update({
            where: { id: existingPO.id },
            data: {
              sourceEnquiryId: id, // Ensure it's linked
              amount: newTotal
            }
          });
        } else {
          // Create new PO with original reference format
          const poReference = enquiry.reference || `PO-${Date.now()}`;
          console.log(`[ENQUIRY APPROVE] Creating new PO: ${poReference}`);
          
          const newTotal = itemsToConvert.reduce((sum, item) => {
            const itemTotal = Number(item.totalAmount || 0);
            if (itemTotal > 0) return sum + itemTotal;
            return sum + (Number(item.qty || 0) * Number(item.unitPrice || 0));
          }, 0);

          await tx.purchaseOrder.create({
            data: {
              reference: poReference,
              orderDate: new Date(),
              supplierId: enquiry.supplierId,
              description: `Generated from Enquiry ${enquiry.reference}. ${enquiry.description || ''}`,
              currency: enquiry.currency,
              amount: newTotal,
              status: 'Open',
              sourceEnquiryId: id,
              docOptions: enquiry.docOptions || {},
              items: {
                create: itemsToConvert.map(item => ({
                  itemId: item.itemId,
                  description: item.description,
                  qty: item.qty,
                  unitPrice: item.unitPrice,
                  totalAmount: Number(item.totalAmount) > 0 ? item.totalAmount : (Number(item.qty || 0) * Number(item.unitPrice || 0)),
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

app.patch('/api/purchase-enquiries/:id/quotes', async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.id) {
          await tx.purchaseEnquiryItem.update({
            where: { id: item.id },
            data: { 
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount
            }
          });
        }
      }
      return tx.purchaseEnquiry.findUnique({
        where: { id },
        include: { items: { include: { item: true } }, supplier: true }
      });
    });
    res.json(result);
  } catch (err: any) {
    console.error('PATCH PURCHASE ENQUIRY QUOTES ERROR:', err);
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
      const totalDiscount = (inv.items || []).reduce((sum, item) => {
        if (!(inv.docOptions as any)?.columnDiscount) return sum;
        const lineExTax = (Number(item.qty) * Number(item.unitPrice)) || 0;
        const discountVal = parseFloat(item.discount as string) || 0;
        const isExact = (inv.docOptions as any)?.columnDiscountType === 'Exact';
        const discountAmount = isExact ? discountVal : (lineExTax * (discountVal / 100));
        return sum + discountAmount;
      }, 0);
      return {
        ...inv,
        description: inv.description || '',
        dueDate: inv.due_date ? formatDate(inv.due_date) : null,
        timestamp: inv.created_at ? formatDateTime(inv.created_at) : null,
        invoiceAmount: Number(inv.grand_total) > 0 ? Number(inv.grand_total) : itemsTotal,
        balanceDue: Number(inv.grand_total) > 0 ? Number(inv.grand_total) : itemsTotal,
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

    const totalDiscount = (inv.items || []).reduce((sum, item) => {
      if (!(inv.docOptions as any)?.columnDiscount) return sum;
      const lineExTax = (Number(item.qty) * Number(item.unitPrice)) || 0;
      const discountVal = parseFloat(item.discount as string) || 0;
      const isExact = (inv.docOptions as any)?.columnDiscountType === 'Exact';
      return sum + (isExact ? discountVal : (lineExTax * (discountVal / 100)));
    }, 0);
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
      grandTotal: inv.grand_total || itemsTotal,
      invoiceAmount: inv.grand_total || itemsTotal,
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

    // Populate procurement price history automatically for each item in the purchase invoice
    if (result.items && result.items.length > 0) {
      try {
        const pDate = result.created_at || new Date();
        const supplier = await prisma.suppliers.findUnique({
          where: { id: supplierId }
        });
        const currency = supplier?.currency || 'USD';

        await Promise.all(
          result.items.map((i: any) => {
            if (i.itemId) {
              return prisma.procurementPriceHistory.create({
                data: {
                  itemId: i.itemId,
                  supplierId,
                  purchaseDate: pDate,
                  qty: i.qty,
                  unitCost: i.unitPrice,
                  currency
                }
              });
            }
            return Promise.resolve();
          })
        );
        console.log(`[PI POST] Successfully populated procurement price history for ${result.items.length} items`);
      } catch (historyErr) {
        console.error('Failed to populate procurement price history on PI creation:', historyErr);
      }
    }

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

    // Automatically create a tracking record for the shipment board
    /*
    await prisma.shipment.create({
      data: {
        purchaseOrderId: result.id,
        eta: orderDate ? parseDate(orderDate) : new Date(),
        status: 'Ordered',
        shipmentValue: Number(amount) || 0,
        delayedDays: 0
      }
    });
    */

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
    const mappedGrns = grns.map(grn => ({
      ...grn,
      supplier: grn.supplier?.name || 'Unknown',
      purchaseOrder: grn.purchaseOrder?.reference || '—',
      receivedDate: formatDate(grn.receivedDate),
      isPurchaseInvoice: false
    }));

    const invs = await prisma.invoices.findMany({
      include: {
        suppliers: true,
        items: { include: { item: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const activeInvs = invs.filter(inv => {
      const opts = inv.docOptions as any;
      return opts && opts.actAsGoodReceipt === true;
    });

    const mappedInvs = activeInvs.map(inv => ({
      id: inv.id,
      reference: inv.reference,
      supplierId: inv.supplier_id,
      supplier: inv.suppliers?.name || 'Unknown',
      purchaseOrder: '—',
      receivedDate: formatDate(inv.created_at || new Date()),
      description: inv.description || '',
      status: 'Received',
      inventoryLocation: (inv.docOptions as any)?.inventoryLocation || 'Main Warehouse',
      createdAt: inv.created_at,
      isPurchaseInvoice: true,
      items: inv.items.map(item => ({
        id: item.id,
        goodsReceivedNoteId: inv.id,
        itemId: item.itemId,
        description: item.description,
        qty: item.qty,
        item: item.item
      }))
    }));

    const combined = [...mappedGrns, ...mappedInvs].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json(combined);
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
    if (!grn) {
      const inv = await prisma.invoices.findUnique({
        where: { id },
        include: {
          suppliers: true,
          items: { include: { item: true } }
        }
      });
      if (inv && (inv.docOptions as any)?.actAsGoodReceipt === true) {
        return res.json({
          id: inv.id,
          reference: inv.reference,
          supplierId: inv.supplier_id,
          supplier: inv.suppliers?.name || 'Unknown',
          purchaseOrder: '—',
          receivedDate: formatDate(inv.created_at || new Date()),
          description: inv.description || '',
          status: 'Received',
          inventoryLocation: (inv.docOptions as any)?.inventoryLocation || 'Main Warehouse',
          isPurchaseInvoice: true,
          items: inv.items.map(item => ({
            id: item.id,
            goodsReceivedNoteId: inv.id,
            itemId: item.itemId,
            description: item.description,
            qty: item.qty,
            item: item.item
          }))
        });
      }
      return res.status(404).json({ error: 'GRN not found' });
    }
    res.json({
      ...grn,
      supplier: grn.supplier?.name || 'Unknown',
      purchaseOrder: grn.purchaseOrder?.reference || '—',
      receivedDate: formatDate(grn.receivedDate),
      isPurchaseInvoice: false
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goods-received-notes', async (req, res) => {
  const { supplierId, reference, items, description, inventoryLocation, receivedDate, purchaseOrderId, status } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceivedNote.create({
        data: {
          supplierId,
          reference,
          description,
          inventoryLocation,
          receivedDate: receivedDate ? parseDate(receivedDate) : undefined,
          purchaseOrderId,
          status: status || 'Draft',
          items: {
            create: (items || []).map((item: any) => ({
              itemId: item.itemId,
              description: item.description,
              qty: Number(item.qty)
            }))
          }
        },
        include: { items: true }
      });

      for (const item of grn.items) {
        if (item.itemId) {
          await adjustItemInventory(item.itemId, Number(item.qty), 'GRN', grn.id, inventoryLocation, tx);
        }
      }

      if (purchaseOrderId) {
        /*
        await tx.shipment.updateMany({
          where: { purchaseOrderId },
          data: { status: 'Received' }
        });
        */
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: 'Received' }
        });
      }

      return grn;
    });

    res.json(result);
  } catch (err: any) {
    console.error('CREATE GRN ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});


app.patch('/api/goods-received-notes/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      let grn = await tx.goodsReceivedNote.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!grn) throw new Error('GRN not found');
      if (grn.status === 'Approved' || grn.status === 'Received') throw new Error('GRN is already approved');

      const updatedGrn = await tx.goodsReceivedNote.update({
        where: { id },
        data: { status: 'Approved' },
        include: { items: true }
      });

      for (const item of updatedGrn.items) {
        if (item.itemId) {
          await adjustItemInventory(item.itemId, Number(item.qty), 'GRN', updatedGrn.id, updatedGrn.inventoryLocation || 'Main Warehouse', tx);
        }
      }

      if (updatedGrn.purchaseOrderId) {
        // Only update PO, do not auto-complete all shipments as there may be multiple containers
        await tx.purchaseOrder.update({
          where: { id: updatedGrn.purchaseOrderId },
          data: { status: 'Received' }
        });
      }

      return updatedGrn;
    });

    res.json(result);
  } catch (err: any) {
    console.error('APPROVE GRN ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/goods-received-notes/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`>>> [GRN PUT] UPDATING ID: ${id}`);
  const { supplierId, reference, items, description, inventoryLocation, receivedDate, purchaseOrderId, status } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      let grn = await tx.goodsReceivedNote.findUnique({
        where: { id },
        include: { items: true }
      });

      if (grn) {
        for (const item of grn.items) {
          if (item.itemId) {
            await tx.item.update({
              where: { id: item.itemId },
              data: { qtyOnHand: { decrement: Number(item.qty) } }
            });
          }
        }
        await tx.stockLedger.deleteMany({ where: { sourceDocumentId: id } });

        const updatedGrn = await tx.goodsReceivedNote.update({
          where: { id },
          data: {
            supplierId,
            reference,
            description,
            inventoryLocation,
            receivedDate: receivedDate ? parseDate(receivedDate) : undefined,
            purchaseOrderId,
            status: status || 'Draft',
            items: {
              deleteMany: {},
              create: (items || []).map((item: any) => ({
                itemId: item.itemId,
                description: item.description,
                qty: Number(item.qty)
              }))
            }
          },
          include: { items: true }
        });

        for (const item of updatedGrn.items) {
          if (item.itemId) {
            await adjustItemInventory(item.itemId, Number(item.qty), 'GRN', updatedGrn.id, inventoryLocation, tx);
          }
        }

        if (purchaseOrderId) {
          /*
          await tx.shipment.updateMany({
            where: { purchaseOrderId },
            data: { status: 'Received' }
          });
          */
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: 'Received' }
          });
        }

        return updatedGrn;
      } else {
        const inv = await tx.invoices.findUnique({
          where: { id },
          include: { items: true }
        });
        if (inv && (inv.docOptions as any)?.actAsGoodReceipt === true) {
          for (const item of inv.items) {
            if (item.itemId) {
              await tx.item.update({
                where: { id: item.itemId },
                data: { qtyOnHand: { decrement: Number(item.qty) } }
              });
            }
          }
          await tx.stockLedger.deleteMany({ where: { sourceDocumentId: id } });

          const existingOptions = (inv.docOptions as any) || {};
          const updatedOptions = {
            ...existingOptions,
            inventoryLocation: inventoryLocation || 'Main Warehouse'
          };
          const updatedInv = await tx.invoices.update({
            where: { id },
            data: {
              supplier_id: supplierId,
              reference,
              description,
              docOptions: updatedOptions,
              items: {
                deleteMany: {},
                create: (items || []).map((item: any) => ({
                  itemId: item.itemId,
                  description: item.description,
                  qty: Number(item.qty),
                  unitPrice: item.unitPrice || 0,
                  totalAmount: item.totalAmount || 0
                }))
              }
            },
            include: { items: true }
          });

          for (const item of updatedInv.items) {
            if (item.itemId) {
              await adjustItemInventory(item.itemId, Number(item.qty), 'GRN', updatedInv.id, inventoryLocation, tx);
            }
          }

          return updatedInv;
        }
      }
      throw new Error('GRN or associated invoice not found');
    });

    res.json(result);
  } catch (err: any) {
    console.error('[GRN UPDATE ERROR]:', err);
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

// Email setup
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/send-email', upload.single('attachment'), async (req, res) => {
  const { to, cc, bcc, subject, body } = req.body;
  const attachment = req.file;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Check if credentials are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[EMAIL] Real SMTP credentials not configured in .env. Simulating email send.');
      return res.json({ success: true, simulated: true, message: 'Email sent (Simulated - Configure SMTP in .env)' });
    }

    const mailOptions: any = {
      from: `"OMNIROSOL ERP" <${process.env.SMTP_USER}>`,
      to,
      cc,
      bcc,
      subject,
      text: body,
    };

    if (attachment) {
      mailOptions.attachments = [
        {
          filename: attachment.originalname || 'Document.pdf',
          content: attachment.buffer,
        }
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Message sent: %s', info.messageId);
    
    res.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error('[EMAIL ERROR]', err);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});
// --- PAYMENTS ---
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments/:id', async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { reference, date, paidToContact, paidFromAccount, description, amount, currency, status, items } = req.body;
    const newPayment = await prisma.payment.create({
      data: {
        reference,
        date: date ? new Date(date) : undefined,
        paidToContact,
        paidFromAccount,
        description,
        amount,
        currency,
        status: status || 'Completed',
        items: items || null
      }
    });
    res.json(newPayment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/payments/:id', async (req, res) => {
  try {
    const { reference, date, paidToContact, paidFromAccount, description, amount, currency, status, items } = req.body;
    const updatedPayment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        reference,
        date: date ? new Date(date) : undefined,
        paidToContact,
        paidFromAccount,
        description,
        amount,
        currency,
        status: status || 'Completed',
        items: items || null
      }
    });
    res.json(updatedPayment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payments/:id', async (req, res) => {
  try {
    await prisma.payment.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inter-account-transfers', async (req, res) => {
  try {
    const transfers = await prisma.interAccountTransfer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(transfers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inter-account-transfers/:id', async (req, res) => {
  try {
    const transfer = await prisma.interAccountTransfer.findUnique({
      where: { id: req.params.id }
    });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json(transfer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inter-account-transfers', async (req, res) => {
  try {
    const { reference, date, paidFromAccount, receivedInAccount, description, amount, currency } = req.body;
    const finalRef = reference || await generateNextReference('inter-account-transfer');
    
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.interAccountTransfer.create({
        data: {
          reference: finalRef,
          date: new Date(date),
          paidFromAccount,
          receivedInAccount,
          description,
          amount,
          currency: currency || 'ZMW',
          status: 'Completed'
        }
      });

      // Double-entry ledger (Credit Source, Debit Destination)
      await tx.ledgerEntry.create({
        data: {
          accountId: paidFromAccount,
          transactionDate: new Date(date),
          transactionType: 'Inter Account Transfer',
          source_document_id: transfer.id,
          credit: amount,
          debit: 0
        }
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: receivedInAccount,
          transactionDate: new Date(date),
          transactionType: 'Inter Account Transfer',
          source_document_id: transfer.id,
          debit: amount,
          credit: 0
        }
      });

      return transfer;
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inter-account-transfers/:id', async (req, res) => {
  try {
    const transfer = await prisma.interAccountTransfer.findUnique({ where: { id: req.params.id }});
    if (transfer) {
      await prisma.$transaction(async (tx) => {
        // Delete associated ledger entries
        await tx.ledgerEntry.deleteMany({
          where: { source_document_id: transfer.id }
        });
        await tx.interAccountTransfer.delete({ where: { id: transfer.id }});
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Expense Claim Payers
app.get('/api/expense-claim-payers', async (req, res) => {
  try {
    const payers = await prisma.expenseClaimPayer.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(payers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expense-claim-payers', async (req, res) => {
  try {
    const { name, code } = req.body;
    const result = await prisma.expenseClaimPayer.create({
      data: { name, code: code || 'PAYER-' + Date.now() }
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Expense Claims
app.get('/api/expense-claims', async (req, res) => {
  try {
    const claims = await prisma.expenseClaim.findMany({
      include: { payer: true, items: true },
      orderBy: { date: 'desc' }
    });
    res.json(claims);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expense-claims/:id', async (req, res) => {
  try {
    const claim = await prisma.expenseClaim.findUnique({
      where: { id: req.params.id },
      include: { payer: true, items: { include: { account: true } } }
    });
    if (!claim) return res.status(404).json({ error: 'Expense Claim not found' });
    res.json(claim);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expense-claims', async (req, res) => {
  try {
    const { date, reference, payerId, payee, currency, description, amountsAreTaxInclusive, items } = req.body;
    
    // Create the expense claim header and lines
    const result = await prisma.expenseClaim.create({
      data: {
        date: new Date(date),
        reference: reference || 'EXP-' + Date.now(),
        payerId,
        payee,
        currency,
        description,
        amountsAreTaxInclusive,
        items: {
          create: items.map((item: any) => ({
            accountId: item.account,
            description: item.description,
            qty: Number(item.qty || 1),
            unitPrice: Number(item.unitPrice || 0),
            taxCode: item.taxCode,
            taxAmount: Number(item.taxAmount || 0)
          }))
        }
      },
      include: { items: true }
    });

    // Accounting: Debit Expense Accounts, Credit Expense Claims Payable (Liability)
    const liabilityAccount = await prisma.chartOfAccount.findFirst({
      where: { name: 'Expense Claims Payable' }
    }) || await prisma.chartOfAccount.create({
      data: {
        name: 'Expense Claims Payable',
        code: 'LIAB-EXP-CLAIMS',
        accountType: 'Liability',
        isPaymentAccount: false
      }
    });

    let totalClaimAmount = 0;
    const ledgerEntries = [];
    for (const item of result.items) {
      if (!item.accountId) continue;
      const lineTotal = Number(item.qty || 1) * Number(item.unitPrice || 0);
      totalClaimAmount += lineTotal;

      // Debit the expense account
      ledgerEntries.push({
        accountId: item.accountId,
        debit: lineTotal,
        credit: 0
      });
    }

    // Credit the Liability Account for the total amount
    if (totalClaimAmount > 0) {
      ledgerEntries.push({
        accountId: liabilityAccount.id,
        debit: 0,
        credit: totalClaimAmount
      });
    }

    if (ledgerEntries.length > 0) {
      await prisma.ledgerEntry.createMany({
        data: ledgerEntries
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Transaction Items API
app.get('/api/transaction-items', async (req, res) => {
  try {
    const items = await prisma.transactionItem.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transaction-items', async (req, res) => {
  try {
    const data = req.body;
    const newItem = await prisma.transactionItem.create({ data });
    res.json(newItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transaction-items/:id', async (req, res) => {
  try {
    const data = req.body;
    const updatedItem = await prisma.transactionItem.update({
      where: { id: req.params.id },
      data
    });
    res.json(updatedItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transaction-items/:id', async (req, res) => {
  try {
    await prisma.transactionItem.delete({
      where: { id: req.params.id }
    });
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 ERP Backend running at http://localhost:${PORT}`);
  });
}
export default app;

// Trigger restart
