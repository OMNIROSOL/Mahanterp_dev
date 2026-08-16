import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  count?: number;
  submenu?: SidebarItem[];
}

interface ModernSidebarProps {
  items: SidebarItem[];
  isOpen?: boolean;
  onClose?: () => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({
  items,
  isOpen = true,
  onClose
}) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleSubmenu = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const SidebarLink: React.FC<{ item: SidebarItem; level?: number }> = ({ item, level = 0 }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedItems.includes(item.id);

    return (
      <div key={item.id}>
        {hasSubmenu ? (
          <button
            onClick={() => toggleSubmenu(item.id)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-text-secondary hover:text-text-main hover:bg-surface-variant'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                <i className={`fas ${item.icon} text-sm`}></i>
              </div>
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
            <i className={`fas fa-chevron-down text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
          </button>
        ) : (
          <Link
            to={item.path}
            className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-text-secondary hover:text-text-main hover:bg-surface-variant'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                <i className={`fas ${item.icon} text-sm`}></i>
              </div>
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
            {item.count !== undefined && item.count > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-surface-variant text-text-secondary'}`}>
                {item.count}
              </span>
            )}
          </Link>
        )}

        {/* Submenu Items */}
        {hasSubmenu && isExpanded && (
          <div className="mt-1 space-y-1 pl-4 border-l border-border ml-2">
            {item.submenu!.map(subitem => (
              <SidebarLink key={subitem.id} item={subitem} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static left-0 top-16 lg:top-0 h-[calc(100vh-4rem)] lg:h-screen w-64 bg-surface border-r border-border overflow-y-auto transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 space-y-2">
          {/* Main Menu */}
          <div className="mb-8">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Menu</p>
            <nav className="space-y-1">
              {items.map(item => (
                <SidebarLink key={item.id} item={item} />
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ModernSidebar;
