import React, { useState } from 'react'; // Triggering rebuild
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Import Layout
import Layout from './components/shared/Layout';

// Import all views
import ViewSalesQuoteView from './views/ViewSalesQuoteView';
import NewSalesOrderView from './views/NewSalesOrderView';
import NewSalesInvoiceView from './views/NewSalesInvoiceView';
import NewDeliveryNoteView from './views/NewDeliveryNoteView';
import NewCreditNoteView from './views/NewCreditNoteView';
import CreditNotesView from './views/CreditNotesView';
import EditCreditNoteColumnsView from './views/EditCreditNoteColumnsView';
import ViewCreditNoteView from './views/ViewCreditNoteView';
import ViewDebitNoteView from './views/ViewDebitNoteView';
import NewPurchaseInvoiceView from './views/NewPurchaseInvoiceView';
import ViewPurchaseInvoiceView from './views/ViewPurchaseInvoiceView';
import NewPurchaseOrderView from './views/NewPurchaseOrderView';
import ViewPurchaseOrderView from './views/ViewPurchaseOrderView';
import NewGoodsReceiptView from './views/NewGoodsReceiptView';
import ViewGoodsReceiptView from './views/ViewGoodsReceiptView';
import EditGoodsReceivedNoteColumnsView from './views/EditGoodsReceivedNoteColumnsView';
import NewDebitNoteView from './views/NewDebitNoteView';
import EditSalesQuoteView from './views/EditSalesQuoteView';
import EditColumnsView from './views/EditColumnsView';
import EditInvoiceColumnsView from './views/EditInvoiceColumnsView';
import SalesQuotesView from './views/SalesQuotesView';
import AccountsView from './views/AccountsView';
import SummaryView from './views/SummaryView';
import BankAccountsView from './views/BankAccountsView';
import ViewBankAccountView from './views/ViewBankAccountView';
import InvoicesView from './views/InvoicesView';
import InvoiceFormDefaultsView from './views/InvoiceFormDefaultsView';
import BatchPrintView from './views/BatchPrintView';
import SalesHistoryView from './views/SalesHistoryView';
import ApprovalsView from './views/ApprovalsView';
import SalesOrdersView from './views/SalesOrdersView';
import CustomersView from './views/CustomersView';
import NewCustomerView from './views/NewCustomerView';
import EditCustomerView from './views/EditCustomerView';
import EditCustomerColumnsView from './views/EditCustomerColumnsView';
import ViewCustomerView from './views/ViewCustomerView';
import ViewSalesInvoiceView from './views/ViewSalesInvoiceView';
import DeliveryNotesView from './views/DeliveryNotesView';
import EditDeliveryNoteColumnsView from './views/EditDeliveryNoteColumnsView';
import DeliveryNoteFormDefaultsView from './views/DeliveryNoteFormDefaultsView';
import ViewSalesOrderView from './views/ViewSalesOrderView';
import ViewDeliveryNoteView from './views/ViewDeliveryNoteView';
import EditSalesOrderColumnsView from './views/EditSalesOrderColumnsView';
import ReceiptsView from './views/ReceiptsView';
import NewReceiptView from './views/NewReceiptView';
import ViewReceiptView from './views/ViewReceiptView';
import NewAccountView from './views/NewAccountView';
import NewBankAccountView from './views/NewBankAccountView';
import ViewAccountView from './views/ViewAccountView';
import EditBankAccountView from './views/EditBankAccountView';
import EditBankAccountColumnsView from './views/EditBankAccountColumnsView';
import QtyToDeliverView from './views/QtyToDeliverView';
import InventoryItemTransactionsView from './views/InventoryItemTransactionsView';
import CustomerTransactionsView from './views/CustomerTransactionsView';
import CustomerCostOfSalesView from './views/CustomerCostOfSalesView';
import InvoiceCostOfSalesView from './views/InvoiceCostOfSalesView';
import InvoiceTransactionsView from './views/InvoiceTransactionsView';
import SalesDashboard from './views/SalesDashboard';
import ReportsView from './views/ReportsView';
import AgedReceivablesView from './views/AgedReceivablesView';
import NewAgedReceivableReportView from './views/NewAgedReceivableReportView';
import ViewAgedReceivableReportView from './views/ViewAgedReceivableReportView';
import CustomerSummaryView from './views/CustomerSummaryView';
import NewCustomerSummaryView from './views/NewCustomerSummaryView';
import ViewCustomerSummaryView from './views/ViewCustomerSummaryView';
import CustomerUnpaidInvoicesView from './views/CustomerUnpaidInvoicesView';
import InventoryItemLedgerView from './views/InventoryItemLedgerView';
import InventoryItemAllocationsView from './views/InventoryItemAllocationsView';
import NewCustomerUnpaidInvoicesView from './views/NewCustomerUnpaidInvoicesView';
import ViewCustomerUnpaidInvoicesView from './views/ViewCustomerUnpaidInvoicesView';
import CustomerTransactionsReportView from './views/CustomerTransactionsReportView';
import NewCustomerTransactionsReportView from './views/NewCustomerTransactionsReportView';
import ViewCustomerTransactionsReportView from './views/ViewCustomerTransactionsReportView';
import SalesInvoiceTotalsByCustomerView from './views/SalesInvoiceTotalsByCustomerView';
import NewSalesInvoiceTotalsByCustomerReportView from './views/NewSalesInvoiceTotalsByCustomerReportView';
import ViewSalesInvoiceTotalsByCustomerReportView from './views/ViewSalesInvoiceTotalsByCustomerReportView';
import SalesInvoiceTotalsByItemView from './views/SalesInvoiceTotalsByItemView';
import NewSalesInvoiceTotalsByItemReportView from './views/NewSalesInvoiceTotalsByItemReportView';
import ViewSalesInvoiceTotalsByItemReportView from './views/ViewSalesInvoiceTotalsByItemReportView';

