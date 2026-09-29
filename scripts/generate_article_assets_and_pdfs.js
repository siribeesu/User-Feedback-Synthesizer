const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5173';
const IMAGES_DIR = path.resolve(__dirname, '../docs/articles/images');
const ARTICLES_DIR = path.resolve(__dirname, '../docs/articles');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Launching Edge for UI Screenshot Capture...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run', '--disable-extensions']
  });

  const page = await browser.newPage();
  console.log('🌐 Navigating to Fedar UI at', APP_URL);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));

  const pagesToCapture = [
    { id: 'overview', filename: 'overview_dashboard.png', name: 'Overview Dashboard' },
    { id: 'integrations', filename: 'data_connectors.png', name: 'Data Connectors Workspace' },
    { id: 'themes', filename: 'themes_and_insights.png', name: 'Themes & Grounded Citations' },
    { id: 'copilot', filename: 'ai_copilot.png', name: 'AI Decision Copilot' },
    { id: 'releases', filename: 'release_impact.png', name: 'Release Impact Analyzer' },
    { id: 'sentiment', filename: 'sentiment_analytics.png', name: 'Sentiment Trends' }
  ];

  for (const item of pagesToCapture) {
    console.log(`📸 Capturing ${item.name}...`);
    await page.evaluate((navId) => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      for (const el of items) {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        if (navId === 'overview' && text.includes('overview')) { el.click(); return; }
        if (navId === 'integrations' && (text.includes('connect') || text.includes('integrat'))) { el.click(); return; }
        if (navId === 'themes' && text.includes('theme')) { el.click(); return; }
        if (navId === 'copilot' && text.includes('copilot')) { el.click(); return; }
        if (navId === 'releases' && text.includes('release')) { el.click(); return; }
        if (navId === 'sentiment' && text.includes('sentiment')) { el.click(); return; }
      }
    }, item.id);

    await new Promise(r => setTimeout(r, 1800));
    const dest = path.join(IMAGES_DIR, item.filename);
    await page.screenshot({ path: dest, type: 'png' });
    console.log(`  Saved: ${dest}`);
  }

  await browser.close();
  console.log('✅ Screenshot capture completed.');
}

