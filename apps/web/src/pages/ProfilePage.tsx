import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import IdentityCard from '../components/profile/IdentityCard';
import QuickSettings from '../components/profile/QuickSettings';
import MyReportsCard from '../components/profile/MyReportsCard';
import CredibilityCard from '../components/profile/CredibilityCard';

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#F9FAFB] font-[Inter,system-ui,sans-serif]">
      <main className="flex-1 px-6 py-10">
        <div className="max-w-[780px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-[#1A1A2E] tracking-tight m-0">
              Profile
            </h1>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors cursor-pointer bg-transparent"
            >
              Sign out
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
            <IdentityCard />
            <CredibilityCard />
            <QuickSettings />
            <MyReportsCard />
          </div>
        </div>
      </main>
    </div>
  );
}
