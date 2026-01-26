
import React from 'react';
import { ViewState } from '../types';

interface AddMethodSelectionProps {
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
}

const MethodCard = ({ icon, title, description, onClick, borderColor = 'border-brand-light', warningText }: { icon: React.ReactNode, title: string, description: string, onClick: () => void, borderColor?: string, warningText?: string }) => (
  <button onClick={onClick} className={`text-left p-6 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 ${borderColor} hover:border-brand-secondary flex flex-col h-full`}>
    <div className="flex items-center mb-3">
      <div className="bg-brand-light p-3 rounded-full mr-4 text-brand-primary">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600 flex-grow">{description}</p>
    {warningText && (
      <div className="mt-3 text-xs text-yellow-800 bg-yellow-100 p-2 rounded-md flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.008-1.742 3.008H4.42c-1.522 0-2.492-1.674-1.742-3.008l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.008a1 1 0 011 1v3.012a1 1 0 01-1 1H10a1 1 0 01-1-1V5z" clipRule="evenodd" />
        </svg>
        <span>{warningText}</span>
      </div>
    )}
  </button>
);


const AddMethodSelection: React.FC<AddMethodSelectionProps> = ({ setView }) => {
  return (
    <div className="max-w-4xl mx-auto bg-gray-50 p-4 sm:p-8 rounded-lg">
      <div className="flex items-center mb-8">
         <button onClick={() => setView({ name: 'dashboard' })} className="text-gray-500 hover:text-gray-700 mr-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
          </button>
        <h2 className="text-3xl font-bold text-gray-800">Add a New Outgoing Document</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <MethodCard 
          onClick={() => setView({ name: 'manual-entry' })}
          title="Enter Manually"
          description="Create a new outgoing document from scratch by filling out a detailed form."
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <MethodCard 
          onClick={() => alert('Upload File feature coming soon!')}
          title="Upload File"
          description="Upload a pre-written digital file (PDF, image) to create a new outgoing record."
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
        />
         <MethodCard 
          onClick={() => alert('Select from Incoming feature coming soon!')}
          title="Select from Incoming"
          description="Quickly dispatch a document that has already been registered as incoming."
          borderColor="border-yellow-400"
          warningText="For Outgoing Documents Only"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
      </div>
    </div>
  );
};

export default AddMethodSelection;