// Markdown parser & HTML generator
function markdownToHtml(md, articleNum) {
  let html = md;

  // Code blocks with syntax highlighting style
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div class="code-container"><div class="code-header"><span class="lang-tag">${lang || 'code'}</span></div><pre><code class="language-${lang || 'text'}">${escaped}</code></pre></div>`;
  });

  // Headers
  html = html.replace(/^# (.*$)/gim, '<h1 class="article-title">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="section-title">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="subsection-title">$1</h3>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="callout">$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="doc-link" target="_blank">$1</a>');

  // Unordered list items
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (p.startsWith('<h') || p.startsWith('<div') || p.startsWith('<blockquote') || p.startsWith('<ul') || p.startsWith('<hr')) {
      return p;
    }
    return `<p class="prose">${p}</p>`;
  }).join('\n');

  html = html.replace(/<p class="prose">---<\/p>/g, '<hr class="divider"/>');
  html = html.replace(/---/g, '<hr class="divider"/>');

  return html;
}

// Embed relevant images into specific articles
function injectVisualsIntoArticle(html, articleNum) {
  const images = {
    1: [
      {
        after: '<h2 class="section-title">System Architecture: How Fedar and Hindsight Fit Together</h2>',
        img: 'overview_dashboard.png',
        caption: 'Figure 1: Fedar Executive Dashboard synthesizing live App Store, Google Play, and Zendesk feedback into persistent memory banks.'
      },
      {
        after: '<h2 class="section-title">Concrete Interaction Example: Detecting a Release Regression</h2>',
        img: 'themes_and_insights.png',
        caption: 'Figure 2: Themes & Insights view showing grounded customer citations and temporal sentiment shift flags.'
      }
    ],
    2: [
      {
        after: '<h2 class="section-title">Copilot Architecture: From Raw Query to Grounded Synthesis</h2>',
        img: 'ai_copilot.png',
        caption: 'Figure 1: AI Product Decision Copilot retrieving grounded citations and computing confidence scores from Hindsight memory.'
      },
      {
        after: '<h2 class="section-title">What It Looks Like in Practice</h2>',
        img: 'themes_and_insights.png',
        caption: 'Figure 2: Grounded Evidence Drawer verifying customer quotes with exact memory IDs.'
      }
    ],
    3: [
      {
        after: '<h2 class="section-title">Ingestion Architecture: Multi-Channel Streaming to Memory Bank</h2>',
        img: 'data_connectors.png',
        caption: 'Figure 1: Multi-Channel Data Connectors workspace streaming live reviews and supporting bulk CSV/JSON ingestion.'
      },
      {
        after: '<h2 class="section-title">Real Production Impact: Detecting High-Severity Emotions</h2>',
        img: 'sentiment_analytics.png',
        caption: 'Figure 2: Sentiment and emotion trajectory analytics across 30-day rolling windows.'
      }
    ],
    4: [
      {
        after: '<h2 class="section-title">The Concept: Temporal Sentiment Shift</h2>',
        img: 'release_impact.png',
        caption: 'Figure 1: Release Impact Analyzer comparing rating trajectories and dominant themes across versions.'
      },
      {
        after: '<h2 class="section-title">Real-World Case Study</h2>',
        img: 'themes_and_insights.png',
        caption: 'Figure 2: Automated Temporal Shift alert flagged on critical checkout regression.'
      }
    ],
    5: [
      {
        after: '<h2 class="section-title">The Resilient Dual-Mode Memory Architecture</h2>',
        img: 'data_connectors.png',
        caption: 'Figure 1: Data Connectors sync status showing live client heartbeat and resilient fallback memory bank.'
      },
      {
        after: '<h2 class="section-title">Performance &amp; Reliability Results</h2>',
        img: 'overview_dashboard.png',
        caption: 'Figure 2: Real-time dashboard powered by sub-10ms local memory recall.'
      }
    ]
  };

  let modifiedHtml = html;
  const articleImages = images[articleNum] || [];

  for (const item of articleImages) {
    const imgHtml = `
      <div class="figure-card">
        <img src="images/${item.img}" alt="${item.caption}" class="article-img" />
        <p class="figure-caption">${item.caption}</p>
      </div>
    `;
    if (modifiedHtml.includes(item.after)) {
      modifiedHtml = modifiedHtml.replace(item.after, `${item.after}\n${imgHtml}`);
    } else {
      modifiedHtml += `\n${imgHtml}`;
    }
  }

  return modifiedHtml;
}

const PDF_TEMPLATE = (title, bodyHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.6;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }

  .meta-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 10px;
    margin-bottom: 24px;
  }

  .meta-badge {
    background: #0f172a;
    color: #ffffff;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .meta-date {
    font-size: 8pt;
    color: #64748b;
    font-weight: 500;
  }

  .article-title {
    font-size: 21pt;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: #000000;
    margin: 0 0 16px 0;
  }

  .author-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }

  .author-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #0f172a;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 10pt;
  }

  .author-info {
    font-size: 8.5pt;
  }

  .author-name {
    font-weight: 700;
    color: #0f172a;
  }

  .author-role {
    color: #64748b;
  }

  .section-title {
    font-size: 13.5pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f172a;
    margin: 24px 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 1px solid #e2e8f0;
    page-break-after: avoid;
  }

  .subsection-title {
    font-size: 11pt;
    font-weight: 600;
    color: #1e293b;
    margin: 18px 0 6px 0;
    page-break-after: avoid;
  }

  .prose {
    margin: 0 0 12px 0;
    color: #334155;
    text-align: justify;
  }

  .divider {
    border: none;
    border-top: 1px dashed #cbd5e1;
    margin: 20px 0;
  }

  .callout {
    background: #f8fafc;
    border-left: 4px solid #0f172a;
    margin: 14px 0;
    padding: 10px 16px;
    color: #1e293b;
    font-style: italic;
    font-size: 9.5pt;
    border-radius: 0 6px 6px 0;
  }

  .code-container {
    background: #0f172a;
    border-radius: 6px;
    margin: 16px 0;
    overflow: hidden;
    page-break-inside: avoid;
  }

  .code-header {
    background: #1e293b;
    padding: 5px 12px;
    display: flex;
    justify-content: flex-end;
  }

  .lang-tag {
    color: #94a3b8;
    font-size: 7.5pt;
    text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }

  pre {
    margin: 0;
    padding: 12px 14px;
    overflow-x: auto;
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    color: #f1f5f9;
    line-height: 1.45;
  }

  .inline-code {
    font-family: 'JetBrains Mono', monospace;
    background: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 500;
    border: 1px solid #e2e8f0;
  }

  .doc-link {
    color: #0f172a;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  ul, ol {
    margin: 0 0 14px 18px;
    padding: 0;
    color: #334155;
  }

  li {
    margin-bottom: 4px;
  }

  .figure-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    margin: 18px 0;
    page-break-inside: avoid;
    text-align: center;
  }

  .article-img {
    width: 100%;
    max-height: 340px;
    object-fit: contain;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
  }

  .figure-caption {
    font-size: 8pt;
    font-weight: 500;
    color: #64748b;
    margin: 6px 0 2px 0;
  }

  .footer-box {
    margin-top: 30px;
    padding: 14px 18px;
    background: #0f172a;
    color: #ffffff;
    border-radius: 6px;
    page-break-inside: avoid;
  }

  .footer-box h4 {
    margin: 0 0 4px 0;
    font-size: 10pt;
    color: #ffffff;
  }

  .footer-box p {
    margin: 0;
    font-size: 8pt;
    color: #94a3b8;
    line-height: 1.45;
  }

  .footer-box a {
    color: #38bdf8;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="meta-header">
    <span class="meta-badge">Engineering Whitepaper &amp; Technical Deep-Dive</span>
    <span class="meta-date">Fedar Intelligence System • Architecture Series</span>
  </div>

  <div class="author-row">
    <div class="author-avatar">F</div>
    <div class="author-info">
      <div class="author-name">Fedar Engineering Team</div>
      <div class="author-role">Autonomous Product Intelligence &amp; Agent Memory Research</div>
    </div>
  </div>

  ${bodyHtml}

  <div class="footer-box">
    <h4>About Fedar &amp; Hindsight</h4>
    <p>Fedar is an open-source feedback intelligence platform with persistent memory. Read the full codebase and explore the memory architecture on <a href="https://github.com/vectorize-io/hindsight">Hindsight GitHub</a> and <a href="https://hindsight.vectorize.io/">Hindsight Documentation</a>.</p>
  </div>
</body>
</html>`;

async function convertArticlesToPdfs() {
  console.log('🚀 Initializing PDF Generation Engine...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const files = [
    { file: 'article_1_why_vector_search_failed.md', num: 1, title: 'Why Vector Search Failed for User Feedback Until We Added Hindsight' },
    { file: 'article_2_ai_product_copilot.md', num: 2, title: 'How I Built an AI Product Copilot with Grounded Temporal Memory' },
    { file: 'article_3_why_we_stopped_trusting_static_dashboards.md', num: 3, title: 'Why We Stopped Trusting Static Dashboards and Built Continuous Feedback Memory' },
    { file: 'article_4_catching_silent_release_regressions.md', num: 4, title: 'How We Caught Silent Release Regressions Using Hindsight and Sentiment Shift Detection' },
    { file: 'article_5_resilient_local_memory_engine.md', num: 5, title: 'Building a Resilient Local Memory Engine with Hindsight and Sentence Transformers' }
  ];

  for (const item of files) {
    const mdPath = path.join(ARTICLES_DIR, item.file);
    if (!fs.existsSync(mdPath)) continue;

    console.log(`📄 Generating PDF for Article ${item.num}: ${item.title}...`);
    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    let parsedHtml = markdownToHtml(mdContent, item.num);
    parsedHtml = injectVisualsIntoArticle(parsedHtml, item.num);

    const fullHtml = PDF_TEMPLATE(item.title, parsedHtml);
    const htmlTempPath = path.join(ARTICLES_DIR, `temp_article_${item.num}.html`);
    fs.writeFileSync(htmlTempPath, fullHtml, 'utf-8');

    const page = await browser.newPage();
    await page.goto(`file://${htmlTempPath}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));

    const pdfDest = path.join(ARTICLES_DIR, item.file.replace('.md', '.pdf'));
    await page.pdf({
      path: pdfDest,
      format: 'A4',
      margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
      printBackground: true,
      displayHeaderFooter: false
    });

    console.log(`  ✅ Generated: ${pdfDest}`);
    if (fs.existsSync(htmlTempPath)) fs.unlinkSync(htmlTempPath);
  }

  // Also build combined edition PDF
  console.log('📚 Building Complete 5-Article Compendium PDF...');
  let combinedHtml = '';
  for (const item of files) {
    const mdPath = path.join(ARTICLES_DIR, item.file);
    if (!fs.existsSync(mdPath)) continue;
    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    let parsed = markdownToHtml(mdContent, item.num);
    parsed = injectVisualsIntoArticle(parsed, item.num);
    combinedHtml += `<div style="page-break-after: always; padding-top: 10px;">${parsed}</div>`;
  }

  const combinedFullHtml = PDF_TEMPLATE('Fedar & Hindsight: The Complete Technical Intelligence Series', combinedHtml);
  const combinedHtmlPath = path.join(ARTICLES_DIR, 'temp_compendium.html');
  fs.writeFileSync(combinedHtmlPath, combinedFullHtml, 'utf-8');

  const compPage = await browser.newPage();
  await compPage.goto(`file://${combinedHtmlPath}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  
  const compPdfPath = path.join(ARTICLES_DIR, 'fedar_hindsight_articles_compendium.pdf');
  await compPage.pdf({
    path: compPdfPath,
    format: 'A4',
    margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
    printBackground: true,
    displayHeaderFooter: false
  });
  console.log(`  ✅ Generated Compendium: ${compPdfPath}`);
  if (fs.existsSync(combinedHtmlPath)) fs.unlinkSync(combinedHtmlPath);

  await browser.close();
  console.log('🎉 All PDFs and Compendiums generated successfully!');
}

async function main() {
  try {
    await captureScreenshots();
    await convertArticlesToPdfs();
  } catch (err) {
    console.error('Error generating assets and PDFs:', err);
    process.exit(1);
  }
}

main();
