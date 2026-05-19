import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { btoa_utf8, findInFileMap, processHTML, buildImageMap } from '../utils/fileProcessing';
import { generateEditorScript } from '../utils/editorScript';

export default function useWebsiteEditor() {
  const [folderData, setFolderData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const iframeRef = useRef(null);
  const assetsRef = useRef({});

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
      return alert('No index.html file found!');
    }

    let htmlContent = findInFileMap(fileMap, htmlFile.name);
    setImportProgress(55);

    htmlContent = processHTML(htmlContent, fileMap, findInFileMap);
    setImportProgress(80);

    const imageMap = buildImageMap(fileMap);

    const dbFile = files.find(f => f.name === 'db.json');
    let dbContent = null;
    if (dbFile) {
      const raw = findInFileMap(fileMap, 'db.json');
      try { JSON.parse(raw); dbContent = raw; } catch (e) {}
    }

    setImportProgress(90);

    const imageMapB64 = btoa_utf8(JSON.stringify(imageMap));
    const dbB64 = btoa_utf8(dbContent || '{}');

    const editorScript = generateEditorScript(imageMapB64, dbB64, !!dbContent);

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
    setTimeout(() => setImportProgress(null), 500);
  };

  const enableEditMode = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    setTimeout(() => {
      try {
        iframe.contentWindow.__onEditRequest = (info) => {
          setEditModal({ element: info.element, currentValue: info.currentValue });
        };
        iframe.contentWindow.__setupEdit();
        setIsEditMode(true);
      } catch (err) {
        console.error('Edit mode error:', err);
      }
    }, 100);
  };

  const disableEditMode = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.__disableEdit();
      setIsEditMode(false);
    } catch (err) {
      console.error('Disable edit error:', err);
    }
  };

  const applyTextEdit = (newText) => {
    if (!editModal) return;
    try {
      editModal.element.textContent = newText;
    } catch (e) {}
    setEditModal(null);
  };

  const getModifiedHTML = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return '';
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc) return '';
      const clone = doc.documentElement.cloneNode(true);
      clone.querySelector('#editor-style')?.remove();
      clone.querySelector('#editor-script')?.remove();
      clone.querySelector('#app-patch')?.remove();
      clone.querySelectorAll('[data-editable]').forEach(el => el.removeAttribute('data-editable'));
      return clone.outerHTML;
    } catch (err) {
      return '';
    }
  };

  const handleExportHTML = () => {
    const html = getModifiedHTML();
    if (!html) return;
    const blob = new Blob(['<!DOCTYPE html>\n' + html], { type: 'text/html' });
    saveAs(blob, (folderData?.title || 'site') + '-modified.html');
  };

  const handleExportZip = async () => {
    const html = getModifiedHTML();
    if (!html) return;

    setExportProgress(0);
    const zip = new JSZip();
    const siteName = folderData?.title || 'site';
    const folder = zip.folder(siteName);

    const parser = new DOMParser();
    const clone = parser.parseFromString(html, 'text/html').documentElement;
    setExportProgress(5);

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
      clone.querySelector('head')?.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="style.css">');
      folder.file('style.css', cssContent);
    }
    setExportProgress(20);

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
      setExportProgress(20 + Math.round((i + 1) / imgs.length * 50));
    }

    setExportProgress(75);
    folder.file('index.html', '<!DOCTYPE html>\n' + clone.outerHTML);
    setExportProgress(85);

    const blob = await zip.generateAsync({ type: 'blob' });
    setExportProgress(100);
    setTimeout(() => {
      saveAs(blob, siteName + '.zip');
      setExportProgress(null);
    }, 300);
  };

  return {
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
    cancelEditModal: () => setEditModal(null),
    handleExportHTML,
    handleExportZip,
  };
}
