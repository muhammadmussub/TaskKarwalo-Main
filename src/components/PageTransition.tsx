import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  // Simplify the component to just render children without complex transitions
  // This prevents the blank screen issue while maintaining basic fade-in effect
  return (
    <div className="transition-all duration-300 ease-in-out opacity-100 transform translate-y-0">
      {children}
    </div>
  );
};

export default PageTransition;