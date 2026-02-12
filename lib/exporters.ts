/**
 * Multi-format book exporter
 * Supports: EPUB, PDF, DOCX, Markdown, TXT
 */

import { BookProject } from '@/types';
import { saveAs } from 'file-saver';

// ─── Helpers ───

function sanitizeFilename(title: string): string {
    return title.replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff-]/g, '_').slice(0, 80);
}

function buildMarkdown(project: BookProject): string {
    let md = `# ${project.settings.title}\n\n`;
    if (project.settings.authorName) {
        md += `**${project.settings.authorName}**\n\n---\n\n`;
    }
    project.structure.chapters.forEach((c, ci) => {
        md += `## ${c.title}\n\n`;
        c.sections.forEach(s => {
            if (s.content) {
                md += `### ${s.title}\n\n${s.content}\n\n`;
            }
        });
    });
    return md;
}

function buildPlainText(project: BookProject): string {
    let txt = `${project.settings.title}\n${'='.repeat(project.settings.title.length)}\n\n`;
    if (project.settings.authorName) {
        txt += `作者 / Author: ${project.settings.authorName}\n\n`;
    }
    project.structure.chapters.forEach((c, ci) => {
        txt += `\n${'─'.repeat(40)}\n${c.title}\n${'─'.repeat(40)}\n\n`;
        c.sections.forEach(s => {
            if (s.content) {
                // Strip markdown formatting for plain text
                const plain = s.content
                    .replace(/#{1,6}\s/g, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/`(.*?)`/g, '$1')
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1');
                txt += `${s.title}\n\n${plain}\n\n`;
            }
        });
    });
    return txt;
}

// ─── Markdown Export ───

export function exportMarkdown(project: BookProject) {
    const md = buildMarkdown(project);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${sanitizeFilename(project.settings.title)}.md`);
}

// ─── TXT Export ───

export function exportTXT(project: BookProject) {
    const txt = buildPlainText(project);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${sanitizeFilename(project.settings.title)}.txt`);
}

// ─── EPUB Export ───

