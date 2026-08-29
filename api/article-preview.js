const supabaseUrl = 'https://rimdtztawzodxjhyiwqo.supabase.co';
const supabaseKey = 'sb_publishable_eyn9CQSxhK2lokrmYL4_LQ_kul6SZ1L';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

module.exports = async function handler(request, response) {
  const id = request.query?.uploadedId;
  const numericArticleId = Number(request.query?.articleId);
  const numericGalleyId = Number(request.query?.galleyId);
  if (!id && (!Number.isInteger(numericArticleId) || !Number.isInteger(numericGalleyId))) return response.status(400).send('Missing or invalid article ID.');

  const filter = id ? `id=eq.${encodeURIComponent(id)}` : `ojs_article_id=eq.${numericArticleId}&ojs_galley_id=eq.${numericGalleyId}`;
  const result = await fetch(`${supabaseUrl}/rest/v1/journal_pdfs?select=id,title,ojs_article_id,ojs_galley_id&${filter}&is_published=eq.true`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  if (!result.ok) return response.status(502).send('Could not load article.');

  const articles = await result.json();
  if (!articles.length) return response.status(404).send('Article not found.');

  const article = articles[0];
  const articleId = article.id;
  const title = escapeHtml(article.title || 'Article');
  const fallbackViewerUrl = article.ojs_article_id && article.ojs_galley_id
    ? `https://www.mattioli1885journls.com/index.php/actabiomedica/article/view/${encodeURIComponent(article.ojs_article_id)}/${encodeURIComponent(article.ojs_galley_id)}.html?uploadedId=${encodeURIComponent(articleId)}`
    : `https://www.mattioli1885journls.com/index.php/actabiomedica/index.html?uploadedId=${encodeURIComponent(articleId)}`;
  const returnUrl = typeof request.query?.returnUrl === 'string' ? `&returnUrl=${encodeURIComponent(request.query.returnUrl)}` : '';
  const viewerUrl = `${fallbackViewerUrl}${returnUrl ? '&' : '?'}${returnUrl.replace(/^&/, '')}`;
  const absoluteViewerUrl = viewerUrl;
  response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  return response.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>View of ${title}</title><meta property="og:title" content="View of ${title}"><meta property="og:description" content="Read this article PDF from Mattioli 1885 Journals."><meta property="og:type" content="article"><meta property="og:url" content="${absoluteViewerUrl}"><link rel="canonical" href="${absoluteViewerUrl}"><meta http-equiv="refresh" content="0;url=${viewerUrl}"></head><body><p>Opening <a href="${viewerUrl}">${title}</a>...</p><script>window.location.replace(${JSON.stringify(viewerUrl)});</script></body></html>`);
};
