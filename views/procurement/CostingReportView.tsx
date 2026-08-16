import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator, Ship, Truck, FileText, DollarSign, Percent, TrendingUp,
  Package, Anchor, Container, Search, ChevronDown, BarChart3, Landmark,
  ShieldCheck, Banknote, Scale, Receipt, Globe, ArrowRight, Save, Download,
  CheckCircle2, Loader2
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { exportToPDF } from '../../utils/exportUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpenseInputs {
  totalFob: number;
  fobCharge: number;
  freight: number;
  insurance: number;
  roadTransport: number;
  clearingAgent: number;
  duty: number;
  zabs: number;
  overweight: number;
  bankCharges: number;
  exchangeRate: number;
}

interface LogisticsInputs {
  inv: string;
  bl: string;
  cont: string;
  tpt: string;
  truck: string;
}

interface POItem {
  id: string;
  itemId: string;
  description?: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  item?: {
    itemCode: string;
    itemName: string;
  };
}

interface PurchaseOrder {
  id: string;
  reference: string;
  supplier?: { name: string };
  items: POItem[];
  amount?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const InputField = ({
  label, icon: Icon, value, onChange, prefix, suffix, disabled, placeholder, type = 'number'
}: {
  label: string;
  icon?: any;
  value: string | number;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5">
      {Icon && <Icon size={10} />}
      {label}
    </label>
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-[10px] font-black text-slate-400 pointer-events-none">{prefix}</span>
      )}
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || '0.00'}
        className={`w-full ${prefix ? 'pl-10' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {suffix && (
        <span className="absolute right-3 text-[10px] font-black text-slate-400 pointer-events-none">{suffix}</span>
      )}
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const CostingReportView = () => {
  // Logistics state
  const [logistics, setLogistics] = useState<LogisticsInputs>({
    inv: '', bl: '', cont: '', tpt: '', truck: ''
  });

  // Expense state
  const [expenses, setExpenses] = useState<ExpenseInputs>({
    totalFob: 0, fobCharge: 0, freight: 0, insurance: 0,
    roadTransport: 0, clearingAgent: 0, duty: 0,
    zabs: 0, overweight: 0, bankCharges: 0, exchangeRate: 1
  });

  // Bank charges auto-calculate toggle
  const [autoBankCharges, setAutoBankCharges] = useState(true);

  // Save / Export state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // PO / Shipment selection
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentDropdownOpen, setShipmentDropdownOpen] = useState(false);
  const [loadingShipments, setLoadingShipments] = useState(false);

  // System Exchange Rate
  const [systemExchangeRate, setSystemExchangeRate] = useState<number>(1);
  const [systemCurrency, setSystemCurrency] = useState<string>('USD');

  // User Role Check
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isAdmin = currentUser.role === 'Admin';

  // ─── Load Shipments & Settings ───────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoadingShipments(true);
      try {
        const [data, rates] = await Promise.all([
          apiService.getProcurementShipments(),
          apiService.getExchangeRates().catch(() => [])
        ]);
        setShipments((data || []).filter((s: any) => s.status !== 'Completed'));
        if (rates && rates.length > 0) {
          setSystemExchangeRate(Number(rates[0].rate) || 1);
          setSystemCurrency(rates[0].currencyCode || 'USD');
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingShipments(false);
      }
    };
    load();
  }, []);

  // ─── Auto-calculate bank charges at 1.5% ───────────────────────────────

  useEffect(() => {
    if (autoBankCharges) {
      const base = expenses.totalFob + expenses.fobCharge + expenses.freight +
        expenses.insurance + expenses.duty;
      const bankChg = base * 0.015;
      setExpenses(prev => ({ ...prev, bankCharges: Math.round(bankChg * 100) / 100 }));
    }
  }, [
    autoBankCharges, expenses.totalFob, expenses.fobCharge,
    expenses.freight, expenses.insurance, expenses.duty
  ]);

  // ─── Derived calculations ──────────────────────────────────────────────

  const totalExpenses = useMemo(() => {
    return expenses.fobCharge + expenses.freight + expenses.insurance +
      expenses.roadTransport + expenses.clearingAgent + expenses.duty +
      expenses.zabs + expenses.overweight + expenses.bankCharges;
  }, [expenses]);

  const expenseRatio = useMemo(() => {
    return expenses.totalFob > 0 ? (totalExpenses / expenses.totalFob) * 100 : 0;
  }, [totalExpenses, expenses.totalFob]);

  const grandTotal = useMemo(() => {
    return expenses.totalFob + totalExpenses;
  }, [expenses.totalFob, totalExpenses]);

  // ─── Selected Shipment Items + Allocation ────────────────────────────────────

  const selectedShipment = useMemo(() => {
    return shipments.find(s => s.id === selectedShipmentId);
  }, [shipments, selectedShipmentId]);

  const shipmentCurrency = selectedShipment?.supplier?.currency || 'USD';

  const allocatedItems = useMemo(() => {
    if (!selectedShipment || !selectedShipment.items) return [];
    const ratio = expenseRatio / 100;

    const grouped = new Map<string, any>();
    const ungrouped: any[] = [];

    selectedShipment.items.forEach((item: any) => {
      const unitFob = Number(item.unitPrice) || 0;
      const qty = Number(item.qty) || 0;
      const lineFob = unitFob * qty;
      const itemId = item.item?.id || item.itemId;

      if (itemId) {
        if (!grouped.has(itemId)) {
          grouped.set(itemId, {
            id: item.id,
            itemId: itemId,
            itemCode: item.item?.itemCode || itemId || '—',
            itemName: item.description || item.item?.description || item.item?.itemName || '—',
            qty,
            lineFob,
            poReference: item.poReference || ''
          });
        } else {
          const existing = grouped.get(itemId);
          existing.qty += qty;
          existing.lineFob += lineFob;
          if (item.poReference && !existing.poReference.includes(item.poReference)) {
            existing.poReference = existing.poReference ? `${existing.poReference}, ${item.poReference}` : item.poReference;
          }
        }
      } else {
        ungrouped.push({
          id: item.id,
          itemId: '',
          itemCode: '—',
          itemName: item.description || '—',
          qty,
          lineFob,
          poReference: item.poReference || ''
        });
      }
    });

    const combined = [...Array.from(grouped.values()), ...ungrouped];

    return combined.map(item => {
      const unitFob = item.qty > 0 ? item.lineFob / item.qty : 0;
      const allocatedOverhead = item.lineFob * ratio;
      const landedTotal = item.lineFob + allocatedOverhead;
      const landedPerUnit = item.qty > 0 ? landedTotal / item.qty : 0;

      return {
        ...item,
        unitFob,
        allocatedOverhead,
        landedTotal,
        landedPerUnit
      };
    });
  }, [selectedShipment, expenseRatio]);

  // ─── Auto-fill Total FOB and Logistics from Shipment ──────────────────────────────────────

  const handleSelectShipment = useCallback((shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setShipmentDropdownOpen(false);
    setShipmentSearch('');

    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      const total = shipment.items?.reduce((sum: number, item: any) =>
        sum + (Number(item.unitPrice) * Number(item.qty)), 0
      ) || 0;
      setExpenses({ 
        totalFob: Math.round(total * 100) / 100,
        fobCharge: Number(shipment.fobCharge) || 0,
        freight: Number(shipment.freightCharge) || 0,
        insurance: Number(shipment.insurance) || 0,
        roadTransport: Number(shipment.roadTransport) || 0,
        clearingAgent: Number(shipment.clearingAgent) || 0,
        duty: Number(shipment.duty) || 0,
        zabs: Number(shipment.zabs) || 0,
        overweight: Number(shipment.overweight) || 0,
        bankCharges: Number(shipment.bankCharges) || 0,
        exchangeRate: Number(shipment.exchangeRate) || 1
      });
      
      setLogistics({
        inv: shipment.invoiceNumber || '',
        bl: shipment.blNumber || '',
        cont: shipment.ctrNo || '',
        tpt: shipment.freight || '',
        truck: shipment.truckNumber || ''
      });
    }
  }, [shipments]);

  // ─── Expense field updater ─────────────────────────────────────────────

  const updateExpense = useCallback((field: keyof ExpenseInputs, value: string) => {
    const num = parseFloat(value) || 0;
    if (field === 'bankCharges') {
      setAutoBankCharges(false);
    }
    setExpenses(prev => ({ ...prev, [field]: num }));
  }, []);

  // Filtered Shipments for search
  const filteredShipments = useMemo(() => {
    if (!shipmentSearch) return shipments;
    const q = shipmentSearch.toLowerCase();
    return shipments.filter(s =>
      s.reference?.toLowerCase().includes(q) ||
      s.supplier?.name?.toLowerCase().includes(q) ||
      s.supplier?.toLowerCase().includes(q)
    );
  }, [shipments, shipmentSearch]);

  // ─── Save Landed Costs ─────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (allocatedItems.length === 0 || !selectedShipment) {
      alert('Select a Shipment and ensure items are allocated before saving.');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    try {
      const items = allocatedItems.map((item: any) => {
        return {
          itemId: item.itemId || '',
          poLineId: item.id,
          receivedQty: item.qty,
          purchaseCost: item.lineFob,
          freightAllocation: expenses.freight > 0 ? (item.lineFob / expenses.totalFob) * expenses.freight : 0,
          customsAllocation: expenses.duty > 0 ? (item.lineFob / expenses.totalFob) * expenses.duty : 0,
          otherCharges: item.allocatedOverhead - ((item.lineFob / expenses.totalFob) * expenses.freight) - ((item.lineFob / expenses.totalFob) * expenses.duty),
          landedCost: item.landedTotal,
          costPerUnit: item.landedPerUnit
        };
      }).filter((i: any) => i.itemId);

      await apiService.saveLandedCosts(selectedShipment.id, expenses, items);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save landed costs:', err);
      alert('Failed to save landed costs. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [allocatedItems, selectedShipment, expenses]);

  // ─── Export to Excel (CSV) ─────────────────────────────────────────────

  const handleExportExcel = useCallback(() => {
    if (allocatedItems.length === 0) {
      alert('No items to export. Select a Purchase Order first.');
      return;
    }

    const poRef = selectedShipment?.reference || 'LandedCost';
    const headers = [
      'Item Code', 'Description', `Unit FOB (${shipmentCurrency})`, 'Qty',
      `Line FOB (${shipmentCurrency})`, `Overhead Allocation (${shipmentCurrency})`, `Landed Total (${shipmentCurrency})`, `Landed Cost / Unit (${shipmentCurrency})`
    ];

    const rows = allocatedItems.map(item => [
      item.itemCode,
      `"${item.itemName.replace(/"/g, '""')}"`,
      item.unitFob.toFixed(2),
      item.qty,
      item.lineFob.toFixed(2),
      item.allocatedOverhead.toFixed(2),
      item.landedTotal.toFixed(2),
      item.landedPerUnit.toFixed(2)
    ]);

    // Add summary rows
    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Total FOB', '', expenses.totalFob.toFixed(2)]);
    rows.push(['Total Expenses', '', totalExpenses.toFixed(2)]);
    rows.push(['Expense Ratio %', '', expenseRatio.toFixed(2) + '%']);
    rows.push(['Grand Total', '', grandTotal.toFixed(2)]);
    rows.push([]);
    rows.push(['LOGISTICS']);
    rows.push(['Invoice', logistics.inv]);
    rows.push(['Bill of Lading', logistics.bl]);
    rows.push(['Container', logistics.cont]);
    rows.push(['Transport', logistics.tpt]);
    rows.push(['Truck', logistics.truck]);

    const csvContent = [headers.join(','), ...rows.map(r => (r as any[]).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${poRef}_Landed_Cost_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [allocatedItems, selectedShipment, expenses, logistics, totalExpenses, expenseRatio, grandTotal]);

  const handleExportPDF = useCallback(() => {
    if (allocatedItems.length === 0) {
      alert('No items to export. Select a Purchase Order first.');
      return;
    }

    const poRef = selectedShipment?.reference || 'LandedCost';
    const headers = [
      'Item Code', 'Description', `Unit FOB (${shipmentCurrency})`, 'Qty',
      `Line FOB (${shipmentCurrency})`, `Overhead (${shipmentCurrency})`, `Landed Total (${shipmentCurrency})`, `Landed / Unit (${shipmentCurrency})`
    ];

    const rows = allocatedItems.map(item => [
      item.itemCode.trim(),
      item.itemName.trim(),
      item.unitFob.toFixed(2),
      item.qty,
      item.lineFob.toFixed(2),
      item.allocatedOverhead.toFixed(2),
      item.landedTotal.toFixed(2),
      item.landedPerUnit.toFixed(2)
    ]);

    // Add summary rows
    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Total FOB', '', expenses.totalFob.toFixed(2)]);
    rows.push(['Total Expenses', '', totalExpenses.toFixed(2)]);
    rows.push(['Expense Ratio %', '', expenseRatio.toFixed(2) + '%']);
    rows.push(['Grand Total', '', grandTotal.toFixed(2)]);

    exportToPDF(`Landed Cost Report - ${poRef}`, `${poRef}_Landed_Cost`, headers, rows);
  }, [allocatedItems, selectedShipment, expenses, totalExpenses, expenseRatio, grandTotal]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            <Calculator size={14} />
            <span className="text-gray-400">Procurement Tools</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Landed Cost Calculator</h1>
          <p className="text-slate-500 text-sm">Calculate total landed costs by allocating shipment expenses across purchase order items</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex flex-col justify-center shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Exchange Rate</span>
                <span className="text-xs font-bold text-slate-700">{systemCurrency} 1 = LCY {systemExchangeRate}</span>
            </div>
            <button
              onClick={handleExportExcel}
              disabled={allocatedItems.length === 0}
              className="px-5 py-2.5 bg-emerald-50 text-[11px] font-black text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-200 uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Download size={14} />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={allocatedItems.length === 0}
              className="px-5 py-2.5 bg-white text-[11px] font-black text-slate-600 rounded-xl hover:bg-slate-50 transition-all border border-gray-200 uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Download size={14} />
              PDF
            </button>
            <button
            onClick={handleSave}
            disabled={allocatedItems.length === 0 || saving || (selectedShipment?.status?.includes('(Costed)') && !isAdmin)}
            className={`px-6 py-2.5 text-[11px] font-black text-white rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg ${
              saveSuccess
                ? 'bg-emerald-500 shadow-emerald-200 border border-emerald-400'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 border border-blue-500'
            }`}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : saveSuccess ? (
              <><CheckCircle2 size={14} /> Saved!</>
            ) : (
              <><Save size={14} /> Save Costs</>
            )}
          </button>
        </div>
      </div>

      {/* ─── TOP SECTION: Logistics + Expenses ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Card — Logistics */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Ship size={16} />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">Shipment Logistics</h2>
          </div>

          <div className="relative">
            <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 block mb-1.5">Shipment Reference</label>
            <div
              onClick={() => setShipmentDropdownOpen(!shipmentDropdownOpen)}
              className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700">
                {selectedShipment
                  ? `${selectedShipment.reference}`
                  : 'Select Shipment...'}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${shipmentDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {shipmentDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={shipmentSearch}
                      onChange={(e) => setShipmentSearch(e.target.value)}
                      placeholder="Search by reference or supplier..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:bg-white"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {loadingShipments ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-bold">Loading...</div>
                  ) : filteredShipments.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-bold">No shipments found</div>
                  ) : (
                    filteredShipments.map(s => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectShipment(s.id)}
                        className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                          s.id === selectedShipmentId ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-800">{s.reference}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-medium">{s.supplier?.name || s.supplier}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">
                            {s.items?.length || 0} items
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <InputField
            label="Invoice Number (INV)"
            icon={Receipt}
            value={logistics.inv}
            onChange={(v) => setLogistics(p => ({ ...p, inv: v }))}
            type="text"
            placeholder="e.g. INV-2024-001"
          />
          <InputField
            label="Bill of Lading (BL)"
            icon={FileText}
            value={logistics.bl}
            onChange={(v) => setLogistics(p => ({ ...p, bl: v }))}
            type="text"
            placeholder="e.g. BL-98765"
          />
          <InputField
            label="Container Number (CONT)"
            icon={Container}
            value={logistics.cont ? `${logistics.cont.split(',').length} Container(s) (${logistics.cont})` : '0 Containers'}
            onChange={(v) => {}}
            type="text"
            disabled={true}
          />
          <InputField
            label="Transport Method (TPT)"
            icon={Globe}
            value={logistics.tpt}
            onChange={(v) => setLogistics(p => ({ ...p, tpt: v }))}
            type="text"
            placeholder="e.g. Sea Freight"
          />
          <InputField
            label="Truck Number"
            icon={Truck}
            value={logistics.truck}
            onChange={(v) => setLogistics(p => ({ ...p, truck: v }))}
            type="text"
            placeholder="e.g. ALB-1234-ZM"
          />
        </div>

        {/* Right Card — Expense Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Banknote size={16} />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">Expense Breakdown</h2>
            </div>
            {selectedShipment && (
              <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                Currency: {shipmentCurrency}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InputField
              label="Total FOB Value"
              icon={DollarSign}
              value={expenses.totalFob || ''}
              onChange={(v) => updateExpense('totalFob', v)}

            />
            <InputField
              label="FOB Charge"
              icon={DollarSign}
              value={expenses.fobCharge || ''}
              onChange={(v) => updateExpense('fobCharge', v)}

            />
            <InputField
              label="Freight"
              icon={Ship}
              value={expenses.freight || ''}
              onChange={(v) => updateExpense('freight', v)}

            />
            <InputField
              label="Insurance"
              icon={ShieldCheck}
              value={expenses.insurance || ''}
              onChange={(v) => updateExpense('insurance', v)}

            />
            <InputField
              label="Road Transport"
              icon={Truck}
              value={expenses.roadTransport || ''}
              onChange={(v) => updateExpense('roadTransport', v)}

            />
            <InputField
              label="Clearing Agent"
              icon={Landmark}
              value={expenses.clearingAgent || ''}
              onChange={(v) => updateExpense('clearingAgent', v)}

            />
            <InputField
              label="Duty"
              icon={Scale}
              value={expenses.duty || ''}
              onChange={(v) => updateExpense('duty', v)}

            />
            <InputField
              label="ZABS"
              icon={FileText}
              value={expenses.zabs || ''}
              onChange={(v) => updateExpense('zabs', v)}

            />
            <InputField
              label="Overweight"
              icon={Package}
              value={expenses.overweight || ''}
              onChange={(v) => updateExpense('overweight', v)}

            />
          </div>

          {/* Bank Charges with auto-toggle */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5">
                <Banknote size={10} />
                Bank Charges
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Auto 1.5%</span>
                <div
                  onClick={() => setAutoBankCharges(!autoBankCharges)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${autoBankCharges ? 'bg-blue-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${autoBankCharges ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </label>
            </div>
            <div className="relative flex items-center">
              <input
                type="number"
                step="0.01"
                value={expenses.bankCharges || ''}
                onChange={(e) => {
                  setAutoBankCharges(false);
                  updateExpense('bankCharges', e.target.value);
                }}
                disabled={autoBankCharges}
                placeholder="0.00"
                className="w-full max-w-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {autoBankCharges && (
                <span className="ml-3 text-[10px] font-bold text-blue-500 flex items-center gap-1">
                  <Percent size={10} /> 1.5% of (FOB + FOB Charge + Freight + Insurance + Duty)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY PANEL ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total FOB</div>
            <div className="text-xl font-black text-slate-900">{fmt(expenses.totalFob)}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Expenses</div>
            <div className="text-xl font-black text-slate-900">{fmt(totalExpenses)}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl flex items-center gap-4 text-white">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
            <Percent size={24} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Expense Ratio</div>
            <div className="text-xl font-black text-white">{fmt(expenseRatio, 2)}%</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-xl flex items-center gap-4 text-white">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <Landmark size={24} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-blue-200">Grand Total</div>
            <div className="text-xl font-black text-white">{fmt(grandTotal)}</div>
          </div>
        </div>
      </div>

      {/* ─── PO ITEM ALLOCATION ────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package size={16} />
              </div>
              <div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">
                  Item Cost Allocation
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  Select a Purchase Order to allocate expenses proportionally across its items
                </p>
              </div>
            </div>

            {/* Removed selector from here, moved to Shipment Logistics */}
          </div>
        </div>

        {/* Allocation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Item Code</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Unit FOB ({shipmentCurrency})</th>
                <th className="px-6 py-4 text-right">Qty</th>
                <th className="px-6 py-4 text-right">Line FOB ({shipmentCurrency})</th>
                <th className="px-6 py-4 text-right">Overhead Alloc ({shipmentCurrency})</th>
                <th className="px-6 py-4 text-right">Landed Total ({shipmentCurrency})</th>
                <th className="px-6 py-4 text-right">Landed / Unit ({shipmentCurrency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allocatedItems.length > 0 ? (
                allocatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-xs text-slate-900">{item.itemCode}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{item.itemName}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-600">{fmt(item.unitFob)}</td>
                    <td className="px-6 py-4 text-center text-xs font-black text-slate-600">{item.qty}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-600">{fmt(item.lineFob)}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-amber-600">{fmt(item.allocatedOverhead)}</td>
                    <td className="px-6 py-4 text-right text-xs font-black text-slate-900">{fmt(item.landedTotal)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-xs font-black text-blue-700 border border-blue-100">
                        {fmt(item.landedPerUnit)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                        <Calculator size={28} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">
                          {selectedShipmentId ? 'No items found in this Shipment' : 'Select a Shipment above to allocate costs'}
                        </p>
                        <p className="text-[10px] text-slate-300 mt-1 font-medium">
                          Expense ratio will be applied proportionally to each item's FOB value
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {allocatedItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-wider">
                    Totals
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-black text-slate-800">
                    {fmt(allocatedItems.reduce((s, i) => s + i.lineFob, 0))}
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-black text-amber-700">
                    {fmt(allocatedItems.reduce((s, i) => s + i.allocatedOverhead, 0))}
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-black text-slate-900">
                    {fmt(allocatedItems.reduce((s, i) => s + i.landedTotal, 0))}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostingReportView;
