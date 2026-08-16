import type {
  Customer,
  SalesQuote,
  SalesOrder,
  Invoice,
  CreditNote,
  DeliveryNote,
  Receipt,
  Account,
  Transaction,
  ApprovalRequest,
  InventoryItem,
  InventoryTransfer,
  InventoryWriteOff,
  InventoryLocation,
  InventoryUnitCost,
  Supplier,
  PurchaseOrder,
  PurchaseInvoice,
  DebitNote,
  GoodsReceivedNote,
  PurchaseQuote,
  AppUser,
  UserRole,
  TaxCode,
  WithholdingTax,
  RoleDefinition,
  ScreenPermission,
  DocumentFooter
} from './types.ts';

export const ADJUSTABLE_MARGIN_THRESHOLD = 0.1; // 10%

export const mockInventory: Record<string, { stock: number, sellingPrice: number, purchasePrice: number, unit?: string }> = {
  'General Spare Parts': { stock: 50, sellingPrice: 100, purchasePrice: 80, unit: 'pcs' },
  'MI0084 - 315/80 R22.5 UNIVERSAL': { stock: 15, sellingPrice: 2500, purchasePrice: 2100, unit: 'pcs' },
  'MI0323 - WHEEL STUD HENDRED': { stock: 120, sellingPrice: 45, purchasePrice: 35, unit: 'pcs' },
  'MI0234 - WHEEL NUT HENDRED': { stock: 300, sellingPrice: 15, purchasePrice: 10, unit: 'pcs' },
  'MI0848 - DIN180MF 12V 68032MF BATTERY': { stock: 42, sellingPrice: 6800, purchasePrice: 5800, unit: 'pcs' },
  'Engine Oil 20L': { stock: 85, sellingPrice: 3200, purchasePrice: 2800, unit: 'pcs' },
  'Brake Pads Set': { stock: 10, sellingPrice: 1850, purchasePrice: 1500, unit: 'set' },
  'Steel Rod 12mm': { stock: 500, sellingPrice: 450, purchasePrice: 380, unit: 'kg' },
  'Cement Bag (50kg)': { stock: 1000, sellingPrice: 120, purchasePrice: 95, unit: 'kg' }
};

export const getInventoryItems = () => Object.keys(mockInventory);

export const getInvoices = (): Invoice[] => {
  try {
    const saved = localStorage.getItem('invoices_data');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading invoices:', e);
  }
  return [
    {
      id: '1', issueDate: '31.12.2027', dueDate: '01.01.2028', reference: 'REF-001', salesOrder: 'SO-999', customer: 'ZCSA SAMPLE', description: 'ZCSA SAMPLE GIVEN | BATTERY FUEL POWER N180 #LIJ23E10A1211N0542 20.01.2026', currency: 'ZMW', invoiceAmount: 0.00, balanceDue: 0.00, status: 'Paid in full', timestamp: '20.01.2026 03:08:56 PM', hasWarning: true, tpin: '1000123456',
      items: [
        { id: 1, item: 'Battery Fuel Power N180', description: 'ZCSA SAMPLE GIVEN', qty: '1', unitPrice: '0', taxCode: 'No tax' }
      ]
    },
    {
      id: '2', issueDate: '31.01.2027', dueDate: '15.02.2027', reference: '30377', salesOrder: 'SO-1024', customer: 'SOLAR - DIVINE CARGO', description: 'BATTERY SAMPLE ZCSA #TEMP 12.09.2025', currency: 'ZMW', invoiceAmount: 0.00, balanceDue: 0.00, status: 'Paid in full', timestamp: '20.01.2026 03:08:35 PM', hasWarning: true, tpin: '1000987654',
      items: [
        { id: 2, item: 'Battery Sample ZCSA', description: 'SOLAR - DIVINE CARGO', qty: '1', unitPrice: '0', taxCode: 'No tax' }
      ]
    },
    {
      id: '3', issueDate: '08.03.2026', dueDate: '22.03.2026', reference: '12248', salesOrder: 'SO-5521', customer: 'HORIZON HAULIERS LTD - NDOLA', description: 'SPARE DN12248 #PO PENDING', currency: 'ZMW', invoiceAmount: 580.00, balanceDue: 580.00, status: 'Coming due', timestamp: '24.02.2026 05:53:14 PM', hasWarning: true, tpin: '1000554433',
      items: [
        { id: 3, item: 'Spare Part DN12248', description: 'Horizon Hauliers Spare', qty: '1', unitPrice: '580', taxCode: 'No tax' }
      ]
    },
    {
      id: '4', issueDate: '08.03.2026', reference: '', customer: 'MK PETROLEUM TJS', description: 'PO#MKWS1843 SPARES', currency: 'ZMW', invoiceAmount: 5742.00, balanceDue: 5742.00, status: 'Coming due', timestamp: '24.02.2026 08:02:15 PM', hasWarning: true,
      items: [
        { id: 4, item: 'Spares MKWS1843', description: 'MK Petroleum Spares', qty: '2', unitPrice: '2871', taxCode: 'No tax' }
      ]
    },
    {
      id: '5', issueDate: '01.03.2026', reference: 'KDN00779', customer: 'NCT KITWE', description: 'SPARES KDN00779 KDN00784 PO 4802/03', currency: 'ZMW', invoiceAmount: 75026.00, balanceDue: 75026.00, status: 'Coming due', timestamp: '23.02.2026 10:15:54 PM', hasWarning: true,
      items: [
        { id: 5, item: 'Spares KDN00779', description: 'NCT Kitwe Spares', qty: '1', unitPrice: '75026', taxCode: 'No tax' }
      ]
    },
    {
      id: '6', issueDate: '01.03.2026', reference: '12226', customer: 'GAAS TRANSPORT NDOLA', description: 'BATTERY DN12226 DN12247 DN11173 #PO5002', currency: 'ZMW', invoiceAmount: 14930.00, balanceDue: 14930.00, status: 'Coming due', timestamp: '24.02.2026 10:31:07 PM', hasWarning: true,
      items: [
        { id: 6, item: 'Battery DN12226', description: 'GAAS Transport Battery', qty: '2', unitPrice: '7465', taxCode: 'No tax' }
      ]
    },
    { id: '7', issueDate: '28.02.2026', reference: '6657', customer: 'TRANSGATE TRADING CHIPATA - TJS (YAKUB MUNSHI IN ZRA)', description: 'SPARES DN#6657 PRICE CONFIRM', currency: 'ZMW', invoiceAmount: 0.00, balanceDue: 0.00, status: 'Paid in full', timestamp: '22.02.2026 10:27:54 PM', hasWarning: true, items: [{ id: 7, item: 'Spares DN6657', description: 'Transgate Spares', qty: '1', unitPrice: '0', taxCode: 'No tax' }] },
    { id: '8', issueDate: '28.02.2026', reference: '12221', customer: 'BHAVANI AGRO INVESTMENT NDOLA', description: 'WELDING RODS DN12221 #100 KGS', currency: 'ZMW', invoiceAmount: 2320.00, balanceDue: 2320.00, status: 'Coming due', timestamp: '25.02.2026 03:02:43 PM', hasWarning: true, items: [{ id: 8, item: 'Welding Rods', description: 'Bhavani Agro Spares', qty: '100', unitPrice: '23.2', taxCode: 'No tax' }] },
    { id: '9', issueDate: '28.02.2026', reference: '', customer: 'SURYA BIOFUELS LIMITED (SG)', description: 'PO# JACK', currency: 'ZMW', invoiceAmount: 1160.00, balanceDue: 1160.00, status: 'Coming due', timestamp: '12.02.2026 08:34:02 PM', hasWarning: true, items: [{ id: 9, item: 'Jack', description: 'Surya Biofuels Spares', qty: '1', unitPrice: '1160', taxCode: 'No tax' }] },
    { id: '10', issueDate: '28.02.2026', reference: '', customer: 'IKHWAAN LOGISTICS LIMITED TJS', description: 'TYRES AJE9322 PRICE CONFIRM', currency: 'ZMW', invoiceAmount: 15680.00, balanceDue: 15680.00, status: 'Coming due', timestamp: '13.02.2026 08:06:40 PM', hasWarning: true, items: [{ id: 10, item: 'Tyres AJE9322', description: 'Ikhwaan Logistics Tyres', qty: '4', unitPrice: '3920', taxCode: 'No tax' }] },
    { id: '11', issueDate: '28.02.2026', reference: '', customer: 'YOYO FOODS LIMITED', description: 'PO#20 TYRES', currency: 'ZMW', invoiceAmount: 69000.05, balanceDue: 69000.05, status: 'Coming due', timestamp: '23.02.2026 08:44:06 PM', hasWarning: true, items: [{ id: 11, item: 'Tyres PO20', description: 'Yoyo Foods Tyres', qty: '10', unitPrice: '6900', taxCode: 'No tax' }] },
    { id: 'inv-6666', issueDate: '20.02.2027', dueDate: '20.03.2027', reference: '6666', customer: 'ENGENER INVESTMENT - INPART', description: 'SPARES DN#6666', currency: 'ZMW', invoiceAmount: 37840.00, balanceDue: 37840.00, status: 'Coming due', timestamp: '20.02.2027 10:00:00 AM', hasWarning: false, items: [{ id: 6666, item: 'SPARES DN#6666', description: 'Invoice 6666 Spares', qty: '1', unitPrice: '37840', taxCode: 'No tax' }] },
    { id: '12', issueDate: '25.02.2026', reference: 'INV0010007301/2868', customer: 'TERMITES MEAT SUPPLIERS LIMITED - KITWE', description: 'BATTERY KDN00791', currency: 'ZMW', invoiceAmount: 13600.00, balanceDue: 13600.00, status: 'Coming due', timestamp: '25.02.2026 11:48:36 AM', items: [{ id: 12, item: 'Battery KDN00791', description: 'Termites Meat Spares', qty: '2', unitPrice: '6800', taxCode: 'No tax' }] },
    { id: '13', issueDate: '25.02.2026', reference: 'INV0010007301/2867', customer: 'MAKORA LOGISTICS AND TRANSPORT LTD MV', description: 'SPARES KDN00788 PO 341 #KITWE', currency: 'ZMW', invoiceAmount: 2320.00, balanceDue: 2320.00, status: 'DueToday', timestamp: '25.02.2026 11:07:02 AM', items: [{ id: 13, item: 'Spares KDN00788', description: 'Makora Logistics Spares', qty: '1', unitPrice: '2320', taxCode: 'No tax' }] },
    { id: '14', issueDate: '25.02.2026', reference: 'INV0010007301/2866', customer: 'FORTE GROUP INVESTMENTS LIMITED- KITWE', description: 'SPARES KDN00777', currency: 'ZMW', invoiceAmount: 12000.00, balanceDue: 0.00, status: 'Paid in full', timestamp: '25.02.2026 10:51:10 AM', items: [{ id: 14, item: 'Spares KDN00777', description: 'Forte Group Spares', qty: '1', unitPrice: '12000', taxCode: 'No tax' }] },
  ];
};

