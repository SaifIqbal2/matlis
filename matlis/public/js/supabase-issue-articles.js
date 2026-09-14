(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const urlParams = new URLSearchParams(window.location.search);
  const issuePageId = window.location.pathname.match(/\/issue\/view\/(\d+)/)?.[1];
  if (!issuePageId) return;

  async function loadIssueArticles() {
    const { data, error } = await client
      .from('journal_pdfs')
      .select('ojs_article_id, ojs_galley_id, title, doi, is_published')
      .eq('issue_page_id', Number(issuePageId))
      .eq('is_published', true)
      .order('created_at', { ascending: true });
    
    if (error || !data || data.length === 0) return;

    const articleContainer = document.querySelector('.obj_article_list') || 
                             document.querySelector('main') || 
                             document.body;
    
    data.forEach(article => {
      if (!article.ojs_article_id || !article.ojs_galley_id) return;
      const existingArticle = document.getElementById(`article-${article.ojs_article_id}`);
      if (existingArticle) return;

      const articleUrl = `/index.php/actabiomedica/article/view/${article.ojs_article_id}/${article.ojs_galley_id}.html`;
      const doiLink = article.doi ? `<a href="${article.doi}" target="_blank">${article.doi}</a>` : '';
      
      const articleHtml = `
        <div class="obj_article_summary">
          <h3 class="title"><a id="article-${article.ojs_article_id}" href="${articleUrl}">${article.title || 'Untitled Article'}</a></h3>
          ${doiLink ? `<div class="doiInSummary"><a href="${article.doi}" target="_blank">DOI: ${article.doi}</a></div>` : ''}
        </div>
      `;
      
      const temp = document.createElement('div');
      temp.innerHTML = articleHtml;
      if (articleContainer && articleContainer.querySelector('.obj_article_summary')) {
        articleContainer.querySelector('.obj_article_summary').parentNode.insertBefore(temp.firstElementChild, articleContainer.querySelector('.obj_article_summary').nextSibling);
      } else if (articleContainer) {
        articleContainer.appendChild(temp.firstElementChild);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', loadIssueArticles);
  loadIssueArticles();
}());
