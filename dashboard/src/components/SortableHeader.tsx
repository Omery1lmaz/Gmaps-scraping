import React from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';

interface SortableHeaderProps {
  label: string;
  field: string;
  currentSortBy: string;
  currentSortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
  className = ''
}) => {
  const isActive = currentSortBy === field;
  
  return (
    <th 
      onClick={() => onSort(field)}
      className={`sortable-header ${isActive ? `sort-${currentSortOrder}` : ''} ${className}`}
    >
      <div className="header-content">
        {label}
        <span className="sort-icon-container">
          {isActive ? (
            currentSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          ) : (
            <ChevronsUpDown size={12} className="opacity-30" />
          )}
        </span>
      </div>
    </th>
  );
};

export default SortableHeader;
