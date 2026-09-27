import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Plus, Printer, Trash2, Wallet } from 'lucide-react';
import apiService from '../services/apiService';
import Button from '../components/shared/Button';
import DocumentAttachments from '../components/shared/DocumentAttachments';
import DocumentPrintHeader, { DOCUMENT_PRINT_CSS } from '../components/shared/DocumentPrintHeader';

type Line = {
  key: string;
  itemId: string;
  description: string;
  units: string;
  unitPrice: string;
  amount: string;
  division: string;
};

const money = (value: number | string) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().slice(0, 10);

const blankLine = (): Line => ({
  key: `${Date.now()}-${Math.random()}`,
  itemId: '',
  description: '',
  units: '1',
  unitPrice: '',
  amount: '',
  division: '',
});

const earningAmount = (line: Line) => (Number(line.units) || 0) * (Number(line.unitPrice) || 0);

function LinesEditor({
  title,
  hint,
  kind,
  lines,
  items,
  divisions,
  readOnly,
  onChange,
}: {
  title: string;
  hint: string;
  kind: 'earning' | 'deduction' | 'contribution';
  lines: Line[];
  items: any[];
  divisions: any[];
  readOnly: boolean;
  onChange: (lines: Line[]) => void;
}) {
  const choices = items.filter((item) => item.itemType === kind && !item.inactive);
  const update = (key: string, patch: Partial<Line>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        <p className="text-[12px] text-slate-400">{hint}</p>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-left px-3 py-2">Description</th>
              {kind === 'earning' && <th className="text-right px-3 py-2 w-24">Units</th>}
              {kind === 'earning' && <th className="text-right px-3 py-2 w-32">Unit price</th>}
              <th className="text-right px-3 py-2 w-32">Amount</th>
              <th className="text-left px-3 py-2 w-40">Division</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const amount = kind === 'earning' ? earningAmount(line) : Number(line.amount) || 0;
              const selected = items.find((item) => item.id === line.itemId);
              const options = selected && selected.inactive ? [selected, ...choices] : choices;
              return (
                <tr key={line.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <select
                      disabled={readOnly}
                      value={line.itemId}
                      onChange={(e) => update(line.key, { itemId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-semibold disabled:opacity-70"
                    >
                      <option value="">Select</option>
                      {options.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      disabled={readOnly}
                      value={line.description}
                      onChange={(e) => update(line.key, { description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] disabled:opacity-70"
                    />
                  </td>
                  {kind === 'earning' && (
                    <>
                      <td className="px-3 py-2">
                        <input
                          disabled={readOnly}
                          type="number"
                          step="0.01"
                          value={line.units}
                          onChange={(e) => update(line.key, { units: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-right disabled:opacity-70"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          disabled={readOnly}
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-right disabled:opacity-70"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 text-right font-bold text-slate-700">
                    {kind === 'earning' ? (
                      money(amount)
                    ) : (
                      <input
                        disabled={readOnly}
                        type="number"
                        step="0.01"
                        value={line.amount}
                        onChange={(e) => update(line.key, { amount: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-right font-bold disabled:opacity-70"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={readOnly}
                      value={line.division}
                      onChange={(e) => update(line.key, { division: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] disabled:opacity-70"
                    >
                      <option value="">—</option>
                      {divisions.map((d) => (
                        <option key={d.id || d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  {!readOnly && (
                    <td className="px-2">
                      <button type="button" onClick={() => onChange(lines.filter((l) => l.key !== line.key))} className="p-2 text-slate-400 hover:text-rose-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button type="button" onClick={() => onChange([...lines, blankLine()])} className="text-[12px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
          <Plus size={14} /> Add line
        </button>
      )}
    </section>
  );
}

const NewPayslipView = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const readOnly = location.pathname.includes('/view/');
  const fromId = new URLSearchParams(location.search).get('from');

  const [date, setDate] = useState(today());
  const [useReference, setUseReference] = useState(false);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [earnings, setEarnings] = useState<Line[]>([blankLine()]);
  const [deductions, setDeductions] = useState<Line[]>([]);
  const [contributions, setContributions] = useState<Line[]>([]);
  const [showPeriodTotals, setShowPeriodTotals] = useState(false);
  const [customTitle, setCustomTitle] = useState(false);
  const [customTitleValue, setCustomTitleValue] = useState('');
  const [useFooter, setUseFooter] = useState(false);
  const [footerValue, setFooterValue] = useState('');
  const [periodTotals, setPeriodTotals] = useState<any>(null);
  const [saved, setSaved] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [footers, setFooters] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const applySlip = (slip: any, clone: boolean) => {
    setDate(clone ? today() : String(slip.date).slice(0, 10));
    setUseReference(!clone && Boolean(slip.reference));
    setReference(clone ? '' : slip.reference || '');
    setDescription(slip.description || '');
    setEmployeeId(slip.employeeId);
    const mapLine = (line: any): Line => ({
      key: `${line.id || Math.random()}`,
      itemId: line.itemId || '',
      description: line.description || '',
      units: line.units != null ? String(line.units) : '1',
      unitPrice: line.unitPrice != null ? String(line.unitPrice) : '',
      amount: line.amount != null ? String(line.amount) : '',
      division: line.division || '',
    });
    const lines = slip.lines || [];
    setEarnings(lines.filter((l: any) => l.lineType === 'earning').map(mapLine));
    setDeductions(lines.filter((l: any) => l.lineType === 'deduction').map(mapLine));
    setContributions(lines.filter((l: any) => l.lineType === 'contribution').map(mapLine));
    setShowPeriodTotals(!!slip.showPeriodTotals);
    setCustomTitle(!!slip.customTitle);
    setCustomTitleValue(slip.customTitleValue || '');
    setUseFooter(!!slip.useFooter);
    setFooterValue(slip.footerValue || '');
    setPeriodTotals(slip.periodTotals || null);
    if (!clone) setSaved(slip);
  };

  useEffect(() => {
    Promise.all([
      apiService.getEmployees(),
      apiService.getPayslipItems(),
      apiService.getDivisions(),
      apiService.getFooters(),
    ]).then(([people, catalog, divs, footerRows]) => {
      setEmployees((people || []).filter((p: any) => !p.inactive));
      setItems(catalog || []);
      setDivisions(divs || []);
      setFooters(footerRows || []);
    }).catch((err) => setError(err?.response?.data?.error || err.message));
  }, []);

  useEffect(() => {
    const loadId = id || fromId;
    if (!loadId) return;
    apiService.getPayslip(loadId)
      .then((slip) => applySlip(slip, Boolean(fromId && !id)))
      .catch((err) => setError(err?.response?.data?.error || err.message));
  }, [id, fromId]);

  const gross = useMemo(() => earnings.reduce((sum, line) => sum + (line.itemId ? earningAmount(line) : 0), 0), [earnings]);
  const deduction = useMemo(() => deductions.reduce((sum, line) => sum + (line.itemId ? Number(line.amount) || 0 : 0), 0), [deductions]);
  const contribution = useMemo(() => contributions.reduce((sum, line) => sum + (line.itemId ? Number(line.amount) || 0 : 0), 0), [contributions]);
  const net = gross - deduction;
  const employee = employees.find((p) => p.id === employeeId) || saved?.employee;

  const pack = (lines: Line[], lineType: string) =>
    lines
      .filter((line) => line.itemId)
      .map((line) => ({
        lineType,
        itemId: line.itemId,
        description: line.description,
        units: line.units,
        unitPrice: line.unitPrice,
        amount: lineType === 'earning' ? earningAmount(line) : Number(line.amount) || 0,
        division: line.division,
      }));

  const save = async () => {
    setError('');
    if (!employeeId) {
      setError('Choose an employee.');
      return;
    }
    const lines = [...pack(earnings, 'earning'), ...pack(deductions, 'deduction'), ...pack(contributions, 'contribution')];
    if (!lines.some((line) => line.lineType === 'earning' && line.amount)) {
      setError('Add an earnings line with units and a unit price.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        date,
        reference: useReference ? reference.trim() : '',
        description,
        employeeId,
        showPeriodTotals,
        customTitle,
        customTitleValue,
        useFooter,
        footerValue,
        lines,
      };
      const slip = id ? await apiService.updatePayslip(id, payload) : await apiService.createPayslip(payload);
      if (!id && pendingFiles.length) {
        for (const file of pendingFiles) {
          await apiService.uploadAttachment('payslip', slip.id, file);
        }
      }
      navigate(`/payslips/view/${slip.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Could not save the payslip.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id || !window.confirm('Delete this payslip and its journal?')) return;
    setBusy(true);
    try {
      await apiService.deletePayslip(id);
      navigate('/payslips');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
      setBusy(false);
    }
  };

  const pay = () => {
    const name = employee?.name || '';
    const params = new URLSearchParams({
      payslip: '1',
      employee: name,
      amount: String(Number(saved?.netPay ?? net) || 0),
      account: 'Employee clearing account',
      reference: saved?.reference || reference || '',
    });
    navigate(`/payments/new?${params.toString()}`);
  };

  const title = customTitle && customTitleValue ? customTitleValue : 'Payslip';

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <style>{DOCUMENT_PRINT_CSS}</style>
      <div className="no-print bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigate('/payslips')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Payslips
        </button>
        <div className="flex items-center gap-2">
          {readOnly && (
            <>
              <Button variant="secondary" onClick={() => navigate(`/payslips/edit/${id}`)}>Edit</Button>
              <Button variant="secondary" onClick={() => navigate(`/payslips/new?from=${id}`)}>
                <Copy size={14} className="mr-1" /> Copy
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={14} className="mr-1" /> Print
              </Button>
              <Button variant="primary" onClick={pay}>
                <Wallet size={14} className="mr-1" /> Pay employee
              </Button>
              <Button variant="danger" onClick={remove} disabled={busy}>Delete</Button>
            </>
          )}
          {!readOnly && (
            <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : id ? 'Update' : 'Create'}</Button>
          )}
        </div>
      </div>

      <div className={`max-w-5xl mx-auto p-6 ${readOnly ? 'print-container' : ''}`}>
        <div className={`bg-white border border-slate-200 rounded-3xl p-8 space-y-8 ${readOnly ? 'document-print-sheet' : ''}`}>
          {readOnly && <DocumentPrintHeader title={title} reference={reference || undefined} />}
          {!readOnly && <h1 className="text-2xl font-black text-slate-900 tracking-tight">{id ? 'Edit payslip' : 'New payslip'}</h1>}
          {error && <p className="no-print text-sm font-semibold text-rose-600">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</span>
              <input type="date" disabled={readOnly} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-70" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                Reference
                <span className="normal-case tracking-normal font-semibold text-slate-500 inline-flex items-center gap-1">
                  <input type="checkbox" disabled={readOnly} checked={useReference} onChange={(e) => setUseReference(e.target.checked)} /> Optional
                </span>
              </span>
              <input
                disabled={readOnly || !useReference}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</span>
              <input disabled={readOnly} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-70" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</span>
              <select disabled={readOnly} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-70">
                <option value="">Select employee</option>
                {employees.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}{person.code ? ` (${person.code})` : ''}</option>
                ))}
              </select>
            </label>
          </div>

          <LinesEditor title="Earnings" hint="Amount is units × unit price, in ZMW." kind="earning" lines={earnings} items={items} divisions={divisions} readOnly={readOnly} onChange={setEarnings} />
          <LinesEditor title="Deductions" hint="PAYE, NAPSA employee and NHIMA employee. Flat amount in ZMW." kind="deduction" lines={deductions} items={items} divisions={divisions} readOnly={readOnly} onChange={setDeductions} />
          <LinesEditor title="Contributions" hint="Employer NAPSA and NHIMA. These do not change net pay." kind="contribution" lines={contributions} items={items} divisions={divisions} readOnly={readOnly} onChange={setContributions} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-2xl p-5 print-bg-slate-50">
            {[
              ['Gross pay', gross],
              ['Deduction', deduction],
              ['Net pay', net],
              ['Contribution', contribution],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="text-lg font-black text-slate-800">ZMW {money(value as number)}</p>
              </div>
            ))}
          </div>

          {readOnly && showPeriodTotals && periodTotals && (
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Totals for the period</h2>
              <p className="text-[12px] text-slate-400">Calendar year through this payslip, for this employee.</p>
              {(['earnings', 'deductions', 'contributions'] as const).map((key) => (
                <div key={key}>
                  {(periodTotals[key] || []).map((row: any) => (
                    <div key={row.name} className="flex justify-between text-sm py-1 border-b border-slate-100">
                      <span className="text-slate-600">{row.name}</span>
                      <span className="font-bold">{money(row.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <p className="text-sm font-black text-slate-800 pt-2">Period net pay ZMW {money(periodTotals.netPay)}</p>
            </div>
          )}

          <div className="no-print space-y-3 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={readOnly} checked={showPeriodTotals} onChange={(e) => setShowPeriodTotals(e.target.checked)} />
              Show totals for the period
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={readOnly} checked={customTitle} onChange={(e) => setCustomTitle(e.target.checked)} />
              Custom title
            </label>
            {customTitle && (
              <input disabled={readOnly} value={customTitleValue} onChange={(e) => setCustomTitleValue(e.target.value)} placeholder="Title printed on the payslip" className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" />
            )}
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={readOnly} checked={useFooter} onChange={(e) => setUseFooter(e.target.checked)} />
              Footers
            </label>
            {useFooter && (
              <select disabled={readOnly} value={footerValue} onChange={(e) => setFooterValue(e.target.value)} className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <option value="">Select a footer</option>
                {footers.map((footer) => (
                  <option key={footer.id} value={footer.content || footer.name}>{footer.name}</option>
                ))}
              </select>
            )}
          </div>
          {useFooter && footerValue && <p className="text-sm text-slate-500 whitespace-pre-wrap border-t border-slate-100 pt-4">{footerValue}</p>}

          <DocumentAttachments
            documentType="payslip"
            documentId={id}
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
            readOnly={readOnly}
            title="Image"
            hint="One scan or photo — PDF, JPG or PNG, max 10MB"
          />
        </div>
      </div>
    </div>
  );
};

export default NewPayslipView;
