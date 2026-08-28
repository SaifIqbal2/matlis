(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase || !window.pdfjsLib) return;
  const id = new URLSearchParams(window.location.search).get('uploadedId');
  const container = document.querySelector('#pdfCanvasContainer');
  if (!id || !container) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  async function loadPdf() {
    const { data, error } = await client.from('journal_pdfs').select('title, file_path').eq('id', id).eq('is_published', true).maybeSingle();
    if (error || !data) return;

    const pdfUrl = client.storage.from('journal-pdfs').getPublicUrl(data.file_path).data.publicUrl;
    const title = data.title || 'Article PDF';
    const titleLink = document.querySelector('.header_view .title');
    const downloadLink = document.querySelector('.header_view .download');
    if (titleLink) titleLink.textContent = title;
    if (downloadLink) downloadLink.href = pdfUrl;
    document.title = `View of ${title}`;

    container.classList.add('pdfjs-viewer');
    container.innerHTML = '<div class="pdfjs-toolbar" role="toolbar" aria-label="PDF controls"><div class="pdfjs-toolbar-group"><button data-action="previous" aria-label="Previous page">&#8249;</button><button data-action="next" aria-label="Next page">&#8250;</button></div><div class="pdfjs-toolbar-group center"><input id="pdfPage" type="number" min="1" value="1" aria-label="Page number"><span>of <b id="pdfTotal">0</b></span><button data-action="zoom-out" aria-label="Zoom out">−</button><span id="pdfZoom">Automatic</span><button data-action="zoom-in" aria-label="Zoom in">+</button><select id="pdfZoomSelect" aria-label="Zoom"><option value="auto">Automatic Zoom</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></div><div class="pdfjs-toolbar-group"><button data-action="print" aria-label="Print">&#128438;</button><a href="' + pdfUrl + '" download aria-label="Download PDF">&#8681;</a></div></div><div class="pdfjs-pages" id="pdfPages"></div>';

    const pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
    const pages = document.querySelector('#pdfPages');
    const pageInput = document.querySelector('#pdfPage');
    const total = document.querySelector('#pdfTotal');
    const zoomLabel = document.querySelector('#pdfZoom');
    let currentPage = 1;
    let scale = 1;
    total.textContent = pdf.numPages;

    async function renderPages() {
      pages.replaceChildren();
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.className = 'pdfjs-page';
        canvas.dataset.page = number;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pages.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }
      pageInput.value = currentPage;
      zoomLabel.textContent = scale === 1 ? 'Automatic' : `${Math.round(scale * 100)}%`;
      pages.querySelector(`[data-page="${currentPage}"]`)?.scrollIntoView({ block: 'start' });
    }

    document.querySelector('.pdfjs-toolbar').addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'previous') currentPage = Math.max(1, currentPage - 1);
      if (action === 'next') currentPage = Math.min(pdf.numPages, currentPage + 1);
      if (action === 'zoom-out') scale = Math.max(.5, scale - .1);
      if (action === 'zoom-in') scale = Math.min(3, scale + .1);
      if (action === 'print') window.print();
      if (action === 'previous' || action === 'next') pages.querySelector(`[data-page="${currentPage}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (action === 'zoom-out' || action === 'zoom-in') renderPages();
    });
    document.querySelector('#pdfZoomSelect').addEventListener('change', event => { scale = event.target.value === 'auto' ? 1 : Number(event.target.value); renderPages(); });
    pageInput.addEventListener('change', () => { currentPage = Math.min(pdf.numPages, Math.max(1, Number(pageInput.value) || 1)); pages.querySelector(`[data-page="${currentPage}"]`)?.scrollIntoView({ behavior: 'smooth' }); });
    await renderPages();
  }

  loadPdf();
}());
