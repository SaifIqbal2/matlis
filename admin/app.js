const { createClient } = window.supabase;
const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const loginView = document.querySelector('#loginView');
const dashboardView = document.querySelector('#dashboardView');
const loginMessage = document.querySelector('#loginMessage');
const dashboardMessage = document.querySelector('#dashboardMessage');
const records = document.querySelector('#records');
const journalSelect = document.querySelector('#journalSelect');
let journals = [];

function setMessage(element, message, error = false) {
  element.textContent = message;
  element.style.color = error ? '#a52c2c' : '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

async function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  await loadData();
}

async function loadData() {
  setMessage(dashboardMessage, 'Loading...');
  const { data, error } = await client.from('journals').select('*, journal_pdfs(*)').order('name');
  if (error) return setMessage(dashboardMessage, error.message, true);
  journals = data || [];
  journalSelect.innerHTML = journals.map(journal => `<option value="${escapeHtml(journal.id)}">${escapeHtml(journal.name)}</option>`).join('');
  records.innerHTML = journals.length ? journals.map(renderJournal).join('') : '<p class="muted">No journals yet.</p>';
  setMessage(dashboardMessage, '');
}

function renderJournal(journal) {
  const pdfs = (journal.journal_pdfs || []).sort((a, b) => a.title.localeCompare(b.title));
  return `<article class="record"><div class="record-header"><div><h3>${escapeHtml(journal.name)}</h3><small>${escapeHtml(journal.slug)}${journal.description ? ` · ${escapeHtml(journal.description)}` : ''}</small></div><button class="danger" data-delete-journal="${journal.id}">Delete journal</button></div><div class="pdf-list">${pdfs.length ? pdfs.map(pdf => `<div class="pdf-row"><a href="${client.storage.from('journal-pdfs').getPublicUrl(pdf.file_path).data.publicUrl}" target="_blank" rel="noreferrer">${escapeHtml(pdf.title)}</a><span>${escapeHtml(pdf.issue || '')} <button class="danger" data-delete-pdf="${pdf.id}" data-file-path="${escapeHtml(pdf.file_path)}">Delete</button></span></div>`).join('') : '<small>No PDFs uploaded.</small>'}</div></article>`;
}

document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  setMessage(loginMessage, 'Signing in...');
  const { error } = await client.auth.signInWithPassword({ email: document.querySelector('#email').value, password: document.querySelector('#password').value });
  if (error) return setMessage(loginMessage, error.message, true);
  await showDashboard();
});

document.querySelector('#logoutButton').addEventListener('click', async () => { await client.auth.signOut(); dashboardView.hidden = true; loginView.hidden = false; });
document.querySelector('#refreshButton').addEventListener('click', loadData);

document.querySelector('#journalForm').addEventListener('submit', async event => {
  event.preventDefault();
  const { error } = await client.from('journals').insert({ name: document.querySelector('#journalName').value, slug: document.querySelector('#journalSlug').value, website_url: document.querySelector('#journalUrl').value || null, description: document.querySelector('#journalDescription').value || null });
  if (error) return setMessage(dashboardMessage, error.message, true);
  event.target.reset(); await loadData();
});

document.querySelector('#pdfForm').addEventListener('submit', async event => {
  event.preventDefault();
  const file = document.querySelector('#pdfFile').files[0];
  if (!file || file.type !== 'application/pdf') return setMessage(dashboardMessage, 'Please select a PDF file.', true);
  const journal = journals.find(item => item.id === journalSelect.value);
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const filePath = `${journal.slug}/${crypto.randomUUID()}-${safeName}`;
  setMessage(dashboardMessage, 'Uploading PDF...');
  const upload = await client.storage.from('journal-pdfs').upload(filePath, file, { contentType: 'application/pdf', upsert: false });
  if (upload.error) return setMessage(dashboardMessage, upload.error.message, true);
  const insert = await client.from('journal_pdfs').insert({ journal_id: journal.id, title: document.querySelector('#pdfTitle').value, issue: document.querySelector('#pdfIssue').value || null, file_path: filePath, file_size: file.size });
  if (insert.error) { await client.storage.from('journal-pdfs').remove([filePath]); return setMessage(dashboardMessage, insert.error.message, true); }
  event.target.reset(); await loadData();
});

records.addEventListener('click', async event => {
  const journalId = event.target.dataset.deleteJournal;
  const pdfId = event.target.dataset.deletePdf;
  if (journalId && confirm('Delete this journal and its PDF records?')) {
    const { error } = await client.from('journals').delete().eq('id', journalId);
    if (error) return setMessage(dashboardMessage, error.message, true);
    await loadData();
  }
  if (pdfId && confirm('Delete this PDF?')) {
    const filePath = event.target.dataset.filePath;
    const remove = await client.storage.from('journal-pdfs').remove([filePath]);
    if (remove.error) return setMessage(dashboardMessage, remove.error.message, true);
    const { error } = await client.from('journal_pdfs').delete().eq('id', pdfId);
    if (error) return setMessage(dashboardMessage, error.message, true);
    await loadData();
  }
});

client.auth.getSession().then(({ data }) => { if (data.session) showDashboard(); });
