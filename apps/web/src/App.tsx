import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DesktopNav from './components/navigation/DesktopNav';
import MobileNav from './components/navigation/MobileNav';
import MapPage from './pages/MapPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col h-dvh">
          <DesktopNav />
          <main className="flex-1 min-h-0 relative">
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
          <MobileNav />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
