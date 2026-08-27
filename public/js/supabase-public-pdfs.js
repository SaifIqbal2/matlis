(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const list = document.querySelector('.online_first_issue_toc .cmp_article_list.articles');
  const journalSlug = document.body.dataset.journalSlug;
  if (!list || !journalSlug) return;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  async function addUploadedPdfs() {
    const { data: journal, error: journalError } = await client.from('journals').select('id').eq('slug', journalSlug).eq('is_published', true).maybeSingle();
    if (journalError || !journal) return;

    const { data: pdfs, error: pdfError } = await client.from('journal_pdfs').select('title, issue, file_path, created_at').eq('journal_id', journal.id).eq('is_published', true).order('created_at', { ascending: false });
    if (pdfError || !pdfs?.length) return;

    const uploadedItems = pdfs.map(pdf => {
      const url = client.storage.from('journal-pdfs').getPublicUrl(pdf.file_path).data.publicUrl;
      return `<li class="uploaded-publication"><div class="obj_article_summary"><h2 class="title"><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(pdf.title)}</a></h2><div class="meta"><div class="authors">Mattioli 1885 Journals</div><div class="pages">${escapeHtml(pdf.issue || 'PDF')}</div></div><div class="doiInSummary"><strong>PDF:</strong> <a href="${escapeHtml(url)}" target="_blank" rel="noopener">Download PDF</a></div></div></li>`;
    }).join('');

    list.insertAdjacentHTML('afterbegin', uploadedItems);
  }

  addUploadedPdfs();
}());
