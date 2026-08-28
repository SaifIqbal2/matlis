(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;
  const id = new URLSearchParams(window.location.search).get('uploadedId');
  const container = document.querySelector('#pdfCanvasContainer');
  if (!id || !container) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

  async function loadPdf() {
    const { data, error } = await client.from('journal_pdfs').select('title, file_path, journals(name, slug)').eq('id', id).eq('is_published', true).maybeSingle();
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
    container.innerHTML = `<iframe src="${escapeHtml(pdfUrl)}" title="PDF of ${escapeHtml(title)}" allowfullscreen></iframe>`;
  }

  loadPdf();
}());
