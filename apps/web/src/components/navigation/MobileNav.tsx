import { Link, useLocation } from 'react-router-dom';
import { Map, Flag, UserCircle, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const HIDDEN_PATHS = ['/login', '/register'];

export default function MobileNav() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (HIDDEN_PATHS.includes(pathname)) return null;
  if (loading) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[1002] bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 px-2">
        <Tab to="/" icon={<Map size={20} />} label="Map" active={pathname === '/'} />

        {user && (
          <Tab to="/" icon={<Flag size={20} />} label="Report" active={false} />
        )}

        {user ? (
          <Tab
            to="/profile"
            icon={<UserCircle size={20} />}
            label="Profile"
            active={pathname === '/profile'}
          />
        ) : (
          <Tab
            to="/login"
            icon={<LogIn size={20} />}
            label="Login"
            active={false}
          />
        )}
      </div>
    </nav>
  );
}

function Tab({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 no-underline transition-colors',
        active ? 'text-[#16A34A]' : 'text-gray-400',
      )}
    >
      {icon}
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </Link>
  );
}