export const mockInvoices = getInvoices();

export const saveInvoices = (invoices: Invoice[]) => {
  const dataToSave = [...invoices];
  localStorage.setItem('invoices_data', JSON.stringify(dataToSave));
  mockInvoices.length = 0;
  mockInvoices.push(...dataToSave);
  window.dispatchEvent(new Event('invoices_updated'));
};

// Generate 100+ quotes for pagination
const baseQuotes: SalesQuote[] = [
  {
    id: '1', issueDate: '18.02.2026', reference: 'SQ-0001', customer: 'STALLION MOTORS LIMITED NDOLA', description: 'SPARES QUOTE', currency: 'ZMW', amount: 5800.00, status: 'Active', billingAddress: 'Plot 1234, Industrial Area, Ndola', expiryDays: '30', timestamp: '18.02.2026 09:15:32 AM',
    items: [
      { id: 1, item: 'Brake Pads Set', description: 'Front brake pads for truck', qty: '2', unitPrice: '2500', taxCode: 'VAT 16%', account: 'Inventory on hand' },
      { id: 2, item: 'General Spare Parts', description: 'Heavy duty air filter', qty: '1', unitPrice: '800', taxCode: 'No tax', account: 'Inventory on hand' }
    ]
  },
  {
    id: 'quote-hist-1', issueDate: '01.02.2026', reference: 'SQ-0002', customer: 'STALLION MOTORS LIMITED NDOLA', description: 'PREVIOUS QUOTE', currency: 'ZMW', amount: 8000.00, status: 'Accepted', billingAddress: 'Plot 1234, Industrial Area, Ndola', expiryDays: '15', timestamp: '01.02.2026 10:00:00 AM',
    items: [
      { id: 3, item: 'Brake Pads Set', description: 'Front brake pads', qty: '2', unitPrice: '2400', taxCode: 'VAT 16%', account: 'Inventory on hand' }
    ]
  },
  {
    id: 'quote-hist-2', issueDate: '15.01.2026', reference: 'SQ-0003', customer: 'STALLION MOTORS LIMITED NDOLA', description: 'OLD QUOTE', currency: 'ZMW', amount: 2300.00, status: 'Accepted', billingAddress: 'Plot 1234, Industrial Area, Ndola', expiryDays: '15', timestamp: '15.01.2026 11:00:00 AM',
    items: [
      { id: 4, item: 'Brake Pads Set', description: 'Front brake pads', qty: '1', unitPrice: '2300', taxCode: 'VAT 16%', account: 'Inventory on hand' }
    ]
  },
  {
    id: '2', issueDate: '18.02.2026', reference: 'SQ-0004', customer: 'SARAZI LOGISTICS LIMITED - NDOLA', description: 'SPARES QUOTE', currency: 'ZMW', amount: 10440.00, status: 'Accepted', billingAddress: 'Main Street, Ndola', expiryDays: '15', timestamp: '18.02.2026 11:30:45 AM',
    items: [
      { id: 5, item: 'Engine Oil 20L', description: 'Synthetic engine oil 20L', qty: '3', unitPrice: '3000', taxCode: 'VAT 16%', account: 'Inventory on hand' },
      { id: 6, item: 'General Spare Parts', description: 'Standard oil filter', qty: '3', unitPrice: '480', taxCode: 'No tax', account: 'Inventory on hand' }
    ]
  },
  { id: '3', issueDate: '18.02.2026', reference: 'SQ-0005', customer: 'INLAND PROPERTIES LIMITED NDOLA', description: 'BATTERY QUOTE', currency: 'ZMW', amount: 8000.00, status: 'Rejected', billingAddress: 'Broadway, Ndola', expiryDays: '7', timestamp: '18.02.2026 02:15:10 PM', items: [{ id: 5, item: 'Battery 12V', description: 'High capacity battery', qty: '2', unitPrice: '4000', taxCode: 'No tax', account: 'Inventory on hand' }] },
  { id: '4', issueDate: '18.02.2026', reference: 'SQ-0006', customer: 'LANDTO RESOURCES COMPANY LIMITED - NDOLA', description: 'FILTER QUOTE', currency: 'ZMW', amount: 21460.00, status: 'Active', billingAddress: 'President Avenue, Ndola', expiryDays: '30', timestamp: '18.02.2026 03:45:22 PM', items: [{ id: 6, item: 'Fuel Filter', description: 'Primary fuel filter', qty: '10', unitPrice: '2146', taxCode: 'No tax', account: 'Inventory on hand' }] },
  { id: '5', issueDate: '17.02.2026', reference: 'SQ-0007', customer: 'CHAMPION LOGISTICS LIMITD - USD', description: 'BRAKE BONDING AND SHOES', currency: 'US$', amount: 250.00, status: 'Inactive', billingAddress: 'Copperbelt, Zambia', expiryDays: '30', timestamp: '17.02.2026 08:00:05 AM', items: [{ id: 7, item: 'Brake Shoe', description: 'Rear brake shoe set', qty: '1', unitPrice: '250', taxCode: 'No tax', account: 'Inventory on hand' }] },
  { id: '6', issueDate: '17.02.2026', reference: 'SQ-0008', customer: 'ALISTAIR LOGISTICS ZAMBIA LTD - USD', description: 'SPARES', currency: 'US$', amount: 1050.00, status: 'Active', billingAddress: 'Lusaka Road, Ndola', expiryDays: '15', timestamp: '17.02.2026 10:20:33 AM', items: [{ id: 8, item: 'Wiper Blades', description: 'Heavy duty wiper blades', qty: '5', unitPrice: '210', taxCode: 'No tax', account: 'Inventory on hand' }] },
  { id: '7', issueDate: '17.02.2026', reference: 'SQ-0009', customer: 'AVALON CORPORATION LIMITED (MOIL)', description: 'SPARES', currency: 'ZMW', amount: 928.00, status: 'Active', billingAddress: 'Plot 55, Ndola', expiryDays: '30', timestamp: '17.02.2026 11:05:44 AM', items: [{ id: 9, item: 'Bulb H4', description: 'Headlight bulb', qty: '8', unitPrice: '116', taxCode: 'No tax', account: 'Inventory on hand' }] },
  { id: '8', issueDate: '17.02.2026', reference: 'SQ-0010', customer: 'MOIL ENERGIES ZAMBIA LIMITED', description: 'SPARES', currency: 'ZMW', amount: 928.00, status: 'Active', billingAddress: 'Plot 56, Ndola', expiryDays: '30', timestamp: '17.02.2026 01:30:19 PM', items: [{ id: 10, item: 'Bulb H4', description: 'Headlight bulb', qty: '8', unitPrice: '116', taxCode: 'No tax', account: 'Inventory on hand' }] },
  { id: '9', issueDate: '17.02.2026', reference: 'SQ-0011', customer: 'HTC - USD', description: 'RIM QUOTE', currency: 'US$', amount: 255.20, status: 'Active', billingAddress: 'Highway 1, Ndola', expiryDays: '7', timestamp: '17.02.2026 04:00:00 PM', items: [{ id: 11, item: 'Wheel Rim', description: 'Steel wheel rim 22.5', qty: '1', unitPrice: '255.2', taxCode: 'No tax', account: 'Inventory on hand' }] },
  { id: '10', issueDate: '24.02.2026', reference: 'SQ-0012', customer: 'ATHI TRANSPORTERS LIMITED NDOLA USD', description: 'TYRE QUOTE', currency: 'US$', amount: 1840.00, status: 'Active', billingAddress: 'Transport Way, Ndola', expiryDays: '30', timestamp: '24.02.2026 09:45:55 AM', items: [{ id: 12, item: 'Tyre 315/80', description: 'Universal truck tyre', qty: '2', unitPrice: '920', taxCode: 'No tax', account: 'Inventory on hand' }] },
];

