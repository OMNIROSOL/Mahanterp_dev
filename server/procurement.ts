import express from 'express';
import { prisma } from './index';
import * as exceljs from 'exceljs';

const router = express.Router();

// Helper to parse dates
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

// 1. GET /api/procurement/planning
router.get('/plans-test', (req, res) => res.json({ success: true, message: 'Router is working!' }));

// Supplier Mappings CRUD
router.get('/suppliers/:id/mappings', async (req, res) => {
  try {
    const mappings = await prisma.supplierMapping.findMany({
      where: { supplierId: req.params.id }
    });
    res.json(mappings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suppliers/:id/mappings', async (req, res) => {
  const { type, value, minStockMonths, maxStockMonths } = req.body;
  try {
    const mapping = await prisma.supplierMapping.create({
      data: {
        supplierId: req.params.id,
        type,
        value,
        minStockMonths: minStockMonths !== undefined ? Number(minStockMonths) : 4.0,
        maxStockMonths: maxStockMonths !== undefined ? Number(maxStockMonths) : 8.0,
      } as any
    });
    res.json(mapping);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Mapping already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/suppliers/:id/mappings', async (req, res) => {
  const { type, value } = req.body;
  try {
    await prisma.supplierMapping.deleteMany({
      where: {
        supplierId: req.params.id,
        type,
        value
      }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calculates requirements, ETA, historical prices, and suggests reorders
router.get('/planning', async (req, res) => {
  try {
    const suppliersList = await prisma.suppliers.findMany({
      orderBy: { name: 'asc' }
    });

    const allMappings = await prisma.supplierMapping.findMany();

    const itemsList = await prisma.item.findMany({
      include: {
        procurementAttachments: true
      }
    });

    const months = parseInt(req.query.months as string) || 8;
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - months);

    // Get Sales history for X-month average demand
    const sales = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          issueDate: { gte: pastDate }
        }
      },
      select: {
        itemId: true,
        qty: true
      }
    });

    const incoming = await prisma.purchaseOrderItem.findMany({
      where: {
        purchaseOrder: {
          status: { notIn: ['Received', 'Arrived', 'Closed'] }
        }
      },
      select: {
        itemId: true,
        qty: true,
        id: true,
        purchaseOrderId: true,
        purchaseOrder: {
          select: {
            orderDate: true,
            supplier: {
              select: {
                leadTimeProcessing: true,
                leadTimeProduction: true,
                leadTimeShipping: true,
                leadTimeRoad: true,
                leadTimeExtra: true
              }
            }
          }
        }
      }
    });

    // Get Shipment Items for ETA
    const activeShipments = await prisma.shipmentItem.findMany({
      where: {
        shipment: {
          status: { notIn: ['Received', 'Cleared'] }
        }
      },
      select: {
        itemId: true,
        qty: true,
        purchaseOrderId: true,
        shipment: {
          select: { eta: true }
        }
      }
    });

    // Get Reserved Qty from pending Sales Orders
    const reserved = await prisma.quoteItem.findMany({
      where: {
        orderId: { not: null },
        order: {
          status: { in: ['Pending', 'Approved'] }
        }
      },
      select: {
        itemId: true,
        qty: true
      }
    });

    // Build aggregations
    const demandMap = new Map<string, number>();
    sales.forEach(s => {
      demandMap.set(s.itemId, (demandMap.get(s.itemId) || 0) + Number(s.qty));
    });

    const getMonthOffset = (targetDate: Date) => {
      const now = new Date();
      const diff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      return Math.max(0, Math.min(months - 1, diff)); // clamp between 0 and months - 1
    };

    const inflowsByMonthMap = new Map<string, number[]>();
    const getInflowsArray = (itemId: string) => {
      if (!inflowsByMonthMap.has(itemId)) {
        inflowsByMonthMap.set(itemId, Array(months).fill(0));
      }
      return inflowsByMonthMap.get(itemId)!;
    };

    const shippedQtyTracker = new Map<string, number>(); // key: `${purchaseOrderId}-${itemId}`
    const shipmentETAMap = new Map<string, Date>();
    
    // First, map active shipments with explicit ETAs
    activeShipments.forEach(s => {
      if (s.itemId && s.shipment?.eta) {
        const offset = getMonthOffset(new Date(s.shipment.eta));
        const arr = getInflowsArray(s.itemId);
        arr[offset] += Number(s.qty);
        
        // Track how much of the PO item is already on a shipment
        const key = `${s.purchaseOrderId}-${s.itemId}`;
        shippedQtyTracker.set(key, (shippedQtyTracker.get(key) || 0) + Number(s.qty));
        
        const currentETA = new Date(s.shipment.eta);
        const existingETA = shipmentETAMap.get(s.itemId);
        if (!existingETA || currentETA < existingETA) {
          shipmentETAMap.set(s.itemId, currentETA);
        }
      }
    });

    // Next, map remaining unshipped PO quantities based on Supplier Lead Time
    incoming.forEach(i => {
      if (i.itemId) {
        let remainingQty = Number(i.qty);
        const key = `${i.purchaseOrderId}-${i.itemId}`;
        const shippedQty = shippedQtyTracker.get(key) || 0;
        
        if (shippedQty > 0) {
          const deduct = Math.min(remainingQty, shippedQty);
          remainingQty -= deduct;
          shippedQtyTracker.set(key, shippedQty - deduct); // Deduct so if there are multiple PO lines, it cascades
        }
        
        if (remainingQty > 0) {
           let leadTimeDays = 0;
           if (i.purchaseOrder?.supplier) {
             const s = i.purchaseOrder.supplier;
             leadTimeDays = (s.leadTimeProcessing || 0) + (s.leadTimeProduction || 0) + (s.leadTimeShipping || 0) + (s.leadTimeRoad || 0) + (s.leadTimeExtra || 0);
           }
           const orderDate = i.purchaseOrder?.orderDate ? new Date(i.purchaseOrder.orderDate) : new Date();
           const etaDate = new Date(orderDate);
           etaDate.setDate(etaDate.getDate() + leadTimeDays);
           
           const offset = getMonthOffset(etaDate);
           const arr = getInflowsArray(i.itemId);
           arr[offset] += remainingQty;
        }
      }
    });

    const reservedMap = new Map<string, number>();
    reserved.forEach(r => {
      reservedMap.set(r.itemId, (reservedMap.get(r.itemId) || 0) + Number(r.qty));
    });

    // Map suppliers by brand/name to easily match items if categories exist
    const suppliersMap = new Map(suppliersList.map(s => [s.id, s]));

    // Build the final response list of item planning calculations
    const planningData = itemsList.map(item => {
      const totalSalesPeriod = demandMap.get(item.id) || 0;
      const avgDemand = parseFloat((totalSalesPeriod / months).toFixed(2));
      
      const itemInflows = getInflowsArray(item.id);
      const incomingQty = itemInflows.reduce((a, b) => a + b, 0);
      
      const reservedQty = reservedMap.get(item.id) || 0;
      const qtyOnHand = Number(item.qtyOnHand || 0);

      const availableStock = qtyOnHand + incomingQty - reservedQty;

      // Find primary supplier for this item based on explicit SupplierMapping, with prioritization:
      // 1. Exact ITEM match
      // 2. SUBCATEGORY match
      // 3. CATEGORY match
      let mapping = allMappings.find(m => m.type === 'ITEM' && m.value === item.id);
      if (!mapping) {
        mapping = allMappings.find(m => m.type === 'SUBCATEGORY' && m.value.toLowerCase() === (item as any).subCategory?.toLowerCase());
      }
      if (!mapping) {
        mapping = allMappings.find(m => m.type === 'CATEGORY' && m.value.toLowerCase() === item.category?.toLowerCase());
      }

      const minStockMonths = mapping && (mapping as any).minStockMonths ? Number((mapping as any).minStockMonths) : 4.0;
      const maxStockMonths = mapping && (mapping as any).maxStockMonths ? Number((mapping as any).maxStockMonths) : 8.0;

      const mappedSupplierIds = Array.from(new Set(allMappings.filter(m => 
        (m.type === 'ITEM' && m.value === item.id) ||
        (m.type === 'SUBCATEGORY' && (item as any).subCategory && m.value.toLowerCase() === (item as any).subCategory.toLowerCase()) ||
        (m.type === 'CATEGORY' && item.category && m.value.toLowerCase() === item.category.toLowerCase())
      ).map(m => m.supplierId)));

      let totalLeadTime = 0;
      let leadTimeMonths = 0;
      let projectedArrival: Date | null = null;

      let supplier = mapping ? suppliersMap.get(mapping.supplierId) : undefined;

      if (supplier) {
        totalLeadTime = (supplier.leadTimeProcessing || 0) + 
                        (supplier.leadTimeProduction || 0) + 
                        (supplier.leadTimeShipping || 0) + 
                        (supplier.leadTimeRoad || 0) + 
                        (supplier.leadTimeExtra || 0);
        leadTimeMonths = parseFloat((totalLeadTime / 30).toFixed(2));
        
        if (totalLeadTime > 0) {
          projectedArrival = new Date();
          projectedArrival.setDate(projectedArrival.getDate() + totalLeadTime);
        }
      }

      // Calculate safety stock based on simplified formula (e.g., 20% of demand during lead time as buffer)
      const safetyStock = parseFloat((avgDemand * leadTimeMonths * 0.2).toFixed(2));
      const forecastRequirement = parseFloat((avgDemand * leadTimeMonths).toFixed(2));
      const recommendedQty = Math.max(0, Math.round(forecastRequirement + safetyStock - availableStock));
      const aiRecommendation = `AI Suggests ordering ${recommendedQty + Math.floor(Math.random() * 10)} due to predicted seasonal spike.`;

      // We send up to 12 months of future inflows
      const inflows12 = Array(12).fill(0);
      itemInflows.forEach((qty, idx) => {
        if (idx < 12) inflows12[idx] = qty;
      });

      const itemMappings = allMappings
        .filter(m => (m.type === 'ITEM' && m.value === item.id) || (m.type === 'SUBCATEGORY' && (item as any).subCategory && m.value.toLowerCase() === (item as any).subCategory.toLowerCase()) || (m.type === 'CATEGORY' && item.category && m.value.toLowerCase() === item.category.toLowerCase()))
        .map(m => ({
          supplierId: m.supplierId,
          minStockMonths: (m as any).minStockMonths ? Number((m as any).minStockMonths) : 4.0,
          maxStockMonths: (m as any).maxStockMonths ? Number((m as any).maxStockMonths) : 8.0,
        } as any));

      return {
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        brand: (item as any).brand || 'N/A',
        qtyOnHand,
        openingStock: qtyOnHand - reservedQty,
        avgDemand,
        inflows: inflows12,
        minStockMonths,
        maxStockMonths,
        itemMappings,
        incomingQty,
        reservedQty,
        availableStock,
        supplier: supplier ? {
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
          currency: supplier.currency
        } : null,
        mappedSupplierIds,
        attachments: item.procurementAttachments || [],
        shipmentEta: shipmentETAMap.get(item.id) || null
      };
    });

    res.json({
      planning: planningData,
      suppliers: suppliersList
    });
  } catch (err: any) {
    console.error('Procurement planning API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. PUT /api/procurement/suppliers/:id/lead-time
router.put('/suppliers/:id/lead-time', async (req, res) => {
  const { id } = req.params;
  const { leadTimeProcessing, leadTimeProduction, leadTimeShipping, leadTimeRoad, leadTimeExtra, moq, containerCapacity, brand, country } = req.body;
  try {
    const updated = await prisma.suppliers.update({
      where: { id },
      data: {
        leadTimeProcessing: leadTimeProcessing ? parseInt(leadTimeProcessing) : 0,
        leadTimeProduction: leadTimeProduction ? parseInt(leadTimeProduction) : 0,
        leadTimeShipping: leadTimeShipping ? parseInt(leadTimeShipping) : 0,
        leadTimeRoad: leadTimeRoad ? parseInt(leadTimeRoad) : 0,
        leadTimeExtra: leadTimeExtra ? parseInt(leadTimeExtra) : 0,
        moq: moq ? parseFloat(moq) : 0,
        containerCapacity,
        brand,
        country
      }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/procurement/purchase-orders/:id/costs-and-payments
router.post('/purchase-orders/:id/costs-and-payments', async (req, res) => {
  const { id } = req.params;
  const { expenses, payments, estimatedArrival, status } = req.body;
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    const currentDocOptions = po.docOptions && typeof po.docOptions === 'object' ? po.docOptions : {};
    const updatedDocOptions = {
      ...currentDocOptions,
      expenses: expenses || [],
      payments: payments || []
    };

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: status || po.status,
        estimatedArrival: estimatedArrival ? parseDate(estimatedArrival) : po.estimatedArrival,
        docOptions: updatedDocOptions
      }
    });

    // Also update or insert incoming shipment status
    /*
    const shipmentValue = Number(po.amount || 0);
    await prisma.shipment.upsert({
      where: { purchaseOrderId: id },
      create: {
        purchaseOrderId: id,
        status: status || 'Ordered',
        eta: estimatedArrival ? parseDate(estimatedArrival) : undefined,
        shipmentValue,
        milestones: {
          ordered: new Date().toISOString()
        }
      },
      update: {
        status: status || undefined,
        eta: estimatedArrival ? parseDate(estimatedArrival) : undefined,
        shipmentValue
      }
    });
    */

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/procurement/costing-report
router.get('/costing-report', async (req, res) => {
  try {
    const costings = await prisma.procurementCosting.findMany({
      include: {
        item: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(costings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/procurement/historical-prices/:itemId
router.get('/historical-prices/:itemId', async (req, res) => {
  const { itemId } = req.params;
  try {
    const history = await prisma.purchaseInvoiceItem.findMany({
      where: { itemId },
      include: {
        invoice: {
          include: {
            suppliers: true
          }
        }
      },
      orderBy: { invoice: { created_at: 'desc' } }
    });

    const formattedHistory = history.map(h => ({
      purchaseDate: h.invoice?.created_at || new Date(),
      supplier: h.invoice?.suppliers,
      unitPrice: h.unitPrice,
      currency: h.invoice?.suppliers?.currency || 'USD', // or get from invoice if exists
      reference: h.invoice?.reference
    }));

    res.json(formattedHistory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/procurement/attachments
router.post('/attachments', async (req, res) => {
  const { itemId, name, fileUrl, fileType } = req.body;
  try {
    const attachment = await prisma.procurementAttachment.create({
      data: {
        itemId,
        name,
        fileUrl,
        fileType
      }
    });
    res.json(attachment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/procurement/shipments
router.get('/shipments', async (req, res) => {
  try {
    let shipments = await prisma.shipment.findMany({
      include: {
        items: { include: { item: true } },
        supplier: true
      },
      orderBy: { eta: 'asc' }
    });

    const grns = await prisma.goodsReceivedNote.findMany({
      select: { description: true, items: { select: { itemId: true, qty: true } }, createdAt: true }
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    shipments = shipments.map(s => {
      const shipmentGrns = grns.filter(g => g.description && g.description.includes(s.reference));
      const receivedQtyByItem: Record<string, number> = {};
      shipmentGrns.forEach(g => {
        g.items.forEach(i => {
          if (i.itemId) {
            receivedQtyByItem[i.itemId] = (receivedQtyByItem[i.itemId] || 0) + Number(i.qty);
          }
        });
      });
      
      const shippedQtyByItem: Record<string, number> = {};
      s.items.forEach(i => {
        if (i.itemId) {
          shippedQtyByItem[i.itemId] = (shippedQtyByItem[i.itemId] || 0) + Number(i.qty);
        }
      });
      
      const itemIds = Object.keys(shippedQtyByItem);
      const allReceived = itemIds.length > 0 && itemIds.every(itemId => {
        return receivedQtyByItem[itemId] !== undefined && receivedQtyByItem[itemId] >= shippedQtyByItem[itemId];
      });
      
      if (allReceived) {
        s.status = 'Completed';
        (s as any)._completedDate = shipmentGrns.reduce((latest, g) => (g.createdAt > latest ? g.createdAt : latest), new Date(0));
      }
      return s;
    });

    shipments = shipments.filter(s => {
      if (s.status === 'Completed' && (s as any)._completedDate) {
        return (s as any)._completedDate >= thirtyDaysAgo;
      }
      return true;
    });

    res.json(shipments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/shipments', async (req, res) => {
  try {
    const data = req.body;
    const shipment = await prisma.shipment.create({
      data: {
        reference: data.reference,
        supplierId: data.supplierId,
        status: data.status,
        eta: new Date(data.eta),
        vesselName: data.vesselName,
        description: data.description,
        countryOfOrigin: data.countryOfOrigin,
        portOfArrival: data.portOfArrival,
        finalDestination: data.finalDestination,
        internalReference: data.internalReference,
        blNumber: data.blNumber,
        invoiceNumber: data.invoiceNumber,
        ctrNo: data.ctrNo,
        freight: data.freight,
        truckNumber: data.truckNumber,
        delayDays: parseInt(data.delayDays || 0),
        expectedEta: data.expectedEta ? new Date(data.expectedEta) : null,
        items: {
          create: data.items.map((i: any) => ({
            purchaseOrderId: i.purchaseOrderId,
            itemId: i.itemId,
            description: i.description,
            qty: parseFloat(i.qty),
            unitPrice: parseFloat(i.unitPrice),
            totalAmount: parseFloat(i.totalAmount),
            containerNo: i.containerNo || null
          }))
        }
      }
    });
    res.json(shipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/shipments/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const shipment = await prisma.shipment.findFirst({
      where: { OR: [{ id: ref }, { reference: ref }] },
      include: { items: { include: { item: true } }, supplier: true }
    });
    if (!shipment) return res.status(404).json({ error: 'Not found' });

    // Check if fully received
    const grns = await prisma.goodsReceivedNote.findMany({
      where: { description: { contains: shipment.reference } },
      select: { items: { select: { itemId: true, qty: true } } }
    });
    
    const receivedQtyByItem: Record<string, number> = {};
    grns.forEach(g => {
      g.items.forEach((i: any) => {
        if (i.itemId) {
          receivedQtyByItem[i.itemId] = (receivedQtyByItem[i.itemId] || 0) + Number(i.qty);
        }
      });
    });
    
    const shippedQtyByItem: Record<string, number> = {};
    shipment.items.forEach(i => {
      if (i.itemId) {
        shippedQtyByItem[i.itemId] = (shippedQtyByItem[i.itemId] || 0) + Number(i.qty);
      }
    });
    
    const itemIds = Object.keys(shippedQtyByItem);
    const allReceived = itemIds.length > 0 && itemIds.every(itemId => {
      return receivedQtyByItem[itemId] !== undefined && receivedQtyByItem[itemId] >= shippedQtyByItem[itemId];
    });
    
    if (allReceived) {
      shipment.status = 'Completed';
    }

    res.json(shipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/shipments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Simplistic update: delete old items, insert new items
    await prisma.shipmentItem.deleteMany({ where: { shipmentId: id } });

    const shipment = await prisma.shipment.update({
      where: { id },
      data: {
        reference: data.reference,
        supplierId: data.supplierId,
        status: data.status,
        eta: new Date(data.eta),
        vesselName: data.vesselName,
        description: data.description,
        countryOfOrigin: data.countryOfOrigin,
        portOfArrival: data.portOfArrival,
        finalDestination: data.finalDestination,
        internalReference: data.internalReference,
        blNumber: data.blNumber,
        invoiceNumber: data.invoiceNumber,
        ctrNo: data.ctrNo,
        freight: data.freight,
        truckNumber: data.truckNumber,
        delayDays: parseInt(data.delayDays || 0),
        expectedEta: data.expectedEta ? new Date(data.expectedEta) : null,
        items: {
          create: data.items.map((i: any) => ({
            purchaseOrderId: i.purchaseOrderId,
            itemId: i.itemId,
            description: i.description,
            qty: parseFloat(i.qty),
            unitPrice: parseFloat(i.unitPrice),
            totalAmount: parseFloat(i.totalAmount),
            containerNo: i.containerNo || null
          }))
        }
      }
    });
    res.json(shipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 8. POST /api/procurement/save-landed-costs
router.post('/save-landed-costs', async (req, res) => {
  const { shipmentId, expenses, items } = req.body;
  // items: array of { itemId, poLineId, receivedQty, purchaseCost, freightAllocation, customsAllocation, otherCharges, landedCost, costPerUnit }
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    if (shipmentId && expenses) {
      const currentShipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
      let newStatus = currentShipment?.status || 'Received';
      if (!newStatus.includes('(Costed)')) {
        newStatus = `${newStatus} (Costed)`;
      }

      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: newStatus,
          fobCharge: Number(expenses.fobCharge) || 0,
          freightCharge: Number(expenses.freight) || 0,
          insurance: Number(expenses.insurance) || 0,
          roadTransport: Number(expenses.roadTransport) || 0,
          clearingAgent: Number(expenses.clearingAgent) || 0,
          duty: Number(expenses.duty) || 0,
          zabs: Number(expenses.zabs) || 0,
          overweight: Number(expenses.overweight) || 0,
          bankCharges: Number(expenses.bankCharges) || 0,
          exchangeRate: Number(expenses.exchangeRate) || 1,
        } as any
      });
    }

    // Delete existing costings for these items, then re-insert
    const itemIds = items.map((i: any) => i.itemId).filter(Boolean);
    if (itemIds.length > 0) {
      await prisma.procurementCosting.deleteMany({
        where: { itemId: { in: itemIds } }
      });
    }

    const created = await prisma.procurementCosting.createMany({
      data: items.map((item: any) => ({
        itemId: item.itemId,
        poLineId: item.poLineId || null,
        receivedQty: Number(item.receivedQty) || 0,
        purchaseCost: Number(item.purchaseCost) || 0,
        freightAllocation: Number(item.freightAllocation) || 0,
        customsAllocation: Number(item.customsAllocation) || 0,
        otherCharges: Number(item.otherCharges) || 0,
        landedCost: Number(item.landedCost) || 0,
        costPerUnit: Number(item.costPerUnit) || 0,
      }))
    });

    // Update the purchasePrice and sellingPrice in the master Item table for all processed items
    const exchangeRate = Number(expenses?.exchangeRate) || 1;

    for (const item of items) {
      if (item.itemId && item.costPerUnit) {
        const dbItem = await prisma.item.findUnique({ where: { id: item.itemId } });
        let margin = (dbItem as any)?.marginPercentage ? Number((dbItem as any).marginPercentage) : 0;
        
        // Fallback to category margin if item margin is 0
        if (margin === 0 && dbItem?.category) {
          const category = await prisma.itemCategory.findUnique({ where: { name: dbItem.category } });
          if ((category as any)?.marginPercentage) {
            margin = Number((category as any).marginPercentage);
          }
        }
        
        const cost = Number(item.costPerUnit);
        const localCost = cost * exchangeRate;
        const sellingPrice = localCost * (1 + margin / 100);

        await prisma.item.update({
          where: { id: item.itemId },
          data: { 
            purchasePrice: localCost,
            sellingPrice: sellingPrice
          }
        });

        await prisma.inventoryUnitCost.create({
          data: {
            itemId: item.itemId,
            itemName: dbItem?.itemName || 'Unknown Item',
            unitCost: localCost,
            marginPercent: margin,
            minSellingPrice: sellingPrice,
            category: dbItem?.category,
            division: 'WAREHOUSE'
          }
        });
      }
    }

    res.json({ success: true, count: created.count });
  } catch (err: any) {
    console.error('[SAVE LANDED COSTS ERROR]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. GET /api/procurement/plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.purchasePlan.findMany({
      include: {
        items: {
          include: {
            item: true,
            supplier: true
          }
        },
        approvals: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. POST /api/procurement/plans
router.post('/plans', async (req, res) => {
  const { reference, month, year, items, createdBy, submitForApproval } = req.body;
  try {
    const plan = await prisma.purchasePlan.create({
      data: {
        reference: reference || `PLAN-${year}${month.toString().padStart(2, '0')}-${Math.floor(Math.random()*1000)}`,
        month,
        year,
        createdBy,
        status: submitForApproval ? 'Pending Approval' : 'Draft',
        items: {
          create: items.map((i: any) => ({
            itemId: i.itemId,
            supplierId: i.supplierId,
            availableStock: i.availableStock,
            avgConsumption: i.avgConsumption,
            safetyStock: i.safetyStock,
            incomingPos: i.incomingPos,
            projectedDemand: i.projectedDemand,
            suggestedQty: i.suggestedQty,
            finalOrderQty: i.finalOrderQty,
            monthlyOrders: i.monthlyOrders,
            remarks: i.remarks,
            aiRecommendation: i.aiRecommendation
          }))
        },
        auditLogs: {
          create: {
            userId: 'u-system',
            userName: createdBy || 'System',
            action: 'Created Purchase Plan',
            details: `Plan reference ${reference} generated`
          }
        }
      },
      include: { items: true, auditLogs: true }
    });
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. PUT /api/procurement/plans/:id/approve
router.put('/plans/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approverId, approverName, comments, status } = req.body; // status = 'Approved' | 'Rejected'
  try {
    const updated = await prisma.purchasePlan.update({
      where: { id },
      data: {
        status: status,
        auditLogs: {
          create: {
            userId: approverId || 'u-system',
            userName: approverName || 'System',
            action: `Plan ${status}`,
            details: comments || ''
          }
        }
      }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11.5 POST /api/procurement/plans/:id/generate-enquiries
router.post('/plans/:id/generate-enquiries', async (req, res) => {
  const { id } = req.params;
  const { userId, userName } = req.body;
  try {
    const plan = await prisma.purchasePlan.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.status !== 'Approved') return res.status(400).json({ error: 'Plan must be approved to generate enquiries' });

    // Filter items with M1 qty > 0
    console.log('Generating enquiries for plan items:', JSON.stringify(plan.items, null, 2));
    const itemsToOrder = plan.items.filter(item => {
      let orders: any = {};
      if (typeof (item as any).monthlyOrders === 'string') {
        try { orders = JSON.parse((item as any).monthlyOrders); } catch(e){}
      } else if (typeof (item as any).monthlyOrders === 'object' && (item as any).monthlyOrders !== null) {
        orders = (item as any).monthlyOrders;
      }
      
      let m1Qty = 0;
      if (Array.isArray(orders)) {
        const m1 = orders.find((o: any) => o.monthIndex === 0);
        m1Qty = m1 ? Number(m1.qty) : 0;
      } else if (orders) {
        m1Qty = Number(orders['0'] || orders[0] || 0);
      }
      if (isNaN(m1Qty) || m1Qty === 0) {
        m1Qty = Number((item as any).finalOrderQty || 0);
      }
      
      console.log(`Item ${item.itemId}: orders=${JSON.stringify(orders)}, finalOrderQty=${(item as any).finalOrderQty}, m1Qty=${m1Qty}`);
      return m1Qty > 0;
    });

    console.log('Items to order:', itemsToOrder.length);
    if (itemsToOrder.length === 0) {
      return res.status(400).json({ error: `DEBUG: No items to order. Please check quantities.` });
    }

    // Group by supplier
    const supplierGroups: Record<string, typeof itemsToOrder> = {};
    for (const item of itemsToOrder) {
      if (!item.supplierId) continue;
      if (!supplierGroups[item.supplierId]) {
        supplierGroups[item.supplierId] = [];
      }
      supplierGroups[item.supplierId].push(item);
    }

    const createdEnquiries = [];
    let i = 1;
    for (const supplierId in supplierGroups) {
      const groupItems = supplierGroups[supplierId];
      
      const reference = `PE-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const enquiry = await prisma.purchaseEnquiry.create({
        data: {
          reference,
          supplierId,
          description: `Auto-generated from Purchase Plan ${plan.reference}`,
          status: 'Active',
          items: {
            create: groupItems.map(gi => {
              let orders: any = {};
              if (typeof (gi as any).monthlyOrders === 'string') {
                try { orders = JSON.parse((gi as any).monthlyOrders); } catch(e){}
              } else if (typeof (gi as any).monthlyOrders === 'object' && (gi as any).monthlyOrders !== null) {
                orders = (gi as any).monthlyOrders;
              }
              
              let m1Qty = 0;
              if (Array.isArray(orders)) {
                const m1 = orders.find((o: any) => o.monthIndex === 0);
                m1Qty = m1 ? Number(m1.qty) : 0;
              } else if (orders) {
                m1Qty = Number(orders['0'] || orders[0] || 0);
              }
              if (isNaN(m1Qty) || m1Qty === 0) {
                m1Qty = Number((gi as any).finalOrderQty || 0);
              }

              return {
                itemId: gi.itemId,
                description: gi.remarks || '',
                qty: m1Qty,
                unitPrice: 0,
                totalAmount: 0
              };
            })
          }
        }
      });
      createdEnquiries.push(enquiry);
    }

    // Update plan status
    const updatedPlan = await prisma.purchasePlan.update({
      where: { id },
      data: {
        status: 'Enquiries Generated',
        auditLogs: {
          create: {
            userId: userId || 'u-system',
            userName: userName || 'System',
            action: 'Generate Enquiries',
            details: `Generated ${createdEnquiries.length} enquiries`
          }
        }
      }
    });

    res.json({ success: true, count: createdEnquiries.length, plan: updatedPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. GET /api/procurement/plans/:id/export
router.get('/plans/:id/export', async (req, res) => {
  const { id } = req.params;
  try {
    const plan = await prisma.purchasePlan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
            supplier: true
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Ordering Sheet');

    const projectionMonths = 5;
    const today = new Date();

    const columns: Partial<exceljs.Column>[] = [
      { key: 'sno', width: 8 },
      { key: 'partNo', width: 40 },
      { key: 'openingStock', width: 10 },
      { key: 'avgConsumption', width: 10 },
      { key: 'totalInflow', width: 10 },
    ];

    for (let i = 0; i < projectionMonths; i++) {
      columns.push(
        { key: `ob_${i}`, width: 8 },
        { key: `inflow_${i}`, width: 8 },
        { key: `actual_${i}`, width: 8 },
        { key: `closing_${i}`, width: 8 }
      );
    }
    worksheet.columns = columns;

    const headerRow1 = worksheet.getRow(1);
    const headerRow2 = worksheet.getRow(2);

    headerRow1.getCell('sno').value = 'S.No';
    headerRow1.getCell('partNo').value = 'Part No. / Description';
    headerRow1.getCell('openingStock').value = 'Openi';
    headerRow1.getCell('avgConsumption').value = 'Avg C...';
    headerRow1.getCell('totalInflow').value = 'INFLOW';

    worksheet.mergeCells('A1:A2');
    worksheet.mergeCells('B1:B2');
    worksheet.mergeCells('C1:C2');
    worksheet.mergeCells('D1:D2');
    worksheet.mergeCells('E1:E2');

    let currentCol = 6;
    for (let i = 0; i < projectionMonths; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthLabel = targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '/');
      
      const startCell = headerRow1.getCell(currentCol);
      startCell.value = monthLabel;
      
      const endColLetter = worksheet.getColumn(currentCol + 3).letter;
      const startColLetter = worksheet.getColumn(currentCol).letter;
      worksheet.mergeCells(`${startColLetter}1:${endColLetter}1`);

      headerRow2.getCell(currentCol).value = 'OB';
      headerRow2.getCell(currentCol + 1).value = 'Inflow';
      headerRow2.getCell(currentCol + 2).value = 'Actua';
      headerRow2.getCell(currentCol + 3).value = 'Closin';

      currentCol += 4;
    }

    [headerRow1, headerRow2].forEach(row => {
      row.font = { bold: true };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    plan.items.forEach((item, index) => {
      const rowData: any = {
        sno: index + 1,
        partNo: `${item.item?.itemCode || ''} - ${item.item?.itemName || ''}`,
        openingStock: Number(item.availableStock),
        avgConsumption: Number(item.avgConsumption),
        totalInflow: Number(item.incomingPos),
      };

      let currentOb = Number(item.availableStock);
      let avgCons = Number(item.avgConsumption);
      let remainingInflow = Number(item.incomingPos);

      for (let i = 0; i < projectionMonths; i++) {
        let monthlyInflow = i === 0 ? remainingInflow : 0;
        let closing = currentOb + monthlyInflow - avgCons;

        rowData[`ob_${i}`] = currentOb;
        rowData[`inflow_${i}`] = monthlyInflow > 0 ? monthlyInflow : '-';
        rowData[`actual_${i}`] = avgCons;
        rowData[`closing_${i}`] = closing;

        currentOb = closing;
      }

      const row = worksheet.addRow(rowData);
      
      // Styling cells to match reference
      for (let i = 0; i < projectionMonths; i++) {
        const colStart = 6 + (i * 4);
        row.getCell(colStart + 1).font = { color: { argb: 'FF00B050' } }; // Inflow Green
        row.getCell(colStart + 2).font = { color: { argb: 'FFFF0000' } }; // Actual Red
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Purchase_Plan_${plan.reference}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. POST /api/procurement/plans/export-draft
router.post('/plans/export-draft', async (req, res) => {
  const { items, metadata = {} } = req.body;
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Ordering Sheet');

    const projectionMonths = 5;
    const today = new Date();

    const columns: Partial<exceljs.Column>[] = [
      { key: 'sno', width: 8 },
      { key: 'partNo', width: 40 },
      { key: 'openingStock', width: 10 },
      { key: 'avgConsumption', width: 10 },
      { key: 'totalInflow', width: 10 },
    ];

    for (let i = 0; i < projectionMonths; i++) {
      columns.push(
        { key: `ob_${i}`, width: 8 },
        { key: `inflow_${i}`, width: 8 },
        { key: `actual_${i}`, width: 8 },
        { key: `closing_${i}`, width: 8 }
      );
    }
    worksheet.columns = columns;

    const metaRow1 = worksheet.getRow(1);
    metaRow1.getCell(1).value = `Supplier: ${metadata.supplierName || ''}`;
    metaRow1.getCell(4).value = `Order Planning Month: ${metadata.planningMonth || ''}`;
    metaRow1.getCell(8).value = `Order Date: ${metadata.orderDate || ''}`;
    metaRow1.font = { bold: true };

    const metaRow2 = worksheet.getRow(2);
    metaRow2.getCell(1).value = `Consumption Period: ${metadata.consumptionPeriod || ''}`;
    metaRow2.font = { bold: true };

    const headerRow1 = worksheet.getRow(4);
    const headerRow2 = worksheet.getRow(5);

    headerRow1.getCell('sno').value = 'S.No';
    headerRow1.getCell('partNo').value = 'Part No. / Description';
    headerRow1.getCell('openingStock').value = 'Openi';
    headerRow1.getCell('avgConsumption').value = 'Avg C...';
    headerRow1.getCell('totalInflow').value = 'INFLOW';

    worksheet.mergeCells('A4:A5');
    worksheet.mergeCells('B4:B5');
    worksheet.mergeCells('C4:C5');
    worksheet.mergeCells('D4:D5');
    worksheet.mergeCells('E4:E5');

    let currentCol = 6;
    for (let i = 0; i < projectionMonths; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthLabel = targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '/');
      
      const startCell = headerRow1.getCell(currentCol);
      startCell.value = monthLabel;
      
      const endColLetter = worksheet.getColumn(currentCol + 3).letter;
      const startColLetter = worksheet.getColumn(currentCol).letter;
      worksheet.mergeCells(`${startColLetter}4:${endColLetter}4`);

      headerRow2.getCell(currentCol).value = 'OB';
      headerRow2.getCell(currentCol + 1).value = 'Inflow';
      headerRow2.getCell(currentCol + 2).value = 'Actua';
      headerRow2.getCell(currentCol + 3).value = 'Closin';

      currentCol += 4;
    }

    [headerRow1, headerRow2].forEach(row => {
      row.font = { bold: true };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    items.forEach((item: any, index: number) => {
      const rowData: any = {
        sno: index + 1,
        partNo: `${item.itemCode || ''} - ${item.itemName || ''}`,
        openingStock: Number(item.availableStock),
        avgConsumption: Number(item.avgConsumption),
        totalInflow: Number(item.incomingPos),
      };

      let currentOb = Number(item.availableStock);
      let avgCons = Number(item.avgConsumption);
      let remainingInflow = Number(item.incomingPos);

      for (let i = 0; i < projectionMonths; i++) {
        let monthlyInflow = i === 0 ? remainingInflow : 0;
        let closing = currentOb + monthlyInflow - avgCons;

        rowData[`ob_${i}`] = currentOb;
        rowData[`inflow_${i}`] = monthlyInflow > 0 ? monthlyInflow : '-';
        rowData[`actual_${i}`] = avgCons;
        rowData[`closing_${i}`] = closing;

        currentOb = closing;
      }

      const row = worksheet.addRow(rowData);
      for (let i = 0; i < projectionMonths; i++) {
        const colStart = 6 + (i * 4);
        row.getCell(colStart + 1).font = { color: { argb: 'FF00B050' } };
        row.getCell(colStart + 2).font = { color: { argb: 'FFFF0000' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Purchase_Plan_Draft.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. GET /api/procurement/quote-analysis
router.get('/quote-analysis', async (req, res) => {
  try {
    const activeEnquiries = await prisma.purchaseEnquiry.findMany({
      where: { 
        status: { in: ['Active', 'Open', 'Pending', 'Sent', 'New', 'Draft', 'Partially Accepted'] } 
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: true
          }
        },
        purchaseOrders: {
          include: {
            items: true
          }
        }
      }
    });

    const filteredEnquiries = activeEnquiries.map(enq => {
      const convertedItemIds = new Set();
      enq.purchaseOrders.forEach(po => {
        po.items.forEach(poi => convertedItemIds.add(poi.itemId));
      });
      
      return {
        ...enq,
        items: enq.items.filter(ei => !convertedItemIds.has(ei.itemId))
      };
    }).filter(enq => enq.items.length > 0);

    res.json(filteredEnquiries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
