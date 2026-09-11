import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { RoleSelectScreen } from './components/RoleSelectScreen.js';
import { AuthScreen } from './components/AuthScreen.js';
import { FarmerDashboard } from './components/FarmerDashboard.js';
import { ConsumerHome } from './components/ConsumerHome.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { UserRole } from './types.js';

const MainApp: React.FC = () => {
  const { user, isLoading, selectedRoleForAuth, setSelectedRoleForAuth } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const effectiveRole = selectedRoleForAuth || selectedRole;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center text-[#2D3A26] font-sans">
        <div className="w-12 h-12 border-4 border-[#5D7A4F] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-[#5D7A4F]">
          Loading KisanSetu...
        </p>
      </div>
    );
  }

  // 1. If user is logged in, navigate directly to role-appropriate Home/Dashboard (Requirement 6)
  if (user) {
    if (user.role === 'admin') {
      return <AdminDashboard />;
    }
    if (user.role === 'farmer') {
      return <FarmerDashboard />;
    }
    return <ConsumerHome />;
  }

  // 2. If not logged in, first open Role Selection (Requirement 3)
  if (!effectiveRole) {
    return (
      <RoleSelectScreen
        onSelectRole={(role) => {
          setSelectedRole(role);
          setSelectedRoleForAuth(role);
        }}
      />
    );
  }

  // 3. Once role is selected, show Login / Register / Forgot Password for that role (Requirement 3 & 4)
  return (
    <AuthScreen
      role={effectiveRole}
      onBackToRoleSelect={() => {
        setSelectedRole(null);
        setSelectedRoleForAuth(null);
      }}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