// Payments Imports
import PaymentsView from './views/PaymentsView';
import NewPaymentView from './views/NewPaymentView';
import ViewPaymentView from './views/ViewPaymentView';

// Inter Account Transfers Imports
import InterAccountTransfersView from './views/InterAccountTransfersView';
import NewInterAccountTransferView from './views/NewInterAccountTransferView';
import ViewInterAccountTransferView from './views/ViewInterAccountTransferView';

// Expense Claims Imports
import ExpenseClaimsView from './views/ExpenseClaimsView';
import NewExpenseClaimView from './views/NewExpenseClaimView';
import ExpenseClaimPayersView from './views/ExpenseClaimPayersView';

// Purchase Imports
import SuppliersView from './views/SuppliersView';
import PurchaseHistoryView from './views/PurchaseHistoryView';
import PurchaseOrdersView from './views/PurchaseOrdersView';
import PurchaseInvoicesView from './views/PurchaseInvoicesView';
import GoodsReceivedNotesView from './views/GoodsReceivedNotesView';
import DebitNotesView from './views/DebitNotesView';
import PurchaseQuotesView from './views/PurchaseQuotesView';
import EditPurchaseQuoteView from './views/EditPurchaseQuoteView';
import ViewPurchaseQuoteView from './views/ViewPurchaseQuoteView';
import EditPurchaseQuoteColumnsView from './views/EditPurchaseQuoteColumnsView';
import EditPurchaseOrderColumnsView from './views/EditPurchaseOrderColumnsView';
import EditPurchaseInvoiceColumnsView from './views/EditPurchaseInvoiceColumnsView';
import CostingReportView from './views/procurement/CostingReportView';
import SupplierLeadTimeMasterView from './views/procurement/SupplierLeadTimeMasterView';
import ConsumptionDashboardView from './views/procurement/ConsumptionDashboardView';
import ProcurementAnalyticsView from './views/procurement/ProcurementAnalyticsView';
import EnquiryQuotesComparisonView from './views/procurement/EnquiryQuotesComparisonView';
import IncomingShipmentsView from './views/procurement/IncomingShipmentsView';
import PurchasePlanningView from './views/procurement/PurchasePlanningView';
import SupplierCatalogSetupView from './views/procurement/SupplierCatalogSetupView';
import ShipmentPlannerView from './views/ShipmentPlannerView';
import NewShipmentView from './views/NewShipmentView';

