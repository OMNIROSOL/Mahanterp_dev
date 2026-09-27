import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, FileSpreadsheet, Printer } from 'lucide-react';
import apiService from '../services/apiService';
import Button from '../components/shared/Button';
import { DOCUMENT_PRINT_CSS } from '../components/shared/DocumentPrintHeader';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const money = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n) || value === '' || value == null) return value ?? '';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type ReportCfg = {
  title: string;
  endpoint: string;
  purpose: string;
  fields: string[];
};

const REPORTS: Record<string, ReportCfg> = {
  'non-moving-stock': {
    title: 'Non-Moving Stock',
    endpoint: 'non-moving',
    purpose: 'Items with stock and no sales in the selected period.',
    fields: ['branch', 'category', 'brand', 'from', 'to'],
  },
  'dead-stock': {
    title: 'Dead Stock',
    endpoint: 'dead-stock',
    purpose: 'Items with no sale for more than 365 days.',
    fields: ['branch', 'category', 'minValue'],
  },
  'top-parts': {
    title: 'Top 300 Parts',
    endpoint: 'top-parts',
    purpose: 'Best sellers by value or quantity.',
    fields: ['branch', 'from', 'to', 'rankBy'],
  },
  'low-margin': {
    title: 'Low-Margin Items',
    endpoint: 'low-margin',
    purpose: 'Items sold below the margin threshold, grouped by supplier.',
    fields: ['branch', 'from', 'to', 'threshold'],
  },
  'branch-day-book': {
    title: 'Branch Day Book',
    endpoint: 'day-book',
    purpose: 'Every transaction for one branch on one date.',
    fields: ['branch', 'date'],
  },
  'item-costing': {
    title: 'Item Costing',
    endpoint: 'item-costing',
    purpose: 'Landed cost per receipt, and a monthly average.',
    fields: ['item', 'supplier', 'container', 'from', 'to', 'view'],
  },
  'what-to-order': {
    title: 'What to Order',
    endpoint: 'what-to-order',
    purpose: 'Suggested purchase quantity from 8-month sales, stock, pipeline, and lead time.',
    fields: ['supplier', 'category', 'cover'],
  },
  'loss-of-sales': {
    title: 'Loss of Sales on Quotations',
    endpoint: 'loss-of-sales',
    purpose: 'Quoted items the customer did not order within 30 days.',
    fields: ['customer', 'item', 'from', 'to'],
  },
};

const defaultsFor = (id: string) => {
  if (id === 'non-moving-stock') return { branch: 'All', from: daysAgo(90), to: today() };
  if (id === 'branch-day-book') return { branch: 'All', date: today() };
  if (id === 'dead-stock') return { branch: 'All', minValue: '0' };
  if (id === 'low-margin') return { branch: 'All', from: monthStart(), to: today(), threshold: '12' };
  if (id === 'what-to-order') return { cover: '4' };
  if (id === 'item-costing') return { view: 'lines' };
  return { branch: 'All', from: monthStart(), to: today(), rankBy: 'value' };
};

