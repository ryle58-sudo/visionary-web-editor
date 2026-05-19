export const btoa_utf8 = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return '';
  }
};

export const findInFileMap = (fileMap, path) => {
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

export const processHTML = (htmlContent, fileMap, findFn) => {
  let html = htmlContent;

  html = html.replace(/<script[^>]*id=["']app-patch["'][^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*id=["']editor-script["'][^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]+src=["'][^"']*(?:@vite|@react-refresh|localhost:\d+)[^"']*["'][^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]+type=["']module["'][^>]*src=["'][^"']*localhost[^"']*["'][^>]*><\/script>/gi, '');

  html = html.replace(
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
    (match, cssPath) => {
      if (cssPath.startsWith('http')) return match;
      const css = findFn(fileMap, cssPath);
      return css ? '<style>' + css + '</style>' : match;
    }
  );

  html = html.replace(
    /src=["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
    (match, imgPath) => {
      if (imgPath.startsWith('data:') || imgPath.startsWith('http')) return match;
      const base64 = findFn(fileMap, imgPath);
      return base64 ? 'src="' + base64 + '"' : match;
    }
  );

  html = html.replace(
    /<script([^>]+)src=["']([^"']+\.js)["'][^>]*><\/script>/gi,
    (match, attrs, jsPath) => {
      if (jsPath.startsWith('http') || jsPath.startsWith('//')) return match;
      const js = findFn(fileMap, jsPath);
      return js ? '<script' + attrs + '>' + js + '</script>' : match;
    }
  );

  return html;
};

export const buildImageMap = (fileMap) => {
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
  return imageMap;
};