// Inventory Imports
import InventoryItemsView from './views/InventoryItemsView';
import UnitsView from './views/UnitsView';
import ItemCategoriesView from './views/ItemCategoriesView';
import NewInventoryItemView from './views/NewInventoryItemView';
import ViewInventoryItemView from './views/ViewInventoryItemView';
import InventoryTransfersView from './views/InventoryTransfersView';
import NewInventoryTransferView from './views/NewInventoryTransferView';
import ViewInventoryTransferView from './views/ViewInventoryTransferView';
import InventoryWriteOffsView from './views/InventoryWriteOffsView';
import NewInventoryWriteOffView from './views/NewInventoryWriteOffView';
import ViewInventoryWriteOffView from './views/ViewInventoryWriteOffView';
import InventoryLocationsView from './views/InventoryLocationsView';
import NewInventoryLocationView from './views/NewInventoryLocationView';
import InventoryUnitCostsView from './views/InventoryUnitCostsView';
import NewInventoryUnitCostView from './views/NewInventoryUnitCostView';
import UserPermissionsView from './views/UserPermissionsView';
import TaxCodesView from './views/TaxCodesView';
import WithholdingTaxView from './views/WithholdingTaxView';
import RoleManagementView from './views/RoleManagementView';
import SettingsView from './views/SettingsView';
import SettingsFootersView from './views/SettingsFootersView';
import DivisionsView from './views/DivisionsView';
import EditSupplierColumnsView from './views/EditSupplierColumnsView';
import NewSupplierView from './views/NewSupplierView';
import EditSupplierView from './views/EditSupplierView';
import ViewSupplierView from './views/ViewSupplierView';
import SettingsCurrenciesView from './views/SettingsCurrenciesView';
import ExchangeRatesView from './views/ExchangeRatesView';
import LinkedTransactionsView from './views/LinkedTransactionsView';
import UnrealizedFxGainsView from './views/UnrealizedFxGainsView';
import IncomeItemsView from './views/master/IncomeItemsView';
import ExpenseItemsView from './views/master/ExpenseItemsView';



import LoginView from './views/LoginView';
import { Navigate } from 'react-router-dom';

// Not Found Component
const NotFound = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-text-secondary mb-6">Page not found</p>
      <a href="/" className="text-primary hover:underline">Return to Home</a>
    </div>
  </div>
);

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};


