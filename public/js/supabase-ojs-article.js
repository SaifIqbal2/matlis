(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;
  const queryId = new URLSearchParams(window.location.search).get('uploadedId');
  const numericArticleId = Number(new URLSearchParams(window.location.search).get('articleId'));
  const numericGalleyId = Number(new URLSearchParams(window.location.search).get('galleyId'));
  const hasNumericIds = Number.isInteger(numericArticleId) && Number.isInteger(numericGalleyId);
  const id = queryId || (!hasNumericIds ? window.sessionStorage.getItem('uploadedArticleId') : null);
  if (!id && (!Number.isInteger(numericArticleId) || !Number.isInteger(numericGalleyId))) return;
  if (queryId) window.sessionStorage.setItem('uploadedArticleId', queryId);

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

  async function loadUploadedArticle() {
    let articleQuery = client.from('journal_pdfs').select('title, authors, issue, page_number, ojs_article_id, ojs_galley_id, sort_order, doi, citation, alternate_url, abstract, keywords, conflict_of_interest, ai_declaration, funding, correspondence, received_date, accepted_date, first_author_name, first_author_affiliation, file_path, created_at, updated_at, journals(name)').eq('is_published', true);
    articleQuery = id ? articleQuery.eq('id', id) : articleQuery.eq('ojs_article_id', numericArticleId).eq('ojs_galley_id', numericGalleyId);
    const { data, error } = await articleQuery.maybeSingle();
    if (error || !data) {
      document.documentElement.classList.remove('uploaded-article-loading');
      return;
    }

    const pdfUrl = `${client.storage.from('journal-pdfs').getPublicUrl(data.file_path).data.publicUrl}?v=${encodeURIComponent(data.updated_at || data.created_at || Date.now())}`;
    document.title = `${data.title} | ${data.journals?.name || 'Mattioli 1885 Journals'}`;
    document.querySelector('.hero-section h1').textContent = data.title;
    document.querySelector('.page_title').textContent = data.title;

    const authors = document.querySelector('section.item.authors ul.authors');
    if (authors) authors.innerHTML = `<li><span class="name">${escapeHtml(data.authors || 'Mattioli 1885 Journals')}</span></li>`;
    const keywordsSection = document.querySelector('section.item.keywords');
    if (keywordsSection) keywordsSection.remove();
    const abstract = document.querySelector('section.item.abstract');
    if (abstract) abstract.innerHTML = `<h2 class="label">Abstract</h2><p>${escapeHtml(data.abstract || 'PDF publication')}</p>`;

    const declarations = [
      ['Conflict of Interest', data.conflict_of_interest],
      ['Declaration on the Use of AI', data.ai_declaration],
      ['Funding', data.funding]
    ].filter(([, value]) => value);
    const correspondence = [
      ['Correspondence', data.correspondence],
      ['Received', data.received_date],
      ['Accepted', data.accepted_date],
      ['First author name', data.first_author_name],
      ['Affiliation', data.first_author_affiliation]
    ].filter(([, value]) => value);
    const references = document.querySelector('section.item.references');
    if (references && correspondence.length) {
      references.insertAdjacentHTML('afterend', `<section class="item article-correspondence"><div class="value">${correspondence.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}</div></section>`);
    }
    if (references && declarations.length) {
      references.insertAdjacentHTML('beforebegin', `<section class="item article-declarations"><div class="value">${declarations.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}</div></section>`);
    }

    const doi = document.querySelector('meta[name="DC.Identifier.DOI"]');
    if (doi && data.doi) doi.setAttribute('content', data.doi);
    if (data.citation) {
      document.querySelectorAll('#citationOutput').forEach(output => {
        output.textContent = data.citation;
        output.style.whiteSpace = 'pre-wrap';
        if (data.alternate_url) {
          const link = document.createElement('a');
          link.href = data.alternate_url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = data.doi || data.alternate_url;
          output.append(document.createTextNode(' '), link);
        }
      });
    }
    if (data.alternate_url) {
      document.querySelectorAll('#citationOutput a[href*="doi.org"]').forEach(link => {
        link.href = data.alternate_url;
        link.target = '_blank';
        link.rel = 'noopener';
      });
    }
    const details = document.querySelector('.entry_details');
    if (details) {
      const viewerUrl = data.ojs_article_id && data.ojs_galley_id ? `/index.php/actabiomedica/article/view/${data.ojs_article_id}/${data.ojs_galley_id}.html` : `/api/pdf-preview?uploadedId=${encodeURIComponent(id)}`;
      details.insertAdjacentHTML('afterbegin', `<p><a class="obj_galley_link btn btn-primary pdf" href="${escapeHtml(viewerUrl)}">PDF</a></p>`);
    }
    document.documentElement.classList.remove('uploaded-article-loading');
  }

  loadUploadedArticle();
}());
