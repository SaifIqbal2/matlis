(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  async function updateAlternateLinks() {
    const { data, error } = await client
      .from('journal_pdfs')
      .select('ojs_article_id, doi, alternate_url')
      .eq('is_published', true)
      .not('alternate_url', 'is', null);
    if (error || !data) return;

    const articles = new Map();
    data.forEach(article => {
      if (article.alternate_url && article.ojs_article_id) articles.set(String(article.ojs_article_id), article.alternate_url);
      if (article.alternate_url && article.doi) articles.set(article.doi.replace(/^https?:\/\/doi\.org\//, ''), article.alternate_url);
    });

    document.querySelectorAll('.obj_article_summary').forEach(summary => {
      const articleLink = summary.querySelector('.title a');
      const doiLink = summary.querySelector('.doiInSummary a[href*="doi.org"]');
      const articleId = articleLink?.id?.match(/^article-(\d+)$/)?.[1];
      const doi = doiLink?.href.match(/doi\.org\/(.+)$/)?.[1];
      const alternateUrl = articles.get(articleId) || articles.get(doi);

      if (articleLink) {
        const articleHref = articleLink.getAttribute('href') || '';
        const normalizedArticleHref = articleHref.match(/\/article\/view\/(\d+)\/(\d+)\.html$/)
          ? articleHref.replace(/\/article\/view\/\d+\/\d+\.html$/, '/article/view/$1.html')
          : articleHref;

        if (normalizedArticleHref) {
          articleLink.setAttribute('href', normalizedArticleHref);
        }

        articleLink.removeAttribute('target');
        articleLink.removeAttribute('rel');
      }

      if (alternateUrl && doiLink && doiLink.href.includes('doi.org')) {
        doiLink.href = alternateUrl;
        doiLink.target = '_blank';
        doiLink.rel = 'noopener';
        doiLink.addEventListener('click', function (event) {
          event.preventDefault();
          window.open(alternateUrl, '_blank', 'noopener,noreferrer');
        });
      }
    });
  }

  updateAlternateLinks();
}());
