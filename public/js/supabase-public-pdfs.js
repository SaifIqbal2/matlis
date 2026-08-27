(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const journalSlug = document.body.dataset.journalSlug;
  const issueId = document.body.dataset.issueId;
  const list = document.querySelector(issueId ? '.cmp_article_list.articles' : '.online_first_issue_toc .cmp_article_list.articles');
  if (!list || !journalSlug) return;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  async function addUploadedPdfs() {
    const { data: journal, error: journalError } = await client.from('journals').select('id').eq('slug', journalSlug).eq('is_published', true).maybeSingle();
    if (journalError || !journal) return;

    let pdfQuery = client.from('journal_pdfs').select('id, title, authors, issue, doi, file_path, created_at').eq('journal_id', journal.id).eq('is_published', true).order('created_at', { ascending: false });
    if (issueId) pdfQuery = pdfQuery.eq('issue', issueId);
    const { data: pdfs, error: pdfError } = await pdfQuery;
    if (pdfError || !pdfs?.length) return;

    const uploadedItems = pdfs.map(pdf => {
      const url = client.storage.from('journal-pdfs').getPublicUrl(pdf.file_path).data.publicUrl;
      const detailUrl = `/index.php/actabiomedica/onlinefirst/view/19401.html?uploadedId=${encodeURIComponent(pdf.id)}`;
      return `<li class="uploaded-publication"><div class="obj_article_summary"><h2 class="title"><a href="${detailUrl}">${escapeHtml(pdf.title)}</a></h2><div class="meta"><div class="authors">${escapeHtml(pdf.authors || 'Mattioli 1885 Journals')}</div><div class="pages">${escapeHtml(pdf.issue || 'PDF')}</div></div>${pdf.doi ? `<div class="doiInSummary"><strong>DOI:</strong> ${escapeHtml(pdf.doi)}</div>` : ''}<a class="obj_galley_link btn btn-primary pdf" href="${escapeHtml(url)}" target="_blank" rel="noopener">PDF</a></div></li>`;
    }).join('');

    list.insertAdjacentHTML('afterbegin', uploadedItems);
  }

  addUploadedPdfs();
}());
