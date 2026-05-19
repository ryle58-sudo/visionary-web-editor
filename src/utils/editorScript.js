export const generateEditorScript = (imageMapB64, dbB64, hasDb) => {
  return `<script id="editor-script" data-internal="true">
(function() {
  "use strict";
  if (window.__editorLoaded) return;
  window.__editorLoaded = true;
  window.__editMode = false;
  var _im = {};
  try { _im = JSON.parse(decodeURIComponent(escape(atob("${imageMapB64}")))); } catch(e) {}
  function resolveImg(src) {
    if (!src || src.startsWith("data:")) return src;
    var candidates = [src, src.split("/").pop()];
    try { candidates.push(decodeURIComponent(src)); candidates.push(decodeURIComponent(src).split("/").pop()); } catch(e) {}
    for (var i = 0; i < candidates.length; i++) { if (_im[candidates[i]]) return _im[candidates[i]]; }
    return src;
  }
  setTimeout(function() {
    document.querySelectorAll("img").forEach(function(img) {
      var src = img.getAttribute("src");
      var resolved = resolveImg(src);
      if (resolved && resolved !== src) img.setAttribute("src", resolved);
    });
  }, 100);
  ${hasDb ? `
  var _db = {};
  try { _db = JSON.parse(decodeURIComponent(escape(atob("${dbB64}")))); } catch(e) {}
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    var urlStr = url ? url.toString() : "";
    if (urlStr.includes("db.json")) {
      return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve(_db); }, text: function() { return Promise.resolve(JSON.stringify(_db)); } });
    }
    return _origFetch ? _origFetch(url, opts) : Promise.reject(new Error("no fetch"));
  };` : ''}
  window.__setupEdit = function(onEditRequest) {
    if (window.__editMode) return;
    window.__editMode = true;
    var style = document.createElement("style");
    style.id = "editor-style";
    style.textContent = "[data-editable]:hover { outline: 2px dashed #3b82f6 !important; background: rgba(59,130,246,0.08) !important; cursor: text !important; } img[data-editable]:hover { outline: 2px dashed #f59e0b !important; background: rgba(245,158,11,0.12) !important; cursor: pointer !important; }";
    document.head.appendChild(style);
    document.querySelectorAll("p,h1,h2,h3,h4,h5,h6,span,div,img,li,a,button").forEach(function(el) {
      if ((el.textContent && el.textContent.trim()) || el.tagName === "IMG") el.setAttribute("data-editable", "true");
    });
    window.__textClickHandler = function(e) {
      var tgt = e.target;
      if (tgt.hasAttribute("data-editable") && tgt.tagName !== "IMG") {
        e.preventDefault();
        e.stopPropagation();
        if (window.__onEditRequest) {
          window.__onEditRequest({ type: "text", element: tgt, currentValue: tgt.textContent });
        }
      }
    };
    window.__imgClickHandler = function(e) {
      var tgt = e.target;
      if (tgt.hasAttribute("data-editable") && tgt.tagName === "IMG") {
        e.preventDefault();
        e.stopPropagation();
        var input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = function(ev) {
          var file = ev.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function(re) { tgt.src = re.target.result; };
          reader.readAsDataURL(file);
        };
        input.click();
      }
    };
    document.addEventListener("click", window.__textClickHandler, true);
    document.addEventListener("click", window.__imgClickHandler, true);
  };
  window.__disableEdit = function() {
    var s = document.getElementById("editor-style");
    if (s) s.remove();
    document.querySelectorAll("[data-editable]").forEach(function(el) { el.removeAttribute("data-editable"); });
    if (window.__textClickHandler) document.removeEventListener("click", window.__textClickHandler, true);
    if (window.__imgClickHandler) document.removeEventListener("click", window.__imgClickHandler, true);
    window.__editMode = false;
  };
  window.__applyTextEdit = function(selector, newText) {};
})();
</script>`;
};
