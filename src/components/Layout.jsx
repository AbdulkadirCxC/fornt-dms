import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  return (
    <div className="dms-layout">
      <Sidebar />
      <main className="dms-main">
        <Outlet />
      </main>
    </div>
  );
}
