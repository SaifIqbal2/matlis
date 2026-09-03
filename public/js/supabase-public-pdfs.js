(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const journalSlug = document.body.dataset.journalSlug;
  const issueId = document.body.dataset.issueId;
  const list = document.querySelector(issueId ? '.cmp_article_list.articles' : '.online_first_issue_toc .cmp_article_list.articles');
  const isIssue968 = window.location.pathname.includes('/issue/view/968');
  const isIssue928 = window.location.pathname.includes('/issue/view/928');
  const isIssue963 = window.location.pathname.includes('/issue/view/963');
  const forceIssue968Url = 'https://www.mattioli1885journls.com/index.php/actabiomedica/article/view/17657.html';
  if (!list || !journalSlug) return;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  function applyIssue968Override(node) {
    if (!isIssue968) return;
    const container = node && node.closest ? node.closest('.uploaded-publication') : null;
    const link = container ? container.querySelector('.title a') : null;
    if (!link) return;
    const uploadedId = link.getAttribute('data-uploaded-id');
    const targetUrl = uploadedId ? `${forceIssue968Url}?uploadedId=${encodeURIComponent(uploadedId)}` : forceIssue968Url;
    link.href = targetUrl;
    link.setAttribute('data-force-968', 'true');
    link.removeAttribute('target');
    link.onclick = function (event) {
      event.preventDefault();
      window.location.assign(targetUrl);
      return false;
    };
  }

  function hydrateIssue968Links() {
    if (!isIssue968) return;
    document.querySelectorAll('.uploaded-publication .title a').forEach(applyIssue968Override);
    if (list) {
      list.querySelectorAll('.uploaded-publication .title a').forEach(applyIssue968Override);
    }
  }

  async function addUploadedPdfs() {
    const { data: journal, error: journalError } = await client.from('journals').select('id').eq('slug', journalSlug).eq('is_published', true).maybeSingle();
    if (journalError || !journal) return;

    let pdfQuery = client.from('journal_pdfs').select('id, title, authors, issue, page_number, ojs_article_id, ojs_galley_id, sort_order, doi, alternate_url, file_path, created_at, updated_at').eq('journal_id', journal.id).eq('is_published', true);
    if (issueId) pdfQuery = pdfQuery.eq('issue', issueId);
    const { data: pdfs, error: pdfError } = await pdfQuery.order('sort_order', { ascending: true, nullsFirst: false });
    if (pdfError || !pdfs?.length) return;

    const uploadedItems = pdfs.map(pdf => {
      const url = `${client.storage.from('journal-pdfs').getPublicUrl(pdf.file_path).data.publicUrl}?v=${encodeURIComponent(pdf.updated_at || pdf.created_at || Date.now())}`;
      const productionHost = 'https://www.mattioli1885journls.com';
      const viewerUrl = `${productionHost}/api/pdf-preview?uploadedId=${encodeURIComponent(pdf.id)}`;
      const numericPdfUrl = pdf.ojs_article_id && pdf.ojs_galley_id ? `${productionHost}/index.php/${journalSlug}/article/view/${pdf.ojs_article_id}/${pdf.ojs_galley_id}.html` : '';
      const detailUrl = `${productionHost}/index.php/actabiomedica/onlinefirst/view/19401.html?uploadedId=${encodeURIComponent(pdf.id)}`;
      const issue928DetailUrl = `${productionHost}/index.php/actabiomedica/onlinefirst/view/16515.html?uploadedId=${encodeURIComponent(pdf.id)}`;
      const titleUrl = pdf.ojs_article_id ? `${productionHost}/index.php/${journalSlug}/article/view/${pdf.ojs_article_id}.html?uploadedId=${encodeURIComponent(pdf.id)}` : detailUrl;
      const viewerLink = numericPdfUrl || `${viewerUrl}&returnUrl=${encodeURIComponent(detailUrl)}`;
      const doiUrl = pdf.doi ? `https://doi.org/${encodeURIComponent(pdf.doi.replace(/^https?:\/\/doi\.org\//, ''))}` : '';
      const articleUrl = pdf.alternate_url || doiUrl || detailUrl;
      const pageNumber = pdf.page_number || (pdf.doi || '').replace(/\/$/, '').split('/').pop() || 'PDF';
      const uploadedTitleUrl = isIssue968 ? `${forceIssue968Url}?uploadedId=${encodeURIComponent(pdf.id)}` : (isIssue928 ? issue928DetailUrl : (isIssue963 ? detailUrl : titleUrl));
      return `<li class="uploaded-publication"><div class="obj_article_summary"><h2 class="title"><a href="${uploadedTitleUrl}" data-uploaded-id="${escapeHtml(pdf.id)}">${escapeHtml(pdf.title)}</a></h2>${pdf.doi ? `<div class="doiInSummary"><strong>DOI:</strong> <a href="${escapeHtml(articleUrl)}" target="_blank" rel="noopener">${escapeHtml(pdf.doi)}</a></div>` : (pdf.alternate_url ? `<div class="doiInSummary"><strong>Article link:</strong> <a href="${escapeHtml(articleUrl)}" target="_blank" rel="noopener">${escapeHtml(articleUrl)}</a></div>` : '')}<div class="meta"><div class="authors">${escapeHtml(pdf.authors || 'Mattioli 1885 Journals')}</div><div class="pages">${escapeHtml(pageNumber)}</div></div><a class="obj_galley_link btn btn-primary pdf" href="${viewerLink}">PDF</a></div></li>`;
    });

    const fragment = document.createDocumentFragment();
    uploadedItems.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = item;
      fragment.appendChild(wrapper.firstElementChild);
    });
    const uploadedNodes = Array.from(fragment.children);
    const existingNodes = Array.from(list.children);
    uploadedNodes.forEach((node, index) => {
      const order = Number(pdfs[index].sort_order);
      const position = Number.isFinite(order) && order > 0 ? Math.min(order - 1, existingNodes.length) : existingNodes.length;
      list.insertBefore(node, list.children[position] || null);
      existingNodes.splice(position, 0, node);
    });

    hydrateIssue968Links();
    if (isIssue968) {
      const observer = new MutationObserver(() => hydrateIssue968Links());
      observer.observe(list, { childList: true, subtree: true });
    }
  }

  hydrateIssue968Links();
  addUploadedPdfs();
}());
