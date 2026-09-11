const IMAGE_BINARY_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const IMAGE_EXTENSIONS = [...IMAGE_BINARY_EXTENSIONS, 'svg'];
const HTML_EXTENSIONS = ['html', 'htm'];
const WORD_EXTENSIONS = ['doc', 'docx'];

// Binary documents are transported/stored as base64 since they may contain non-UTF-8 bytes.
const BINARY_EXTENSIONS = [...IMAGE_BINARY_EXTENSIONS, ...WORD_EXTENSIONS];

export const DOCUMENT_IMPORT_ACCEPT =
  '.md,.html,.htm,.svg,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,text/markdown,text/html,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Allow any Unicode letter/number (so names like Hebrew or Arabic filenames survive) plus a
// small set of safe punctuation; strip everything else (path separators, control characters, etc.).
export const sanitizeDocumentName = (name: string) => name.replace(/[^\p{L}\p{N}._-]/gu, '-');

export const sanitizeFolderName = (folder: string) => folder.replace(/[^\p{L}\p{N}._/-]/gu, '-');


const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';

export const isImageDocument = (name: string) => IMAGE_EXTENSIONS.includes(extensionOf(name));

// Binary documents are transported/stored as base64 since they may contain non-UTF-8 bytes.
export const isBinaryDocument = (name: string) => BINARY_EXTENSIONS.includes(extensionOf(name));

export const isHtmlDocument = (name: string) => HTML_EXTENSIONS.includes(extensionOf(name));

export const isWordDocument = (name: string) => WORD_EXTENSIONS.includes(extensionOf(name));

export const isSupportedDocumentName = (name: string) =>
  ['md', ...HTML_EXTENSIONS, ...IMAGE_EXTENSIONS, ...WORD_EXTENSIONS].includes(extensionOf(name));

export const mimeTypeForImage = (name: string) => {
  switch (extensionOf(name)) {
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
};

export const mimeTypeForWord = (name: string) =>
  extensionOf(name) === 'docx'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/msword';

export const mimeTypeForDocument = (name: string) => {
  const extension = extensionOf(name);
  if (extension === 'md') {
    return 'text/markdown; charset=utf-8';
  }
  if (HTML_EXTENSIONS.includes(extension)) {
    return 'text/html; charset=utf-8';
  }
  if (WORD_EXTENSIONS.includes(extension)) {
    return mimeTypeForWord(name);
  }
  if (IMAGE_EXTENSIONS.includes(extension)) {
    return mimeTypeForImage(name);
  }
  return 'text/plain; charset=utf-8';
};

// Only the modern .docx (zip/XML) format can be rendered inline; legacy .doc has no browser-side parser.
export const isPreviewableWordDocument = (name: string) => extensionOf(name) === 'docx';

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

// atob() throws synchronously on malformed input (e.g. a document saved before base64 transport
// was introduced, or corrupted content); callers should show an error instead of crashing.
export const tryBase64ToArrayBuffer = (base64: string): ArrayBuffer | null => {
  try {
    return base64ToArrayBuffer(base64);
  } catch {
    return null;
  }
};

// Mammoth only emits a bare HTML fragment, so wrap it with typography so headings/lists/tables
// read like a document instead of plain unstyled text.
export const wrapWordPreviewHtml = (bodyHtml: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body {
    margin: 0;
    padding: 24px;
    color: #201e1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
  }
  h1, h2, h3, h4, h5, h6 { margin: 1.2em 0 0.5em; font-weight: 700; line-height: 1.3; }
  h1 { font-size: 2em; }
  h2 { font-size: 1.6em; }
  h3 { font-size: 1.3em; }
  p { margin: 0 0 1em; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  a { color: #146356; }
  ul, ol { margin: 0 0 1em; padding-left: 1.5em; }
  blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid #d0cdc4; color: #55524a; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }
  th, td { border: 1px solid #d0cdc4; padding: 6px 10px; text-align: left; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;


export const badgeForDocument = (name: string) => {
  const extension = extensionOf(name);
  return (extension || 'md').slice(0, 4).toUpperCase();
};

// Reads a file as text for markdown/HTML/SVG documents, or as base64 for other image formats.
export const readDocumentFile = (file: File): Promise<string> => {
  if (!isBinaryDocument(file.name)) {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};
