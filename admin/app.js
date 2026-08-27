const { createClient } = window.supabase;
const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const loginView = document.querySelector('#loginView');
const dashboardView = document.querySelector('#dashboardView');
const loginMessage = document.querySelector('#loginMessage');
const dashboardMessage = document.querySelector('#dashboardMessage');
const records = document.querySelector('#records');
const journalSelect = document.querySelector('#journalSelect');
const journalForm = document.querySelector('#journalForm');
const journalFormTitle = document.querySelector('#journalFormTitle');
const journalSubmit = document.querySelector('#journalSubmit');
const cancelJournalEdit = document.querySelector('#cancelJournalEdit');
const pdfEditPanel = document.querySelector('#pdfEditPanel');
const pdfEditForm = document.querySelector('#pdfEditForm');
let journals = [];
let editingJournalId = null;
let editingPdfId = null;

const existingJournals = [
  ['actabiomedica', 'Acta Biomedica Atenei Parmensis'],
  ['aestheticmedicine', 'Aesthetic Medicine'],
  ['annali-igiene', 'Annali di Igiene'],
  ['BE', 'Biomedical Engineering'],
  ['DPCJ', 'Disaster and Critical Care Journal'],
  ['EJOEH', 'European Journal of Occupational and Environmental Hygiene'],
  ['JBR', 'Journal of Biological Research'],
  ['lamedicinadellavoro', 'La Medicina del Lavoro'],
  ['MedHistor', 'Medical History'],
  ['MJHID', 'Mediterranean Journal of Hematology and Infectious Diseases'],
  ['MRM', 'Multidisciplinary Respiratory Medicine'],
  ['MRMedizioneitaliana', 'Multidisciplinary Respiratory Medicine Edizione Italiana'],
  ['perspectivespediatricneurology', 'Perspectives in Pediatric Neurology'],
  ['progressinnutrition', 'Progress in Nutrition'],
  ['sarcoidosis', 'Sarcoidosis'],
  ['theultrasoundjournal', 'The Ultrasound Journal']
];

function setMessage(element, message, error = false) {
  element.textContent = message;
  element.style.color = error ? '#a52c2c' : '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function setJournalEditMode(journal) {
  editingJournalId = journal?.id || null;
  journalFormTitle.textContent = journal ? 'Edit journal' : 'Add journal';
  journalSubmit.textContent = journal ? 'Save changes' : 'Create journal';
  cancelJournalEdit.hidden = !journal;
  document.querySelector('#journalName').value = journal?.name || '';
  document.querySelector('#journalSlug').value = journal?.slug || '';
  document.querySelector('#journalUrl').value = journal?.website_url || '';
  document.querySelector('#journalDescription').value = journal?.description || '';
}

function doiPageNumber(doi) {
  const value = String(doi || '').trim().replace(/\/$/, '');
  return value.split('/').pop() || '';
}

async function showDashboard() {
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return redirectToLogin();

  const { data: profile, error } = await client.from('profiles').select('role').eq('id', sessionData.session.user.id).maybeSingle();
  if (error) return setMessage(loginMessage, error.message, true);
  if (!profile || !['admin', 'editor'].includes(profile.role)) {
    await client.auth.signOut();
    return setMessage(loginMessage, 'This account is not approved for the control panel.', true);
  }
  loginView.hidden = true;
  dashboardView.hidden = false;
  await loadData();
}

function redirectToLogin() {
  window.location.replace('/auth/?mode=login&journal=admin');
}

async function loadData() {
  setMessage(dashboardMessage, 'Loading...');
  const { error: syncError } = await client.from('journals').upsert(
    existingJournals.map(([slug, name]) => ({ slug, name, is_published: true })),
    { onConflict: 'slug', ignoreDuplicates: true }
  );
  if (syncError) return setMessage(dashboardMessage, syncError.message, true);
  const { data, error } = await client.from('journals').select('*, journal_pdfs(*)').order('name');
  if (error) return setMessage(dashboardMessage, error.message, true);
  journals = data || [];
  journalSelect.innerHTML = journals.map(journal => `<option value="${escapeHtml(journal.id)}">${escapeHtml(journal.name)}</option>`).join('');
  records.innerHTML = journals.length ? journals.map(renderJournal).join('') : '<p class="muted">No journals yet.</p>';
  setMessage(dashboardMessage, '');
}

function renderJournal(journal) {
  const pdfs = (journal.journal_pdfs || []).sort((a, b) => a.title.localeCompare(b.title));
  return `<article class="record"><div class="record-header"><div><h3>${escapeHtml(journal.name)}</h3><small>${escapeHtml(journal.slug)}${journal.description ? ` · ${escapeHtml(journal.description)}` : ''}</small></div><div><button class="button-secondary" data-edit-journal="${journal.id}">Edit</button> <button class="danger" data-delete-journal="${journal.id}">Delete journal</button></div></div><div class="pdf-list">${pdfs.length ? pdfs.map(pdf => `<div class="pdf-row"><a href="${client.storage.from('journal-pdfs').getPublicUrl(pdf.file_path).data.publicUrl}" target="_blank" rel="noreferrer">${escapeHtml(pdf.title)}</a><span>${escapeHtml(pdf.issue || '')} <button class="button-secondary" data-edit-pdf="${pdf.id}">Edit</button> <button class="danger" data-delete-pdf="${pdf.id}" data-file-path="${escapeHtml(pdf.file_path)}">Delete</button></span></div>`).join('') : '<small>No PDFs uploaded.</small>'}</div></article>`;
}

