import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

interface TopNavigationProps {
  onMenuToggle?: () => void;
  user?: { name: string; avatar?: string };
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  onMenuToggle,
  user = { name: 'Admin User' }
}) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav className="h-16 bg-surface border-b border-border shadow-sm sticky top-0 z-40 no-print">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-surface-variant rounded-lg transition-colors"
          >
            <i className="fas fa-bars text-xl text-text-main"></i>
          </button>
          
          {/* Search Bar */}
          <div className="hidden sm:flex items-center gap-2 bg-surface-variant px-4 py-2 rounded-lg flex-1 max-w-sm">
            <i className="fas fa-search text-text-muted"></i>
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent flex-1 outline-none text-sm text-text-main placeholder-text-muted"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Notifications */}
          <button
            className="relative p-2 hover:bg-surface-variant rounded-lg transition-colors group"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <i className="fas fa-bell text-lg text-text-secondary group-hover:text-text-main"></i>
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg p-4">
                <p className="text-sm font-semibold text-text-main mb-3">Notifications</p>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>No new notifications</p>
                </div>
              </div>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button className="p-2 hover:bg-surface-variant rounded-lg transition-colors group">
            <i className="fas fa-moon text-lg text-text-secondary group-hover:text-text-main"></i>
          </button>

          {/* User Profile */}
          <button
            className="flex items-center gap-3 p-1.5 hover:bg-surface-variant rounded-lg transition-colors"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary">
              <i className="fas fa-user text-sm"></i>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-text-main">{user.name}</p>
              <p className="text-xs text-text-muted">Administrator</p>
            </div>
            <i className="fas fa-chevron-down text-xs text-text-muted"></i>
            
            {showUserMenu && (
              <div className="absolute right-0 mt-64 w-48 bg-surface border border-border rounded-lg shadow-lg py-2">
                <button className="w-full px-4 py-2 text-left text-sm text-text-main hover:bg-surface-variant transition-colors">
                  <i className="fas fa-user mr-2"></i>Profile
                </button>
                <button 
                  onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-text-main hover:bg-surface-variant transition-colors"
                >
                  <i className="fas fa-cog mr-2"></i>Settings
                </button>
                <hr className="my-2 border-border" />
                <button className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-red-50 transition-colors">
                  <i className="fas fa-sign-out-alt mr-2"></i>Logout
                </button>
              </div>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigation;