export const getSalesQuotes = (): SalesQuote[] => {
  try {
    const saved = localStorage.getItem('sales_quotes_data');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading sales quotes:', e);
  }
  return [
    ...baseQuotes,
    ...Array.from({ length: 110 }).map((_, i) => ({
      id: `extra-${i}`,
      issueDate: '15.02.2026',
      reference: `SQ-${(13 + i).toString().padStart(4, '0')}`,
      customer: i % 2 === 0 ? 'GENERAL TRADING CO' : 'NDOLA LOGISTICS',
      description: 'Bulk Maintenance Quote',
      currency: 'ZMW',
      amount: 1500.00 + (i * 10),
      status: 'Active' as const,
      billingAddress: 'Sample Address',
      expiryDays: '30',
      timestamp: '15.02.2026 09:00:00 AM'
    }))
  ];
};

export const mockSalesQuotes = getSalesQuotes();

export const saveSalesQuotes = (quotes: SalesQuote[]) => {
  const dataToSave = [...quotes];
  localStorage.setItem('sales_quotes_data', JSON.stringify(dataToSave));
  mockSalesQuotes.length = 0;
  mockSalesQuotes.push(...dataToSave);
  window.dispatchEvent(new Event('sales_quotes_updated'));
};

export const mockAccounts: Account[] = [
  { id: 'acc1', code: '1200', name: 'AIRTEL ZMW - MAHANT', balance: 90041.10, type: 'Asset', isPaymentAccount: true },
  { id: 'acc2', code: '1201', name: 'ALTUS - AIRTEL MONEY', balance: 0.00, type: 'Asset', isPaymentAccount: true },
  { id: 'acc3', code: '1202', name: 'CASH AT BANK', balance: 5250.00, type: 'Asset', isPaymentAccount: true },
  { id: 'acc4', code: '1100', name: 'PETTY CASH', balance: 1500.00, type: 'Asset', isPaymentAccount: true },
  { id: 'acc5', code: '2100', name: 'Credit Card', balance: -500.00, type: 'Liability', isPaymentAccount: true },
  { id: 'acc6', code: '4000', name: 'Sales', balance: 0, type: 'Income' },
  { id: 'acc7', code: '5000', name: 'Cost of Goods Sold', balance: 0, type: 'Expense' },
  { id: 'acc8', code: '1300', name: 'Accounts Receivable', balance: 0, type: 'Asset' },
  { id: 'acc9', code: '2000', name: 'Accounts Payable', balance: 0, type: 'Liability' },
  { id: 'acc10', code: '9999', name: 'Suspense', balance: 0, type: 'Asset' },
  { id: 'acc11', code: '3000', name: 'Retained earnings', balance: 24160.25, type: 'Equity' },
];

