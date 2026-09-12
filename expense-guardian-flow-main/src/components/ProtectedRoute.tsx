import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import ForcePasswordChange from "@/components/ForcePasswordChange";

type AppRole = "admin" | "manager" | "employee" | "ceo";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, roles, loading } = useAuth();
  const [passwordChanged, setPasswordChanged] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (profile && !profile.company_id) {
    return <Navigate to="/onboarding" replace />;
  }

  // Force password change for users with temporary passwords
  if (
    !passwordChanged &&
    user.user_metadata?.must_change_password === true
  ) {
    return <ForcePasswordChange onComplete={() => setPasswordChanged(true)} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.some(r => roles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
