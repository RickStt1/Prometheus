import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, User, LogOut, Shield } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const displayName = user?.display_name?.trim() || user?.email || 'Usuário';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/generate', icon: Plus, label: 'Novo Roadmap' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin' });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <div className="relative flex">
        {/* Sidebar */}
        <aside className="fixed top-0 left-0 h-screen w-64 bg-card border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-bold font-mono tracking-tight" data-testid="app-title">
              PROJECT PROMETHEUS
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">SAPERE AUDE</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="w-full justify-start font-mono text-sm rounded-sm"
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-2">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center space-x-2">
                <Button
                  data-testid="profile-icon-button"
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/profile')}
                  className="h-7 w-7 rounded-sm"
                  title="Meu Perfil"
                  aria-label="Abrir meu perfil"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt="Avatar"
                      className="h-5 w-5 rounded-sm object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <span className="text-sm text-muted-foreground truncate" data-testid="user-display-name">
                  {displayName}
                </span>
              </div>
              <ThemeToggle />
            </div>
            <Button
              data-testid="logout-button"
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start font-mono text-sm rounded-sm"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sair
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};