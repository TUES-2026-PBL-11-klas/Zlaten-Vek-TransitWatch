import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SOFIA_CENTER: [number, number] = [42.6977, 23.3219];
const DEFAULT_ZOOM = 13;

function RecenterButton() {
  const map = useMap();
  return (
    <button
      onClick={() => map.setView(SOFIA_CENTER, DEFAULT_ZOOM)}
      style={{
        position: 'absolute',
        bottom: 32,
        right: 16,
        zIndex: 1000,
        background: '#1A1A2E',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 16px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      Sofia
    </button>
  );
}

export default function MapPage() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Navbar */}
      <header
        style={{
          background: '#1A1A2E',
          color: '#fff',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 1000,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.3px' }}>
          TransitWatch Sofia
        </span>
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user ? (
            <>
              <Link
                to="/profile"
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: 0.8,
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  background: '#16A34A',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={SOFIA_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterButton />
        </MapContainer>
      </div>
    </div>
  );
}
