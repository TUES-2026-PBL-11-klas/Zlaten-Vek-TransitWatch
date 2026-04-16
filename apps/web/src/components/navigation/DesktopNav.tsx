import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, Flag, UserCircle, LogIn, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const STORAGE_KEY = 'tw-nav-collapsed';

export default function DesktopNav() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true',
  );

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      // Let Leaflet recalculate after the CSS transition ends
      setTimeout(() => window.dispatchEvent(new Event('resize')), 310);
      return next;
    });
  }

  return (
    <div className="hidden md:block relative z-[1002] flex-shrink-0">
      {/* Collapsing container — clips header and transitions height to 0 */}
      <div
        className={cn(
          'overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          collapsed ? 'max-h-0' : 'max-h-14',
        )}
      >
        <header className="h-14 bg-[#1A1A2E] flex items-center justify-between px-6">
          {/* Brand */}
          <Link to="/" className="text-white font-semibold text-lg tracking-tight no-underline">
            TransitWatch Sofia
          </Link>

          {/* Nav items */}
          <nav className="flex items-center gap-1">
            {!loading && (
              <>
                <NavLink to="/" label="Map" icon={<Map size={16} />} active={pathname === '/'} />

                {user && (
                  <NavLink to="/" label="Report" icon={<Flag size={16} />} active={false} />
                )}

                {user ? (
                  <NavLink
                    to="/profile"
                    label="Profile"
                    icon={<UserCircle size={16} />}
                    active={pathname === '/profile'}
                  />
                ) : (
                  <NavLink
                    to="/login"
                    label="Login"
                    icon={<LogIn size={16} />}
                    active={pathname === '/login' || pathname === '/register'}
                  />
                )}
              </>
            )}

            {/* Collapse toggle */}
            <button
              onClick={toggle}
              className="ml-2 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Collapse navigation"
            >
              <ChevronUp size={16} />
            </button>
          </nav>
        </header>
      </div>

      {/* "Show menu" tab — visible only when collapsed */}
      <button
        onClick={toggle}
        className={cn(
          'absolute left-1/2 -translate-x-1/2 bg-[#1A1A2E] text-white/60 hover:text-white px-3 py-1 rounded-b-lg transition-opacity duration-200',
          collapsed ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-label="Show navigation"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

function NavLink({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline',
        active
          ? 'text-white bg-white/[0.12]'
          : 'text-white/70 hover:text-white hover:bg-white/10',
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
