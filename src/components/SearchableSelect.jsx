import { useState, useEffect, useRef, useId } from 'react';
import './SearchableSelect.css';

/**
 * Searchable dropdown; same onChange shape as <select>: { target: { name, value } }.
 * @param {Array<{ value: string|number, label: string }>} options
 */
export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  disabled = false,
  required = false,
  emptyOptionLabel = 'Select…',
  searchPlaceholder = 'Search…',
  showEmptyOption = true,
  dropdownActions = [],
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listId = useId();

  const selected = options.find((o) => String(o.value) === String(value));
  const displayText = selected?.label ?? (value !== '' && value != null ? String(value) : '');

  useEffect(() => {
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setFilter('');
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filterLower = filter.trim().toLowerCase();
  const filtered = options.filter((o) => o.label.toLowerCase().includes(filterLower));

  const showEmptyRow =
    showEmptyOption &&
    (!filterLower || emptyOptionLabel.toLowerCase().includes(filterLower));

  const selectValue = (next) => {
    onChange({ target: { name, value: next === '' || next == null ? '' : String(next) } });
    setOpen(false);
    setFilter('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setFilter('');
    }
  };

  return (
    <div className="searchable-select" ref={containerRef}>
      <button
        type="button"
        id={id}
        name={name}
        className={`searchable-select-trigger ${!displayText ? 'is-placeholder' : ''}`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-required={required}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="searchable-select-trigger-text">
          {displayText || emptyOptionLabel}
        </span>
        <span className="searchable-select-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="searchable-select-dropdown" onKeyDown={handleKeyDown}>
          <input
            ref={searchInputRef}
            type="text"
            className="searchable-select-search"
            placeholder={searchPlaceholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={searchPlaceholder}
          />
          <ul id={listId} role="listbox" className="searchable-select-list">
            {showEmptyRow && (
              <li
                role="option"
                aria-selected={value === '' || value == null}
                className={
                  value === '' || value == null ? 'searchable-select-option selected' : 'searchable-select-option'
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectValue('')}
              >
                {emptyOptionLabel}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="searchable-select-empty">No matches</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={String(o.value)}
                  role="option"
                  aria-selected={String(o.value) === String(value)}
                  className={
                    String(o.value) === String(value)
                      ? 'searchable-select-option selected'
                      : 'searchable-select-option'
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectValue(o.value)}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
          {Array.isArray(dropdownActions) && dropdownActions.length > 0 && (
            <div className="searchable-select-actions">
              {dropdownActions.map((action, idx) => (
                <button
                  key={`${action.label}-${idx}`}
                  type="button"
                  className={`searchable-select-action ${action.className ?? ''}`.trim()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    setFilter('');
                    action.onClick?.();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
