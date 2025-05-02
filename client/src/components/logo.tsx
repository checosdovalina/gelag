import React from 'react';

export const GelagLogo: React.FC<{ className?: string; colorMode?: 'light' | 'dark' }> = ({ 
  className = "w-12 h-12", 
  colorMode = 'light' 
}) => {
  const textColor = colorMode === 'light' ? 'text-primary' : 'text-white';
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect 
          x="10" 
          y="20" 
          width="80" 
          height="60" 
          rx="5" 
          ry="5" 
          fill={colorMode === 'light' ? '#2563EB' : 'white'} 
          fillOpacity={colorMode === 'light' ? '1' : '0.9'}
        />
        <text
          x="50"
          y="60"
          fontFamily="Arial"
          fontSize="28"
          fontWeight="bold"
          textAnchor="middle"
          fill={colorMode === 'light' ? 'white' : '#2563EB'}
        >
          GELAG
        </text>
      </svg>
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