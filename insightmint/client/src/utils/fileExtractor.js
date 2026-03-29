/**
 * Extracts readable text from uploaded files
 * - PDF: uses pdf.js via CDN
 * - DOCX: extracts XML text
 * - TXT/MD: plain read
 * - Images: returns description prompt
 */

// Extract text from PDF using PDF.js
async function extractPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Dynamically load pdf.js from CDN
        if (!window.pdfjsLib) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const typedArray = new Uint8Array(e.target.result);
        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
        
        let fullText = '';
        const totalPages = Math.min(pdf.numPages, 20); // max 20 pages
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += `\n--- Page ${pageNum} ---\n${pageText}`;
        }

        if (pdf.numPages > 20) {
          fullText += `\n\n[Note: Document has ${pdf.numPages} pages. Showing first 20 pages only.]`;
        }

        resolve(fullText.trim() || 'No readable text found in PDF.');
      } catch (err) {
        reject(new Error('Failed to extract PDF text: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Extract text from DOCX (basic XML extraction)
async function extractDOCX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Load JSZip from CDN
        if (!window.JSZip) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        }

        const zip = await window.JSZip.loadAsync(e.target.result);
        const docXml = await zip.file('word/document.xml')?.async('string');
        
        if (!docXml) {
          resolve('Could not extract text from DOCX file.');
          return;
        }

        // Strip XML tags and clean up text
        const text = docXml
          .replace(/<w:p[^>]*>/g, '\n')
          .replace(/<w:br[^>]*>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        resolve(text || 'No readable text found in DOCX.');
      } catch (err) {
        reject(new Error('Failed to extract DOCX text: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Load a script dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// Main export
export async function extractTextFromFile(file) {
  const type = file.type;
  const name = file.name.toLowerCase();

  // Plain text / markdown
  if (type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  // PDF
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractPDF(file);
  }

  // DOCX
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
    return extractDOCX(file);
  }

  // DOC (old format - limited support)
  if (type === 'application/msword' || name.endsWith('.doc')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        // Try to extract any readable text from binary
        const text = e.target.result;
        const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();
        resolve(cleaned.length > 100 ? cleaned : 'Limited text extraction for .doc format. Consider converting to .docx or .pdf for better results.');
      };
      reader.onerror = () => reject(new Error('Failed to read DOC file'));
      reader.readAsText(file, 'latin1');
    });
  }

  // Images — return base64 data URL so server can use vision model
  if (type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        // Return special marker with base64 so summarizer can use vision AI
        resolve(`[IMAGE_BASE64:${e.target.result}]`);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Fallback
  return `File: ${file.name} (${file.type || 'unknown type'})\nContent extraction not supported for this file type. Please try PDF, DOCX, or TXT formats.`;
}

export function getFileTypeLabel(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF Document';
  if (name.endsWith('.docx')) return 'Word Document';
  if (name.endsWith('.doc')) return 'Word Document';
  if (name.endsWith('.txt')) return 'Text File';
  if (name.endsWith('.md')) return 'Markdown File';
  if (file.type.startsWith('image/')) return 'Image';
  return 'Document';
}