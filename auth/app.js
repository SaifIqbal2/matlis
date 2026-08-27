const { createClient } = window.supabase;
const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const params = new URLSearchParams(window.location.search);
let registerMode = params.get('mode') === 'register';
const title = document.querySelector('#title');
const subtitle = document.querySelector('#subtitle');
const nameField = document.querySelector('#nameField');
const confirmField = document.querySelector('#confirmField');
const submitButton = document.querySelector('#submitButton');
const switchButton = document.querySelector('#switchButton');
const forgotButton = document.querySelector('#forgotButton');
const message = document.querySelector('#message');

// Check if already logged in - redirect to admin
client.auth.getSession().then(({ data }) => {
  if (data.session) {
    window.location.href = '/admin/';
  }
});

function setMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? '#a52c2c' : '';
}

function renderMode() {
  title.textContent = registerMode ? 'Create account' : 'Sign in';
  subtitle.textContent = registerMode ? 'Create one account for journal access.' : 'Access your journal account.';
  nameField.hidden = !registerMode;
  confirmField.hidden = !registerMode;
  document.querySelector('#fullName').required = registerMode;
  document.querySelector('#confirmPassword').required = registerMode;
  submitButton.textContent = registerMode ? 'Create account' : 'Sign in';
  switchButton.textContent = registerMode ? 'I already have an account' : 'Create an account';
  forgotButton.hidden = registerMode;
}

switchButton.addEventListener('click', () => { registerMode = !registerMode; setMessage(''); renderMode(); });
forgotButton.addEventListener('click', async () => {
  const email = document.querySelector('#email').value;
  if (!email) return setMessage('Enter your email first.', true);
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/` });
  setMessage(error ? error.message : 'Password reset email sent.');
});

document.querySelector('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  setMessage(registerMode ? 'Creating account...' : 'Signing in...');
  if (registerMode) {
    if (password !== document.querySelector('#confirmPassword').value) return setMessage('Passwords do not match.', true);
    const { error } = await client.auth.signUp({ email, password, options: { data: { full_name: document.querySelector('#fullName').value.trim() } } });
    if (error) return setMessage(error.message, true);
    setMessage('Account created. Check your email if confirmation is enabled.');
    return;
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return setMessage(error.message, true);
  window.location.href = '/admin/';
});

renderMode();