function setPdfEditMode(pdf) {
  editingPdfId = pdf?.id || null;
  pdfEditPanel.hidden = !pdf;
  if (!pdf) return;
  document.querySelector('#editPdfTitle').value = pdf.title || '';
  document.querySelector('#editPdfAuthors').value = pdf.authors || '';
  document.querySelector('#editPdfIssue').value = pdf.issue || '';
  document.querySelector('#editPdfPageNumber').value = pdf.page_number || doiPageNumber(pdf.doi);
  document.querySelector('#editPdfDoi').value = pdf.doi || '';
  document.querySelector('#editPdfAbstract').value = pdf.abstract || '';
  document.querySelector('#editPdfKeywords').value = pdf.keywords || '';
  pdfEditPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  setMessage(loginMessage, 'Signing in...');
  const { error } = await client.auth.signInWithPassword({ email: document.querySelector('#email').value.trim(), password: document.querySelector('#password').value });
  if (error) return setMessage(loginMessage, error.message, true);
  await showDashboard();
});

document.querySelector('#logoutButton').addEventListener('click', async () => { await client.auth.signOut(); dashboardView.hidden = true; loginView.hidden = false; });
document.querySelector('#refreshButton').addEventListener('click', loadData);

journalForm.addEventListener('submit', async event => {
  event.preventDefault();
  const values = { name: document.querySelector('#journalName').value.trim(), slug: document.querySelector('#journalSlug').value.trim(), website_url: document.querySelector('#journalUrl').value.trim() || null, description: document.querySelector('#journalDescription').value.trim() || null };
  const query = editingJournalId ? client.from('journals').update(values).eq('id', editingJournalId) : client.from('journals').insert(values);
  const { error } = await query;
  if (error) return setMessage(dashboardMessage, error.message, true);
  event.target.reset(); setJournalEditMode(null); await loadData();
});

cancelJournalEdit.addEventListener('click', () => { journalForm.reset(); setJournalEditMode(null); });

pdfEditForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!editingPdfId) return;
  const values = {
    title: document.querySelector('#editPdfTitle').value.trim(),
    authors: document.querySelector('#editPdfAuthors').value.trim() || null,
    issue: document.querySelector('#editPdfIssue').value.trim() || null,
    page_number: document.querySelector('#editPdfPageNumber').value.trim() || doiPageNumber(document.querySelector('#editPdfDoi').value) || null,
    doi: document.querySelector('#editPdfDoi').value.trim() || null,
    abstract: document.querySelector('#editPdfAbstract').value.trim() || null,
    keywords: document.querySelector('#editPdfKeywords').value.trim() || null
  };
  const { error } = await client.from('journal_pdfs').update(values).eq('id', editingPdfId);
  if (error) return setMessage(dashboardMessage, error.message, true);
  setPdfEditMode(null);
  await loadData();
});

document.querySelector('#cancelPdfEdit').addEventListener('click', () => { pdfEditForm.reset(); setPdfEditMode(null); });

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
  const { data: sessionData } = await client.auth.getSession();
  const doi = document.querySelector('#pdfDoi').value.trim();
  const insert = await client.from('journal_pdfs').insert({ journal_id: journal.id, title: document.querySelector('#pdfTitle').value.trim(), authors: document.querySelector('#pdfAuthors').value.trim() || null, issue: document.querySelector('#pdfIssue').value.trim() || null, page_number: document.querySelector('#pdfPageNumber').value.trim() || doiPageNumber(doi) || null, doi: doi || null, abstract: document.querySelector('#pdfAbstract').value.trim() || null, keywords: document.querySelector('#pdfKeywords').value.trim() || null, file_path: filePath, file_size: file.size, created_by: sessionData.session?.user.id });
  if (insert.error) { await client.storage.from('journal-pdfs').remove([filePath]); return setMessage(dashboardMessage, insert.error.message, true); }
  event.target.reset(); await loadData();
});

records.addEventListener('click', async event => {
  const journalId = event.target.dataset.deleteJournal;
  const editJournalId = event.target.dataset.editJournal;
  const editPdfId = event.target.dataset.editPdf;
  const pdfId = event.target.dataset.deletePdf;
  if (editPdfId) {
    const pdf = journals.flatMap(item => item.journal_pdfs || []).find(item => item.id === editPdfId);
    if (pdf) setPdfEditMode(pdf);
    return;
  }
  if (editJournalId) {
    const journal = journals.find(item => item.id === editJournalId);
    if (journal) setJournalEditMode(journal);
    return;
  }
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

client.auth.getSession().then(({ data }) => {
  if (data.session) showDashboard();
  else redirectToLogin();
});
