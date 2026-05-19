import { useState, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function App() {
  const [folderData, setFolderData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const iframeRef = useRef(null);
  const assetsRef = useRef({});

  // ✅ Helper pour encoder en base64 UTF-8
  const btoa_utf8 = (str) => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      console.warn("btoa_utf8 error:", e);
      return "";
    }
  };

  // ✅ Helper pour décoder depuis base64 UTF-8
  const atob_utf8 = (str) => {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (e) {
      console.warn("atob_utf8 error:", e);
      return "{}";
    }
  };

  const handleFolderChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setImportProgress(0);

    const readFile = (file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      if (file.name.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    const readFileAsBuffer = (file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsArrayBuffer(file);
    });

    const fileMap = {};
    const assets = {};

    const findInFileMap = (path) => {
      if (!path) return null;
      const decoded = decodeURIComponent(path);
      const variants = [
        path, decoded,
        path.replace(/^\//, ''),
        decoded.replace(/^\//, ''),
        path.replace(/^\.\//, ''),
        decoded.replace(/^\.\//, ''),
        path.replace(/^\.\.\//, ''),
        path.split('/').pop(),
        decoded.split('/').pop(),
      ];
      for (const v of variants) {
        if (fileMap[v]) return fileMap[v];
      }
      const fileName = decoded.split('/').pop().toLowerCase();
      for (const key of Object.keys(fileMap)) {
        if (key.toLowerCase().endsWith('/' + fileName) || key.toLowerCase() === fileName) {
          return fileMap[key];
        }
      }
      return null;
    };

    // Lecture des fichiers
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const content = await readFile(file);
      const buffer = await readFileAsBuffer(file);
      const fullPath = file.webkitRelativePath;
      const pathWithoutRoot = fullPath.split('/').slice(1).join('/');

      assets[pathWithoutRoot] = { buffer, file, name: file.name, path: pathWithoutRoot };

      fileMap[file.name] = content;
      fileMap[fullPath] = content;
      fileMap[pathWithoutRoot] = content;
      fileMap['/' + pathWithoutRoot] = content;
      fileMap['./' + pathWithoutRoot] = content;
      fileMap['../' + pathWithoutRoot] = content;
      fileMap[encodeURIComponent(file.name)] = content;
      fileMap[encodeURIComponent(pathWithoutRoot)] = content;

      setImportProgress(Math.round((idx + 1) / files.length * 40));
    }

    assetsRef.current = assets;
    setImportProgress(50);

    const htmlFile = files.find(f => f.name === 'index.html') || files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) {
      setImportProgress(null);
      return alert("❌ Aucun fichier index.html trouvé !");
    }

    let htmlContent = findInFileMap(htmlFile.name);
    setImportProgress(55);

    htmlContent = htmlContent.replace(/<script[^>]*id=["']app-patch["'][^>]*>[\s\S]*?<\/script>/gi, '');
    htmlContent = htmlContent.replace(/<script[^>]*id=["']editor-script["'][^>]*>[\s\S]*?<\/script>/gi, '');
    htmlContent = htmlContent.replace(/<script[^>]+src=["'][^"']*(?:@vite|@react-refresh|localhost:\d+)[^"']*["'][^>]*><\/script>/gi, '');
    htmlContent = htmlContent.replace(/<script[^>]+type=["']module["'][^>]*src=["'][^"']*localhost[^"']*["'][^>]*><\/script>/gi, '');

    setImportProgress(60);

    htmlContent = htmlContent.replace(
      /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (match, cssPath) => {
        if (cssPath.startsWith('http')) return match;
        const css = findInFileMap(cssPath);
        return css ? '<style>' + css + '</style>' : match;
      }
    );

    setImportProgress(70);

    htmlContent = htmlContent.replace(
      /src=["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      (match, imgPath) => {
        if (imgPath.startsWith('data:') || imgPath.startsWith('http')) return match;
        const base64 = findInFileMap(imgPath);
        return base64 ? 'src="' + base64 + '"' : match;
      }
    );

    setImportProgress(80);

    htmlContent = htmlContent.replace(
      /<script([^>]+)src=["']([^"']+\.js)["'][^>]*><\/script>/gi,
      (match, attrs, jsPath) => {
        if (jsPath.startsWith('http') || jsPath.startsWith('//')) return match;
        const js = findInFileMap(jsPath);
        return js ? '<script' + attrs + '>' + js + '</script>' : match;
      }
    );

    setImportProgress(85);

    const imageMap = {};
    for (const [key, val] of Object.entries(fileMap)) {
      if (typeof val === 'string' && val.startsWith('data:image/')) {
        const fileName = key.split('/').pop();
        imageMap[fileName] = val;
        imageMap[key] = val;
        imageMap['./' + key] = val;
        imageMap['../' + key] = val;
        imageMap['/' + key] = val;
      }
    }

    const dbFile = files.find(f => f.name === 'db.json');
    let dbContent = null;
    if (dbFile) {
      const raw = findInFileMap('db.json');
      try { JSON.parse(raw); dbContent = raw; } catch (e) {}
    }

    setImportProgress(90);

    // ✅ CORRECTION : Utiliser btoa_utf8 au lieu de btoa
    let imageMapB64 = "";
    let dbB64 = "";
    try {
      imageMapB64 = btoa_utf8(JSON.stringify(imageMap));
      dbB64 = dbContent ? btoa_utf8(dbContent) : btoa_utf8('{}');
    } catch (err) {
      console.error("Erreur encodage base64:", err);
      imageMapB64 = btoa_utf8('{}');
      dbB64 = btoa_utf8('{}');
    }

    let editorScript = '<script id="editor-script" data-internal="true">\n';
    editorScript += '(function() {\n';
    editorScript += '  "use strict";\n';
    editorScript += '  if (window.__editorLoaded) return;\n';
    editorScript += '  window.__editorLoaded = true;\n';
    editorScript += '  window.__editMode = false;\n';
    editorScript += '  var _im = {};\n';
    editorScript += '  try { _im = JSON.parse(decodeURIComponent(escape(atob("' + imageMapB64 + '")))); } catch(e) { console.log("Map error:", e); }\n';
    editorScript += '  function resolveImg(src) {\n';
    editorScript += '    if (!src || src.startsWith("data:")) return src;\n';
    editorScript += '    var candidates = [src, src.split("/").pop()];\n';
    editorScript += '    try { candidates.push(decodeURIComponent(src)); candidates.push(decodeURIComponent(src).split("/").pop()); } catch(e){}\n';
    editorScript += '    for (var i=0; i<candidates.length; i++) { if (_im[candidates[i]]) return _im[candidates[i]]; }\n';
    editorScript += '    return src;\n';
    editorScript += '  }\n';
    editorScript += '  setTimeout(function() {\n';
    editorScript += '    document.querySelectorAll("img").forEach(function(img) {\n';
    editorScript += '      var src = img.getAttribute("src");\n';
    editorScript += '      var resolved = resolveImg(src);\n';
    editorScript += '      if (resolved && resolved !== src) { img.setAttribute("src", resolved); }\n';
    editorScript += '    });\n';
    editorScript += '  }, 100);\n';

    if (dbContent) {
      editorScript += '  var _db = {};\n';
      editorScript += '  try { _db = JSON.parse(decodeURIComponent(escape(atob("' + dbB64 + '")))); } catch(e) { console.log("DB error:", e); }\n';
      editorScript += '  var _origFetch = window.fetch;\n';
      editorScript += '  window.fetch = function(url, opts) {\n';
      editorScript += '    var urlStr = url ? url.toString() : "";\n';
      editorScript += '    if (urlStr.includes("db.json")) {\n';
      editorScript += '      return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve(_db); }, text: function() { return Promise.resolve(JSON.stringify(_db)); } });\n';
      editorScript += '    }\n';
      editorScript += '    return _origFetch ? _origFetch(url, opts) : Promise.reject(new Error("no fetch"));\n';
      editorScript += '  };\n';
    }

    editorScript += '  window.__setupEdit = function() {\n';
    editorScript += '    if (window.__editMode) return;\n';
    editorScript += '    window.__editMode = true;\n';
    editorScript += '    var style = document.createElement("style");\n';
    editorScript += '    style.id = "editor-style";\n';
    editorScript += '    style.textContent = "[data-editable]:hover { outline: 2px dashed #3b82f6 !important; background: rgba(59, 130, 246, 0.1) !important; cursor: text !important; } img[data-editable]:hover { outline: 2px dashed #f59e0b !important; background: rgba(245, 158, 11, 0.2) !important; cursor: pointer !important; }";\n';
    editorScript += '    document.head.appendChild(style);\n';
    editorScript += '    var editables = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, div, img, li, a, button");\n';
    editorScript += '    editables.forEach(function(el) {\n';
    editorScript += '      var hasText = el.textContent && el.textContent.trim();\n';
    editorScript += '      if (hasText || el.tagName === "IMG") { el.setAttribute("data-editable", "true"); }\n';
    editorScript += '    });\n';
    editorScript += '    window.__textClickHandler = function(e) {\n';
    editorScript += '      var tgt = e.target;\n';
    editorScript += '      if (tgt.hasAttribute("data-editable") && tgt.tagName !== "IMG") {\n';
    editorScript += '        e.preventDefault();\n';
    editorScript += '        e.stopPropagation();\n';
    editorScript += '        var oldText = tgt.textContent;\n';
    editorScript += '        var newText = prompt("Éditer le texte :", oldText);\n';
    editorScript += '        if (newText !== null && newText !== oldText) { tgt.textContent = newText; }\n';
    editorScript += '      }\n';
    editorScript += '    };\n';
    editorScript += '    window.__imgClickHandler = function(e) {\n';
    editorScript += '      var tgt = e.target;\n';
    editorScript += '      if (tgt.hasAttribute("data-editable") && tgt.tagName === "IMG") {\n';
    editorScript += '        e.preventDefault();\n';
    editorScript += '        e.stopPropagation();\n';
    editorScript += '        var input = document.createElement("input");\n';
    editorScript += '        input.type = "file";\n';
    editorScript += '        input.accept = "image/*";\n';
    editorScript += '        input.onchange = function(ev) {\n';
    editorScript += '          var file = ev.target.files[0];\n';
    editorScript += '          if (!file) return;\n';
    editorScript += '          var reader = new FileReader();\n';
    editorScript += '          reader.onload = function(re) { tgt.src = re.target.result; };\n';
    editorScript += '          reader.readAsDataURL(file);\n';
    editorScript += '        };\n';
    editorScript += '        input.click();\n';
    editorScript += '      }\n';
    editorScript += '    };\n';
    editorScript += '    document.addEventListener("click", window.__textClickHandler, true);\n';
    editorScript += '    document.addEventListener("click", window.__imgClickHandler, true);\n';
    editorScript += '  };\n';
    editorScript += '  window.__disableEdit = function() {\n';
    editorScript += '    var style = document.getElementById("editor-style");\n';
    editorScript += '    if (style) style.remove();\n';
    editorScript += '    document.querySelectorAll("[data-editable]").forEach(function(el) { el.removeAttribute("data-editable"); });\n';
    editorScript += '    if (window.__textClickHandler) { document.removeEventListener("click", window.__textClickHandler, true); }\n';
    editorScript += '    if (window.__imgClickHandler) { document.removeEventListener("click", window.__imgClickHandler, true); }\n';
    editorScript += '    window.__editMode = false;\n';
    editorScript += '  };\n';
    editorScript += '})();\n';
    editorScript += '</script>\n';

    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', editorScript + '</body>');
    } else if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', editorScript + '</head>');
    } else {
      htmlContent = editorScript + htmlContent;
    }

    setImportProgress(95);

    const title = htmlFile.name.replace('.html', '');
    setFolderData({ title, preview: htmlContent });
    setIsEditMode(false);

    setImportProgress(100);
    setTimeout(() => {
      setImportProgress(null);
      alert('✅ Site importé : ' + title);
    }, 500);
  };

  const enableEditMode = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    setTimeout(() => {
      try {
        iframe.contentWindow.__setupEdit();
        setIsEditMode(true);
      } catch (err) {
        console.error("Erreur édition:", err);
        alert("❌ Impossible d'initialiser l'édition");
      }
    }, 100);
  };

  const disableEditMode = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    try {
      iframe.contentWindow.__disableEdit();
      setIsEditMode(false);
    } catch (err) {
      console.error("Erreur désactivation:", err);
    }
  };

  const getModifiedHTML = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return '';

    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc) return '';

      const clone = doc.documentElement.cloneNode(true);
      const editorStyle = clone.querySelector('#editor-style');
      if (editorStyle) editorStyle.remove();
      const editorScript = clone.querySelector('#editor-script');
      if (editorScript) editorScript.remove();
      const appPatch = clone.querySelector('#app-patch');
      if (appPatch) appPatch.remove();
      clone.querySelectorAll('[data-editable]').forEach(el => {
        el.removeAttribute('data-editable');
      });

      return clone.outerHTML;
    } catch (err) {
      console.error("Erreur getModifiedHTML:", err);
      return '';
    }
  };

  const handleExportHTML = () => {
    const html = getModifiedHTML();
    if (!html) return alert("❌ Impossible d'exporter le HTML");
    const blob = new Blob(['<!DOCTYPE html>\n' + html], { type: 'text/html' });
    saveAs(blob, (folderData?.title || 'site') + '-modifie.html');
  };

  const handleExportZip = async () => {
    const html = getModifiedHTML();
    if (!html) return alert("❌ Impossible d'exporter le ZIP");

    setExportProgress(0);
    const zip = new JSZip();
    const siteName = folderData?.title || 'site';
    const folder = zip.folder(siteName);

    const parser = new DOMParser();
    const clone = parser.parseFromString(html, 'text/html').documentElement;
    setExportProgress(5);

    setExportProgress(20);
    let cssContent = '';
    let styleIndex = 1;
    clone.querySelectorAll('style').forEach((s) => {
      if (s.id !== 'editor-style') {
        cssContent += '/* === Style ' + styleIndex + ' === */\n' + s.textContent + '\n\n';
        styleIndex++;
        s.remove();
      }
    });
    if (cssContent) {
      const cloneHead = clone.querySelector('head');
      if (cloneHead) cloneHead.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="style.css">');
      folder.file('style.css', cssContent);
    }

    const imgs = Array.from(clone.querySelectorAll('img[src^="data:"]'));
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const src = img.getAttribute('src');
      const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const fileName = 'images/image-' + (i + 1) + '.' + ext;
        folder.file(fileName, match[2], { base64: true });
        img.setAttribute('src', fileName);
      }
    }

    setExportProgress(70);

    const finalHTML = clone.outerHTML;
    folder.file('index.html', '<!DOCTYPE html>\n' + finalHTML);

    setExportProgress(80);

    const blob = await zip.generateAsync({ type: 'blob' });
    setExportProgress(100);

    setTimeout(() => {
      saveAs(blob, siteName + '.zip');
      setExportProgress(null);
    }, 300);
  };

  return (
    <div style={{ padding: '2rem', background: '#f9fafb', minHeight: '100vh' }}>
      <section style={{ maxWidth: '1200px', margin: '0 auto', background: '#fff', borderRadius: '8px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>✏️ Éditeur de site</h1>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            Importer un dossier (Ctrl+Clic sur dossier) :
          </label>
          <input
            type="file"
            webkitdirectory="true"
            onChange={handleFolderChange}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }}
          />
        </div>

        {importProgress !== null && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#0369a1', fontWeight: '600' }}>
              <span>
                ⏳{' '}
                {importProgress < 10 ? 'Lecture des fichiers...'
                  : importProgress < 50 ? 'Traitement des images...'
                  : importProgress < 80 ? 'Génération de l\'aperçu...'
                  : importProgress < 100 ? 'Préparation de l\'édition...'
                  : 'Finalisation...'}
              </span>
              <span>{importProgress}%</span>
            </div>
            <div style={{ background: '#cffafe', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: importProgress + '%',
                background: '#0369a1',
                borderRadius: '999px',
                transition: 'width 0.2s ease'
              }} />
            </div>
          </div>
        )}

        {folderData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isEditMode ? (
                <button onClick={enableEditMode} style={{ padding: '0.5rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  ✏️ Mode Édition
                </button>
              ) : (
                <button onClick={disableEditMode} style={{ padding: '0.5rem 1.2rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  ⏹️ Arrêter l'édition
                </button>
              )}
              <button onClick={handleExportHTML} style={{ padding: '0.5rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                📄 Exporter HTML
              </button>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={handleExportZip}
                  disabled={exportProgress !== null}
                  style={{
                    padding: '0.5rem 1.2rem',
                    background: exportProgress !== null ? '#6d28d9' : '#8b5cf6',
                    color: 'white', border: 'none', borderRadius: '6px',
                    cursor: exportProgress !== null ? 'not-allowed' : 'pointer',
                    minWidth: '160px', position: 'relative', overflow: 'hidden', fontWeight: '600'
                  }}
                >
                  {exportProgress !== null && (
                    <span style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: exportProgress + '%',
                      background: 'rgba(255,255,255,0.25)',
                      transition: 'width 0.3s ease',
                      borderRadius: '6px'
                    }} />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {exportProgress === null
                      ? '📦 Exporter ZIP'
                      : exportProgress === 100
                        ? '✅ Téléchargement...'
                        : '⏳ ' + exportProgress + '%'}
                  </span>
                </button>
              </div>
              {isEditMode && (
                <span style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '6px', fontSize: '0.85rem', color: '#92400e', alignSelf: 'center', fontWeight: '600' }}>
                  💡 Cliquez sur un texte pour l'éditer • Cliquez sur une image pour la remplacer
                </span>
              )}
            </div>

            {exportProgress !== null && (
              <div style={{ marginBottom: '0.75rem', padding: '1rem', background: '#f3f4f6', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem', color: '#555', fontWeight: '600' }}>
                  <span>
                    {exportProgress < 5 ? '🔧 Initialisation...'
                      : exportProgress < 20 ? '🧹 Nettoyage du HTML...'
                      : exportProgress < 70 ? '🖼️ Traitement des images...'
                      : exportProgress < 80 ? '📁 Ajout des assets...'
                      : exportProgress < 100 ? '🗜️ Compression ZIP...'
                      : '✅ Finalisation...'}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#8b5cf6' }}>{exportProgress}%</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: exportProgress + '%',
                    background: exportProgress === 100 ? '#10b981' : '#8b5cf6',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              srcDoc={folderData.preview}
              style={{
                width: '100%', height: '600px',
                border: isEditMode ? '2px solid #3b82f6' : '1px solid #ccc',
                borderRadius: '6px'
              }}
              title="Aperçu du site"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            />
          </div>
        )}
      </section>
    </div>
  );
}
