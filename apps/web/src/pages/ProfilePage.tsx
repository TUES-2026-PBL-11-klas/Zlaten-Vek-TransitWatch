import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IdentityCard from '../components/profile/IdentityCard';
import QuickSettings from '../components/profile/QuickSettings';
import MyReportsCard from '../components/profile/MyReportsCard';

export default function ProfilePage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/login');
    });
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <header style={styles.navbar}>
        <span style={styles.navBrand}>TransitWatch Sofia</span>
        <nav style={styles.navActions}>
          <Link to="/" style={styles.navBack}>
            <ArrowLeft size={14} strokeWidth={2} />
            Map
          </Link>
          <button onClick={handleSignOut} style={styles.signOutBtn}>
            Sign out
          </button>
        </nav>
      </header>

      {/* Content */}
      <main style={styles.main}>
        <div style={styles.inner}>
          <h1 style={styles.pageTitle}>Profile</h1>
          <div style={styles.grid}>
            <IdentityCard />
            <QuickSettings />
            <MyReportsCard />
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  navbar: {
    backgroundColor: '#1A1A2E',
    color: '#FFFFFF',
    padding: '0 24px',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  navBrand: {
    fontWeight: 600,
    fontSize: 18,
    letterSpacing: '-0.3px',
    color: '#FFFFFF',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navBack: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  signOutBtn: {
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    padding: '40px 24px',
  },
  inner: {
    maxWidth: 780,
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#1A1A2E',
    letterSpacing: '-0.4px',
    margin: '0 0 24px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 16,
  },
};
