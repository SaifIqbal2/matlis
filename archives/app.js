const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const journalSelect = document.querySelector('#journalSelect');
const archiveList = document.querySelector('#archiveList');
const message = document.querySelector('#message');
let journals = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function setMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? '#a52c2c' : '';
}

function pdfUrl(filePath) {
  return client.storage.from('journal-pdfs').getPublicUrl(filePath).data.publicUrl;
}

function renderJournal(journal) {
  const pdfs = (journal.journal_pdfs || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return `<article class="journal"><h2>${escapeHtml(journal.name)}</h2><p class="journal-meta">${escapeHtml(journal.description || 'Published journal archive')}</p><div class="pdf-list">${pdfs.length ? pdfs.map(pdf => `<div class="pdf"><div><p class="pdf-title">${escapeHtml(pdf.title)}</p><p class="pdf-issue">${escapeHtml(pdf.issue || '')}</p></div><a href="${escapeHtml(pdfUrl(pdf.file_path))}" target="_blank" rel="noopener noreferrer">Open PDF</a></div>`).join('') : '<p class="empty">No PDF publications yet.</p>'}</div></article>`;
}

function renderSelectedJournal() {
  const selected = journalSelect.value;
  const visible = selected === 'all' ? journals : journals.filter(journal => journal.id === selected);
  archiveList.innerHTML = visible.length ? visible.map(renderJournal).join('') : '<p class="empty">No publications found.</p>';
}

async function loadArchives() {
  setMessage('Loading archives...');
  const { data, error } = await client.from('journals').select('id, name, slug, description, journal_pdfs(id, title, issue, file_path, created_at, is_published)').eq('is_published', true).order('name');
  if (error) return setMessage(error.message, true);
  journals = (data || []).map(journal => ({ ...journal, journal_pdfs: (journal.journal_pdfs || []).filter(pdf => pdf.is_published) }));
  journalSelect.innerHTML = `<option value="all">All journals</option>${journals.map(journal => `<option value="${escapeHtml(journal.id)}">${escapeHtml(journal.name)}</option>`).join('')}`;
  renderSelectedJournal();
  setMessage('');
}

journalSelect.addEventListener('change', renderSelectedJournal);
loadArchives();
