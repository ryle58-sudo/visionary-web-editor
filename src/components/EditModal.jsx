import { useState, useEffect, useRef } from 'react';

export default function EditModal({ editModal, onApply, onCancel }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editModal) {
      setValue(editModal.currentValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editModal]);

  if (!editModal) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onApply(value);
    }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit text</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">&#x2715;</button>
        </div>
        <div className="modal-body">
          <textarea
            ref={inputRef}
            className="modal-textarea"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Enter new text..."
          />
          <p className="modal-hint">Press Enter to confirm, Escape to cancel</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onApply(value)}>Apply</button>
        </div>
      </div>
    </div>
  );
}