export const getSalesOrders = (): SalesOrder[] => {
  try {
    const saved = localStorage.getItem('sales_orders_data');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading sales orders:', e);
  }
  return [
    {
      id: 'so1', orderDate: '20.02.2026', reference: 'SO-1001', customer: 'STALLION MOTORS LIMITED NDOLA', description: 'Monthly Spares', currency: 'ZMW', amount: 12500.00, status: 'Ordered', billingAddress: 'Plot 1234, Industrial Area, Ndola', timestamp: '20.02.2026 09:15:32 AM', items: [
        { id: 1, item: 'General Spare Parts', description: 'Monthly Spares', qty: '125', unitPrice: '100', taxCode: 'VAT 16%' }
      ]
    },
    {
      id: 'so2', orderDate: '15.02.2026', reference: 'SO-1002', customer: 'SARAZI LOGISTICS LIMITED - NDOLA', description: 'Emergency Repair Parts', currency: 'ZMW', amount: 4500.00, status: 'Ordered', billingAddress: 'Main Street, Ndola', timestamp: '15.02.2026 11:30:45 AM', items: [
        { id: 2, item: 'Brake Pads Set', description: 'Emergency Repair Parts', qty: '2', unitPrice: '2250', taxCode: 'VAT 16%' }
      ]
    },
    {
      id: 'so3', orderDate: '10.02.2026', reference: 'SO-1003', customer: 'STALLION MOTORS LIMITED NDOLA', description: 'Bulk Tyres', currency: 'ZMW', amount: 4500.00, status: 'Ordered', billingAddress: 'Plot 1234, Industrial Area, Ndola', timestamp: '10.02.2026 02:15:10 PM', items: [
        { id: 3, item: 'MI0084 - 315/80 R22.5 UNIVERSAL', description: 'Bulk Tyres', qty: '18', unitPrice: '2500', taxCode: 'VAT 16%' }
      ]
    },
    {
      id: 'so4', orderDate: '05.02.2026', reference: 'SO-1004', customer: 'INLAND PROPERTIES LIMITED NDOLA', description: 'Maintenance Kit', currency: 'ZMW', amount: 2100.00, status: 'Ordered', billingAddress: 'Industrial Complex, Ndola', timestamp: '05.02.2026 03:45:22 PM', items: [
        { id: 4, item: 'Engine Oil 20L', description: 'Maintenance Kit', qty: '1', unitPrice: '2100', taxCode: 'VAT 16%' }
      ]
    },
  ];
};

export const mockSalesOrders = getSalesOrders();
export const getReceipts = (): Receipt[] => {
  try {
    const saved = localStorage.getItem('receipts_data');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return [
    {
      id: '1', date: '21.02.2026', reference: 'REC-1001', paidBy: 'Customer', paidByContact: 'STALLION MOTORS LIMITED NDOLA', description: 'Fuel Payment', receivedIn: 'Account', receivedInAccount: 'CASH AT BANK', amount: 5000.00, currency: 'ZMW', status: 'Completed', timestamp: '21.02.2026 10:30:00 AM',
      items: [{ id: 1, item: 'General Spare Parts', description: 'Diesel', qty: '200', unitPrice: '25', taxCode: 'No tax', account: 'Fuel Expense' }]
    },
    {
      id: '2', date: '22.02.2026', reference: 'REC-1002', paidBy: 'Other', paidByContact: 'Cash Sale', description: 'Spare Parts Sale', receivedIn: 'Account', receivedInAccount: 'PETTY CASH', amount: 1500.00, currency: 'ZMW', status: 'Completed', timestamp: '22.02.2026 02:45:00 PM',
      items: [{ id: 2, item: 'MI0084 - 315/80 R22.5 UNIVERSAL', description: 'Front set', qty: '1', unitPrice: '1500', taxCode: 'No tax', account: 'Inventory on hand' }]
    },
    {
      id: '3', date: '23.02.2026', reference: 'REC-1003', paidBy: 'Supplier', paidByContact: 'ZESCO', description: 'Electricity Refund', receivedIn: 'Account', receivedInAccount: 'CASH AT BANK', amount: 250.00, currency: 'ZMW', status: 'Completed', timestamp: '23.02.2026 09:15:00 AM'
    },
    ...Array.from({ length: 15 }).map((_, i) => ({
      id: `rec-extra-${i}`,
      date: '24.02.2026',
      reference: `REC-${1004 + i}`,
      paidBy: i % 2 === 0 ? 'Customer' : 'Other',
      paidByContact: i % 2 === 0 ? 'NDOLA LOGISTICS' : 'Walk-in Customer',
      description: `Service Payment ${i + 1}`,
      receivedIn: 'Account',
      receivedInAccount: 'Business Checking',
      amount: 1000.00 + (i * 100),
      currency: 'ZMW',
      status: 'Completed',
      timestamp: '24.02.2026 11:00:00 AM'
    }))
  ];
};

export const saveReceipts = (receipts: Receipt[]) => {
  localStorage.setItem('receipts_data', JSON.stringify(receipts));
  mockReceipts.length = 0;
  mockReceipts.push(...receipts);
  window.dispatchEvent(new Event('receipts_updated'));
};

export const mockReceipts = getReceipts();

export const getCreditNotes = (): CreditNote[] => {
  try {
    const saved = localStorage.getItem('credit_notes_data');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading credit notes:', e);
  }
  return [
    {
      id: 'cn-1',
      issueDate: '24.02.2026',
      reference: 'CN-1001',
      customer: 'STALLION MOTORS LIMITED NDOLA',
      description: 'Returned Brake Pads set',
      currency: 'ZMW',
      amount: 5000.00,
      costOfSales: 4000.00,
      salesInvoice: 'INV-10045',
      status: 'Issued',
      timestamp: '24.02.2026 03:30:15 PM',
      items: [{ id: 1, item: 'Brake Pads Set', description: 'Faulty set', qty: '2', unitPrice: '2500', unitCost: '2000', taxCode: 'VAT 16%', account: 'Returns' }]
    },
    {
      id: 'cn-2',
      issueDate: '20.02.2026',
      reference: 'CN-1002',
      customer: 'SARAZI LOGISTICS LIMITED - NDOLA',
      description: 'Price adjustment on Synthetic oil',
      currency: 'ZMW',
      amount: 450.00,
      costOfSales: 380.00,
      salesInvoice: 'INV-10022',
      status: 'Issued',
      timestamp: '20.02.2026 11:20:45 AM',
      items: [{ id: 1, item: 'Engine Oil 20L', description: 'Price difference credit', qty: '3', unitPrice: '150', unitCost: '126.67', taxCode: 'No tax', account: 'Returns' }]
    }
  ];
};

export const saveCreditNotes = (notes: CreditNote[]) => {
  localStorage.setItem('credit_notes_data', JSON.stringify(notes));
  mockCreditNotes.length = 0;
  mockCreditNotes.push(...notes);
  window.dispatchEvent(new Event('credit_notes_updated'));
};

export const mockCreditNotes = getCreditNotes();

export const saveSalesOrders = (orders: SalesOrder[]) => {
  localStorage.setItem('sales_orders_data', JSON.stringify(orders));
};

export const mockApprovalRequests: ApprovalRequest[] = [];

export const initialCustomers: Customer[] = [];

// Consistent mock data for Customer delivery items
export const mockCustomerDeliveryItems: Record<string, { item: string, qty: number }[]> = {
  'STALLION MOTORS LIMITED NDOLA': [
    { item: 'MI0323 - WHEEL STUD HENDRED', qty: -50 },
    { item: 'MI0234 - WHEEL NUT HENDRED', qty: -50 },
    { item: 'MI0760 - PVC PIPE 12MM 50MTR.', qty: -0.2 }
  ],
  'Aarush Transport Ltd': [
    { item: 'MI0323 - WHEEL STUD HENDRED', qty: -50 },
    { item: 'MI0234 - WHEEL NUT HENDRED', qty: -50 },
    { item: 'MI0760 - PVC PIPE 12MM 50MTR.', qty: -0.2 },
    { item: 'MI0848 - DIN180MF 12V 68032MF BATTERY', qty: 0 }
  ],
  'SARAZI LOGISTICS LIMITED - NDOLA': [
    { item: 'MI0848 - DIN180MF 12V 68032MF BATTERY', qty: 25 },
    { item: 'MI0297 - N150LMF 12V (160G51MF) BATTERY', qty: 10 }
  ],
  'default': [
    { item: 'MI0428 - CARGO BELT & RATCHET10M', qty: 0 },
    { item: 'MI0329 - BOGGIE ASSY HENDRED', qty: 0 },
    { item: 'MI0540 - 7 PIN MALE', qty: 0 }
  ]
};

export const getCustomerDeliveryDetails = (name: string) => {
  return mockCustomerDeliveryItems[name] || mockCustomerDeliveryItems['default'];
};

export const mockDeliveryTransactions = [
  { id: '4', customer: 'Aarush Transport Ltd', item: 'MI0323 - WHEEL STUD HENDRED', date: '06.03.2026', transaction: 'Delivery Note', reference: '12331', qty: -50 },
  { id: '3', customer: 'STALLION MOTORS LIMITED NDOLA', item: 'MI0323 - WHEEL STUD HENDRED', date: '06.03.2026', transaction: 'Delivery Note', reference: '12331', qty: -50 },
  { id: '3', customer: 'STALLION MOTORS LIMITED NDOLA', item: 'MI0234 - WHEEL NUT HENDRED', date: '06.03.2026', transaction: 'Delivery Note', reference: '12331', qty: -50 },
  { id: '5', customer: 'SARAZI LOGISTICS LIMITED - NDOLA', item: 'MI0848 - DIN180MF 12V 68032MF BATTERY', date: '25.02.2026', transaction: 'Delivery Note', reference: 'DN-999', qty: 25 },
];

export const getDeliveryTransactionsByItem = (customerName: string, itemName: string) => {
  return mockDeliveryTransactions.filter(t => t.customer === customerName && t.item === itemName);
};

export const getCustomers = (): Customer[] => {
  let persistentCustomers = [];
  try {
    const saved = localStorage.getItem('customers_data');
    persistentCustomers = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(persistentCustomers)) persistentCustomers = [];
  } catch (e) {
    console.error('Error loading customers from storage:', e);
    persistentCustomers = [];
  }

  const allCustomersNames = [
    ...mockInvoices.map((i: any) => i.customer),
    ...mockSalesQuotes.map((q: any) => q.customer),
    ...mockSalesOrders.map((o: any) => o.customer)
  ];

  const savedCustomerNames = new Set(persistentCustomers.map((c: any) => c.name));

  const uniqueDerived = Array.from(new Set(allCustomersNames))
    .filter(name => !savedCustomerNames.has(name))
    .map((name, index) => {
      const balance = mockInvoices.filter((i: any) => i.customer === name).reduce((sum: number, inv: any) => sum + inv.balanceDue, 0);
      const deliveryItems = getCustomerDeliveryDetails(name as string);
      const totalQtyToDeliver = deliveryItems.reduce((sum, item) => sum + item.qty, 0);

      return {
        id: `cust-derived-${index + 1}`,
        name: name as string,
        code: `CUST-${(index + 1).toString().padStart(4, '0')}`,
        balance: balance,
        accountsReceivable: balance,
        division: 'Global Division',
        qtyToDeliver: totalQtyToDeliver,
        uninvoiced: Math.floor(Math.random() * 10000),
        status: balance > 0 ? 'Unpaid' : 'Paid',
        tpin: `100${Math.floor(Math.random() * 10000000)}`,
        salesPerson: ['John Doe', 'Jane Smith', 'Alice Johnson'][index % 3],
        creditDays: [15, 30, 45, 60][index % 4],
        currency: index % 5 === 0 ? 'USD - US Dollar' : 'ZMW - Zambian Kwacha',
        withholdingTax: Math.floor(Math.random() * 500),
        billingAddress: `Plot ${name.length * 7 % 999 + 1}, Industrial Area, NDOLA`
      };
    });

  return [...persistentCustomers, ...initialCustomers, ...uniqueDerived as any];
};

