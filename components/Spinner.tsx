
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-2 text-gray-600">AI is analyzing...</p>
    </div>
  );
};

export default Spinner;
