import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from 'lucide-react';
import apiService from '../../services/apiService';
import { cn } from '../../utils/cn';

type StoredFile = {
  id: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  uploadedAt?: string;
};

type Props = {
  documentType: string;
  documentId?: string;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  readOnly?: boolean;
  title?: string;
  hint?: string;
};

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.csv';

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileGlyph({ name, mime }: { name: string; mime?: string }) {
  const lower = `${name} ${mime || ''}`.toLowerCase();
  if (lower.includes('image') || /\.(jpe?g|png|gif|webp)$/.test(name.toLowerCase())) {
    return <ImageIcon size={18} />;
  }
  return <FileText size={18} />;
}

const DocumentAttachments: React.FC<Props> = ({
  documentType,
  documentId,
  pendingFiles = [],
  onPendingFilesChange,
  readOnly,
  title = 'Attachments',
  hint = 'PDF, JPG, PNG or Excel — max 10MB',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!documentId) {
      setSaved([]);
      return;
    }
    try {
      setSaved(await apiService.getAttachments(documentType, documentId));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not load attachments.');
    }
  };

  useEffect(() => {
    load();
  }, [documentType, documentId]);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError('');
    const files = Array.from(list);
    if (documentId) {
      setBusy(true);
      try {
        for (const file of files) {
          await apiService.uploadAttachment(documentType, documentId, file);
        }
        await load();
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Upload failed.');
      } finally {
        setBusy(false);
      }
    } else {
      onPendingFilesChange?.([...pendingFiles, ...files]);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeSaved = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await apiService.deleteAttachment(id);
      setSaved((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not delete file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
          <Paperclip size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">{title}</h2>
          <p className="text-[11px] font-medium text-slate-400">{hint}</p>
        </div>
      </div>

      {!readOnly && (
        <div
          className="max-w-[720px] p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/30 flex items-center gap-6 hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer group"
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors">
            <Upload size={24} />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
              {busy ? 'Uploading…' : 'Drop files or click to attach'}
            </p>
            <p className="text-[10px] font-medium text-slate-400">{hint}</p>
            <input
              type="file"
              multiple
              ref={inputRef}
              className="hidden"
              accept={ACCEPT}
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
          <button
            type="button"
            className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
          >
            Select
          </button>
        </div>
      )}

      {error && <p className="text-[12px] font-semibold text-rose-600">{error}</p>}

      <div className="space-y-2 max-w-[720px]">
        {saved.map((file) => (
          <div key={file.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileGlyph name={file.fileName} mime={file.mimeType} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-700 truncate">{file.fileName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{formatSize(file.fileSize)}</p>
            </div>
            <button
              type="button"
              onClick={() => apiService.downloadAttachment(file.id, file.fileName)}
              className="p-2 text-slate-400 hover:text-indigo-600"
              title="Download"
            >
              <Download size={16} />
            </button>
            {!readOnly && (
              <button type="button" onClick={() => removeSaved(file.id)} className="p-2 text-slate-400 hover:text-rose-500" title="Remove">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {pendingFiles.map((file, idx) => (
          <div key={`${file.name}-${idx}`} className="flex items-center gap-3 px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-white text-amber-600 flex items-center justify-center">
              <FileGlyph name={file.name} mime={file.type} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-700 truncate">{file.name}</p>
              <p className="text-[10px] text-amber-700 uppercase tracking-wider">Uploads after save · {formatSize(file.size)}</p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onPendingFilesChange?.(pendingFiles.filter((_, i) => i !== idx))}
                className="p-2 text-slate-400 hover:text-rose-500"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {!saved.length && !pendingFiles.length && (
          <p className={cn('text-[12px] text-slate-400 px-1', readOnly ? '' : 'hidden')}>No files attached.</p>
        )}
      </div>
    </section>
  );
};

export default DocumentAttachments;
