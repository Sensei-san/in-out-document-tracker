
import React from 'react';
import { ViewState } from '../types';

interface AddIncomingMethodProps {
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
}

const MethodCard = ({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) => (
  <button onClick={onClick} className="text-left p-6 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-brand-light hover:border-brand-secondary flex flex-col h-full">
    <div className="flex items-center mb-3">
      <div className="bg-brand-light p-3 rounded-full mr-4 text-brand-primary">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600 flex-grow">{description}</p>
  </button>
);


const AddIncomingMethod: React.FC<AddIncomingMethodProps> = ({ setView }) => {
  return (
    <div className="max-w-4xl mx-auto bg-gray-50 p-4 sm:p-8 rounded-lg">
      <div className="flex items-center mb-8">
         <button onClick={() => setView({ name: 'dashboard' })} className="text-gray-500 hover:text-gray-700 mr-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
          </button>
        <h2 className="text-3xl font-bold text-gray-800">Add a New Incoming Document</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MethodCard 
          onClick={() => setView({ name: 'manual-entry-incoming', startMode: 'scan' })}
          title="Scan Document"
          description="Use your device's camera to capture the document and let AI extract the details automatically."
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
         <MethodCard 
          onClick={() => setView({ name: 'manual-entry-incoming', startMode: 'manual' })}
          title="Enter Manually"
          description="Fill out the document details yourself using a simple form. Best for documents without clear text."
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <MethodCard 
          onClick={() => setView({ name: 'upload-batch' })}
          title="Upload File"
          description="Upload an existing digital file (like a PDF or image) from your device for processing."
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
        />
      </div>
    </div>
  );
};

export default AddIncomingMethod;
