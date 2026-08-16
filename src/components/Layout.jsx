import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './navigation/Navbar.jsx';
import MobileTabBar from './navigation/MobileTabBar.jsx';
import FloatingTimer from './navigation/FloatingTimer.jsx';
import ScrollToTop from './ScrollToTop.jsx';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-6 md:pb-20">
        <Outlet />
      </main>
      <MobileTabBar />
      <FloatingTimer currentPath={pathname} />
    </div>
  );
}
