import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import TopMenu from './TopMenu';
import { motion } from 'framer-motion';

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <div className="no-print z-30 relative">
        <Navbar />
        <TopMenu />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-auto p-4 lg:p-8 scroll-smooth print:p-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="max-w-[1400px] mx-auto min-h-full"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};

export default Layout;
