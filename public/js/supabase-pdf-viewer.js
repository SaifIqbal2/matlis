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
    const articleUrl = `/index.php/${encodeURIComponent(data.journals?.slug || 'actabiomedica')}/onlinefirst/view/19401.html?uploadedId=${encodeURIComponent(id)}`;
    document.title = `View of ${title}`;
    document.querySelector('#titleLink').textContent = title;
    document.querySelector('#titleLink').href = articleUrl;
    document.querySelector('#returnLink').href = articleUrl;
    document.querySelector('#downloadLink').href = pdfUrl;
    container.innerHTML = `<iframe src="${escapeHtml(pdfUrl)}" title="PDF of ${escapeHtml(title)}" allowfullscreen></iframe>`;
  }

  loadPdf();
}());
