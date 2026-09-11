const BINARY_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const IMAGE_EXTENSIONS = [...BINARY_EXTENSIONS, 'svg'];
const HTML_EXTENSIONS = ['html', 'htm'];

export const DOCUMENT_IMPORT_ACCEPT = '.md,.html,.htm,.svg,.png,.jpg,.jpeg,.gif,.webp,text/markdown,text/html,image/*';

const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';

export const isImageDocument = (name: string) => IMAGE_EXTENSIONS.includes(extensionOf(name));

// Binary documents are transported/stored as base64 since they may contain non-UTF-8 bytes.
export const isBinaryDocument = (name: string) => BINARY_EXTENSIONS.includes(extensionOf(name));

export const isHtmlDocument = (name: string) => HTML_EXTENSIONS.includes(extensionOf(name));

export const isSupportedDocumentName = (name: string) =>
  ['md', ...HTML_EXTENSIONS, ...IMAGE_EXTENSIONS].includes(extensionOf(name));

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
