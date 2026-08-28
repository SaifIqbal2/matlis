const supabaseUrl = 'https://rimdtztawzodxjhyiwqo.supabase.co';
const supabaseKey = 'sb_publishable_eyn9CQSxhK2lokrmYL4_LQ_kul6SZ1L';

module.exports = async function handler(request, response) {
  const id = request.query?.uploadedId;
  if (!id) return response.status(400).send('Missing uploaded article ID.');

  const filter = `id=eq.${encodeURIComponent(id)}`;
  const result = await fetch(`${supabaseUrl}/rest/v1/journal_pdfs?select=file_path,ojs_article_id,ojs_galley_id&${filter}&is_published=eq.true`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  if (!result.ok) return response.status(502).send('Could not load PDF.');

  const articles = await result.json();
  if (!articles.length || !articles[0].file_path) return response.status(404).send('PDF not found.');

  const article = articles[0];
  if (article.ojs_article_id && article.ojs_galley_id) {
    return response.redirect(302, `https://www.mattioli1885journls.com/index.php/actabiomedica/article/view/18612/13437.html?uploadedId=${encodeURIComponent(articleId)}${returnUrl}`);
  }

  const pdfUrl = `${supabaseUrl}/storage/v1/object/public/journal-pdfs/${article.file_path}`;
  return response.redirect(302, pdfUrl);
};
