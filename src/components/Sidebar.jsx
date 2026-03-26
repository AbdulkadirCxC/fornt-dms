import { NavLink, useNavigate } from 'react-router-dom';
import { tokenStorage } from '../api/tokenStorage';
import { usePermissions } from '../auth/PermissionContext';
import { ROUTE_PERMISSIONS } from '../auth/permissionRules';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/register', label: 'Register', icon: '✍️' },
  { to: '/dentists', label: 'Dentists', icon: '👨‍⚕️' },
  { to: '/patients', label: 'Patients', icon: '👥' },
  { to: '/treatments', label: 'Treatments', icon: '💊' },
  { to: '/patient-treatments', label: 'Patient Treatments', icon: '📋' },
  { to: '/patient-recalls', label: 'Patient Recalls', icon: '🔔' },
  { to: '/recall-notifications', label: 'Recall Notifications', icon: '🔕' },
  { to: '/invoices', label: 'Invoices', icon: '🧾' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/appointments', label: 'Appointments', icon: '📅' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/roles-permissions', label: 'Roles & Permissions', icon: '🛡️' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { hasAnyPermission, currentUser, isSuperuser } = usePermissions();
  const allowedItems = navItems.filter((item) => hasAnyPermission(ROUTE_PERMISSIONS[item.to] ?? []));
  const userName = currentUser?.username ?? '—';
  const userInitial = userName && userName !== '—' ? userName.charAt(0).toUpperCase() : '?';
  const roleText = isSuperuser
    ? 'Super Admin'
    : currentUser?.is_staff
      ? 'Staff'
      : currentUser?.roles?.[0]?.name ?? 'User';

  const handleLogoReload = () => {
    window.location.reload();
  };

  const handleLogout = () => {
    tokenStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="dms-sidebar">
      <button
        type="button"
        className="dms-sidebar-header dms-sidebar-header-btn"
        onClick={handleLogoReload}
        title="Reload page"
        aria-label="Reload page"
      >
        <span className="dms-logo">🦷</span>
        <h1 className="dms-brand">DMS</h1>
      </button>
      {currentUser && (
        <div className="dms-user-panel">
          <div className="dms-user-main">
            <div className="dms-user-meta">
              <p className="dms-user-name">{userName}</p>
              <p className="dms-user-role">{roleText}</p>
            </div>
            <div className="dms-user-avatar" aria-label="Logged in user avatar">
              {userInitial}
            </div>
          </div>
        </div>
      )}
      <nav className="dms-nav">
        {allowedItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `dms-nav-link ${isActive ? 'active' : ''}`}
            end={to === '/'}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
        <button className="dms-nav-link dms-logout" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </nav>
    </aside>
  );
}
