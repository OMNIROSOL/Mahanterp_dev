import React, { useState } from 'react';
import TopNavigation from './TopNavigation';
import ModernSidebar from './ModernSidebar';

interface LayoutContainerProps {
  sidebarItems: any[];
  children: React.ReactNode;
}

const LayoutContainer: React.FC<LayoutContainerProps> = ({
  sidebarItems,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Navigation */}
      <TopNavigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ModernSidebar
          items={sidebarItems}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutContainer;
