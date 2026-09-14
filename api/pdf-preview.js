const supabaseUrl = 'https://rimdtztawzodxjhyiwqo.supabase.co';
const supabaseKey = 'sb_publishable_eyn9CQSxhK2lokrmYL4_LQ_kul6SZ1L';

module.exports = async function handler(request, response) {
  const id = request.query?.uploadedId;
  if (!id) return response.status(400).send('Missing uploaded article ID.');

  const filter = `id=eq.${encodeURIComponent(id)}`;
  const result = await fetch(`${supabaseUrl}/rest/v1/journal_pdfs?select=id,file_path,ojs_article_id,ojs_galley_id,article_shell_id,journal_id,journals!journal_id(slug)&${filter}&is_published=eq.true`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  if (!result.ok) return response.status(502).send('Could not load PDF.');

  const articles = await result.json();
  if (!articles.length || !articles[0].file_path) return response.status(404).send('PDF not found.');

  const article = articles[0];
  const objectPath = article.file_path.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const publicPdfUrl = `${supabaseUrl}/storage/v1/object/public/journal-pdfs/${objectPath}`;
  const journalSlug = article.journals?.slug || 'actabiomedica';
  const shellArticleId = Number.isFinite(Number(article.article_shell_id)) ? Number(article.article_shell_id) : (Number.isFinite(Number(article.ojs_article_id)) ? Number(article.ojs_article_id) : null);

  if (article.ojs_article_id && article.ojs_galley_id) {
    return response.redirect(302, `https://www.mattioli1885journls.com/index.php/${journalSlug}/article/view/${article.ojs_article_id}/${article.ojs_galley_id}.html?uploadedId=${encodeURIComponent(id)}`);
  }

  if (shellArticleId) {
    return response.redirect(302, `https://www.mattioli1885journls.com/index.php/${journalSlug}/article/view/${shellArticleId}.html?uploadedId=${encodeURIComponent(id)}`);
  }

  return response.redirect(302, publicPdfUrl);
};
