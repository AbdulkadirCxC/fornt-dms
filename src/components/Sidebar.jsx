import { NavLink, useNavigate } from 'react-router-dom';
import { tokenStorage } from '../api/tokenStorage';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/dentists', label: 'Dentists', icon: '👨‍⚕️' },
  { to: '/patients', label: 'Patients', icon: '👥' },
  { to: '/treatments', label: 'Treatments', icon: '💊' },
  { to: '/patient-treatments', label: 'Patient Treatments', icon: '📋' },
  { to: '/invoices', label: 'Invoices', icon: '🧾' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/appointments', label: 'Appointments', icon: '📅' },
  { to: '/reports', label: 'Reports', icon: '📈' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    tokenStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="dms-sidebar">
      <div className="dms-sidebar-header">
        <span className="dms-logo">🦷</span>
        <h1 className="dms-brand">DMS</h1>
      </div>
      <nav className="dms-nav">
        {navItems.map(({ to, label, icon }) => (
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
