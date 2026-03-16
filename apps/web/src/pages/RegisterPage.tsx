import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    navigate('/');
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>Create Account</h1>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />
        </label>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p style={styles.link}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '400px',
    padding: '32px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    border: '1px solid #E5E7EB',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1A1A2E',
    textAlign: 'center',
    margin: 0,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    color: '#6B7280',
  },
  input: {
    padding: '10px 12px',
    fontSize: '16px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    outline: 'none',
    color: '#111827',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: '#16A34A',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  error: {
    padding: '10px',
    fontSize: '14px',
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
    border: '1px solid #FECACA',
  },
  link: {
    fontSize: '14px',
    color: '#6B7280',
    textAlign: 'center',
  },
};
