import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const location = useLocation();
  const tvQueue = location.pathname === '/queue-display';

  return (
    <div className={`dms-layout ${tvQueue ? 'dms-layout--tv' : ''}`}>
      {!tvQueue && <Sidebar />}
      <main className={`dms-main ${tvQueue ? 'dms-main--tv' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
