
export interface Division {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Unit {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'debit' | 'credit';
  account: string;
}

export interface CreditNote {
  id: string;
  issueDate: string;
  reference: string;
  salesInvoice?: string;
  customer: string;
  description: string;
  currency: string;
  amount: number;
  costOfSales?: number;
  status: string;
  timestamp: string;
  items?: QuoteItem[];
  billingAddress?: string;
  options?: DocumentOptions;
}

export interface Invoice {
  id: string;
  issueDate: string;
  dueDate?: string;
  reference: string;
  salesOrder?: string;
  customer: string;
  description: string;
  currency: string;
  invoiceAmount: number;
  balanceDue: number;
  status: string;
  tpin?: string;
  timestamp: string;
  hasWarning?: boolean;
  items?: QuoteItem[];
  billingAddress?: string;
  customTitle?: string;
  options?: DocumentOptions;
}

export interface QuoteItem {
  id: number;
  item: string;
  description: string;
  qty: string;
  unitPrice: string;
  unitCost?: string;
  discount?: string;
  taxCode: string;
  account?: string;
  division?: string;
  total?: string;
  unit?: string;
  landedUnitCost?: number;
  landedTotal?: number;
}

export interface SalesQuote {
  id: string;
  issueDate: string;
  reference: string;
  customer: string;
  description: string;
  currency: string;
  amount: number;
  status: 'Active' | 'Expired' | 'Accepted' | 'Pending Approval' | 'Rejected' | 'Inactive';
  billingAddress?: string;
  expiryDays?: string;
  timestamp?: string;
  items?: QuoteItem[];
  customTitle?: string;
  footer?: string;
  options?: DocumentOptions;
}

export interface SalesOrder {
  id: string;
  orderDate: string;
  reference: string;
  customer: string;
  description: string;
  currency: string;
  amount: number;
  status: string;
  qtyReserved?: number;
  invoiceAmount?: number;
  invoiceStatus?: string;
  timestamp?: string;
  items?: QuoteItem[];
  customTitle?: string;
  footer?: string;
  billingAddress?: string;
  options?: DocumentOptions;
}

export interface DocumentOptions {
  columnLineNumber?: boolean;
  columnDescription?: boolean;
  columnDiscount?: boolean;
  columnDiscountType?: string;
  amountsAreTaxInclusive?: boolean;
  rounding?: boolean;
  roundingType?: string;
  withholdingTax?: boolean;
  withholdingTaxType?: string;
  withholdingTaxValue?: string;
  hideTotalAmount?: boolean;
  showTaxAmount?: boolean;
  customTitle?: boolean;
  customTitleValue?: string;
  footers?: boolean;
  footerValue?: string;
  earlyPaymentDiscount?: boolean;
  earlyPaymentType?: string;
  earlyPaymentValue?: string;
  earlyPaymentDays?: string;
  latePaymentFees?: boolean;
  latePaymentFeePercentage?: string;
  actsAsDeliveryNote?: boolean;
  inventoryLocation?: string;
  alsoActsAsDeliveryNote?: boolean;
  deliveryLocation?: string;
  cancelled?: boolean;
  deliveryDate?: string;
}

export interface ApprovalRequest {
  id: string;
  type: 'Quote' | 'Order';
  customer: string;
  amount: number;
  currency: string;
  requestedBy: string;
  approver: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  reference: string;
  timestamp?: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'Income';
  accountType?: string;
  isPaymentAccount?: boolean;
  code?: string;
}

export interface FinancialSummary {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  profitThisMonth: number;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  division?: string;
  qtyToDeliver?: number;
  uninvoiced?: number;
  accountsReceivable?: number;
  status: 'Paid' | 'Unpaid';
  inactive?: boolean;
  withholdingTax?: number | string;
  tpin?: string;
  salesPerson?: string;
  creditDays?: number;
  balance: number;
  email?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  currency?: string;
  creditLimit?: string;
  documentation?: string;
}
export interface DeliveryNote {
  id: string;
  deliveryDate: string;
  reference: string;
  salesOrder?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  customer: string;
  inventoryLocation?: string;
  description: string;
  deliveryAddress?: string;
  status: 'Pending' | 'Delivered' | 'Cancelled';
  items?: QuoteItem[];
  timestamp?: string;
  customTitle?: string;
  footer?: string;
  footers?: string;
  columnLineNumber?: boolean;
}

export interface Receipt {
  id: string;
  date: string;
  reference: string;
  paidBy: string;
  paidByContact: string;
  paidByOptional?: string;
  receivedIn: string;
  receivedInAccount: string;
  description: string;
  amount: number;
  currency: string;
  items?: QuoteItem[];
  timestamp?: string;
  customTitle?: string;
  footers?: string;
  status: string;
}

export interface Payment {
  id: string;
  date: string;
  reference: string;
  paidToContact: string;
  paidFromAccount: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  createdAt?: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  unitName: string;
  valuationMethod: 'FIFO' | 'WeightedAverage' | 'Manual';
  division?: string;
  qtyOnHand: number;
  qtyReserved?: number;
  qtyDesired?: number;
  avgCost: number;
  totalValue: number;
  reorderLevel?: number;
  category?: string;
  incomeAccount?: string;
  expenseAccount?: string;
  autoFillDescription?: boolean;
  autoFillPurchasePrice?: boolean;
  autoFillSalesPrice?: boolean;
  autoFillDivision?: boolean;
  autoFillTaxCode?: boolean;
  hideItemName?: boolean;
  inactive?: boolean;
  imageUrl?: string;
  palletQty?: number;
  weightKg?: number;
  volumeCbm?: number;
  leadTimeDays?: number;
}

export interface InventoryTransfer {
  id: string;
  date: string;
  reference: string;
  fromLocation: string;
  toLocation: string;
  description: string;
  status: 'Draft' | 'Approved' | 'Posted' | 'Sent' | 'Received';
  items: {
    inventoryItem: string;
    qty: number;
  }[];
  timestamp?: string;
  image?: string;
}

export interface InventoryWriteOff {
  id: string;
  date: string;
  reference: string;
  inventoryItem: string;
  qty: number;
  account: string;
  allocation?: string;
  taxCode?: string;
  division?: string;
  description: string;
  amount?: number;
  timestamp?: string;
  status: 'Draft' | 'Approved' | 'Posted';
}

export interface InventoryLocation {
  id: string;
  name: string;
  description?: string;
  inactive?: boolean;
}

export interface InventoryUnitCost {
  id: string;
  itemId: string;
  itemName: string;
  date: string;
  unitCost: number;
  marginPercent?: number;
  minSellingPrice: number;
  category?: string;
  division: string;
}

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string | UserRole;
  roleId?: string;
  avatar?: string;
}