export const getCustomerTransactions = (customerName: string) => {
  const invoices = getInvoices().filter(inv => inv.customer === customerName);
  const receipts = getReceipts().filter(rec => rec.paidByContact === customerName);
  const creditNotes = (getCreditNotes ? getCreditNotes() : []).filter(cn => cn.customer === customerName);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
  };

  const allItems = [
    ...invoices.map(inv => ({
      id: inv.id,
      date: inv.issueDate,
      sortDate: parseDate(inv.issueDate),
      transaction: `Sales Invoice — ${inv.reference} — ${inv.issueDate}`,
      customer: inv.customer,
      bankAccount: '',
      description: inv.description,
      amount: inv.invoiceAmount,
      currency: inv.currency
    })),
    ...receipts.map(rec => ({
      id: rec.id,
      date: rec.date,
      sortDate: parseDate(rec.date),
      transaction: `Receipt — ${rec.reference}`,
      customer: rec.paidByContact,
      bankAccount: rec.receivedInAccount,
      description: rec.description,
      amount: -rec.amount,
      currency: rec.currency
    })),
    ...creditNotes.map(cn => ({
      id: cn.id,
      date: cn.issueDate,
      sortDate: parseDate(cn.issueDate),
      transaction: `Credit Note — ${cn.reference}`,
      customer: cn.customer,
      bankAccount: '',
      description: cn.description,
      amount: -cn.amount,
      currency: cn.currency
    }))
  ];

  allItems.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  let runningBalance = 0;
  return allItems.map(item => {
    runningBalance += item.amount;
    return {
      ...item,
      balance: runningBalance
    };
  }).reverse(); // Latest at top
};

export const getInvoiceTransactions = (invoiceId: string) => {
  // Matching the user's image for invoice 6666
  if (invoiceId === '6666' || invoiceId === 'inv-6666') {
    return [
      {
        id: 'itx-1',
        date: '20.02.2027',
        transaction: 'Sales Invoice — 6666 — 20.02.2027',
        customer: 'ENGENER INVESTMENT - INPART',
        description: 'SPARES DN#6666',
        amount: 37840.00,
        currency: 'ZMW',
        balance: 37840.00,
        timestamp: '20.02.2027 10:00:00 AM'
      }
    ];
  }

  // Adding more mock data for other invoices
  if (invoiceId === '12248' || invoiceId === '3') {
    return [
      {
        id: 'itx-2',
        date: '08.03.2026',
        transaction: 'Sales Invoice — 12248 — 08.03.2026',
        customer: 'HORIZON HAULIERS LTD - NDOLA',
        description: 'SPARE DN12248 #PO PENDING',
        amount: 580.00,
        currency: 'ZMW',
        balance: 580.00,
        timestamp: '24.02.2026 05:53:14 PM'
      }
    ];
  }

  if (invoiceId === '30377' || invoiceId === '2') {
    return [
      {
        id: 'itx-3',
        date: '31.01.2027',
        transaction: 'Sales Invoice — 30377 — 31.01.2027',
        customer: 'SOLAR - DIVINE CARGO',
        description: 'BATTERY SAMPLE ZCSA #TEMP 12.09.2025',
        amount: 0.00,
        currency: 'ZMW',
        balance: 0.00,
        timestamp: '20.01.2026 03:08:35 PM'
      }
    ];
  }

  if (invoiceId === 'REF-001' || invoiceId === '1') {
    return [
      {
        id: 'itx-4',
        date: '31.12.2027',
        transaction: 'Sales Invoice — REF-001 — 31.12.2027',
        customer: 'ZCSA SAMPLE',
        description: 'ZCSA SAMPLE GIVEN',
        amount: 0.00,
        currency: 'ZMW',
        balance: 0.00,
        timestamp: '20.01.2026 03:08:56 PM'
      }
    ];
  }

  return [];
};





