(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase || !window.pdfjsLib) return;
  const id = new URLSearchParams(window.location.search).get('uploadedId');
  const container = document.querySelector('#pdfCanvasContainer');
  if (!id || !container) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  async function loadPdf() {
    const { data, error } = await client.from('journal_pdfs').select('title, page_number, file_path, journals(name, slug)').eq('id', id).eq('is_published', true).maybeSingle();
    if (error || !data) {
      container.innerHTML = '<p class="message">PDF is not available.</p>';
      return;
    }

    const pdfUrl = client.storage.from('journal-pdfs').getPublicUrl(data.file_path).data.publicUrl;
    const title = data.title || 'Article PDF';
    const returnUrl = `/index.php/actabiomedica/issue/view/963.html`;
    document.title = `View of ${title}`;
    const titleLink = document.querySelector('#titleLink, .header_view .title');
    const returnLink = document.querySelector('#returnLink, .header_view .return');
    const downloadLink = document.querySelector('#downloadLink, .header_view .download');
    if (titleLink) { titleLink.textContent = title; titleLink.href = returnUrl; }
    if (returnLink) returnLink.href = returnUrl;
    if (downloadLink) downloadLink.href = pdfUrl;

    container.classList.add('pdfjs-viewer');
    container.innerHTML = `
      <div class="pdfjs-controls" role="toolbar" aria-label="PDF controls">
        <button type="button" data-pdf-action="previous">Previous</button>
        <span class="pdfjs-page-status" aria-live="polite">Page 1 of 1</span>
        <button type="button" data-pdf-action="next">Next</button>
        <button type="button" data-pdf-action="zoom-out">Zoom out</button>
        <span class="pdfjs-zoom-status">100%</span>
        <button type="button" data-pdf-action="zoom-in">Zoom in</button>
      </div>
      <div class="pdfjs-canvas-wrap"><canvas aria-label="PDF page"></canvas></div>`;

    const pdf = await window.pdfjsLib.getDocument({ url: pdfUrl }).promise;
    const canvas = container.querySelector('canvas');
    const canvasContext = canvas.getContext('2d');
    const pageStatus = container.querySelector('.pdfjs-page-status');
    const zoomStatus = container.querySelector('.pdfjs-zoom-status');
    let pageNumber = 1;
    let scale = 1;

    async function renderPage() {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext, viewport }).promise;
      pageStatus.textContent = `Page ${pageNumber} of ${pdf.numPages}`;
      zoomStatus.textContent = `${Math.round(scale * 100)}%`;
      container.querySelector('[data-pdf-action="previous"]').disabled = pageNumber <= 1;
      container.querySelector('[data-pdf-action="next"]').disabled = pageNumber >= pdf.numPages;
    }

    container.addEventListener('click', event => {
      const action = event.target.dataset.pdfAction;
      if (action === 'previous' && pageNumber > 1) pageNumber -= 1;
      if (action === 'next' && pageNumber < pdf.numPages) pageNumber += 1;
      if (action === 'zoom-out') scale = Math.max(.5, scale - .1);
      if (action === 'zoom-in') scale = Math.min(3, scale + .1);
      if (action) renderPage();
    });

    await renderPage();
  }

  loadPdf();
}());
