import ProgressBar from './ProgressBar';

export default function Toolbar({
  isEditMode,
  exportProgress,
  onEnableEdit,
  onDisableEdit,
  onExportHTML,
  onExportZip,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-actions">
        {!isEditMode ? (
          <button className="btn btn-primary" onClick={onEnableEdit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Mode
          </button>
        ) : (
          <button className="btn btn-danger" onClick={onDisableEdit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
            Stop Editing
          </button>
        )}
        <button className="btn btn-success" onClick={onExportHTML}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Export HTML
        </button>
        <button
          className="btn btn-secondary"
          onClick={onExportZip}
          disabled={exportProgress !== null}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exportProgress !== null
            ? exportProgress === 100 ? 'Downloading...' : `${exportProgress}%`
            : 'Export ZIP'}
        </button>
      </div>

      {isEditMode && (
        <div className="edit-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Click text to edit &bull; Click image to replace
        </div>
      )}

      {exportProgress !== null && (
        <div style={{ marginTop: '0.75rem' }}>
          <ProgressBar
            progress={exportProgress}
            label={exportProgress < 20 ? 'Preparing...' : exportProgress < 75 ? 'Processing images...' : exportProgress < 100 ? 'Compressing...' : 'Done!'}
            color={exportProgress === 100 ? '#16a34a' : '#2563eb'}
          />
        </div>
      )}
    </div>
  );
}