export const mockCustomers = getCustomers();

export const initialDeliveryNotes: DeliveryNote[] = [
  {
    id: '1',
    deliveryDate: '24.02.2026',
    reference: 'DN12248',
    salesOrder: 'SO-5521',
    customer: 'HORIZON HAULIERS LTD - NDOLA',
    description: 'SPARES DELIVERY',
    status: 'Delivered',
    timestamp: '24.02.2026 05:53:14 PM',
    items: [
      { id: 1, item: 'Spare Part DN12248', description: 'Horizon Hauliers Spare', qty: '1', unitPrice: '580', taxCode: 'No tax' }
    ]
  },
  {
    id: '2',
    deliveryDate: '24.02.2026',
    reference: 'DN12226',
    salesOrder: 'SO-5002',
    customer: 'GAAS TRANSPORT NDOLA',
    description: 'BATTERY DELIVERY',
    status: 'Delivered',
    timestamp: '24.02.2026 10:31:07 PM',
    items: [
      { id: 2, item: 'Battery DN12226', description: 'GAAS Transport Battery', qty: '2', unitPrice: '7465', taxCode: 'No tax' }
    ]
  },
  {
    id: '3',
    deliveryDate: '06.03.2026',
    reference: '12331',
    salesOrder: 'SO-5530',
    customer: 'STALLION MOTORS LIMITED NDOLA',
    description: 'SPARES DELIVERY',
    status: 'Pending',
    timestamp: '06.03.2026 09:15:22 AM',
    items: [
      { id: 1, item: 'MI0323 - WHEEL STUD HENDRED', description: 'WHEEL STUD', qty: '-50', unitPrice: '0', taxCode: 'No tax' },
      { id: 2, item: 'MI0234 - WHEEL NUT HENDRED', description: 'WHEEL NUT', qty: '-50', unitPrice: '0', taxCode: 'No tax' },
      { id: 3, item: 'MI0760 - PVC PIPE 12MM 50MTR.', description: 'PVC PIPE', qty: '-0.2', unitPrice: '0', taxCode: 'No tax' }
    ]
  },
  {
    id: '4',
    deliveryDate: '06.03.2026',
    reference: '12331',
    salesOrder: 'SO-9999',
    customer: 'Aarush Transport Ltd',
    description: 'SPARES DELIVERY',
    status: 'Pending',
    timestamp: '06.03.2026 02:45:10 PM',
    items: [
      { id: 1, item: 'MI0323 - WHEEL STUD HENDRED', description: 'WHEEL STUD', qty: '-50', unitPrice: '0', taxCode: 'No tax' },
      { id: 2, item: 'MI0234 - WHEEL NUT HENDRED', description: 'WHEEL NUT', qty: '-50', unitPrice: '0', taxCode: 'No tax' },
      { id: 3, item: 'MI0760 - PVC PIPE 12MM 50MTR.', description: 'PVC PIPE', qty: '-0.2', unitPrice: '0', taxCode: 'No tax' }
    ]
  },
  {
    id: '5',
    deliveryDate: '25.02.2026',
    reference: 'DN-999',
    salesOrder: 'SO-2022',
    customer: 'SARAZI LOGISTICS LIMITED - NDOLA',
    description: 'BATTERY DELIVERY',
    status: 'Delivered',
    timestamp: '25.02.2026 11:20:00 AM',
    items: [
      { id: 1, item: 'MI0848 - DIN180MF 12V 68032MF BATTERY', description: 'BATTERY', qty: '25', unitPrice: '0', taxCode: 'No tax' }
    ]
  }
];

export const getDeliveryNotes = (): DeliveryNote[] => {
  const saved = localStorage.getItem('delivery_notes_data');
  const persistentNotes = saved ? JSON.parse(saved) : [];
  const persistentIds = new Set(persistentNotes.map((n: any) => n.id));

  // Filter out any initial notes that have been "overridden" in localStorage
  const filteredInitial = initialDeliveryNotes.filter(n => !persistentIds.has(n.id));

  return [...persistentNotes, ...filteredInitial];
};

export const saveDeliveryNotes = (notes: DeliveryNote[]) => {
  localStorage.setItem('delivery_notes_data', JSON.stringify(notes));
  const newNotes = [...notes];
  mockDeliveryNotes.length = 0;
  mockDeliveryNotes.push(...newNotes);
  window.dispatchEvent(new Event('delivery_notes_updated'));
};

export const mockDeliveryNotes = getDeliveryNotes();



export const mockInventoryUnitCosts: InventoryUnitCost[] = [
  {
    id: '1',
    date: '2026-03-27',
    itemId: 'item-1',
    itemName: '315/80 R22.5 UNIVERSAL',
    unitCost: 2100.00,
    minSellingPrice: 2300.00,
    division: 'WAREHOUSE'
  }
];

export const initialUsers: AppUser[] = [
  { id: 'u1', name: 'John Doe', email: 'admin@erppro.com', role: 'Admin', avatar: 'JD' },
  { id: 'u2', name: 'Jane Smith', email: 'manager@erppro.com', role: 'Manager', avatar: 'JS' },
  { id: 'u3', name: 'Bob Wilson', email: 'staff@erppro.com', role: 'Staff', avatar: 'BW' }
];

export const getUsers = (): AppUser[] => {
  const saved = localStorage.getItem('app_users_data');
  if (saved) return JSON.parse(saved);
  return initialUsers;
};

export const saveUsers = (users: AppUser[]) => {
  localStorage.setItem('app_users_data', JSON.stringify(users));
  window.dispatchEvent(new Event('users_updated'));
};

export const mockUsers = getUsers();

export const getCurrentUser = (): AppUser => {
  const saved = localStorage.getItem('current_user_sim');
  if (saved) return JSON.parse(saved);
  return mockUsers[0]; // Default to Admin
};

export const setCurrentUser = (user: AppUser) => {
  localStorage.setItem('current_user_sim', JSON.stringify(user));
  window.dispatchEvent(new Event('user_sim_updated'));
};

export const mockInventoryItems: InventoryItem[] = [
  {
    id: 'item-1',
    itemCode: 'MI0084',
    itemName: '315/80 R22.5 UNIVERSAL',
    description: 'Universal Truck Tyre',
    unitName: 'Each',
    qtyOnHand: 15,
    avgCost: 2100,
    totalValue: 31500,
    reorderLevel: 10,
    category: 'Tyres',
    valuationMethod: 'WeightedAverage'
  },
  {
    id: 'item-2',
    itemCode: 'MI0323',
    itemName: 'WHEEL STUD HENDRED',
    description: 'Hendred Wheel Stud',
    unitName: 'Each',
    qtyOnHand: 120,
    avgCost: 35,
    totalValue: 4200,
    reorderLevel: 50,
    category: 'Spare Parts',
    valuationMethod: 'WeightedAverage'
  },
  {
    id: 'item-3',
    itemCode: 'MI0848',
    itemName: 'DIN180MF 12V BATTERY',
    description: '12V 68032MF Battery',
    unitName: 'Each',
    qtyOnHand: 42,
    avgCost: 5800,
    totalValue: 243600,
    reorderLevel: 20,
    category: 'Batteries',
    valuationMethod: 'WeightedAverage'
  }
];

