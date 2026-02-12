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
    project.structure.chapters.forEach((c) => {
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
    project.structure.chapters.forEach((c) => {
        txt += `\n${'─'.repeat(40)}\n${c.title}\n${'─'.repeat(40)}\n\n`;
        c.sections.forEach(s => {
            if (s.content) {
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

    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

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

    zip.file('OEBPS/style.css', `
body { font-family: serif; line-height: 1.8; margin: 1em; color: #222; }
h1 { font-size: 1.8em; margin-top: 2em; margin-bottom: 0.5em; text-align: center; }
h2 { font-size: 1.3em; margin-top: 1.5em; margin-bottom: 0.3em; }
h3 { font-size: 1.1em; margin-top: 1em; }
p { text-indent: 2em; margin: 0.5em 0; text-align: justify; }
blockquote { margin: 1em 2em; font-style: italic; border-left: 3px solid #ccc; padding-left: 1em; }
`);

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

    project.structure.chapters.forEach((chapter) => {
        children.push(
            new Paragraph({
                text: chapter.title,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 600, after: 300 },
            })
        );

        chapter.sections.forEach(section => {
            if (!section.content) return;

            children.push(
                new Paragraph({
                    text: section.title,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 },
                })
            );

            const lines = section.content.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

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

// ─── PDF Export (captures the actual rendered preview from BookDesigner) ───

export async function exportPDF(project: BookProject) {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const title = project.settings.title;
    const filename = sanitizeFilename(title);

    // Find the actual rendered preview container in the DOM
    const container = document.getElementById('book-preview-container');
    if (!container) {
        alert('請先切換到「設計與出版」頁面再匯出 PDF');
        return;
    }

    // A4 page dimensions
    const PAGE_W_MM = 210;
    const PAGE_H_MM = 297;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Collect all renderable page elements from the preview DOM
    // Structure: cover (.page-break), TOC (.page-break),
    // chapter wrappers containing title page (.page-break) + content div,
    // back cover (.page-break)
    const allElements: HTMLElement[] = [];

    const children = Array.from(container.children) as HTMLElement[];
    for (const child of children) {
        if (child.classList.contains('page-break')) {
            allElements.push(child);
        } else {
            // Chapter wrapper — contains title page + content div
            const subChildren = Array.from(child.children) as HTMLElement[];
            for (const sub of subChildren) {
                allElements.push(sub);
            }
        }
    }

    if (allElements.length === 0) {
        alert('沒有找到可匯出的頁面內容');
        return;
    }

    // Save scroll state
    const scrollParent = container.closest('.overflow-y-auto') as HTMLElement;
    const savedScroll = scrollParent?.scrollTop || 0;

    // Background color from the container's computed style
    const containerStyle = window.getComputedStyle(container);
    const bgColor = containerStyle.backgroundColor || '#fdfbf7';

    let isFirstPage = true;

    for (const el of allElements) {
        if (el.offsetHeight < 10) continue;

        try {
            // Capture the element as-is from the rendered preview
            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: bgColor,
                width: el.offsetWidth,
                height: el.offsetHeight,
                scrollX: 0,
                scrollY: 0,
                windowWidth: el.offsetWidth,
            });

            const imgW = canvas.width;
            const imgH = canvas.height;

            // Scale to fit page width
            const pdfW = PAGE_W_MM;
            const scaleFactor = pdfW / imgW;
            const pdfH = imgH * scaleFactor;

            if (pdfH <= PAGE_H_MM) {
                // Fits in one page
                if (!isFirstPage) doc.addPage();
                doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, pdfH);
                isFirstPage = false;
            } else {
                // Content spans multiple pages — slice the canvas
                const pagesNeeded = Math.ceil(pdfH / PAGE_H_MM);
                const sliceHeightPx = Math.floor(imgH / pagesNeeded);

                for (let p = 0; p < pagesNeeded; p++) {
                    if (!isFirstPage) doc.addPage();

                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = imgW;
                    const thisSliceH = Math.min(sliceHeightPx, imgH - p * sliceHeightPx);
                    sliceCanvas.height = thisSliceH;

                    const ctx = sliceCanvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                        ctx.drawImage(
                            canvas,
                            0, p * sliceHeightPx,
                            imgW, thisSliceH,
                            0, 0,
                            imgW, thisSliceH
                        );
                    }

                    const slicePdfH = thisSliceH * scaleFactor;
                    doc.addImage(
                        sliceCanvas.toDataURL('image/jpeg', 0.92),
                        'JPEG', 0, 0, pdfW, Math.min(slicePdfH, PAGE_H_MM)
                    );
                    isFirstPage = false;
                }
            }
        } catch (e) {
            console.error('Error rendering page element:', e);
        }
    }

    // Restore scroll position
    if (scrollParent) scrollParent.scrollTop = savedScroll;

    doc.save(`${filename}.pdf`);
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

            const html = escapeHtml(trimmed)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            return `<p>${html}</p>`;
        })
        .join('\n');
}