export interface TaxCode {
  id: string;
  name: string;
  rate: number;
  description?: string;
  inactive?: boolean;
}

export interface WithholdingTax {
  id: string;
  name: string;
  rate: number;
  description?: string;
  inactive?: boolean;
}

export interface ScreenPermission {
  screenId: string;
  screenName?: string;
  view?: boolean;
  add?: boolean;
  edit?: boolean;
  delete?: boolean;
  full?: boolean;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: ScreenPermission[];
}

export interface FooterTemplate {
  id: string;
  name: string;
  content: string;
}


export interface Supplier {
  id: string;
  name: string;
  code: string;
  division?: string;
  accountsPayable?: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  balance: number;
  email?: string;
  billingAddress?: string;
  currency?: string;
  tpin?: string;
  withholdingTax?: number | string;
  inactive?: boolean;
  controlAccount?: string;
  purchaseEnquiries?: number;
  purchaseOrders?: number;
  purchaseInvoices?: number;
  goodsReceipts?: number;
  debitNotes?: number;
}

export interface PurchaseOrder {
  id: string;
  orderDate: string;
  reference: string;
  supplier: string;
  description: string;
  currency: string;
  amount: number;
  status: string;
  timestamp?: string;
  items?: QuoteItem[];
  billingAddress?: string;
  customTitle?: string;
  options?: DocumentOptions;
  docOptions?: DocumentOptions;
}

