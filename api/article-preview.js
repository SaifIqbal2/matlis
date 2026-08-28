const supabaseUrl = 'https://rimdtztawzodxjhyiwqo.supabase.co';
const supabaseKey = 'sb_publishable_eyn9CQSxhK2lokrmYL4_LQ_kul6SZ1L';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

module.exports = async function handler(request, response) {
  const id = request.query?.uploadedId;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return response.status(400).send('Missing or invalid article ID.');
  }

  const result = await fetch(`${supabaseUrl}/rest/v1/journal_pdfs?select=title&id=eq.${encodeURIComponent(id)}&is_published=eq.true`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  if (!result.ok) return response.status(502).send('Could not load article.');

  const articles = await result.json();
  if (!articles.length) return response.status(404).send('Article not found.');

  const title = escapeHtml(articles[0].title || 'Article');
  const returnUrl = typeof request.query?.returnUrl === 'string' && request.query.returnUrl.startsWith('/') ? `&returnUrl=${encodeURIComponent(request.query.returnUrl)}` : '';
  const viewerUrl = `/index.php/actabiomedica/article/view/18612/13437.html?uploadedId=${encodeURIComponent(id)}${returnUrl}`;
  const absoluteViewerUrl = `https://${request.headers.host}${viewerUrl}`;
  response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  return response.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>View of ${title}</title><meta property="og:title" content="View of ${title}"><meta property="og:description" content="Read this article PDF from Mattioli 1885 Journals."><meta property="og:type" content="article"><meta property="og:url" content="${absoluteViewerUrl}"><link rel="canonical" href="${absoluteViewerUrl}"><meta http-equiv="refresh" content="0;url=${viewerUrl}"></head><body><p>Opening <a href="${viewerUrl}">${title}</a>...</p><script>window.location.replace(${JSON.stringify(viewerUrl)});</script></body></html>`);
};
