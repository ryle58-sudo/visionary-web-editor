import useWebsiteEditor from '../hooks/useWebsiteEditor';
import ProgressBar from './ProgressBar';
import Toolbar from './Toolbar';
import EditModal from './EditModal';

export default function App() {
  const {
    folderData,
    isEditMode,
    exportProgress,
    importProgress,
    editModal,
    iframeRef,
    handleFolderChange,
    enableEditMode,
    disableEditMode,
    applyTextEdit,
    cancelEditModal,
    handleExportHTML,
    handleExportZip,
  } = useWebsiteEditor();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <svg className="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <circle cx="7" cy="6" r="0.5" fill="currentColor"/>
              <circle cx="10" cy="6" r="0.5" fill="currentColor"/>
              <circle cx="13" cy="6" r="0.5" fill="currentColor"/>
              <path d="M7 13h10M7 17h6"/>
            </svg>
            <span className="brand-name">Visionary Web Editor</span>
          </div>
          {folderData && (
            <div className="header-site-name">
              <span className="site-badge">{folderData.title}</span>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {!folderData ? (
          <div className="welcome-screen">
            <div className="welcome-card">
              <div className="welcome-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                  <path d="M12 12v9"/>
                  <path d="m16 16-4-4-4 4"/>
                </svg>
              </div>
              <h2 className="welcome-title">Import your website</h2>
              <p className="welcome-desc">
                Select a folder containing your website files (HTML, CSS, JS, images). The editor will load it as a live preview you can edit and export.
              </p>
              <label className="upload-area" htmlFor="folder-input">
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                </div>
                <span className="upload-label">Click to select a folder</span>
                <span className="upload-sub">Must contain an index.html file</span>
                <input
                  id="folder-input"
                  type="file"
                  webkitdirectory="true"
                  onChange={handleFolderChange}
                  style={{ display: 'none' }}
                />
              </label>

              {importProgress !== null && (
                <div style={{ marginTop: '1.5rem' }}>
                  <ProgressBar
                    progress={importProgress}
                    label={
                      importProgress < 10 ? 'Reading files...'
                      : importProgress < 50 ? 'Processing images...'
                      : importProgress < 80 ? 'Generating preview...'
                      : importProgress < 100 ? 'Preparing editor...'
                      : 'Done!'
                    }
                  />
                </div>
              )}

              <div className="welcome-features">
                <div className="feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span>Edit text inline</span>
                </div>
                <div className="feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Replace images</span>
                </div>
                <div className="feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Export HTML or ZIP</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="editor-layout">
            <Toolbar
              isEditMode={isEditMode}
              exportProgress={exportProgress}
              onEnableEdit={enableEditMode}
              onDisableEdit={disableEditMode}
              onExportHTML={handleExportHTML}
              onExportZip={handleExportZip}
            />

            {importProgress !== null && (
              <div style={{ padding: '0 1.5rem' }}>
                <ProgressBar
                  progress={importProgress}
                  label={importProgress < 100 ? 'Loading...' : 'Done!'}
                />
              </div>
            )}

            <div className="preview-wrapper">
              <iframe
                ref={iframeRef}
                srcDoc={folderData.preview}
                className={`preview-frame${isEditMode ? ' preview-frame--editing' : ''}`}
                title="Website preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              />
            </div>

            <div className="import-new">
              <label htmlFor="folder-input-2" className="btn btn-ghost btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Import another site
              </label>
              <input
                id="folder-input-2"
                type="file"
                webkitdirectory="true"
                onChange={handleFolderChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        )}
      </main>

      <EditModal
        editModal={editModal}
        onApply={applyTextEdit}
        onCancel={cancelEditModal}
      />
    </div>
  );
}
