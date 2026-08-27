const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const message = document.querySelector('#message');
const id = new URLSearchParams(window.location.search).get('id');

function setMessage(text) { message.textContent = text; }
function setText(selector, value) { document.querySelector(selector).textContent = value || ''; }

async function loadArticle() {
  if (!id) return setMessage('Article not found.');
  const { data, error } = await client.from('journal_pdfs').select('title, authors, issue, doi, abstract, keywords, file_path, journals(name)').eq('id', id).eq('is_published', true).maybeSingle();
  if (error || !data) return setMessage('Article not found or unavailable.');
  document.title = `${data.title} | Mattioli 1885 Journals`;
  setText('#journal', data.journals?.name || 'Mattioli 1885 Journals');
  setText('#title', data.title);
  setText('#authors', data.authors || 'Mattioli 1885 Journals');
  setText('#issue', data.issue ? `Issue page: ${data.issue}` : 'Online First');
  setText('#doi', data.doi ? `DOI: ${data.doi}` : '');
  setText('#keywords', data.keywords);
  setText('#abstract', data.abstract);
  if (!data.keywords) document.querySelector('#keywordsSection').hidden = true;
  if (!data.abstract) document.querySelector('#abstractSection').hidden = true;
  document.querySelector('#pdf').href = client.storage.from('journal-pdfs').getPublicUrl(data.file_path).data.publicUrl;
}
loadArticle();