export interface PurchaseInvoice {
  id: string;
  issueDate: string;
  dueDate?: string;
  reference: string;
  purchaseOrder?: string;
  shipmentIds?: string[];
  supplier: string;
  description: string;
  currency: string;
  invoiceAmount: number;
  balanceDue: number;
  status: string;
  timestamp: string;
  items?: QuoteItem[];
  billingAddress?: string;
  customTitle?: string;
  options?: DocumentOptions;
  docOptions?: DocumentOptions;
  freightCost?: number;
  transportCost?: number;
  handlingCost?: number;
  bankCharges?: number;
  customsDuty?: number;
}

export interface DebitNote {
  id: string;
  issueDate: string;
  reference: string;
  supplierId?: string;
  customerId?: string;
  supplier?: { id: string, name: string };
  customer?: { id: string, name: string };
  description: string;
  currency: string;
  amount: number;
  status: string;
  timestamp?: string;
  items?: QuoteItem[];
}

export interface GoodsReceivedNote {
  id: string;
  receivedDate: string;
  reference: string;
  purchaseOrder?: string;
  shipmentIds?: string[];
  supplier: string;
  inventoryLocation?: string;
  description: string;
  status: 'Pending' | 'Received' | 'Cancelled';
  items?: QuoteItem[];
  timestamp?: string;
}

export interface PurchaseEnquiry {
  id: string;
  issueDate: string;
  reference: string;
  supplier: string;
  description: string;
  currency: string;
  amount: number;
  status: 'Active' | 'Expired' | 'Accepted' | 'Pending Approval' | 'Rejected' | 'Inactive';
  billingAddress?: string;
  expiryDays?: string;
  timestamp?: string;
  items?: PurchaseEnquiryItem[];
  customTitle?: string;
  footer?: string;
  options?: DocumentOptions;
  docOptions?: DocumentOptions;
}

export interface PurchaseEnquiryItem {
  id: string;
  purchaseEnquiryId: string;
  itemId?: string;
  description?: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  taxCode?: string;
  unit?: string;
  division?: string;
  discount?: string;
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  purchaseOrderId: string;
  itemId: string;
  description: string;
  qty: number;
  unitPrice: number;
  landedCost?: number;
  totalAmount: number;
}

export interface Shipment {
  id: string;
  reference: string;
  supplier: string;
  status: 'Planned' | 'In Transit' | 'Arrived' | 'Cleared' | 'Received';
  eta: string;
  vesselName?: string;
  items?: ShipmentItem[];
  timestamp?: string;
  description?: string;
  expectedEta?: string;
  delayDays?: number;
  countryOfOrigin?: string;
  portOfArrival?: string;
  finalDestination?: string;
  invoiceNumber?: string;
  blNumber?: string;
  ctrNo?: string;
  freight?: string;
  truckNumber?: string;
}


export interface PurchasePlan {
  id: string;
  reference: string;
  month: number;
  year: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  createdAt?: string;
  createdBy?: string;
  items?: PurchasePlanItem[];
  approvals?: ApprovalWorkflow[];
  auditLogs?: AuditHistory[];
}

export interface PurchasePlanItem {
  id: string;
  planId: string;
  itemId: string;
  supplierId?: string;
  availableStock: number;
  avgConsumption: number;
  safetyStock: number;
  incomingPos: number;
  projectedDemand: number;
  suggestedQty: number;
  finalOrderQty: number;
  shipmentEta?: string;
  remarks?: string;
  aiRecommendation?: string;
  item?: any;
  supplier?: any;
}

export interface ApprovalWorkflow {
  id: string;
  planId: string;
  level: number;
  roleRequired: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approverId?: string;
  approverName?: string;
  comments?: string;
  actionDate?: string;
  createdAt?: string;
}

export interface AuditHistory {
  id: string;
  planId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  createdAt?: string;
}
