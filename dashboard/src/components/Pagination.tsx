import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (size: number) => void;
  pageSizeOptions?: number[];
  totalItems: number;
  isLoading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  pageSizeOptions = [10, 20, 50, 100],
  totalItems,
  isLoading = false,
}) => {
  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-50">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        Görüntülenen: <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> / <strong>{totalItems}</strong>
      </div>
      <div className="flex items-center gap-2">
        <select 
          value={itemsPerPage} 
          onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
          className="h-8 text-xs font-bold rounded-lg border-slate-200 bg-white px-2"
          disabled={isLoading}
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1 || isLoading}
            className={`h-8 w-8 rounded-lg border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === 1 ? 'opacity-50' : ''}`}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-500 px-2">{currentPage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages || isLoading}
            className={`h-8 w-8 rounded-lg border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === totalPages ? 'opacity-50' : ''}`}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