export const mockInventoryTransfers: InventoryTransfer[] = [
  {
    id: 'tr-1',
    date: '20.03.2026',
    reference: 'TR-001',
    fromLocation: 'Main Warehouse',
    toLocation: 'Ndola Branch',
    description: 'Stock replenishment for Ndola branch',
    status: 'Sent',
    items: [
      { inventoryItem: 'MI0084 - 315/80 R22.5 UNIVERSAL', qty: 5 },
      { inventoryItem: 'MI0848 - DIN180MF 12V 68032MF BATTERY', qty: 10 }
    ],
    timestamp: '20.03.2026 10:00:00 AM'
  }
];

export const getAccounts = () => mockAccounts;

export const mockInventoryWriteOffs: InventoryWriteOff[] = [
  {
    id: 'wo-1',
    date: '15.03.2026',
    reference: 'WO-001',
    inventoryItem: 'MI0323 - WHEEL STUD HENDRED',
    qty: 5,
    account: 'Inventory Damage Expense',
    description: 'Damaged during unloading',
    amount: 175,
    timestamp: '15.03.2026 02:30:00 PM',
    status: 'Approved'
  }
];

export const getInventoryLocations = (): InventoryLocation[] => {
  let locations = [];
  try {
    const saved = localStorage.getItem('inventory_locations_data');
    if (saved) {
      locations = JSON.parse(saved);
    } else {
      // Default initial locations based on user screenshot
      locations = [
        { id: '1', name: 'Copperbelt Upcountry' },
        { id: '2', name: 'KITWE' },
        { id: '3', name: 'NDOLA - SPARES' },
        { id: '4', name: 'Solwezi' },
        { id: '5', name: 'UDDIT SHOP - CAIRO' },
        { id: '6', name: 'UPCOUNTRY' },
        { id: '7', name: 'WAREHOUSE' },
        { id: '8', name: 'Z-SUSPENSE' },
      ];
      localStorage.setItem('inventory_locations_data', JSON.stringify(locations));
    }
  } catch (e) {
    console.error('Error loading inventory locations:', e);
  }
  return Array.isArray(locations) ? locations : [];
};

export const saveInventoryLocations = (locations: InventoryLocation[]) => {
  localStorage.setItem('inventory_locations_data', JSON.stringify(locations));
  window.dispatchEvent(new Event('inventory_locations_updated'));
};

export const mockInventoryLocations = getInventoryLocations();

export const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem('customers_data', JSON.stringify(customers));
};

export const getInventoryUnitCosts = (): InventoryUnitCost[] => {
  let costs = [];
  try {
    const saved = localStorage.getItem('inventory_unit_costs_data');
    if (saved) {
      costs = JSON.parse(saved);
    } else {
      // Initial mock data from screenshot
      costs = [
        { id: '1', date: '2023-10-26', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 1206.60, minSellingPrice: 1400.00, division: 'WAREHOUSE' },
        { id: '2', date: '2024-04-04', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 1282.905, minSellingPrice: 1450.00, division: 'WAREHOUSE' },
        { id: '3', date: '2024-08-09', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 1254.238, minSellingPrice: 1400.00, division: 'WAREHOUSE' },
        { id: '4', date: '2024-11-22', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 1254.237, minSellingPrice: 1400.00, division: 'WAREHOUSE' },
        { id: '5', date: '2024-12-10', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 1254.238, minSellingPrice: 1400.00, division: 'WAREHOUSE' },
        { id: '6', date: '2025-02-10', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 1254.24, minSellingPrice: 1400.00, division: 'WAREHOUSE' },
        { id: '7', date: '2025-03-21', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 3053.45, minSellingPrice: 3200.00, division: 'WAREHOUSE' },
        { id: '8', date: '2025-10-06', itemId: 'item-527', itemName: 'MUFFLER SINO WG9727540001', unitCost: 1258.20, minSellingPrice: 1400.00, division: 'WAREHOUSE' },
      ];
      localStorage.setItem('inventory_unit_costs_data', JSON.stringify(costs));
    }
  } catch (e) {
    console.error('Error loading unit costs:', e);
  }
  return Array.isArray(costs) ? costs : [];
};

export const saveInventoryUnitCosts = (costs: InventoryUnitCost[]) => {
  localStorage.setItem('inventory_unit_costs_data', JSON.stringify(costs));
  window.dispatchEvent(new Event('inventory_unit_costs_updated'));
};

export const mockTaxCodes: TaxCode[] = [
  { id: 'tax-16', name: 'VAT 16%', rate: 16, description: 'Standard Value Added Tax' },
  { id: 'tax-0', name: 'Zero Rated', rate: 0, description: 'Items exempt from VAT' },
  { id: 'tax-exempt', name: 'Exempt', rate: 0, description: 'Non-vatable supplies' }
];

export function getSuppliers(): Supplier[] {
  let list: Supplier[] = [];
  try {
    const saved = localStorage.getItem('suppliers_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      list = Array.isArray(parsed) ? parsed : [];
    } else {
      list = [
        { id: 'sup1', name: 'AUTO SPARES LTD', code: 'SUP001', status: 'Paid', balance: 0, currency: 'ZMW', billingAddress: 'Plot 45, Independence Avenue, Kitwe, Zambia', tpin: '1000123456' },
        { id: 'sup2', name: 'TRUCK TECH GLOBAL', code: 'SUP002', status: 'Unpaid', balance: 5000, currency: 'USD', billingAddress: 'South Industrial Area, Johannesburg, South Africa', tpin: '999888777' },
        { id: 'sup3', name: 'LUBRICANTS DIRECT', code: 'SUP003', status: 'Paid', balance: 0, currency: 'ZMW', billingAddress: 'Warehouse 12, Heavy Industrial Area, Ndola', tpin: '1000555666' }
      ];
    }
  } catch (e) {
    console.error('Error loading suppliers:', e);
    return [];
  }

  // Fetch all related documents
  const quotes = getPurchaseQuotes();
  const orders = getPurchaseOrders();
  const invoices = getPurchaseInvoices();
  const debitNotes = getDebitNotes();
  const grns = getGoodsReceivedNotes();

  return list.map(s => {
    const sName = (s.name || '').trim().toLowerCase();
    const supplierQuotes = quotes.filter(q => (q.supplier || '').trim().toLowerCase() === sName);
    
    return {
      ...s,
      purchaseQuotes: supplierQuotes.filter(q => q.status !== 'Accepted' && q.status !== 'Rejected').length,
      purchaseOrders: orders.filter(o => (o.supplier || '').trim().toLowerCase() === sName && o.status !== 'Invoiced' && o.status !== 'Rejected').length,
      purchaseInvoices: invoices.filter(i => (i.supplier || '').trim().toLowerCase() === sName).length,
      debitNotes: debitNotes.filter(d => (d.supplier || '').trim().toLowerCase() === sName).length,
      goodsReceipts: grns.filter(g => (g.supplier || '').trim().toLowerCase() === sName).length
    };
  });
}

export const saveSuppliers = (suppliers: Supplier[]) => {
  localStorage.setItem('suppliers_data', JSON.stringify(suppliers));
  window.dispatchEvent(new Event('suppliers_updated'));
};

export const mockSuppliers = getSuppliers();

