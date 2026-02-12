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

// ─── PDF Export (novel-style via html2canvas) ───

export async function exportPDF(project: BookProject) {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const title = project.settings.title;
    const author = project.settings.authorName || '';
    const filename = sanitizeFilename(title);

    // Novel page dimensions (mm) — close to A5 / trade paperback
    const PAGE_W_MM = 140;
    const PAGE_H_MM = 210;
    // Render at 2x for crisp output
    const SCALE = 2;
    const PAGE_W_PX = Math.round(PAGE_W_MM * 3.78 * SCALE); // ~1058px
    const PAGE_H_PX = Math.round(PAGE_H_MM * 3.78 * SCALE); // ~1588px

    const doc = new jsPDF({ unit: 'mm', format: [PAGE_W_MM, PAGE_H_MM] });

    // Create off-screen container
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed; top: -99999px; left: -99999px;
        width: ${PAGE_W_PX}px; pointer-events: none; z-index: -9999;
    `;
    document.body.appendChild(container);

    let pageIndex = 0;

    // Helper: render an HTML string as one PDF page
    const renderPage = async (html: string) => {
        const pageDiv = document.createElement('div');
        pageDiv.innerHTML = html;
        pageDiv.style.cssText = `
            width: ${PAGE_W_PX}px; height: ${PAGE_H_PX}px;
            overflow: hidden; box-sizing: border-box;
            font-family: "Noto Serif TC", "Noto Serif SC", "Noto Serif JP", "Source Han Serif", "Songti SC", "SimSun", Georgia, serif;
        `;
        container.appendChild(pageDiv);
        const canvas = await html2canvas(pageDiv, {
            width: PAGE_W_PX, height: PAGE_H_PX, scale: 1,
            backgroundColor: '#fdfbf7', useCORS: true, logging: false,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (pageIndex > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, PAGE_H_MM);
        pageIndex++;
        container.removeChild(pageDiv);
    };

    // Helper: render long content as multiple pages (auto-paged)
    const renderContentPages = async (html: string, chapterNum: number, startPage: number): Promise<number> => {
        const measureDiv = document.createElement('div');
        measureDiv.innerHTML = html;
        const paddingPx = Math.round(PAGE_W_PX * 0.12);
        measureDiv.style.cssText = `
            width: ${PAGE_W_PX}px; box-sizing: border-box;
            padding: ${paddingPx}px;
            font-family: "Noto Serif TC", "Noto Serif SC", "Noto Serif JP", "Source Han Serif", "Songti SC", "SimSun", Georgia, serif;
            font-size: ${Math.round(16 * SCALE)}px; line-height: 2;
            color: #2d2a2e;
        `;
        container.appendChild(measureDiv);

        // Wait for fonts
        await new Promise(r => setTimeout(r, 100));
        const totalH = measureDiv.scrollHeight;
        const contentH = PAGE_H_PX - paddingPx * 2;
        const numPages = Math.max(1, Math.ceil(totalH / contentH));

        // Render page by page using clip
        for (let p = 0; p < numPages; p++) {
            const clipDiv = document.createElement('div');
            clipDiv.style.cssText = `
                width: ${PAGE_W_PX}px; height: ${PAGE_H_PX}px;
                overflow: hidden; position: relative;
                background: #fdfbf7;
            `;
            const inner = document.createElement('div');
            inner.innerHTML = html;
            inner.style.cssText = `
                width: ${PAGE_W_PX}px; box-sizing: border-box;
                padding: ${paddingPx}px;
                font-family: "Noto Serif TC", "Noto Serif SC", "Noto Serif JP", "Source Han Serif", "Songti SC", "SimSun", Georgia, serif;
                font-size: ${Math.round(16 * SCALE)}px; line-height: 2;
                color: #2d2a2e;
                position: absolute; top: ${-p * contentH}px; left: 0;
            `;
            // Page number
            const pageNum = document.createElement('div');
            pageNum.textContent = `${startPage + p}`;
            pageNum.style.cssText = `
                position: absolute; bottom: ${Math.round(paddingPx * 0.4)}px;
                right: ${paddingPx}px;
                font-size: ${Math.round(12 * SCALE)}px; color: #999;
                font-family: Georgia, serif;
            `;
            clipDiv.appendChild(inner);
            clipDiv.appendChild(pageNum);
            container.appendChild(clipDiv);

            const canvas = await html2canvas(clipDiv, {
                width: PAGE_W_PX, height: PAGE_H_PX, scale: 1,
                backgroundColor: '#fdfbf7', useCORS: true, logging: false,
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            if (pageIndex > 0) doc.addPage();
            doc.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, PAGE_H_MM);
            pageIndex++;
            container.removeChild(clipDiv);
        }

        container.removeChild(measureDiv);
        return numPages;
    };

    // ─── 1. Cover page (full bleed image or styled) ───
    if (project.coverImage) {
        await renderPage(`
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a;">
                <img src="${project.coverImage}" style="max-width:100%; max-height:100%; object-fit:contain;" />
            </div>
        `);
    }

    // ─── 2. Title page ───
    const pad = Math.round(PAGE_W_PX * 0.12);
    await renderPage(`
        <div style="width:100%; height:100%; background:#fdfbf7; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:${pad}px;">
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <h1 style="font-size:${Math.round(36 * SCALE)}px; font-weight:bold; color:#2d2a2e; line-height:1.3; margin:0; font-family:'Noto Serif TC','Songti SC',Georgia,serif;">
                    ${escapeHtml(title)}
                </h1>
                ${author ? `<p style="font-size:${Math.round(18 * SCALE)}px; color:#666; margin-top:${Math.round(30 * SCALE)}px; font-family:'Noto Serif TC','Songti SC',Georgia,serif;">${escapeHtml(author)}</p>` : ''}
            </div>
            <div style="width:60px; height:2px; background:#ccc; margin-bottom:${Math.round(60 * SCALE)}px;"></div>
        </div>
    `);

    // ─── 3. Table of Contents ───
    const tocLabel = (() => {
        const lang = project.settings.language.toLowerCase();
        if (lang.includes('chinese') || lang.includes('中文')) return '目錄';
        if (lang.includes('japanese') || lang.includes('日')) return '目次';
        if (lang.includes('spanish')) return 'Índice';
        return 'Table of Contents';
    })();

    const tocItems = project.structure.chapters.map((ch, i) =>
        `<div style="display:flex; align-items:baseline; margin-bottom:${Math.round(12 * SCALE)}px;">
            <span style="font-size:${Math.round(16 * SCALE)}px; color:#2d2a2e; white-space:nowrap;">${escapeHtml(ch.title)}</span>
            <span style="flex:1; border-bottom:1px dotted #ccc; margin:0 ${Math.round(8 * SCALE)}px; min-width:${Math.round(20 * SCALE)}px;"></span>
            <span style="font-size:${Math.round(14 * SCALE)}px; color:#999;">${i + 1}</span>
        </div>`
    ).join('');

    await renderPage(`
        <div style="width:100%; height:100%; background:#fdfbf7; padding:${pad}px; box-sizing:border-box; display:flex; flex-direction:column; font-family:'Noto Serif TC','Songti SC',Georgia,serif;">
            <h2 style="font-size:${Math.round(28 * SCALE)}px; font-weight:bold; color:#2d2a2e; margin:0 0 ${Math.round(15 * SCALE)}px 0; padding-bottom:${Math.round(10 * SCALE)}px; border-bottom:2px solid #ddd;">
                ${tocLabel}
            </h2>
            <div style="margin-top:${Math.round(20 * SCALE)}px;">
                ${tocItems}
            </div>
        </div>
    `);

    // ─── 4. Chapter content ───
    let runningPage = 1;
    const getChapterLabel = (i: number) => {
        const lang = project.settings.language.toLowerCase();
        if (lang.includes('chinese') || lang.includes('中文')) return `第 ${i + 1} 章`;
        if (lang.includes('japanese') || lang.includes('日')) return `第${i + 1}章`;
        if (lang.includes('spanish')) return `Capítulo ${i + 1}`;
        return `Chapter ${i + 1}`;
    };

    for (let ci = 0; ci < project.structure.chapters.length; ci++) {
        const chapter = project.structure.chapters[ci];

        // Chapter title page
        await renderPage(`
            <div style="width:100%; height:100%; background:#fdfbf7; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:${pad}px; font-family:'Noto Serif TC','Songti SC',Georgia,serif;">
                <span style="font-size:${Math.round(14 * SCALE)}px; text-transform:uppercase; letter-spacing:${Math.round(4 * SCALE)}px; color:#999;">${getChapterLabel(ci)}</span>
                <h2 style="font-size:${Math.round(30 * SCALE)}px; font-weight:bold; color:#2d2a2e; margin-top:${Math.round(16 * SCALE)}px; line-height:1.4;">${escapeHtml(chapter.title)}</h2>
                <div style="width:${Math.round(40 * SCALE)}px; height:2px; background:#ccc; margin-top:${Math.round(20 * SCALE)}px;"></div>
            </div>
        `);

        // Build content HTML for this chapter
        let contentHtml = '';
        chapter.sections.forEach(section => {
            if (!section.content) return;
            contentHtml += `<h3 style="font-size:${Math.round(20 * SCALE)}px; font-weight:bold; margin:${Math.round(24 * SCALE)}px 0 ${Math.round(10 * SCALE)}px 0; color:#2d2a2e;">${escapeHtml(section.title)}</h3>`;
            // Convert markdown to styled HTML
            const html = section.content
                .split('\n\n')
                .map(block => {
                    const t = block.trim();
                    if (!t) return '';
                    if (t.startsWith('### ')) return `<h4 style="font-size:${Math.round(18 * SCALE)}px; font-weight:bold; margin:${Math.round(16 * SCALE)}px 0 ${Math.round(8 * SCALE)}px 0;">${escapeHtml(t.replace(/^### /, ''))}</h4>`;
                    if (t.startsWith('## ')) return `<h3 style="font-size:${Math.round(20 * SCALE)}px; font-weight:bold; margin:${Math.round(20 * SCALE)}px 0 ${Math.round(10 * SCALE)}px 0;">${escapeHtml(t.replace(/^## /, ''))}</h3>`;
                    if (t.startsWith('# ')) return `<h2 style="font-size:${Math.round(24 * SCALE)}px; font-weight:bold; margin:${Math.round(24 * SCALE)}px 0 ${Math.round(12 * SCALE)}px 0;">${escapeHtml(t.replace(/^# /, ''))}</h2>`;
                    if (t.startsWith('> ')) return `<blockquote style="margin:${Math.round(12 * SCALE)}px ${Math.round(24 * SCALE)}px; padding-left:${Math.round(16 * SCALE)}px; border-left:3px solid #ccc; font-style:italic; color:#555;">${escapeHtml(t.replace(/^> /gm, ''))}</blockquote>`;
                    if (t === '---' || t === '***') return `<div style="text-align:center; margin:${Math.round(20 * SCALE)}px 0; color:#ccc; font-size:${Math.round(20 * SCALE)}px;">· · ·</div>`;

                    // Regular paragraph with inline formatting
                    let p = escapeHtml(t)
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>');
                    return `<p style="text-indent:2em; margin:${Math.round(6 * SCALE)}px 0; text-align:justify;">${p}</p>`;
                })
                .join('\n');
            contentHtml += html;
            contentHtml += `<div style="text-align:center; margin:${Math.round(30 * SCALE)}px 0; color:#ddd;">✦</div>`;
        });

        if (contentHtml) {
            const pagesAdded = await renderContentPages(contentHtml, ci, runningPage);
            runningPage += pagesAdded;
        }
    }

    // ─── 5. Back page ───
    await renderPage(`
        <div style="width:100%; height:100%; background:#fdfbf7; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:${pad}px; font-family:'Noto Serif TC','Songti SC',Georgia,serif;">
            <p style="font-size:${Math.round(16 * SCALE)}px; font-style:italic; color:#666; line-height:2; max-width:80%;">
                "${escapeHtml(project.settings.topic)}"
            </p>
            ${author ? `
                <div style="width:60px; height:1px; background:#ccc; margin:${Math.round(24 * SCALE)}px 0;"></div>
                <p style="font-size:${Math.round(14 * SCALE)}px; color:#999;">${escapeHtml(author)}</p>
            ` : ''}
        </div>
    `);

    // Cleanup
    document.body.removeChild(container);
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

            // Regular paragraph — handle inline markdown
            const html = escapeHtml(trimmed)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            return `<p>${html}</p>`;
        })
        .join('\n');
}