const MilReportsView = () => {
  const { reportId = '' } = useParams();
  const navigate = useNavigate();
  const cfg = REPORTS[reportId];
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<string[]>(['All']);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFilters(defaultsFor(reportId));
    setData(null);
    setError('');
    setPicked({});
    apiService.getMilBranches().then(setBranches).catch(() => setBranches(['All']));
  }, [reportId]);

  const run = async () => {
    if (!cfg) return;
    setLoading(true);
    setError('');
    try {
      setData(await apiService.getMilReport(cfg.endpoint, filters));
    } catch (err: any) {
      setData(null);
      setError(err?.response?.data?.error || err.message || 'Could not run the report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cfg && filters.branch !== undefined || cfg && reportId === 'item-costing' || cfg && reportId === 'what-to-order' || cfg && reportId === 'loss-of-sales') {
      if (Object.keys(filters).length) run();
    }
    // run when the report opens with defaults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, filters.branch, filters.date, filters.from]);

  const set = (key: string, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));

  const saveNote = async (row: any, noteType: string, value: string, refId = '') => {
    await apiService.saveMilNote({
      itemId: row.itemId || null,
      refId,
      branch: row.branch || '',
      noteType,
      value,
    });
  };

  const draftOrders = async () => {
    const rows = (data?.rows || []).filter((row: any) => picked[row.itemId] && row.supplierId && Number(row.suggested) > 0);
    const bySupplier = new Map<string, any[]>();
    for (const row of rows) {
      const list = bySupplier.get(row.supplierId) || [];
      list.push(row);
      bySupplier.set(row.supplierId, list);
    }
    if (!bySupplier.size) {
      setError('Tick at least one line that has a supplier and a suggested quantity.');
      return;
    }
    setLoading(true);
    try {
      const created = [];
      for (const [supplierId, lines] of bySupplier) {
        created.push(await apiService.createMilDraftOrder({
          supplierId,
          lines: lines.map((line: any) => ({
            itemId: line.itemId,
            description: line.description,
            qty: line.suggested,
            unitPrice: line.lastPrice,
          })),
        }));
      }
      navigate(`/purchase-orders`);
      setError('');
      alert(`Created ${created.length} draft purchase order${created.length === 1 ? '' : 's'}.`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const emailDayBook = async () => {
    if (!emailTo.trim()) return;
    const lines = (data?.sections || []).flatMap((section: any) =>
      section.rows.map((row: any) => `${section.name}\t${row.docNo || ''}\t${row.party || ''}\t${row.debit || 0}\t${row.credit || 0}`)
    );
    try {
      const result = await apiService.sendEmailWithAttachment({
        to: emailTo.trim(),
        cc: '',
        bcc: '',
        subject: `Branch day book ${data?.date || ''} ${data?.branch || ''}`,
        body: lines.join('\n') || 'No transactions.',
      });
      alert(result?.simulated ? 'Email simulated. Add SMTP settings to send it for real.' : 'Day book email sent.');
    } catch (err: any) {
      setError(err.message || 'Could not send the day book.');
    }
  };

  const columns = data?.columns || [];
  const rows = data?.rows || [];
  const moneyKeys = useMemo(() => new Set(columns.filter((col: any) => /value|cost|price|debit|credit|lost|sell|fob|freight|duty|transport|other|landed|marginLost|sales/i.test(col.key)).map((col: any) => col.key)), [columns]);

  if (!cfg) {
    return <div className="p-8">Unknown report. <button className="text-indigo-600" onClick={() => navigate('/reports')}>Back to reports</button></div>;
  }

  const fieldClass = 'mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto font-sans mil-report">
      <style>{`${DOCUMENT_PRINT_CSS}
@media print {
  .mil-report, .mil-report .bg-white, .mil-report .bg-slate-50, .mil-report thead, .mil-report tr {
    background: #fff !important;
    color: #111827 !important;
  }
  .mil-report h1, .mil-report h2, .mil-report th, .mil-report td, .mil-report p, .mil-report span, .mil-report label {
    color: #111827 !important;
  }
}`}</style>
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors group bg-transparent border-0 cursor-pointer"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Reports
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{cfg.title}</h1>
              <p className="text-sm text-slate-500 font-medium">{cfg.purpose}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => apiService.downloadMilReport(cfg.endpoint, filters)}>
            <FileSpreadsheet size={14} className="mr-1" /> Excel
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={14} className="mr-1" /> PDF
          </Button>
          <Button variant="primary" onClick={run} disabled={loading}>{loading ? 'Running…' : 'Run'}</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="no-print bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-5 grid grid-cols-2 md:grid-cols-6 gap-4">
          {cfg.fields.includes('branch') && (
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Branch
              <select value={filters.branch || 'All'} onChange={(e) => set('branch', e.target.value)} className={fieldClass}>
                {branches.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
          )}
          {cfg.fields.includes('from') && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">From<input type="date" value={filters.from || ''} onChange={(e) => set('from', e.target.value)} className={fieldClass} /></label>}
          {cfg.fields.includes('to') && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">To<input type="date" value={filters.to || ''} onChange={(e) => set('to', e.target.value)} className={fieldClass} /></label>}
          {cfg.fields.includes('date') && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date<input type="date" value={filters.date || ''} onChange={(e) => set('date', e.target.value)} className={fieldClass} /></label>}
          {['category', 'brand', 'supplier', 'item', 'customer', 'container'].filter((key) => cfg.fields.includes(key)).map((key) => (
            <label key={key} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{key}
              <input value={filters[key] || ''} onChange={(e) => set(key, e.target.value)} className={fieldClass} />
            </label>
          ))}
          {cfg.fields.includes('minValue') && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Min stock value<input type="number" value={filters.minValue || ''} onChange={(e) => set('minValue', e.target.value)} className={fieldClass} /></label>}
          {cfg.fields.includes('threshold') && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Margin threshold %<input type="number" value={filters.threshold || ''} onChange={(e) => set('threshold', e.target.value)} className={fieldClass} /></label>}
          {cfg.fields.includes('cover') && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Months of cover<input type="number" value={filters.cover || ''} onChange={(e) => set('cover', e.target.value)} className={fieldClass} /></label>}
          {cfg.fields.includes('rankBy') && (
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rank by
              <select value={filters.rankBy || 'value'} onChange={(e) => set('rankBy', e.target.value)} className={fieldClass}>
                <option value="value">Value</option>
                <option value="qty">Quantity</option>
              </select>
            </label>
          )}
          {cfg.fields.includes('view') && (
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">View
              <select value={filters.view || 'lines'} onChange={(e) => set('view', e.target.value)} className={fieldClass}>
                <option value="lines">Per receipt</option>
                <option value="monthly">Monthly average</option>
              </select>
            </label>
          )}
        </div>

        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
        {data?.note && <p className="text-sm text-slate-500">{data.note}</p>}
        {data?.total != null && (
          <div className="rounded-xl bg-slate-900 text-white px-6 py-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stock value</p>
            <p className="text-2xl font-black tracking-tight mt-1">ZMW {money(data.total)}</p>
          </div>
        )}

        {data?.customerSummary && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Loss ratio by customer</h2>
              {data.customerSummary.map((row: any) => (
                <div key={row.customer} className="flex justify-between text-sm py-1 border-b border-slate-100">
                  <span>{row.customer}</span>
                  <span className="font-bold">{row.ratio}% · ZMW {money(row.lost)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Most frequently lost items</h2>
              {(data.itemSummary || []).map((row: any) => (
                <div key={row.code} className="flex justify-between text-sm py-1 border-b border-slate-100">
                  <span>{row.code} {row.description}</span>
                  <span className="font-bold">{row.times}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data?.sections ? (
          <div className="space-y-4">
            {data.sections.map((section: any) => (
              <section key={section.name} className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">{section.name}</h2>
                  <p className="text-xs font-bold text-slate-500">Debit {money(section.debit)} · Credit {money(section.credit)}</p>
                </div>
                <ReportTable columns={[
                  { key: 'time', header: 'Time' },
                  { key: 'docNo', header: 'Doc No.' },
                  { key: 'type', header: 'Type' },
                  { key: 'party', header: 'Party' },
                  { key: 'description', header: 'Description' },
                  { key: 'debit', header: 'Debit' },
                  { key: 'credit', header: 'Credit' },
                  { key: 'mode', header: 'Payment Mode' },
                  { key: 'status', header: 'Status' },
                ]} rows={section.rows} moneyKeys={new Set(['debit', 'credit'])} />
              </section>
            ))}
            <div className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-3">Cash and bank closing balances</h2>
              {(data.closing || []).map((row: any) => (
                <div key={row.name} className="flex justify-between text-sm py-1 border-b border-slate-100">
                  <span>{row.name}</span>
                  <span className="font-bold">ZMW {money(row.amount)}</span>
                </div>
              ))}
            </div>
            <div className="no-print flex gap-2 items-end">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email this day book
                <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="manager@company.com" className="mt-1 block bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </label>
              <Button variant="secondary" onClick={emailDayBook}>Send</Button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">
            <ReportTable
              columns={columns}
              rows={rows}
              moneyKeys={moneyKeys}
              reportId={reportId}
              onNote={saveNote}
              picked={picked}
              onPick={(id, on) => setPicked((prev) => ({ ...prev, [id]: on }))}
            />
          </div>
        )}

        {reportId === 'what-to-order' && (
          <div className="no-print">
            <Button variant="primary" onClick={draftOrders} disabled={loading}>Create draft purchase orders</Button>
          </div>
        )}
      </div>
    </div>
  );
};

function ReportTable({ columns, rows, moneyKeys, reportId, onNote, picked, onPick }: any) {
  if (!rows?.length) return <p className="p-4 text-sm text-slate-400">No rows for these filters.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
          <tr>
            {reportId === 'what-to-order' && <th className="px-6 py-3" />}
            {columns.map((col: any) => <th key={col.key} className="text-left px-6 py-3">{col.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any, index: number) => {
            const risk = row.monthsOfCover !== '' && Number(row.monthsOfCover) < 1;
            const variance = Math.abs(Number(row.variance));
            const hot = risk || (Number.isFinite(variance) && variance > 5);
            if (row.rowType === 'subtotal') {
              return (
                <tr key={`sub-${index}`} className="bg-slate-50 font-bold text-slate-800">
                  <td className="px-6 py-4 text-[12px]" colSpan={Math.max(1, columns.length - 2)}>{row.supplier} total</td>
                  <td className="px-6 py-4 text-[12px]">{money(row.salesValue)}</td>
                  <td className="px-6 py-4 text-[12px]">{money(row.marginLost)}</td>
                </tr>
              );
            }
            return (
              <tr key={row.itemId || row.id || index} className={`border-b border-slate-100 hover:bg-slate-50 ${hot ? 'bg-rose-50' : 'bg-white'}`}>
                {reportId === 'what-to-order' && (
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={!!picked?.[row.itemId]} onChange={(e) => onPick(row.itemId, e.target.checked)} />
                  </td>
                )}
                {columns.map((col: any) => (
                  <td key={col.key} className="px-6 py-4 text-[12px] font-semibold text-slate-600">
                    {col.key === 'action' || col.key === 'decision' || col.key === 'reason' ? (
                      <NoteCell row={row} field={col.key} reportId={reportId} onNote={onNote} />
                    ) : moneyKeys.has(col.key) ? money(row[col.key]) : (row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NoteCell({ row, field, reportId, onNote }: any) {
  const options = field === 'decision'
    ? ['', 'Write-off', 'Clearance', 'Return', 'Hold']
    : field === 'action' && reportId === 'low-margin'
      ? ['', 'Renegotiate', 'Increase Price', 'Discontinue']
      : field === 'action'
        ? ['', 'Transfer / Discount', 'Push sales', 'Return', 'Hold']
        : null;
  const noteType = field === 'decision' ? 'dead_decision' : field === 'reason' ? 'quote_reason' : reportId === 'low-margin' ? 'margin_action' : 'non_moving_action';
  if (!options) {
    return (
      <input
        defaultValue={row.reason || ''}
        onBlur={(e) => onNote(row, noteType, e.target.value, row.id)}
        className="w-40 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
      />
    );
  }
  return (
    <select
      defaultValue={row[field] || ''}
      onChange={(e) => onNote(row, noteType, e.target.value, field === 'reason' ? row.id : '')}
      className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    >
      {options.map((option) => <option key={option} value={option}>{option || '—'}</option>)}
    </select>
  );
}

export default MilReportsView;
