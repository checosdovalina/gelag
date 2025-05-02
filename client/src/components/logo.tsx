import React from 'react';
import gelagLogoImage from '../assets/gelag-logo.png';

export const GelagLogo: React.FC<{ className?: string; colorMode?: 'light' | 'dark' }> = ({ 
  className = "w-12 h-12", 
  colorMode = 'light' 
}) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img
        src={gelagLogoImage}
        alt="GELAG Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export const CompanyInfo: React.FC<{ className?: string; textColor?: string }> = ({ 
  className = "", 
  textColor = "text-gray-500" 
}) => {
  return (
    <p className={`text-xs ${textColor} text-center ${className}`}>
      GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.
    </p>
  );
};