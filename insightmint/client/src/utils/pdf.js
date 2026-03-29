import jsPDF from 'jspdf';

// Strip emojis and special unicode — jsPDF only supports latin characters
const clean = (str) => {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')   // emoji ranges
    .replace(/[\u{2600}-\u{26FF}]/gu, '')       // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')       // dingbats
    .replace(/[^\x00-\xFF]/g, '')               // any remaining non-latin
    .replace(/\s{2,}/g, ' ')                    // collapse multiple spaces
    .trim();
};

const addPage = (doc) => { doc.addPage(); return 25; };

const checkY = (doc, y, needed = 15) => {
  if (y + needed > 275) return addPage(doc);
  return y;
};

const writeLine = (doc, text, x, y, maxWidth) => {
  const lines = doc.splitTextToSize(clean(text), maxWidth);
  lines.forEach(line => { doc.text(line, x, y); y += 6; });
  return { y, lines: lines.length };
};

export const downloadNotesPDF = (topic, summary, studyNotes, options = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 20;
  const cw     = pageW - margin * 2;
  let y        = 0;

  // ── Header banner ──────────────────────────────────────
  doc.setFillColor(14, 116, 144);
  doc.rect(0, 0, pageW, 50, 'F');

  // Accent strip
  doc.setFillColor(20, 184, 166);
  doc.rect(0, 46, pageW, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('InsightMint Study Notes', margin, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Topic: ${clean(topic)}`, margin, 32);

  doc.setFontSize(9);
  doc.setTextColor(200, 240, 240);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}`, margin, 42);

  y = 62;

  // ── Summary section ────────────────────────────────────
  if (summary) {
    // Section label
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(margin - 2, y - 6, cw + 4, 12, 2, 2, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text('Summary', margin + 2, y + 1);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 60);
    const summaryLines = doc.splitTextToSize(clean(summary), cw);
    summaryLines.forEach(line => {
      y = checkY(doc, y);
      doc.text(line, margin, y);
      y += 6;
    });
    y += 6;
  }

  // ── Key Points ────────────────────────────────────────
  if (options?.keyPoints?.length || studyNotes?.keyPoints?.length) {
    const kps = options?.keyPoints || studyNotes?.keyPoints || [];
    y = checkY(doc, y, 20);

    doc.setFillColor(240, 253, 250);
    doc.roundedRect(margin - 2, y - 6, cw + 4, 12, 2, 2, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text('Key Points', margin + 2, y + 1);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 60);
    kps.forEach((pt, i) => {
      y = checkY(doc, y);
      const txt = doc.splitTextToSize(`${i + 1}. ${clean(pt)}`, cw - 5);
      txt.forEach(line => { doc.text(line, margin + 4, y); y += 6; });
    });
    y += 4;
  }

  // ── Study Notes sections ──────────────────────────────
  const sections = options?.sections || studyNotes?.sections;
  if (sections?.length) {
    y = checkY(doc, y, 20);

    doc.setFillColor(240, 253, 250);
    doc.roundedRect(margin - 2, y - 6, cw + 4, 12, 2, 2, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text('Study Notes', margin + 2, y + 1);
    y += 12;

    sections.forEach((sec, idx) => {
      y = checkY(doc, y, 18);

      // Section title
      doc.setFillColor(224, 247, 250);
      doc.rect(margin - 2, y - 5, cw + 4, 9, 'F');
      doc.setFillColor(14, 116, 144);
      doc.rect(margin - 2, y - 5, 3, 9, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(14, 116, 144);
      doc.text(clean(sec.title || `Section ${idx + 1}`), margin + 4, y + 1);
      y += 10;

      // Section content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 70);
      const lines = doc.splitTextToSize(clean(sec.content || ''), cw - 4);
      lines.forEach(line => {
        y = checkY(doc, y);
        doc.text(line, margin + 2, y);
        y += 6;
      });
      y += 6;
    });
  }

  // ── Footer on every page ──────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer bar
    doc.setFillColor(245, 250, 252);
    doc.rect(0, 284, pageW, 13, 'F');
    doc.setDrawColor(200, 230, 235);
    doc.line(0, 284, pageW, 284);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 150, 160);
    doc.text('InsightMint — AI-Powered Learning Platform', margin, 291);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin - 18, 291);
  }

  const filename = `InsightMint_${clean(topic).replace(/\s+/g, '_')}_Notes.pdf`;
  doc.save(filename);
};