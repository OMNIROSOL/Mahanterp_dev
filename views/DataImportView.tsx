import React, { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import apiService from '../services/apiService';

const DataImportView = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [type, setType] = useState('customers');
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    apiService.getImportTypes()
      .then((rows) => {
        setTypes(rows || []);
        if (rows?.[0]?.id) setType(rows[0].id);
      })
      .catch((err) => setError(err?.response?.data?.error || 'Could not load import types.'));
  }, []);

  const selected = types.find((t) => t.id === type);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setPreview(await apiService.previewImport(type, file));
    } catch (err: any) {
      setPreview(null);
      setError(err?.response?.data?.error || err?.message || 'Could not read file.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const commit = async () => {
    const rows = (preview?.rows || []).filter((r: any) => r.ok);
    if (!rows.length) {
      setError('There are no valid rows to import.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await apiService.commitImport(type, rows);
      setResult(saved);
      setPreview(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Settings</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Data Import</h1>
        <p className="text-slate-500 text-sm mt-1">Download a template, upload Excel or CSV, then import only the rows that pass validation.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Import type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPreview(null);
                setResult(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-[13px] font-semibold text-slate-700"
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => apiService.downloadImportTemplate(type)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600"
          >
            <Download size={14} />
            Template
          </button>
          <div>
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              <Upload size={14} />
              {busy ? 'Reading…' : 'Upload file'}
            </button>
          </div>
        </div>

        {selected?.columns && (
          <p className="text-[12px] text-slate-400">
            Columns: {selected.columns.join(', ')}
          </p>
        )}
      </div>

      {error && <p className="text-[13px] font-semibold text-rose-600">{error}</p>}
      {result && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4 text-[13px] text-emerald-800">
          Imported {result.created} row{result.created === 1 ? '' : 's'}
          {result.skipped ? `. Skipped ${result.skipped}.` : '.'}
          {!!result.errors?.length && (
            <ul className="mt-2 text-rose-600 list-disc ml-5">
              {result.errors.slice(0, 8).map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {preview && (
        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[13px] font-bold text-slate-600">
              <FileSpreadsheet size={16} className="text-indigo-500" />
              {preview.valid} valid · {preview.errors} with errors
            </div>
            <button
              type="button"
              disabled={busy || !preview.valid}
              onClick={commit}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              Import valid rows
            </button>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th className="text-left px-6 py-3 font-black">Row</th>
                <th className="text-left px-4 py-3 font-black">Status</th>
                <th className="text-left px-4 py-3 font-black">Summary</th>
                <th className="text-left px-6 py-3 font-black">Errors</th>
              </tr>
            </thead>
            <tbody>
              {(preview.rows || []).map((row: any) => (
                <tr key={row.row} className="border-t border-slate-50">
                  <td className="px-6 py-3 font-mono text-slate-400">{row.row}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${row.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {row.ok ? 'Ready' : 'Error'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.data?.name || row.data?.itemName || row.data?.reference || row.data?.paidByContact || row.data?.paidToContact || '—'}
                    {(row.data?.code || row.data?.itemCode) && (
                      <span className="text-slate-400"> · {row.data.code || row.data.itemCode}</span>
                    )}
                    {row.data?.amount ? <span className="text-slate-400"> · {row.data.amount}</span> : null}
                  </td>
                  <td className="px-6 py-3 text-rose-600">{(row.errors || []).join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataImportView;
