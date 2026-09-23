import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil } from 'lucide-react';

type Props = {
  viewPath?: string;
  editPath?: string;
  showEdit?: boolean;
};

const RowActions = ({ viewPath, editPath, showEdit = true }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {viewPath && (
        <button
          type="button"
          onClick={() => navigate(viewPath)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
        >
          <Eye size={13} /> View
        </button>
      )}
      {showEdit && editPath && (
        <button
          type="button"
          onClick={() => navigate(editPath)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100"
        >
          <Pencil size={13} /> Edit
        </button>
      )}
    </div>
  );
};

export default RowActions;
