(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;
  const id = new URLSearchParams(window.location.search).get('uploadedId');
  if (!id) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

  async function loadUploadedArticle() {
    const { data, error } = await client.from('journal_pdfs').select('title, authors, issue, doi, abstract, keywords, file_path, journals(name)').eq('id', id).eq('is_published', true).maybeSingle();
    if (error || !data) return;

    const pdfUrl = client.storage.from('journal-pdfs').getPublicUrl(data.file_path).data.publicUrl;
    document.title = `${data.title} | ${data.journals?.name || 'Mattioli 1885 Journals'}`;
    document.querySelector('.hero-section h1').textContent = data.title;
    document.querySelector('.page_title').textContent = data.title;

    const authors = document.querySelector('section.item.authors ul.authors');
    if (authors) authors.innerHTML = `<li><span class="name">${escapeHtml(data.authors || 'Mattioli 1885 Journals')}</span></li>`;
    const keywords = document.querySelector('section.item.keywords .value');
    if (keywords) keywords.textContent = data.keywords || '';
    const abstract = document.querySelector('section.item.abstract');
    if (abstract) abstract.innerHTML = `<h2 class="label">Abstract</h2><p>${escapeHtml(data.abstract || 'PDF publication')}</p>`;

    const doi = document.querySelector('meta[name="DC.Identifier.DOI"]');
    if (doi && data.doi) doi.setAttribute('content', data.doi);
    const details = document.querySelector('.entry_details');
    if (details) details.insertAdjacentHTML('afterbegin', `<div class="item"><strong>Issue:</strong> ${escapeHtml(data.issue || 'Online First')}</div><p><a class="obj_galley_link btn btn-primary pdf" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener">PDF</a></p>`);
  }

  loadUploadedArticle();
}());
