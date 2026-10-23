import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/Footer';
import './RootLayout.css';

export const RootLayout: React.FC = () => {
  const { pathname } = useLocation();

  // Scroll smoothly to top on route navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <div className="root-layout-wrapper">
      <Navbar />
      <main className="root-main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