export async function exportEPUB(project: BookProject) {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const title = project.settings.title;
    const author = project.settings.authorName || 'Unknown';
    const bookId = `omniscribe-${Date.now()}`;

    // mimetype (must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    // Build chapter XHTML files
    const chapters = project.structure.chapters;
    const chapterFiles: { id: string; filename: string; title: string }[] = [];

    chapters.forEach((chapter, ci) => {
        const filename = `chapter_${ci + 1}.xhtml`;
        const id = `chapter_${ci + 1}`;
        let body = `<h1>${escapeHtml(chapter.title)}</h1>\n`;
        chapter.sections.forEach(s => {
            if (s.content) {
                body += `<h2>${escapeHtml(s.title)}</h2>\n`;
                body += markdownToBasicHtml(s.content);
            }
        });

        zip.file(`OEBPS/${filename}`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh">
<head>
  <title>${escapeHtml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${body}
</body>
</html>`);

        chapterFiles.push({ id, filename, title: chapter.title });
    });

    // Stylesheet
    zip.file('OEBPS/style.css', `
body { font-family: serif; line-height: 1.8; margin: 1em; color: #222; }
h1 { font-size: 1.8em; margin-top: 2em; margin-bottom: 0.5em; text-align: center; }
h2 { font-size: 1.3em; margin-top: 1.5em; margin-bottom: 0.3em; }
h3 { font-size: 1.1em; margin-top: 1em; }
p { text-indent: 2em; margin: 0.5em 0; text-align: justify; }
blockquote { margin: 1em 2em; font-style: italic; border-left: 3px solid #ccc; padding-left: 1em; }
`);

    // Title page
    zip.file('OEBPS/title.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh">
<head><title>${escapeHtml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div style="text-align:center; margin-top:40%;">
    <h1 style="font-size:2.5em;">${escapeHtml(title)}</h1>
    ${author !== 'Unknown' ? `<p style="font-size:1.2em; margin-top:1em;">${escapeHtml(author)}</p>` : ''}
  </div>
</body>
</html>`);

    // TOC (NCX for EPUB2 compat)
    const tocNcxItems = chapterFiles.map((ch, i) => `
    <navPoint id="nav_${i}" playOrder="${i + 2}">
      <navLabel><text>${escapeHtml(ch.title)}</text></navLabel>
      <content src="${ch.filename}"/>
    </navPoint>`).join('\n');

    zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
  </head>
  <docTitle><text>${escapeHtml(title)}</text></docTitle>
  <navMap>
    <navPoint id="nav_title" playOrder="1">
      <navLabel><text>Title</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>
${tocNcxItems}
  </navMap>
</ncx>`);

    // content.opf
    const manifestItems = [
        `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`,
        `<item id="style" href="style.css" media-type="text/css"/>`,
        `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
        ...chapterFiles.map(ch => `<item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`)
    ].join('\n    ');

    const spineItems = [
        `<itemref idref="title"/>`,
        ...chapterFiles.map(ch => `<itemref idref="${ch.id}"/>`)
    ].join('\n    ');

    zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${bookId}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:creator>${escapeHtml(author)}</dc:creator>
    <dc:language>zh</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`);

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    saveAs(blob, `${sanitizeFilename(title)}.epub`);
}

// ─── DOCX Export ───

export async function exportDOCX(project: BookProject) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = await import('docx');

    const title = project.settings.title;
    const author = project.settings.authorName || '';

    const children: any[] = [];

    // Title page
    children.push(
        new Paragraph({ text: '', spacing: { before: 4000 } }),
        new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 56, font: 'Times New Roman' })],
            alignment: AlignmentType.CENTER,
        })
    );
    if (author) {
        children.push(
            new Paragraph({ text: '', spacing: { before: 800 } }),
            new Paragraph({
                children: [new TextRun({ text: author, size: 28, font: 'Times New Roman' })],
                alignment: AlignmentType.CENTER,
            })
        );
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // Chapters
    project.structure.chapters.forEach((chapter, ci) => {
        // Chapter heading
        children.push(
            new Paragraph({
                text: chapter.title,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 600, after: 300 },
            })
        );

        chapter.sections.forEach(section => {
            if (!section.content) return;

            // Section heading
            children.push(
                new Paragraph({
                    text: section.title,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 },
                })
            );

            // Parse content into paragraphs
            const lines = section.content.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

                // Headings
                if (trimmed.startsWith('### ')) {
                    children.push(new Paragraph({
                        text: trimmed.replace(/^### /, ''),
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 300, after: 150 },
                    }));
                } else if (trimmed.startsWith('## ')) {
                    children.push(new Paragraph({
                        text: trimmed.replace(/^## /, ''),
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                    }));
                } else if (trimmed.startsWith('# ')) {
                    children.push(new Paragraph({
                        text: trimmed.replace(/^# /, ''),
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 600, after: 300 },
                    }));
                } else if (trimmed.startsWith('> ')) {
                    // Blockquote
                    children.push(new Paragraph({
                        children: [new TextRun({
                            text: trimmed.replace(/^> /, ''),
                            italics: true,
                            size: 22,
                            font: 'Times New Roman',
                        })],
                        indent: { left: 720 },
                        spacing: { before: 100, after: 100 },
                    }));
                } else if (trimmed === '---' || trimmed === '***') {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: '─'.repeat(30), color: 'AAAAAA', size: 20 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 200 },
                    }));
                } else {
                    // Regular paragraph — strip basic markdown
                    const cleaned = trimmed
                        .replace(/\*\*(.*?)\*\*/g, '$1')
                        .replace(/\*(.*?)\*/g, '$1')
                        .replace(/`(.*?)`/g, '$1')
                        .replace(/\[(.*?)\]\(.*?\)/g, '$1');

                    children.push(new Paragraph({
                        children: [new TextRun({
                            text: cleaned,
                            size: 24,
                            font: 'Times New Roman',
                        })],
                        spacing: { before: 80, after: 80 },
                        indent: { firstLine: 480 },
                    }));
                }
            });
        });

        // Page break after each chapter
        children.push(new Paragraph({ children: [new PageBreak()] }));
    });

    const doc = new Document({
        creator: author || 'OmniScribe',
        title: title,
        description: project.settings.topic,
        sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${sanitizeFilename(title)}.docx`);
}

// ─── PDF Export (proper multi-page) ───

export async function exportPDF(project: BookProject) {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const marginX = 25;
    const marginY = 30;
    const contentW = pageW - marginX * 2;
    const lineHeight = 7;
    const title = project.settings.title;
    const author = project.settings.authorName || '';

    let y = marginY;

    const addPage = () => {
        doc.addPage();
        y = marginY;
    };

    const checkNewPage = (needed: number) => {
        if (y + needed > pageH - marginY) {
            addPage();
        }
    };

    // Title page
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    const titleLines = doc.splitTextToSize(title, contentW);
    const titleY = pageH / 3;
    doc.text(titleLines, pageW / 2, titleY, { align: 'center' });

    if (author) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.text(author, pageW / 2, titleY + titleLines.length * 14 + 20, { align: 'center' });
    }

    // Content pages
    project.structure.chapters.forEach((chapter, ci) => {
        addPage();

        // Chapter title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        y = pageH / 3;
        const chTitleLines = doc.splitTextToSize(chapter.title, contentW);
        doc.text(chTitleLines, pageW / 2, y, { align: 'center' });

        addPage();

        chapter.sections.forEach(section => {
            if (!section.content) return;

            // Section title
            checkNewPage(20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            const secTitleLines = doc.splitTextToSize(section.title, contentW);
            doc.text(secTitleLines, marginX, y);
            y += secTitleLines.length * 6 + 5;

            // Section content
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);

            const contentLines = section.content.split('\n');
            contentLines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) {
                    y += 3;
                    return;
                }

                // Strip markdown
                let text = trimmed
                    .replace(/#{1,6}\s/g, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/`(.*?)`/g, '$1')
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                    .replace(/^[>-]\s?/, '');

                if (trimmed.startsWith('#')) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(13);
                }

                const wrapped = doc.splitTextToSize(text, contentW);
                wrapped.forEach((wline: string) => {
                    checkNewPage(lineHeight);
                    doc.text(wline, marginX, y);
                    y += lineHeight;
                });

                if (trimmed.startsWith('#')) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(11);
                }
            });

            y += 8; // gap between sections
        });
    });

    doc.save(`${sanitizeFilename(title)}.pdf`);
}

// ─── Utility ───

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function markdownToBasicHtml(md: string): string {
    return md
        .split('\n\n')
        .map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('### '))
                return `<h3>${escapeHtml(trimmed.replace(/^### /, ''))}</h3>`;
            if (trimmed.startsWith('## '))
                return `<h2>${escapeHtml(trimmed.replace(/^## /, ''))}</h2>`;
            if (trimmed.startsWith('# '))
                return `<h1>${escapeHtml(trimmed.replace(/^# /, ''))}</h1>`;
            if (trimmed.startsWith('> '))
                return `<blockquote><p>${escapeHtml(trimmed.replace(/^> /gm, ''))}</p></blockquote>`;
            if (trimmed === '---' || trimmed === '***')
                return '<hr/>';

            // Regular paragraph — handle inline markdown
            const html = escapeHtml(trimmed)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            return `<p>${html}</p>`;
        })
        .join('\n');
}
