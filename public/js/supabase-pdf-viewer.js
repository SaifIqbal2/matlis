(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase || !window.pdfjsLib) return;
  const id = new URLSearchParams(window.location.search).get('uploadedId');
  const container = document.querySelector('#pdfCanvasContainer');
  if (!id || !container) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  async function loadPdf() {
    const { data, error } = await client.from('journal_pdfs').select('title, file_path').eq('id', id).eq('is_published', true).maybeSingle();
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
    container.innerHTML = `<div class="pdfjs-controls" role="toolbar" aria-label="PDF controls"><div class="pdfjs-toolbar-group"><button type="button" aria-label="Menu"><span class="fa fa-bars"></span></button><button type="button" aria-label="Search"><span class="fa fa-search"></span></button><button type="button" data-pdf-action="previous" aria-label="Previous page"><span class="fa fa-chevron-up"></span></button><button type="button" data-pdf-action="next" aria-label="Next page"><span class="fa fa-chevron-down"></span></button></div><div class="pdfjs-toolbar-group"><input class="pdfjs-page-input" type="number" min="1" value="1" aria-label="Page number"><span class="pdfjs-page-status">of 1</span><button type="button" data-pdf-action="zoom-out" aria-label="Zoom out"><span class="fa fa-minus"></span></button><span class="pdfjs-zoom-status">100%</span><button type="button" data-pdf-action="zoom-in" aria-label="Zoom in"><span class="fa fa-plus"></span></button><select class="pdfjs-zoom-select" aria-label="Zoom preset"><option>Automatic Zoom</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></div><div class="pdfjs-toolbar-group"><button type="button" data-pdf-action="print" aria-label="Print"><span class="fa fa-print"></span></button><a class="pdfjs-download" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener" aria-label="Download PDF"><span class="fa fa-download"></span></a></div></div><div class="pdfjs-pages" aria-label="PDF pages"></div>`;

    const pdf = await window.pdfjsLib.getDocument({ url: pdfUrl }).promise;
    const pagesContainer = container.querySelector('.pdfjs-pages');
    const pageStatus = container.querySelector('.pdfjs-page-status');
    const pageInput = container.querySelector('.pdfjs-page-input');
    const zoomStatus = container.querySelector('.pdfjs-zoom-status');
    const zoomSelect = container.querySelector('.pdfjs-zoom-select');
    let pageNumber = 1;
    let scale = 1;

    async function renderPages() {
      pagesContainer.innerHTML = '';
      for (let index = 1; index <= pdf.numPages; index += 1) {
        const page = await pdf.getPage(index);
        const viewport = page.getViewport({ scale });
        const pageWrap = document.createElement('div');
        pageWrap.className = 'pdfjs-canvas-wrap';
        pageWrap.dataset.pageNumber = index;
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-label', `PDF page ${index}`);
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pageWrap.appendChild(canvas);
        pagesContainer.appendChild(pageWrap);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }
      pageInput.value = pageNumber;
      pageStatus.textContent = `of ${pdf.numPages}`;
      zoomStatus.textContent = `${Math.round(scale * 100)}%`;
      container.querySelector('[data-pdf-action="previous"]').disabled = pageNumber <= 1;
      container.querySelector('[data-pdf-action="next"]').disabled = pageNumber >= pdf.numPages;
      pagesContainer.querySelector(`[data-page-number="${pageNumber}"]`)?.scrollIntoView({ block: 'start' });
    }

    container.addEventListener('change', event => {
      if (event.target === pageInput) pageNumber = Math.min(pdf.numPages, Math.max(1, Number(pageInput.value) || 1));
      if (event.target === zoomSelect && zoomSelect.value !== 'Automatic Zoom') scale = Number(zoomSelect.value);
      if (event.target === pageInput) pagesContainer.querySelector(`[data-page-number="${pageNumber}"]`)?.scrollIntoView({ block: 'start' });
      if (event.target === zoomSelect) renderPages();
    });
    container.addEventListener('click', event => {
      const action = event.target.closest('[data-pdf-action]')?.dataset.pdfAction;
      if (action === 'previous' && pageNumber > 1) pageNumber -= 1;
      if (action === 'next' && pageNumber < pdf.numPages) pageNumber += 1;
      if (action === 'zoom-out') scale = Math.max(.5, scale - .1);
      if (action === 'zoom-in') scale = Math.min(3, scale + .1);
      if (action === 'print') window.print();
      if (action === 'previous' || action === 'next') pagesContainer.querySelector(`[data-page-number="${pageNumber}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (action === 'zoom-in' || action === 'zoom-out') renderPages();
    });
    await renderPages();
  }

  loadPdf();
}());