export function getPurchaseOrders(): PurchaseOrder[] {
  try {
    const saved = localStorage.getItem('purchase_orders_data');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return [];
}

export const mockPurchaseOrders = getPurchaseOrders();

export const savePurchaseOrders = (orders: PurchaseOrder[]) => {
  const dataToSave = [...orders];
  localStorage.setItem('purchase_orders_data', JSON.stringify(dataToSave));
  mockPurchaseOrders.length = 0;
  mockPurchaseOrders.push(...dataToSave);
  window.dispatchEvent(new Event('purchase_orders_updated'));
};

export function getPurchaseQuotes(): PurchaseQuote[] {
  try {
    const saved = localStorage.getItem('purchase_quotes_data');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading purchase quotes:', e);
  }
  return [];
}

export const mockPurchaseQuotes = getPurchaseQuotes();

export const savePurchaseQuotes = (quotes: PurchaseQuote[]) => {
  const quotesToSave = [...quotes];
  localStorage.setItem('purchase_quotes_data', JSON.stringify(quotesToSave));
  mockPurchaseQuotes.length = 0;
  mockPurchaseQuotes.push(...quotesToSave);
  window.dispatchEvent(new Event('purchase_quotes_updated'));
};

export function getPurchaseInvoices(): PurchaseInvoice[] {
  try {
    const saved = localStorage.getItem('purchase_invoices_data');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return [];
}

export const mockPurchaseInvoices = getPurchaseInvoices();

export const savePurchaseInvoices = (invoices: PurchaseInvoice[]) => {
  const dataToSave = [...invoices];
  localStorage.setItem('purchase_invoices_data', JSON.stringify(dataToSave));
  mockPurchaseInvoices.length = 0;
  mockPurchaseInvoices.push(...dataToSave);
  window.dispatchEvent(new Event('purchase_invoices_updated'));
};

export function getDebitNotes(): DebitNote[] {
  try {
    const saved = localStorage.getItem('debit_notes_data');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return [];
}

export const mockDebitNotes = getDebitNotes();

export const saveDebitNotes = (notes: DebitNote[]) => {
  const dataToSave = [...notes];
  localStorage.setItem('debit_notes_data', JSON.stringify(dataToSave));
  mockDebitNotes.length = 0;
  mockDebitNotes.push(...dataToSave);
  window.dispatchEvent(new Event('debit_notes_updated'));
};

export function getGoodsReceivedNotes(): GoodsReceivedNote[] {
  try {
    const saved = localStorage.getItem('grn_data');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return [];
}

export const mockGoodsReceivedNotes = getGoodsReceivedNotes();

export const saveGoodsReceivedNotes = (grns: GoodsReceivedNote[]) => {
  const dataToSave = [...grns];
  localStorage.setItem('grn_data', JSON.stringify(dataToSave));
  mockGoodsReceivedNotes.length = 0;
  mockGoodsReceivedNotes.push(...dataToSave);
  window.dispatchEvent(new Event('grn_updated'));
};

export const mockWithholdingTaxes: WithholdingTax[] = [
  { id: 'wht-10', name: 'WHT 10%', rate: 10, description: 'Standard Withholding Tax on services' },
  { id: 'wht-15', name: 'WHT 15%', rate: 15, description: 'Withholding Tax on royalties/rents' },
  { id: 'wht-5', name: 'WHT 5%', rate: 5, description: 'WHT on construction/consultancy' }
];

export const getTaxCodes = (): TaxCode[] => {
  const saved = localStorage.getItem('tax_codes_data');
  if (saved) return JSON.parse(saved);
  return mockTaxCodes;
};

export const saveTaxCodes = (codes: TaxCode[]) => {
  localStorage.setItem('tax_codes_data', JSON.stringify(codes));
  window.dispatchEvent(new Event('tax_codes_updated'));
};

export const getWithholdingTaxes = (): WithholdingTax[] => {
  const saved = localStorage.getItem('withholding_taxes_data');
  if (saved) return JSON.parse(saved);
  return mockWithholdingTaxes;
};

export const saveWithholdingTaxes = (taxes: WithholdingTax[]) => {
  localStorage.setItem('withholding_taxes_data', JSON.stringify(taxes));
  window.dispatchEvent(new Event('withholding_taxes_updated'));
};

export const SCREENS = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'sales-quotes', name: 'Sales Quotes' },
  { id: 'sales-orders', name: 'Sales Orders' },
  { id: 'sales-invoices', name: 'Sales Invoices' },
  { id: 'delivery-notes', name: 'Delivery Notes' },
  { id: 'customers', name: 'Customers' },
  { id: 'inventory-items', name: 'Inventory Items' },
  { id: 'inventory-transfers', name: 'Inventory Transfers' },
  { id: 'inventory-write-offs', name: 'Inventory Write-offs' },
  { id: 'inventory-locations', name: 'Inventory Locations' },
  { id: 'inventory-unit-costs', name: 'Inventory Unit Costs' },
  { id: 'accounts', name: 'Accounts' },
  { id: 'bank-accounts', name: 'Bank & Cash' },
  { id: 'receipts', name: 'Receipts' },
  { id: 'credit-notes', name: 'Credit Notes' },
  { id: 'user-permissions', name: 'User Permissions' },
  { id: 'role-management', name: 'Role Management' },
  { id: 'tax-codes', name: 'Tax Codes' },
  { id: 'withholding-taxes', name: 'Withholding Taxes' },
  { id: 'purchase-quotes', name: 'Purchase Quotes' }
];

export const initialRoleDefinitions: RoleDefinition[] = [
  {
    id: 'r-admin',
    name: 'Admin',
    permissions: SCREENS.map(s => ({
      screenId: s.id,
      screenName: s.name,
      view: true, add: true, edit: true, delete: true, full: true
    }))
  },
  {
    id: 'r-manager',
    name: 'Manager',
    permissions: SCREENS.map(s => ({
      screenId: s.id,
      screenName: s.name,
      view: true,
      add: !['user-permissions', 'role-management'].includes(s.id),
      edit: !['user-permissions', 'role-management'].includes(s.id),
      delete: false,
      full: false
    }))
  },
  {
    id: 'r-staff',
    name: 'Staff',
    permissions: SCREENS.map(s => ({
      screenId: s.id,
      screenName: s.name,
      view: !['user-permissions', 'role-management', 'inventory-unit-costs'].includes(s.id),
      add: ['sales-quotes', 'sales-invoices', 'receipts'].includes(s.id),
      edit: false,
      delete: false,
      full: false
    }))
  }
];

export const getRoleDefinitions = (): RoleDefinition[] => {
  const saved = localStorage.getItem('role_definitions_data');
  if (saved) return JSON.parse(saved);
  return initialRoleDefinitions;
};

export const saveRoleDefinitions = (roles: RoleDefinition[]) => {
  localStorage.setItem('role_definitions_data', JSON.stringify(roles));
  window.dispatchEvent(new Event('roles_updated'));
};

export const getRoleById = (id: string): RoleDefinition | undefined => {
  return getRoleDefinitions().find(r => r.id === id);
};

const defaultFooters: DocumentFooter[] = [
  {
    id: 'f1',
    name: 'Standard Corporate',
    content: 'Thank you for your business.\n\nBank Account: Corporate Bank\nAccount Number: 123456789\nSwift: CORPZMXXX'
  },
  {
    id: 'f2',
    name: 'Cash Payment',
    content: 'Received with thanks.\nPlease keep this document for your records.'
  },
  {
    id: 'f3',
    name: 'Strict Terms',
    content: 'All goods remain the property of the company until paid in full.\nLate payments attract a 5% monthly fee.'
  }
];

export const getFooters = (): DocumentFooter[] => {
  try {
    const saved = localStorage.getItem('document_footers');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading footers:', e);
  }
  return defaultFooters;
};

export const saveFooters = (data: DocumentFooter[]) => {
  localStorage.setItem('document_footers', JSON.stringify(data));
  window.dispatchEvent(new Event('footers_updated'));
};
