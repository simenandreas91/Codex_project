import { useEffect, useState } from 'react';
import { Modal } from './Modal';

const MODE_LABELS = {
  login: {
    title: 'Sign in',
    submit: 'Sign in',
    toggle: 'Need an account? Register',
    toggleMode: 'register'
  },
  register: {
    title: 'Create account',
    submit: 'Register',
    toggle: 'Already have an account? Sign in',
    toggleMode: 'login'
  }
};

export function AuthModal({ open, mode, onClose, onSubmit, onToggleMode, error, isSubmitting }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
    }
  }, [open, mode]);

  const labels = MODE_LABELS[mode] ?? MODE_LABELS.login;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ email: email.trim(), password });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="authModalTitle">
      <div className="modal-header">
        <div>
          <h2 id="authModalTitle">{labels.title}</h2>
          <p className="modal-subtitle">Collaborate with peers and keep your automation playbook in sync.</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close auth modal">
          &times;
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button type="submit" className="btn btn-gradient" disabled={isSubmitting}>
            {isSubmitting ? 'Working…' : labels.submit}
          </button>
          <button type="button" className="btn btn-link" onClick={() => onToggleMode(labels.toggleMode)}>
            {labels.toggle}
          </button>
        </div>
      </form>
    </Modal>
  );
}
