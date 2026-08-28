(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase || !window.pdfjsLib) return;
  const id = new URLSearchParams(window.location.search).get('uploadedId');
  const container = document.querySelector('#pdfCanvasContainer');
  if (!id || !container) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  async function loadPdf() {
    const { data, error } = await client.from('journal_pdfs').select('title, file_path, created_at, updated_at').eq('id', id).eq('is_published', true).maybeSingle();
    if (error || !data) return;

    const pdfUrl = `${client.storage.from('journal-pdfs').getPublicUrl(data.file_path).data.publicUrl}?v=${encodeURIComponent(data.updated_at || data.created_at || Date.now())}`;
    const title = data.title || 'Article PDF';
    const requestedReturnUrl = new URLSearchParams(window.location.search).get('returnUrl');
    const referrerUrl = document.referrer ? new URL(document.referrer) : null;
    const returnUrl = requestedReturnUrl || (referrerUrl && referrerUrl.origin === window.location.origin ? `${referrerUrl.pathname}${referrerUrl.search}` : `/index.php/actabiomedica/onlinefirst/view/19401.html?uploadedId=${encodeURIComponent(id)}`);
    const titleLink = document.querySelector('.header_view .title');
    const returnLink = document.querySelector('.header_view .return');
    const downloadLink = document.querySelector('.header_view .download');
    if (titleLink) {
      titleLink.textContent = title;
      titleLink.href = returnUrl;
    }
    if (returnLink) returnLink.href = returnUrl;
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
    let automaticZoom = true;
    total.textContent = pdf.numPages;

    async function automaticScale() {
      const firstPage = await pdf.getPage(1);
      const baseViewport = firstPage.getViewport({ scale: 1 });
      return Math.min(1, Math.max(.25, (container.clientWidth - 24) / baseViewport.width));
    }

    async function renderPages() {
      pages.replaceChildren();
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number);
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.className = 'pdfjs-page';
        canvas.dataset.page = number;
        canvas.width = Math.ceil(viewport.width * dpr);
        canvas.height = Math.ceil(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        pages.appendChild(canvas);
        const context = canvas.getContext('2d');
        context.scale(dpr, dpr);
        await page.render({ canvasContext: context, viewport }).promise;
      }
      pageInput.value = currentPage;
      zoomLabel.textContent = automaticZoom ? 'Automatic' : `${Math.round(scale * 100)}%`;
      pages.querySelector(`[data-page="${currentPage}"]`)?.scrollIntoView({ block: 'start' });
    }

    document.querySelector('.pdfjs-toolbar').addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'previous') currentPage = Math.max(1, currentPage - 1);
      if (action === 'next') currentPage = Math.min(pdf.numPages, currentPage + 1);
      if (action === 'zoom-out') { automaticZoom = false; scale = Math.max(.5, scale - .1); }
      if (action === 'zoom-in') { automaticZoom = false; scale = Math.min(3, scale + .1); }
      if (action === 'print') window.print();
      if (action === 'previous' || action === 'next') pages.querySelector(`[data-page="${currentPage}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (action === 'zoom-out' || action === 'zoom-in') renderPages();
    });
    document.querySelector('#pdfZoomSelect').addEventListener('change', async event => {
      automaticZoom = event.target.value === 'auto';
      scale = automaticZoom ? await automaticScale() : Number(event.target.value);
      renderPages();
    });
    pageInput.addEventListener('change', () => { currentPage = Math.min(pdf.numPages, Math.max(1, Number(pageInput.value) || 1)); pages.querySelector(`[data-page="${currentPage}"]`)?.scrollIntoView({ behavior: 'smooth' }); });
    window.addEventListener('resize', async () => {
      if (!automaticZoom) return;
      scale = await automaticScale();
      renderPages();
    });
    scale = await automaticScale();
    await renderPages();
  }

  loadPdf();
}());