const App = () => {

  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginView />} />

        {/* Main Layout Route with Nested Routes */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          {/* Dashboard Routes */}
          <Route path="/" element={<SummaryView />} />
          <Route path="/summary" element={<SummaryView />} />
          <Route path="/sales-dashboard" element={<SalesDashboard />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/reports/unrealized-fx" element={<UnrealizedFxGainsView />} />
          <Route path="/reports/aged-receivables" element={<AgedReceivablesView />} />
          <Route path="/reports/aged-receivables/new" element={<NewAgedReceivableReportView />} />
          <Route path="/reports/aged-receivables/edit/:id" element={<NewAgedReceivableReportView />} />
          <Route path="/reports/aged-receivables/view/:id" element={<ViewAgedReceivableReportView />} />

          <Route path="/reports/customer-summary" element={<CustomerSummaryView />} />
          <Route path="/reports/customer-summary/new" element={<NewCustomerSummaryView />} />
          <Route path="/reports/customer-summary/edit/:id" element={<NewCustomerSummaryView />} />
          <Route path="/reports/customer-summary/view/:id" element={<ViewCustomerSummaryView />} />

          <Route path="/reports/unpaid-invoices" element={<CustomerUnpaidInvoicesView />} />
          <Route path="/reports/unpaid-invoices/new" element={<NewCustomerUnpaidInvoicesView />} />
          <Route path="/reports/unpaid-invoices/edit/:id" element={<NewCustomerUnpaidInvoicesView />} />
          <Route path="/reports/unpaid-invoices/view/:id" element={<ViewCustomerUnpaidInvoicesView />} />

          <Route path="/reports/customer-transactions" element={<CustomerTransactionsReportView />} />
          <Route path="/reports/customer-transactions/new" element={<NewCustomerTransactionsReportView />} />
          <Route path="/reports/customer-transactions/edit/:id" element={<NewCustomerTransactionsReportView />} />
          <Route path="/reports/customer-transactions/view/:id" element={<ViewCustomerTransactionsReportView />} />

          <Route path="/reports/sales-invoice-totals-by-customer" element={<SalesInvoiceTotalsByCustomerView />} />
          <Route path="/reports/sales-invoice-totals-by-customer/new" element={<NewSalesInvoiceTotalsByCustomerReportView />} />
          <Route path="/reports/sales-invoice-totals-by-customer/edit/:id" element={<NewSalesInvoiceTotalsByCustomerReportView />} />
          <Route path="/reports/sales-invoice-totals-by-customer/view/:id" element={<ViewSalesInvoiceTotalsByCustomerReportView />} />

          <Route path="/reports/sales-invoice-totals-by-item" element={<SalesInvoiceTotalsByItemView />} />
          <Route path="/reports/sales-invoice-totals-by-item/new" element={<NewSalesInvoiceTotalsByItemReportView />} />
          <Route path="/reports/sales-invoice-totals-by-item/edit/:id" element={<NewSalesInvoiceTotalsByItemReportView />} />
          <Route path="/reports/sales-invoice-totals-by-item/view/:id" element={<ViewSalesInvoiceTotalsByItemReportView />} />

          {/* Settings Route */}
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/settings/inventory-locations" element={<InventoryLocationsView />} />
          <Route path="/settings/inventory-locations/new" element={<NewInventoryLocationView />} />
          <Route path="/settings/inventory-locations/edit/:id" element={<NewInventoryLocationView />} />
          <Route path="/settings/inventory-unit-costs" element={<InventoryUnitCostsView />} />
          <Route path="/settings/inventory-unit-costs/new" element={<NewInventoryUnitCostView />} />
          <Route path="/settings/inventory-unit-costs/edit/:id" element={<NewInventoryUnitCostView />} />
          <Route path="/settings/user-permissions" element={<UserPermissionsView />} />
          <Route path="/settings/tax-codes" element={<TaxCodesView />} />
          <Route path="/settings/withholding-taxes" element={<WithholdingTaxView />} />
          <Route path="/settings/role-management" element={<RoleManagementView />} />
          <Route path="/settings/footers" element={<SettingsFootersView />} />
          <Route path="/settings/divisions" element={<DivisionsView />} />
          <Route path="/settings/currencies" element={<SettingsCurrenciesView />} />
          <Route path="/settings/exchange-rates" element={<ExchangeRatesView />} />
          <Route path="/settings/exchange-rates/:id/transactions" element={<LinkedTransactionsView />} />

          {/* Inventory Routes */}
          <Route path="/inventory-items" element={<InventoryItemsView />} />
          <Route path="/inventory-items/new" element={<NewInventoryItemView />} />
          <Route path="/inventory-items/edit/:id" element={<NewInventoryItemView />} />
          <Route path="/inventory-items/view/:id" element={<ViewInventoryItemView />} />
          <Route path="/inventory-items/transactions/:id" element={<InventoryItemLedgerView />} />
          <Route path="/inventory-items/locations/:id" element={<InventoryItemAllocationsView />} />

          <Route path="/inventory-transfers" element={<InventoryTransfersView />} />
          <Route path="/inventory-transfers/new" element={<NewInventoryTransferView />} />
          <Route path="/inventory-transfers/edit/:id" element={<NewInventoryTransferView />} />
          <Route path="/inventory-transfers/view/:id" element={<ViewInventoryTransferView />} />

          <Route path="/inventory-write-offs" element={<InventoryWriteOffsView />} />
          <Route path="/inventory-write-offs/new" element={<NewInventoryWriteOffView />} />
          <Route path="/inventory-write-offs/edit/:id" element={<NewInventoryWriteOffView />} />
          <Route path="/inventory-write-offs/view/:id" element={<ViewInventoryWriteOffView />} />

          {/* Master Data Routes */}
          <Route path="/accounts" element={<AccountsView />} />
          <Route path="/accounts/new" element={<NewAccountView />} />
          <Route path="/accounts/edit/:id" element={<NewAccountView />} />
          <Route path="/accounts/view/:id" element={<ViewAccountView />} />
          <Route path="/master/units" element={<UnitsView />} />
          <Route path="/master/income-items" element={<IncomeItemsView />} />
          <Route path="/master/expense-items" element={<ExpenseItemsView />} />
          <Route path="/master/categories" element={<ItemCategoriesView />} />

          {/* Bank & Cash Routes */}
          <Route path="/account" element={<BankAccountsView />} />
          <Route path="/account/new" element={<NewBankAccountView />} />
          <Route path="/account/view/:id" element={<ViewBankAccountView />} />
          <Route path="/account/edit/:id" element={<EditBankAccountView />} />
          <Route path="/account/edit-columns" element={<EditBankAccountColumnsView />} />

          {/* Customer Routes */}
          <Route path="/customers" element={<CustomersView />} />
          <Route path="/customers/new" element={<NewCustomerView />} />
          <Route path="/customers/edit/:id" element={<EditCustomerView />} />
          <Route path="/customers/view/:id" element={<ViewCustomerView />} />
          <Route path="/customers/qty-to-deliver/:id" element={<QtyToDeliverView />} />
          <Route path="/customers/qty-to-deliver/:id/transactions" element={<InventoryItemTransactionsView />} />
          <Route path="/customers/transactions/:id" element={<CustomerTransactionsView />} />
          <Route path="/customers/cost-of-sales/:id" element={<CustomerCostOfSalesView />} />
          <Route path="/customers/edit-columns" element={<EditCustomerColumnsView />} />

          {/* Sales Quotes Routes */}
          <Route path="/sales-quotes" element={<SalesQuotesView />} />
          <Route path="/sales-quotes/customer/:customerName" element={<SalesQuotesView />} />
          <Route path="/sales-quotes/new" element={<EditSalesQuoteView />} />
          <Route path="/sales-quotes/edit/:id" element={<EditSalesQuoteView />} />
          <Route path="/sales-quotes/view/:id" element={<ViewSalesQuoteView />} />

          <Route path="/sales-quotes/edit-columns" element={<EditColumnsView />} />

          {/* Sales Orders Routes */}
          <Route path="/sales-orders" element={<SalesOrdersView />} />
          <Route path="/sales-orders/customer/:customerName" element={<SalesOrdersView />} />
          <Route path="/sales-orders/new" element={<NewSalesOrderView />} />
          <Route path="/sales-orders/edit/:id" element={<NewSalesOrderView />} />
          <Route path="/sales-orders/view/:id" element={<ViewSalesOrderView />} />
          <Route path="/sales-orders/edit-columns" element={<EditSalesOrderColumnsView />} />

          {/* Sales Invoices Routes */}
          <Route path="/sales-invoices" element={<InvoicesView />} />
          <Route path="/sales-invoices/customer/:customerName" element={<InvoicesView />} />
          <Route path="/sales-invoices/new" element={<NewSalesInvoiceView />} />
          <Route path="/sales-invoices/edit/:id" element={<NewSalesInvoiceView />} />
          <Route path="/sales-invoices/view/:id" element={<ViewSalesInvoiceView />} />
          <Route path="/sales-invoices/transactions/:id" element={<InvoiceTransactionsView />} />
          <Route path="/sales-invoices/cost-of-sales/:id" element={<InvoiceCostOfSalesView />} />
          <Route path="/sales-invoices/edit-columns" element={<EditInvoiceColumnsView />} />
          <Route path="/sales-invoices/form-defaults" element={<InvoiceFormDefaultsView />} />


          {/* Delivery Notes Routes */}
          <Route path="/delivery-notes" element={<DeliveryNotesView />} />
          <Route path="/delivery-notes/customer/:customerName" element={<DeliveryNotesView />} />
          <Route path="/delivery-notes/new" element={<NewDeliveryNoteView />} />
          <Route path="/delivery-notes/edit/:id" element={<NewDeliveryNoteView />} />
          <Route path="/delivery-notes/view/:id" element={<ViewDeliveryNoteView />} />
          <Route path="/delivery-notes/edit-columns" element={<EditDeliveryNoteColumnsView />} />
          <Route path="/delivery-notes/form-defaults" element={<DeliveryNoteFormDefaultsView />} />

          {/* Credit Notes Routes */}
          <Route path="/credit-notes" element={<CreditNotesView />} />
          <Route path="/credit-notes/customer/:customerName" element={<CreditNotesView />} />
          <Route path="/credit-notes/new" element={<NewCreditNoteView />} />
          <Route path="/credit-notes/edit/:id" element={<NewCreditNoteView />} />
          <Route path="/credit-notes/view/:id" element={<ViewCreditNoteView />} />
          <Route path="/credit-notes/edit-columns" element={<EditCreditNoteColumnsView />} />

          {/* Supplier Routes */}
          <Route path="/suppliers" element={<SuppliersView />} />
          <Route path="/suppliers/new" element={<NewSupplierView />} />
          <Route path="/suppliers/edit/:id" element={<EditSupplierView />} />
          <Route path="/suppliers/view/:id" element={<ViewSupplierView />} />
          <Route path="/suppliers/edit-columns" element={<EditSupplierColumnsView />} />

          {/* Purchase History Routes */}
          <Route path="/purchase-history" element={<PurchaseHistoryView />} />
          <Route path="/purchase-history/supplier/:supplierName" element={<PurchaseHistoryView />} />

          {/* Purchase Quotes Routes */}
          <Route path="/purchase-quotes" element={<PurchaseQuotesView />} />
          <Route path="/purchase-quotes/supplier/:supplierName" element={<PurchaseQuotesView />} />
          <Route path="/purchase-quotes/new" element={<EditPurchaseQuoteView />} />
          <Route path="/purchase-quotes/edit/:id" element={<EditPurchaseQuoteView />} />
          <Route path="/purchase-quotes/view/:id" element={<ViewPurchaseQuoteView />} />
          <Route path="/purchase-quotes/edit-columns" element={<EditPurchaseQuoteColumnsView />} />

          <Route path="/purchase-orders" element={<PurchaseOrdersView />} />
          <Route path="/purchase-orders/supplier/:supplierName" element={<PurchaseOrdersView />} />
          <Route path="/purchase-orders/new" element={<NewPurchaseOrderView />} />
          <Route path="/purchase-orders/edit/:id" element={<NewPurchaseOrderView />} />
          <Route path="/purchase-orders/view/:id" element={<ViewPurchaseOrderView />} />
          <Route path="/purchase-orders/edit-columns" element={<EditPurchaseOrderColumnsView />} />
          <Route path="/purchase/lead-time-master" element={<SupplierLeadTimeMasterView />} />
          <Route path="/purchase/costing-reports" element={<CostingReportView />} />
          <Route path="/purchase/consumption" element={<ConsumptionDashboardView />} />
          <Route path="/purchase/analytics" element={<ProcurementAnalyticsView />} />
          <Route path="/purchase/quote-analysis" element={<EnquiryQuotesComparisonView />} />
          <Route path="/purchase/incoming-shipments" element={<IncomingShipmentsView />} />
          <Route path="/purchase/planning" element={<PurchasePlanningView />} />
          <Route path="/purchase/supplier-catalog" element={<SupplierCatalogSetupView />} />
          <Route path="/shipment-planner" element={<ShipmentPlannerView />} />
          <Route path="/shipment-planner/new" element={<NewShipmentView />} />
          <Route path="/shipment-planner/edit/:id" element={<NewShipmentView />} />
          <Route path="/shipment-planner/view/:id" element={<NewShipmentView />} />

          {/* Purchase Invoices Routes */}
          <Route path="/purchase-invoices" element={<PurchaseInvoicesView />} />
          <Route path="/purchase-invoices/supplier/:supplierName" element={<PurchaseInvoicesView />} />
          <Route path="/purchase-invoices/new" element={<NewPurchaseInvoiceView />} />
          <Route path="/purchase-invoices/edit/:id" element={<NewPurchaseInvoiceView />} />
          <Route path="/purchase-invoices/view/:id" element={<ViewPurchaseInvoiceView />} />
          <Route path="/purchase-invoices/columns" element={<EditPurchaseInvoiceColumnsView />} />

          {/* Goods Received Notes Routes */}
          <Route path="/goods-received-notes" element={<GoodsReceivedNotesView />} />
          <Route path="/goods-received-notes/supplier/:supplierName" element={<GoodsReceivedNotesView />} />
          <Route path="/goods-receipts/new" element={<NewGoodsReceiptView />} />
          <Route path="/goods-received-notes/new" element={<NewGoodsReceiptView />} />
          <Route path="/goods-received-notes/edit/:id" element={<NewGoodsReceiptView />} />
          <Route path="/goods-received-notes/view/:id" element={<ViewGoodsReceiptView />} />
          <Route path="/goods-received-notes/edit-columns" element={<EditGoodsReceivedNoteColumnsView />} />

          {/* Debit Notes Routes */}
          <Route path="/debit-notes" element={<DebitNotesView />} />
          <Route path="/debit-notes/supplier/:supplierName" element={<DebitNotesView />} />
          <Route path="/debit-notes/new" element={<NewDebitNoteView />} />
          <Route path="/debit-notes/view/:id" element={<ViewDebitNoteView />} />

          {/* Receipts Routes */}
          <Route path="/receipts" element={<ReceiptsView />} />
          <Route path="/receipts/customer/:customerName" element={<ReceiptsView />} />
          <Route path="/receipts/new" element={<NewReceiptView />} />
          <Route path="/receipts/view/:id" element={<ViewReceiptView />} />
          <Route path="/receipts/edit/:id" element={<NewReceiptView />} />

          {/* Payments Routes */}
          <Route path="/payments" element={<PaymentsView />} />
          <Route path="/payments/new" element={<NewPaymentView />} />
          <Route path="/payments/view/:id" element={<ViewPaymentView />} />
          <Route path="/payments/edit/:id" element={<NewPaymentView />} />

          {/* Inter Account Transfers Routes */}
          <Route path="/inter-account-transfers" element={<InterAccountTransfersView />} />
          <Route path="/inter-account-transfers/new" element={<NewInterAccountTransferView />} />
          <Route path="/inter-account-transfers/view/:id" element={<ViewInterAccountTransferView />} />
          <Route path="/inter-account-transfers/edit/:id" element={<NewInterAccountTransferView />} />

          {/* Expense Claims Routes */}
          <Route path="/expense-claims" element={<ExpenseClaimsView />} />
          <Route path="/expense-claims/new" element={<NewExpenseClaimView />} />
          <Route path="/expense-claims/edit/:id" element={<NewExpenseClaimView />} />
          <Route path="/expense-claim-payers" element={<ExpenseClaimPayersView />} />

          {/* Approvals Routes */}
          <Route path="/approvals" element={<ApprovalsView />} />

          {/* Sales History Routes */}
          <Route path="/sales-history" element={<SalesHistoryView />} />

          {/* Print Batch Routes */}
          <Route path="/:type/print-batch" element={<BatchPrintView />} />

        </Route>

        {/* 404 Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
