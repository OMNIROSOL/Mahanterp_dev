import { Express } from 'express';
import ExcelJS from 'exceljs';

const n = (v: any) => Number(v || 0);
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const r1 = (v: number) => Math.round((Number(v) || 0) * 10) / 10;

function iso(d: any) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function daysBetween(from: any, to = new Date()) {
  const a = new Date(iso(from) + 'T00:00:00Z').getTime();
  const b = new Date(iso(to) + 'T00:00:00Z').getTime();
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000);
}

function inRange(d: any, from?: string, to?: string) {
  const key = iso(d);
  if (!key) return false;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

function branchOk(value: any, branch?: string) {
  if (!branch || branch === 'All') return true;
  return String(value || '').trim().toLowerCase() === branch.trim().toLowerCase();
}

function seeMargin(req: any) {
  const role = String(req.headers['x-user-role'] || req.user?.role || '');
  return /admin|management|finance/i.test(role);
}

function baseAmount(doc: any, amount: number) {
  const rate = n(doc?.exchangeRate) || 1;
  const currency = String(doc?.currency || 'ZMW').toUpperCase();
  return currency === 'ZMW' ? n(amount) : n(amount) * rate;
}

async function ensureNotes(db: any) {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS master.mil_report_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID,
    ref_id TEXT DEFAULT '',
    branch TEXT DEFAULT '',
    note_type TEXT NOT NULL,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`);
}

async function notesOf(db: any, noteType: string) {
  const rows = await db.$queryRawUnsafe(
    `SELECT item_id::text AS "itemId", COALESCE(ref_id, '') AS "refId", COALESCE(branch, '') AS branch, COALESCE(value, '') AS value
     FROM master.mil_report_notes WHERE note_type = $1`,
    noteType
  );
  const map = new Map<string, string>();
  for (const row of rows || []) map.set(`${row.itemId || ''}|${row.refId || ''}|${row.branch || ''}`, row.value);
  return map;
}

function noteKey(itemId: string, refId = '', branch = '') {
  return `${itemId || ''}|${refId || ''}|${branch || ''}`;
}

async function stockPositions(db: any) {
  const [items, ledger, grns, history] = await Promise.all([
    db.item.findMany(),
    db.stockLedger.findMany({ include: { location: true, item: true } }),
    db.goodsReceivedNoteItem.findMany({ include: { goodsReceivedNote: { include: { supplier: true } }, item: true } }),
    db.procurementPriceHistory.findMany({ include: { supplier: true }, orderBy: { purchaseDate: 'desc' } }),
  ]);
  const byItem = new Map(items.map((item: any) => [item.id, item]));
  const qty = new Map<string, number>();
  for (const row of ledger) {
    const branch = row.location?.name || 'Unassigned';
    const key = `${row.itemId}|${branch}`;
    qty.set(key, r2((qty.get(key) || 0) + n(row.qtyChange)));
  }
  if (!qty.size) {
    for (const item of items) {
      if (n(item.qtyOnHand) > 0) qty.set(`${item.id}|Unassigned`, n(item.qtyOnHand));
    }
  }
  const purchases = new Map<string, { first: string; last: string; supplier: string; brand: string }>();
  for (const line of grns) {
    if (!line.itemId) continue;
    const date = iso(line.goodsReceivedNote?.receivedDate);
    const prev = purchases.get(line.itemId) || { first: date, last: date, supplier: '', brand: '' };
    if (date && (!prev.first || date < prev.first)) prev.first = date;
    if (date && (!prev.last || date > prev.last)) {
      prev.last = date;
      prev.supplier = line.goodsReceivedNote?.supplier?.name || prev.supplier;
      prev.brand = line.goodsReceivedNote?.supplier?.brand || prev.brand;
    }
    purchases.set(line.itemId, prev);
  }
  for (const row of history) {
    const prev = purchases.get(row.itemId) || { first: '', last: '', supplier: '', brand: '' };
    if (!prev.supplier) prev.supplier = row.supplier?.name || '';
    if (!prev.brand) prev.brand = row.supplier?.brand || '';
    purchases.set(row.itemId, prev);
  }
  const positions: any[] = [];
  for (const [key, onHand] of qty) {
    if (onHand <= 0.0001) continue;
    const [itemId, branch] = key.split('|');
    const item = byItem.get(itemId);
    if (!item || item.isInactive) continue;
    const buy = purchases.get(itemId) || { first: '', last: '', supplier: '', brand: '' };
    positions.push({
      itemId,
      code: item.itemCode,
      description: item.itemName,
      category: item.category || '',
      branch,
      qty: onHand,
      avgCost: n(item.purchasePrice),
      targetMargin: n(item.marginPercentage) || 15,
      brand: buy.brand || '',
      supplier: buy.supplier || '',
      firstPurchase: buy.first,
      lastPurchase: buy.last,
    });
  }
  return { positions, items: byItem };
}

async function salesFacts(db: any) {
  const lines = await db.invoiceItem.findMany({
    include: { invoice: { include: { customer: true } }, item: true },
  });
  return lines.filter((line: any) => String(line.invoice?.status || '') !== 'Cancelled');
}

function later(a: string, b: string) {
  return !a || (b && b > a) ? b : a;
}

function lastSaleMap(lines: any[]) {
  const map = new Map<string, string>();
  for (const line of lines) {
    const date = iso(line.invoice?.issueDate);
    const division = String(line.division || 'General');
    const exact = `${line.itemId}|${division}`;
    map.set(exact, later(map.get(exact) || '', date));
    if (!division || division.toLowerCase() === 'general') {
      const anyKey = `${line.itemId}|*`;
      map.set(anyKey, later(map.get(anyKey) || '', date));
    }
  }
  return map;
}

function saleDateFor(last: Map<string, string>, itemId: string, branch: string) {
  return later(last.get(`${itemId}|${branch}`) || '', last.get(`${itemId}|*`) || '');
}

function agingBucket(days: number) {
  if (days <= 730) return '1–2 years';
  if (days <= 1095) return '2–3 years';
  return '>3 years';
}

async function openPipeline(db: any) {
  const [orders, received] = await Promise.all([
    db.purchaseOrderItem.findMany({ include: { purchaseOrder: { include: { supplier: true } } } }),
    db.goodsReceivedNoteItem.findMany({ include: { goodsReceivedNote: true } }),
  ]);
  const receivedByPoItem = new Map<string, number>();
  for (const line of received) {
    const poId = line.goodsReceivedNote?.purchaseOrderId;
    if (!poId || !line.itemId) continue;
    const key = `${poId}|${line.itemId}`;
    receivedByPoItem.set(key, (receivedByPoItem.get(key) || 0) + n(line.qty));
  }
  const byItem = new Map<string, number>();
  for (const line of orders) {
    const status = String(line.purchaseOrder?.status || '');
    if (/closed|cancelled|received/i.test(status)) continue;
    const got = receivedByPoItem.get(`${line.purchaseOrderId}|${line.itemId}`) || 0;
    const open = Math.max(0, n(line.qty) - got);
    if (line.itemId && open) byItem.set(line.itemId, r2((byItem.get(line.itemId) || 0) + open));
  }
  return byItem;
}

function leadDays(supplier: any) {
  if (!supplier) return 0;
  return n(supplier.leadTimeProcessing) + n(supplier.leadTimeProduction) + n(supplier.leadTimeShipping) + n(supplier.leadTimeRoad) + n(supplier.leadTimeExtra);
}

async function sendWorkbook(res: any, title: string, columns: { key: string; header: string }[], rows: any[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title.slice(0, 31));
  ws.addRow([`MAHANT INVESTMENT LTD — ${title}`]);
  ws.addRow([]);
  ws.addRow(columns.map((col) => col.header));
  for (const row of rows) ws.addRow(columns.map((col) => row[col.key] ?? ''));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

export function registerMilReportRoutes(app: Express, prisma: any) {
  app.get('/api/mil-reports/branches', async (_req, res) => {
    try {
      const [divisions, locations] = await Promise.all([
        prisma.division.findMany({ orderBy: { name: 'asc' } }),
        prisma.location.findMany({ orderBy: { name: 'asc' } }),
      ]);
      const names = new Set<string>();
      for (const row of [...divisions, ...locations]) if (row.name) names.add(row.name);
      res.json(['All', ...Array.from(names)]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/mil-reports/notes', async (req, res) => {
    try {
      await ensureNotes(prisma);
      const itemId = req.body.itemId || null;
      const refId = req.body.refId || '';
      const branch = req.body.branch || '';
      const noteType = String(req.body.noteType || '');
      const value = req.body.value == null ? '' : String(req.body.value);
      if (!noteType) return res.status(400).json({ error: 'Note type is required' });
      const found = await prisma.$queryRawUnsafe(
        `SELECT id FROM master.mil_report_notes
         WHERE note_type = $1 AND COALESCE(item_id::text, '') = COALESCE($2, '')
           AND COALESCE(ref_id, '') = $3 AND COALESCE(branch, '') = $4 LIMIT 1`,
        noteType, itemId, refId, branch
      );
      if (found?.[0]?.id) {
        await prisma.$executeRawUnsafe(
          `UPDATE master.mil_report_notes SET value = $2, updated_at = now() WHERE id = $1::uuid`,
          found[0].id, value
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO master.mil_report_notes (item_id, ref_id, branch, note_type, value)
           VALUES ($1::uuid, $2, $3, $4, $5)`,
          itemId, refId, branch, noteType, value
        );
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/non-moving', async (req, res) => {
    try {
      await ensureNotes(prisma);
      const from = String(req.query.from || iso(new Date(Date.now() - 90 * 86400000)));
      const to = String(req.query.to || iso(new Date()));
      const branch = String(req.query.branch || 'All');
      const category = String(req.query.category || '');
      const brand = String(req.query.brand || '');
      const [{ positions }, lines, saved] = await Promise.all([
        stockPositions(prisma),
        salesFacts(prisma),
        notesOf(prisma, 'non_moving_action'),
      ]);
      const last = lastSaleMap(lines);
      const rows = positions
        .filter((row) => branchOk(row.branch, branch))
        .filter((row) => !category || row.category.toLowerCase().includes(category.toLowerCase()))
        .filter((row) => !brand || row.brand.toLowerCase().includes(brand.toLowerCase()))
        .filter((row) => !(row.firstPurchase && row.firstPurchase >= from && row.firstPurchase <= to))
        .map((row) => {
          const sold = saleDateFor(last, row.itemId, row.branch);
          const inPeriod = sold && sold >= from && sold <= to;
          return {
            ...row,
            stockValue: r2(row.qty * row.avgCost),
            lastSale: sold,
            daysSinceSale: sold ? daysBetween(sold) : '',
            action: saved.get(noteKey(row.itemId, '', row.branch)) || '',
            inPeriod,
          };
        })
        .filter((row) => !row.inPeriod)
        .sort((a, b) => b.stockValue - a.stockValue)
        .map(({ inPeriod, ...row }) => row);
      const columns = [
        { key: 'code', header: 'Part Code' },
        { key: 'description', header: 'Description' },
        { key: 'category', header: 'Category' },
        { key: 'branch', header: 'Branch' },
        { key: 'qty', header: 'Qty on Hand' },
        { key: 'avgCost', header: 'Avg Cost (ZMW)' },
        { key: 'stockValue', header: 'Stock Value (ZMW)' },
        { key: 'lastSale', header: 'Last Sale Date' },
        { key: 'daysSinceSale', header: 'Days Since Last Sale' },
        { key: 'lastPurchase', header: 'Last Purchase Date' },
        { key: 'action', header: 'Suggested Action' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'Non-Moving Stock', columns, rows);
      const total = r2(rows.reduce((sum, row) => sum + row.stockValue, 0));
      res.json({ title: 'Non-Moving Stock', columns, rows, total, from, to, branch });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/dead-stock', async (req, res) => {
    try {
      await ensureNotes(prisma);
      const branch = String(req.query.branch || 'All');
      const category = String(req.query.category || '');
      const minValue = n(req.query.minValue);
      const [{ positions }, lines, saved] = await Promise.all([
        stockPositions(prisma),
        salesFacts(prisma),
        notesOf(prisma, 'dead_decision'),
      ]);
      const last = lastSaleMap(lines);
      const rows = positions
        .filter((row) => branchOk(row.branch, branch))
        .filter((row) => !category || row.category.toLowerCase().includes(category.toLowerCase()))
        .map((row) => {
          const sold = saleDateFor(last, row.itemId, row.branch);
          const anchor = sold || row.firstPurchase;
          const dormant = anchor ? daysBetween(anchor) : 9999;
          return {
            code: row.code,
            description: row.description,
            category: row.category,
            branch: row.branch,
            itemId: row.itemId,
            qty: row.qty,
            avgCost: row.avgCost,
            stockValue: r2(row.qty * row.avgCost),
            lastSale: sold,
            daysDormant: dormant,
            bucket: agingBucket(dormant),
            decision: saved.get(noteKey(row.itemId, '', row.branch)) || '',
          };
        })
        .filter((row) => row.daysDormant > 365 && row.stockValue >= minValue)
        .sort((a, b) => b.stockValue - a.stockValue);
      const columns = [
        { key: 'code', header: 'Part Code' },
        { key: 'description', header: 'Description' },
        { key: 'category', header: 'Category' },
        { key: 'branch', header: 'Branch' },
        { key: 'qty', header: 'Qty on Hand' },
        { key: 'avgCost', header: 'Avg Cost (ZMW)' },
        { key: 'stockValue', header: 'Stock Value (ZMW)' },
        { key: 'lastSale', header: 'Last Sale Date' },
        { key: 'daysDormant', header: 'Days Dormant' },
        { key: 'bucket', header: 'Aging Bucket' },
        { key: 'decision', header: 'Decision' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'Dead Stock', columns, rows);
      res.json({ title: 'Dead Stock', columns, rows, branch });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/top-parts', async (req, res) => {
    try {
      const from = String(req.query.from || iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
      const to = String(req.query.to || iso(new Date()));
      const branch = String(req.query.branch || 'All');
      const rankBy = String(req.query.rankBy || 'value');
      const margin = seeMargin(req);
      const [lines, stock, pipeline] = await Promise.all([salesFacts(prisma), stockPositions(prisma), openPipeline(prisma)]);
      const stockQty = new Map<string, number>();
      const cost = new Map<string, number>();
      for (const row of stock.positions) {
        stockQty.set(row.itemId, r2((stockQty.get(row.itemId) || 0) + row.qty));
        cost.set(row.itemId, row.avgCost);
      }
      const agg = new Map<string, any>();
      for (const line of lines) {
        if (!inRange(line.invoice.issueDate, from, to)) continue;
        if (!branchOk(line.division, branch)) continue;
        const cur = agg.get(line.itemId) || {
          itemId: line.itemId,
          code: line.item?.itemCode || '',
          description: line.item?.itemName || line.description || '',
          category: line.item?.category || '',
          qty: 0,
          sales: 0,
          cost: 0,
        };
        const qty = n(line.qty);
        cur.qty += qty;
        cur.sales += baseAmount(line.invoice, n(line.totalAmount));
        cur.cost += qty * (cost.get(line.itemId) || n(line.item?.purchasePrice));
        agg.set(line.itemId, cur);
      }
      const months = Math.max(1, daysBetween(from, to) / 30);
      let rows = Array.from(agg.values())
        .map((row) => {
          const onHand = stockQty.get(row.itemId) || 0;
          const monthly = row.qty / months;
          return {
            code: row.code,
            description: row.description,
            category: row.category,
            qtySold: r2(row.qty),
            salesValue: r2(row.sales),
            marginPct: row.sales ? r1(((row.sales - row.cost) / row.sales) * 100) : 0,
            currentStock: onHand,
            monthsOfCover: monthly ? r1(onHand / monthly) : '',
            onOrder: pipeline.get(row.itemId) || 0,
            stockOutDays: '',
            itemId: row.itemId,
          };
        })
        .sort((a, b) => (rankBy === 'qty' ? b.qtySold - a.qtySold : b.salesValue - a.salesValue))
        .slice(0, 300)
        .map((row, index) => ({ rank: index + 1, ...row }));
      if (!margin) rows = rows.map(({ marginPct, ...row }) => row);
      const columns = [
        { key: 'rank', header: 'Rank' },
        { key: 'code', header: 'Part Code' },
        { key: 'description', header: 'Description' },
        { key: 'category', header: 'Category' },
        { key: 'qtySold', header: 'Qty Sold' },
        { key: 'salesValue', header: 'Sales Value (ZMW)' },
        ...(margin ? [{ key: 'marginPct', header: 'Gross Margin %' }] : []),
        { key: 'currentStock', header: 'Current Stock (all branches)' },
        { key: 'monthsOfCover', header: 'Months of Cover' },
        { key: 'onOrder', header: 'On Order Qty' },
        { key: 'stockOutDays', header: 'Stock-Out Days in Period' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'Top 300 Parts', columns, rows);
      res.json({
        title: 'Top 300 Parts',
        columns,
        rows,
        note: 'Stock-out days need a daily quantity snapshot, so that column is blank. Months of cover under 1 are at risk.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/low-margin', async (req, res) => {
    try {
      if (!seeMargin(req)) return res.status(403).json({ error: 'Low-margin figures are limited to management, finance, and admin.' });
      await ensureNotes(prisma);
      const from = String(req.query.from || iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
      const to = String(req.query.to || iso(new Date()));
      const branch = String(req.query.branch || 'All');
      const threshold = req.query.threshold == null || req.query.threshold === '' ? 12 : n(req.query.threshold);
      const [lines, stock, saved] = await Promise.all([salesFacts(prisma), stockPositions(prisma), notesOf(prisma, 'margin_action')]);
      const supplierOf = new Map<string, string>();
      const targetOf = new Map<string, number>();
      const costOf = new Map<string, number>();
      for (const row of stock.positions) {
        if (!supplierOf.has(row.itemId)) supplierOf.set(row.itemId, row.supplier || 'Unassigned');
        targetOf.set(row.itemId, row.targetMargin);
        costOf.set(row.itemId, row.avgCost);
      }
      const agg = new Map<string, any>();
      for (const line of lines) {
        if (!inRange(line.invoice.issueDate, from, to) || !branchOk(line.division, branch)) continue;
        const cur = agg.get(line.itemId) || { itemId: line.itemId, code: line.item?.itemCode, description: line.item?.itemName, qty: 0, sales: 0 };
        cur.qty += n(line.qty);
        cur.sales += baseAmount(line.invoice, n(line.totalAmount));
        agg.set(line.itemId, cur);
      }
      const items = Array.from(agg.values()).map((row) => {
        const avgSell = row.qty ? row.sales / row.qty : 0;
        const avgCost = costOf.get(row.itemId) || 0;
        const marginPct = avgSell ? ((avgSell - avgCost) / avgSell) * 100 : 0;
        const target = targetOf.get(row.itemId) || 15;
        const gap = target - marginPct;
        return {
          supplier: supplierOf.get(row.itemId) || 'Unassigned',
          itemId: row.itemId,
          code: row.code,
          description: row.description,
          qtySold: r2(row.qty),
          avgSell: r2(avgSell),
          avgCost: r2(avgCost),
          marginPct: r1(marginPct),
          target,
          gap: r1(gap),
          salesValue: r2(row.sales),
          marginLost: r2(row.sales * (gap / 100)),
          action: saved.get(noteKey(row.itemId, '', '')) || '',
        };
      }).filter((row) => row.marginPct < threshold);
      items.sort((a, b) => a.supplier.localeCompare(b.supplier) || b.marginLost - a.marginLost);
      const rows: any[] = [];
      let group: any[] = [];
      const flush = () => {
        if (!group.length) return;
        rows.push(...group, {
          rowType: 'subtotal',
          supplier: group[0].supplier,
          salesValue: r2(group.reduce((s, row) => s + row.salesValue, 0)),
          marginLost: r2(group.reduce((s, row) => s + row.marginLost, 0)),
        });
        group = [];
      };
      for (const row of items) {
        if (group.length && group[0].supplier !== row.supplier) flush();
        group.push(row);
      }
      flush();
      const columns = [
        { key: 'supplier', header: 'Supplier' },
        { key: 'code', header: 'Part Code' },
        { key: 'description', header: 'Description' },
        { key: 'qtySold', header: 'Qty Sold' },
        { key: 'avgSell', header: 'Avg Selling Price' },
        { key: 'avgCost', header: 'Avg Cost' },
        { key: 'marginPct', header: 'Avg Margin %' },
        { key: 'target', header: 'Target Margin %' },
        { key: 'gap', header: 'Margin Gap %' },
        { key: 'salesValue', header: 'Sales Value (ZMW)' },
        { key: 'marginLost', header: 'Est. Margin Lost (ZMW)' },
        { key: 'action', header: 'Action' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'Low-Margin Items', columns, rows);
      res.json({ title: 'Low-Margin Items', columns, rows, threshold });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/day-book', async (req, res) => {
    try {
      const date = String(req.query.date || iso(new Date()));
      const branch = String(req.query.branch || 'All');
      const [invoices, receipts, payments, purchaseInvoices, transfers, ledger, claims, accounts, entries] = await Promise.all([
        prisma.invoice.findMany({ where: { issueDate: new Date(date) }, include: { customer: true, items: true } }),
        prisma.receipt.findMany(),
        prisma.payment.findMany(),
        prisma.invoices.findMany({ include: { suppliers: true, items: true } }),
        prisma.inventoryTransfer.findMany({ include: { items: true } }),
        prisma.stockLedger.findMany({ include: { location: true, item: true } }),
        prisma.expenseClaim.findMany({ include: { payer: true, items: true } }),
        prisma.chartOfAccount.findMany({ where: { isPaymentAccount: true } }),
        prisma.ledgerEntry.findMany({ where: { transactionDate: { lte: new Date(date) } }, include: { account: true } }),
      ]);
      const timeOf = (d: any) => {
        if (!d) return '';
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return '';
        return dt.toISOString().slice(11, 16);
      };
      const sections: { name: string; rows: any[] }[] = [
        { name: 'Sales', rows: [] },
        { name: 'Receipts', rows: [] },
        { name: 'Payments', rows: [] },
        { name: 'Purchases', rows: [] },
        { name: 'Stock Transfers', rows: [] },
        { name: 'Adjustments', rows: [] },
        { name: 'Expenses', rows: [] },
      ];
      for (const doc of invoices) {
        const matched = (doc.items || []).filter((line: any) => branchOk(line.division, branch));
        if (branch !== 'All' && !matched.length) continue;
        const amount = (branch === 'All' ? doc.items : matched).reduce((sum: number, line: any) => sum + baseAmount(doc, n(line.totalAmount)), 0);
        sections[0].rows.push({ time: timeOf(doc.createdAt), docNo: doc.reference, type: 'Sales Invoice', party: doc.customer?.name || '', description: doc.items?.[0]?.description || '', debit: 0, credit: r2(amount), mode: n(doc.balanceDue) > 0 ? 'Credit' : 'Paid', user: '', status: doc.status });
      }
      for (const doc of receipts.filter((row: any) => iso(row.date) === date)) {
        sections[1].rows.push({ time: timeOf(doc.createdAt), docNo: doc.reference, type: 'Receipt', party: doc.paidByContact, description: doc.description || '', debit: 0, credit: r2(baseAmount(doc, doc.amount)), mode: doc.receivedInAccount, user: '', status: doc.status });
      }
      for (const doc of payments.filter((row: any) => iso(row.date) === date)) {
        sections[2].rows.push({ time: timeOf(doc.createdAt), docNo: doc.reference, type: 'Payment', party: doc.paidToContact, description: doc.description || '', debit: r2(baseAmount(doc, doc.amount)), credit: 0, mode: doc.paidFromAccount, user: '', status: doc.status });
      }
      for (const doc of purchaseInvoices.filter((row: any) => iso(row.created_at) === date)) {
        const matched = (doc.items || []).filter((line: any) => branchOk(line.division, branch));
        if (branch !== 'All' && !matched.length) continue;
        sections[3].rows.push({ time: timeOf(doc.created_at), docNo: doc.reference, type: 'Purchase Invoice', party: doc.suppliers?.name || '', description: doc.description || '', debit: r2(baseAmount(doc, doc.grand_total)), credit: 0, mode: '', user: '', status: doc.status });
      }
      for (const doc of transfers.filter((row: any) => iso(row.date) === date)) {
        if (branch !== 'All' && !branchOk(doc.fromLocation, branch) && !branchOk(doc.toLocation, branch)) continue;
        const qty = (doc.items || []).reduce((sum: number, line: any) => sum + n(line.qty), 0);
        sections[4].rows.push({ time: timeOf(doc.createdAt), docNo: doc.reference, type: 'Stock Transfer', party: '', description: `${doc.fromLocation} → ${doc.toLocation} (${qty})`, debit: 0, credit: 0, mode: '', user: '', status: doc.status });
      }
      for (const row of ledger.filter((entry: any) => iso(entry.createdAt) === date && /adjust|write-off/i.test(entry.transactionType || ''))) {
        if (!branchOk(row.location?.name, branch)) continue;
        sections[5].rows.push({ time: timeOf(row.createdAt), docNo: '', type: row.transactionType, party: '', description: `${row.item?.itemCode || ''} ${n(row.qtyChange)}`, debit: 0, credit: 0, mode: '', user: '', status: 'Posted' });
      }
      for (const doc of claims.filter((row: any) => iso(row.date) === date)) {
        const claimAmount = (doc.items || []).reduce((sum: number, line: any) => sum + n(line.qty) * n(line.unitPrice), 0);
        sections[6].rows.push({ time: timeOf(doc.createdAt), docNo: doc.reference, type: 'Expense Claim', party: doc.payer?.name || doc.payee || '', description: doc.description || '', debit: r2(claimAmount), credit: 0, mode: '', user: '', status: 'Posted' });
      }
      const closing: any[] = [];
      const accountIds = new Set(accounts.map((account: any) => account.id));
      const bal = new Map<string, { name: string; amount: number }>();
      for (const entry of entries) {
        if (!accountIds.has(entry.accountId)) continue;
        const cur = bal.get(entry.accountId) || { name: entry.account?.name || '', amount: 0 };
        cur.amount = r2(cur.amount + n(entry.debit) - n(entry.credit));
        bal.set(entry.accountId, cur);
      }
      for (const row of bal.values()) closing.push(row);
      const flat = sections.flatMap((section) => section.rows.map((row) => ({ section: section.name, ...row })));
      const columns = [
        { key: 'section', header: 'Section' },
        { key: 'time', header: 'Time' },
        { key: 'docNo', header: 'Doc No.' },
        { key: 'type', header: 'Transaction Type' },
        { key: 'party', header: 'Customer / Supplier / Staff' },
        { key: 'description', header: 'Description' },
        { key: 'debit', header: 'Debit (ZMW)' },
        { key: 'credit', header: 'Credit (ZMW)' },
        { key: 'mode', header: 'Payment Mode' },
        { key: 'user', header: 'User' },
        { key: 'status', header: 'Status' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'Branch Day Book', columns, flat);
      res.json({
        title: 'Branch Day Book',
        date,
        branch,
        sections: sections.map((section) => ({
          ...section,
          debit: r2(section.rows.reduce((sum, row) => sum + n(row.debit), 0)),
          credit: r2(section.rows.reduce((sum, row) => sum + n(row.credit), 0)),
        })),
        closing,
        note: 'Sales, purchases, transfers, and adjustments follow the branch. Receipts, payments, and expense claims are company-wide because those documents are not stored by branch.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/item-costing', async (req, res) => {
    try {
      const itemQ = String(req.query.item || '').toLowerCase();
      const supplierQ = String(req.query.supplier || '').toLowerCase();
      const containerQ = String(req.query.container || '').toLowerCase();
      const from = String(req.query.from || '');
      const to = String(req.query.to || '');
      const view = String(req.query.view || 'lines');
      const [rowsRaw, invoices, shipments] = await Promise.all([
        prisma.procurementCosting.findMany({ include: { item: true }, orderBy: { createdAt: 'asc' } }),
        prisma.invoices.findMany({ include: { suppliers: true } }),
        prisma.shipment.findMany(),
      ]);
      const invoiceOf = new Map(invoices.map((row: any) => [row.id, row]));
      const shipmentOf = new Map(shipments.map((row: any) => [row.id, row]));
      const previous = new Map<string, number>();
      const lines = rowsRaw.map((row: any) => {
        const qty = n(row.receivedQty) || 1;
        const landed = n(row.costPerUnit);
        const prev = previous.get(row.itemId) || 0;
        previous.set(row.itemId, landed || prev);
        const invoice = invoiceOf.get(row.purchaseInvoiceId);
        const shipment = shipmentOf.get(row.shipmentId);
        const rate = n(row.exchangeRate) || 1;
        const fobUnitBase = n(row.purchaseCost) / qty;
        return {
          date: iso(row.createdAt),
          itemId: row.itemId,
          code: row.item?.itemCode || '',
          description: row.item?.itemName || '',
          supplier: invoice?.suppliers?.name || '',
          poNo: '',
          container: shipment?.reference || shipment?.blNumber || '',
          qty: n(row.receivedQty),
          fobUnit: r2(rate > 1 ? fobUnitBase / rate : fobUnitBase),
          freightUnit: r2(n(row.freightAllocation) / qty),
          dutyUnit: r2(n(row.customsAllocation) / qty),
          transportUnit: 0,
          otherUnit: r2(n(row.otherCharges) / qty),
          landed,
          prevAvg: r2(prev),
          variance: prev ? r1(((landed - prev) / prev) * 100) : '',
        };
      }).filter((row: any) => {
        if (itemQ && !`${row.code} ${row.description}`.toLowerCase().includes(itemQ)) return false;
        if (supplierQ && !row.supplier.toLowerCase().includes(supplierQ)) return false;
        if (containerQ && !String(row.container).toLowerCase().includes(containerQ)) return false;
        if (from && row.date < from) return false;
        if (to && row.date > to) return false;
        return true;
      });
      let rows = lines;
      if (view === 'monthly') {
        const groups = new Map<string, any>();
        for (const row of lines) {
          const key = `${row.itemId}|${row.date.slice(0, 7)}`;
          const cur = groups.get(key) || { ...row, qty: 0, landedValue: 0 };
          cur.qty += row.qty;
          cur.landedValue += row.landed * row.qty;
          cur.landed = cur.qty ? r2(cur.landedValue / cur.qty) : row.landed;
          groups.set(key, cur);
        }
        rows = Array.from(groups.values()).map((row) => ({ ...row, container: row.date.slice(0, 7), variance: row.prevAvg ? r1(((row.landed - row.prevAvg) / row.prevAvg) * 100) : '' }));
      }
      const columns = [
        { key: 'code', header: 'Part Code' },
        { key: 'description', header: 'Description' },
        { key: 'supplier', header: 'Supplier' },
        { key: 'container', header: view === 'monthly' ? 'Month' : 'Container / Shipment' },
        { key: 'qty', header: 'Qty Received' },
        { key: 'fobUnit', header: 'FOB Unit' },
        { key: 'freightUnit', header: 'Freight Alloc/Unit' },
        { key: 'dutyUnit', header: 'Clearing & Duty/Unit' },
        { key: 'transportUnit', header: 'Transport/Unit' },
        { key: 'otherUnit', header: 'Other/Unit' },
        { key: 'landed', header: 'Landed Cost/Unit (ZMW)' },
        { key: 'prevAvg', header: 'Prev. Avg Cost' },
        { key: 'variance', header: 'Variance %' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'Item Costing', columns, rows);
      res.json({ title: 'Item Costing', columns, rows, note: 'Landed cost comes from the purchase costing already saved. Transport stays inside Other until it is stored on its own. Variance beyond 5% is highlighted.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/what-to-order', async (req, res) => {
    try {
      const supplierQ = String(req.query.supplier || '').toLowerCase();
      const category = String(req.query.category || '').toLowerCase();
      const cover = req.query.cover == null || req.query.cover === '' ? 4 : n(req.query.cover);
      const from = iso(new Date(Date.now() - 243 * 86400000));
      const [lines, stock, pipeline, suppliers] = await Promise.all([
        salesFacts(prisma),
        stockPositions(prisma),
        openPipeline(prisma),
        prisma.suppliers.findMany(),
      ]);
      const supplierByName = new Map(suppliers.map((row: any) => [String(row.name || '').toLowerCase(), row]));
      const sold = new Map<string, number>();
      for (const line of lines) {
        if (!inRange(line.invoice.issueDate, from, iso(new Date()))) continue;
        sold.set(line.itemId, (sold.get(line.itemId) || 0) + n(line.qty));
      }
      const seen = new Set<string>();
      const items = stock.positions.filter((row) => {
        if (seen.has(row.itemId)) return false;
        seen.add(row.itemId);
        return true;
      });
      const stockQty = new Map<string, number>();
      for (const row of stock.positions) stockQty.set(row.itemId, r2((stockQty.get(row.itemId) || 0) + row.qty));
      const rows = items.map((row) => {
        const supplier = supplierByName.get(String(row.supplier || '').toLowerCase());
        const avg = r2((sold.get(row.itemId) || 0) / 8);
        const onHand = stockQty.get(row.itemId) || 0;
        const onOrder = pipeline.get(row.itemId) || 0;
        const lead = leadDays(supplier);
        const leadQty = avg * lead / 30;
        const suggested = Math.max(0, r2(avg * cover + leadQty - onHand - onOrder));
        return {
          supplier: row.supplier || 'Unassigned',
          supplierId: supplier?.id || '',
          itemId: row.itemId,
          code: row.code,
          description: row.description,
          category: row.category,
          avgMonthly: avg,
          currentStock: onHand,
          onOrder,
          monthsCover: avg ? r1((onHand + onOrder) / avg) : '',
          leadDays: lead,
          leadQty: r2(leadQty),
          targetCover: cover,
          suggested,
          lastPrice: row.avgCost,
        };
      }).filter((row) => row.suggested > 0 || row.avgMonthly > 0)
        .filter((row) => !supplierQ || row.supplier.toLowerCase().includes(supplierQ))
        .filter((row) => !category || row.category.toLowerCase().includes(category))
        .sort((a, b) => a.supplier.localeCompare(b.supplier) || b.suggested - a.suggested);
      const columns = [
        { key: 'supplier', header: 'Supplier' },
        { key: 'code', header: 'Part Code' },
        { key: 'description', header: 'Description' },
        { key: 'avgMonthly', header: '8-Mth Avg Monthly Sales (Qty)' },
        { key: 'currentStock', header: 'Current Stock' },
        { key: 'onOrder', header: 'On Order (Pipeline)' },
        { key: 'monthsCover', header: 'Months of Cover (incl. pipeline)' },
        { key: 'leadDays', header: 'Lead Time (days)' },
        { key: 'leadQty', header: 'Qty Needed to Cover Lead Time' },
        { key: 'targetCover', header: 'Target Cover (months)' },
        { key: 'suggested', header: 'Suggested Order Qty' },
        { key: 'lastPrice', header: 'Last Purchase Price' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'What to Order', columns, rows);
      res.json({ title: 'What to Order', columns, rows, note: 'Suggested qty is not rounded to a pack size. Pack size is not stored on the item yet. Lead time is the supplier lead-time total and can be changed on the supplier before you create the draft order.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/mil-reports/what-to-order/draft', async (req, res) => {
    try {
      const supplierId = req.body.supplierId;
      const lines = (req.body.lines || []).filter((line: any) => n(line.qty) > 0 && line.itemId);
      if (!supplierId || !lines.length) return res.status(400).json({ error: 'Choose a supplier with at least one suggested quantity.' });
      const reference = `WTO-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
      const amount = r2(lines.reduce((sum: number, line: any) => sum + n(line.qty) * n(line.unitPrice), 0));
      const order = await prisma.purchaseOrder.create({
        data: {
          supplierId,
          reference,
          amount,
          currency: 'ZMW',
          description: 'Draft from What to Order',
          status: 'Open',
          items: {
            create: lines.map((line: any) => ({
              itemId: line.itemId,
              description: line.description || '',
              qty: n(line.qty),
              unitPrice: n(line.unitPrice),
              totalAmount: r2(n(line.qty) * n(line.unitPrice)),
            })),
          },
        },
      });
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/mil-reports/loss-of-sales', async (req, res) => {
    try {
      await ensureNotes(prisma);
      const from = String(req.query.from || iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
      const to = String(req.query.to || iso(new Date()));
      const customerQ = String(req.query.customer || '').toLowerCase();
      const itemQ = String(req.query.item || '').toLowerCase();
      const [quotes, orders, invoices, saved] = await Promise.all([
        prisma.quoteItem.findMany({ where: { quoteId: { not: null } }, include: { quote: { include: { customer: true } }, item: true } }),
        prisma.quoteItem.findMany({ where: { orderId: { not: null } }, include: { order: true, item: true } }),
        salesFacts(prisma),
        notesOf(prisma, 'quote_reason'),
      ]);
      const wonPrice = new Map<string, { date: string; price: number }>();
      for (const line of invoices) {
        const date = iso(line.invoice.issueDate);
        const prev = wonPrice.get(line.itemId);
        if (!prev || date > prev.date) wonPrice.set(line.itemId, { date, price: n(line.unitPrice) });
      }
      const lostCount = new Map<string, number>();
      const sixMonths = iso(new Date(Date.now() - 182 * 86400000));
      const detailed = quotes.map((line: any) => {
        const quote = line.quote;
        const quoteDate = iso(quote?.issueDate);
        const windowEnd = iso(new Date(new Date(quoteDate).getTime() + 30 * 86400000));
        const ordered = orders
          .filter((orderLine: any) => orderLine.itemId === line.itemId && orderLine.order?.customerId === quote?.customerId && iso(orderLine.order?.orderDate) >= quoteDate && iso(orderLine.order?.orderDate) <= windowEnd)
          .reduce((sum: number, orderLine: any) => sum + n(orderLine.qty), 0);
        const invoiced = invoices
          .filter((inv: any) => inv.itemId === line.itemId && inv.invoice?.customerId === quote?.customerId && iso(inv.invoice?.issueDate) >= quoteDate && iso(inv.invoice?.issueDate) <= windowEnd)
          .reduce((sum: number, inv: any) => sum + n(inv.qty), 0);
        const qtyOrdered = Math.max(ordered, invoiced);
        const qtyLost = Math.max(0, n(line.qty) - qtyOrdered);
        return {
          id: line.id,
          customer: quote?.customer?.name || '',
          customerId: quote?.customerId,
          quoteNo: quote?.reference || '',
          quoteDate,
          itemId: line.itemId,
          code: line.item?.itemCode || '',
          description: line.item?.itemName || line.description || '',
          qtyQuoted: n(line.qty),
          quotedPrice: n(line.unitPrice),
          qtyOrdered,
          qtyLost,
          lostValue: r2(qtyLost * n(line.unitPrice)),
          quotedValue: r2(n(line.qty) * n(line.unitPrice)),
          lastWonPrice: wonPrice.get(line.itemId)?.price || '',
          reason: saved.get(noteKey('', line.id, '')) || '',
        };
      }).filter((row: any) => row.qtyLost > 0 && row.quoteDate);
      for (const row of detailed) {
        if (row.quoteDate >= sixMonths) lostCount.set(row.itemId, (lostCount.get(row.itemId) || 0) + 1);
      }
      const rows = detailed
        .filter((row: any) => inRange(row.quoteDate, from, to))
        .filter((row: any) => !customerQ || row.customer.toLowerCase().includes(customerQ))
        .filter((row: any) => !itemQ || `${row.code} ${row.description}`.toLowerCase().includes(itemQ))
        .map((row: any) => ({ ...row, timesLost: lostCount.get(row.itemId) || 0 }))
        .sort((a: any, b: any) => a.customer.localeCompare(b.customer) || b.lostValue - a.lostValue);
      const byCustomer = new Map<string, { customer: string; quoted: number; lost: number }>();
      for (const row of rows) {
        const cur = byCustomer.get(row.customer) || { customer: row.customer, quoted: 0, lost: 0 };
        cur.quoted += row.quotedValue;
        cur.lost += row.lostValue;
        byCustomer.set(row.customer, cur);
      }
      const customerSummary = Array.from(byCustomer.values()).map((row) => ({
        ...row,
        quoted: r2(row.quoted),
        lost: r2(row.lost),
        ratio: row.quoted ? r1((row.lost / row.quoted) * 100) : 0,
      })).sort((a, b) => b.lost - a.lost);
      const itemSummary = Array.from(lostCount.entries())
        .map(([itemId, times]) => {
          const sample = detailed.find((row: any) => row.itemId === itemId);
          return { code: sample?.code, description: sample?.description, times };
        })
        .sort((a, b) => b.times - a.times)
        .slice(0, 20);
      const columns = [
        { key: 'customer', header: 'Customer' },
        { key: 'quoteNo', header: 'Quote No.' },
        { key: 'quoteDate', header: 'Quote Date' },
        { key: 'code', header: 'Part Code' },
        { key: 'description', header: 'Description' },
        { key: 'qtyQuoted', header: 'Qty Quoted' },
        { key: 'quotedPrice', header: 'Quoted Price' },
        { key: 'qtyOrdered', header: 'Qty Ordered' },
        { key: 'qtyLost', header: 'Qty Lost' },
        { key: 'lostValue', header: 'Lost Value (ZMW)' },
        { key: 'timesLost', header: 'Times Lost (last 6 mths)' },
        { key: 'lastWonPrice', header: 'Last Won Price' },
        { key: 'reason', header: 'Remarks / Reason' },
      ];
      if (req.query.format === 'xlsx') return sendWorkbook(res, 'Loss of Sales', columns, rows);
      res.json({ title: 'Loss of Sales on Quotations', columns, rows, customerSummary, itemSummary, note: 'A quote line is lost when the same customer does not order or invoice that item within 30 days.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
