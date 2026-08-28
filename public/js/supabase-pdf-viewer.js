(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;
  const id = new URLSearchParams(window.location.search).get('uploadedId');
  const container = document.querySelector('#pdfCanvasContainer');
  if (!id || !container) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  async function loadPdf() {
    const { data, error } = await client.from('journal_pdfs').select('title, file_path').eq('id', id).eq('is_published', true).maybeSingle();
    if (error || !data) return;

    const pdfUrl = client.storage.from('journal-pdfs').getPublicUrl(data.file_path).data.publicUrl;
    const title = data.title || 'Article PDF';
    const titleLink = document.querySelector('.header_view .title');
    const returnLink = document.querySelector('.header_view .return');
    const downloadLink = document.querySelector('.header_view .download');
    if (titleLink) titleLink.textContent = title;
    if (returnLink) returnLink.href = '/index.php/actabiomedica/issue/view/963.html';
    if (downloadLink) downloadLink.href = pdfUrl;
    document.title = `View of ${title}`;

    const iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.src = pdfUrl;
      iframe.title = `PDF of ${title}`;
    }
  }

  loadPdf();
}());
