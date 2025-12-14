// RecruiterSidebar.jsx
import { useAuth } from '../context/AuthContext';

const MenuItem = ({ id, label, icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-gray-100/50 transition-colors text-left ${
      active ? 'bg-gray-100/50 font-semibold text-gray-800' : 'text-gray-600'
    }`}
  >
    <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);

const RecruiterSidebar = ({ activeSection, setActiveSection, isSidebarOpen, setIsSidebarOpen }) => {
  const { logout } = useAuth();

  // simple icons as inline SVGs to match StudentSidebar
  const icons = {
    profile: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 20a8 8 0 0 1 16 0" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    applications: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 17v-6h6v6" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    postJob: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    statistics: (  // NEW: Statistics icon (pie chart)
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12V3M21 12H12M12 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    hamburger: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    chevronLeft: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };

  const menu = [
    { id: 'profile', label: 'Profile', icon: icons.profile },
    { id: 'applications', label: 'Applications', icon: icons.applications },
    { id: 'postJob', label: 'Post Job', icon: icons.postJob },
    { id: 'statistics', label: 'Placement Statistics', icon: icons.statistics }, // NEW MENU ITEM
  ];

  return (
    // keep the element in the layout so main content doesn't jump; width animates
    <aside
      className={`flex-shrink-0 bg-white/5 backdrop-blur-md h-screen transition-all duration-300 z-20
        ${isSidebarOpen ? 'w-64' : 'w-12'}
      `}
      aria-hidden={false}
    >
      {/* Top area: toggle button */}
      <div className="flex items-center justify-between p-3">
        {/* When collapsed: only show the small toggle button centered in the small column */}
        {isSidebarOpen ? (
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <span className="text-white font-bold">R</span>
              </div>
              <h2 className="text-gray-800 font-semibold text-lg">Placement-Cell</h2>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Collapse sidebar"
              className="ml-auto p-2 rounded-md hover:bg-gray-100/50 transition text-gray-700"
              title="Collapse"
            >
              {icons.chevronLeft}
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center">
            {/* only the hamburger visible when collapsed */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
              className="p-2 rounded-md hover:bg-gray-100/50 transition text-gray-700"
              title="Open"
            >
              {icons.hamburger}
            </button>
          </div>
        )}
      </div>

      {/* Full menu shown only when expanded */}
      {isSidebarOpen && (
        <nav className="px-3 mt-4">
          <div className="space-y-2">
            {menu.map((m) => (
              <MenuItem
                key={m.id}
                id={m.id}
                label={m.label}
                icon={m.icon}
                active={activeSection === m.id}
                onClick={(id) => setActiveSection(id)}
              />
            ))}
          </div>

          {/* Logout as a special menu item at the bottom */}
          <div className="mt-4 pt-2 border-t border-gray-200">
            <MenuItem
              id="logout"
              label="Logout"
              icon={icons.logout}
              active={false}
              onClick={logout}
            />
          </div>

          {/* Quick links footer (matching StudentSidebar) */}
          <div className="mt-6 px-2 text-sm text-gray-500">
            <p className="truncate">Quick links</p>
          </div>
        </nav>
      )}
    </aside>
  );
};

export default RecruiterSidebar;