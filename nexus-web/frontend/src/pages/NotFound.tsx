import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

// BUG FIX: This file was imported in App.tsx but did not exist in the project.
// A clean 404 page matching the KATASHIE VPN dashboard design system.

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const homeRoute = user
    ? user.role === 'admin' || user.role === 'super_admin'
      ? '/admin'
      : '/reseller'
    : '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="glass-card max-w-md w-full p-10 text-center space-y-6">
        <div className="text-8xl font-display font-black text-gradient-primary select-none">
          404
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Page introuvable
          </h1>
          <p className="text-muted-foreground text-sm">
            La page que vous cherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        <button
          onClick={() => navigate(homeRoute)}
          className="btn-primary w-full"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
