
import React, { useState } from 'react';
import { Document, DocumentStatus, ViewState } from '../types';
import DocumentCard from './DocumentCard';
import DocumentDetailsModal from './DocumentDetailsModal';

interface DashboardProps {
  documents: Document[];
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, setView }) => {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const incomingDocs = documents.filter(doc => doc.status !== DocumentStatus.Dispatched && doc.status !== DocumentStatus.Archived).sort((a,b) => b.receivedDate.getTime() - a.receivedDate.getTime());
  const dispatchedDocs = documents.filter(doc => doc.status === DocumentStatus.Dispatched || doc.status === DocumentStatus.Archived).sort((a,b) => b.dispatchedDetails!.dispatchedDate.getTime() - a.dispatchedDetails!.dispatchedDate.getTime());

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={() => setView({ name: 'add' })}
          className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Scan New Document
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Incoming Documents</h3>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {incomingDocs.length > 0 ? (
              incomingDocs.map(doc => <DocumentCard key={doc.id} document={doc} onClick={() => setSelectedDoc(doc)} />)
            ) : (
              <p className="text-gray-500 text-center py-4">No incoming documents.</p>
            )}
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Dispatched Documents</h3>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {dispatchedDocs.length > 0 ? (
              dispatchedDocs.map(doc => <DocumentCard key={doc.id} document={doc} onClick={() => setSelectedDoc(doc)} />)
            ) : (
              <p className="text-gray-500 text-center py-4">No dispatched documents.</p>
            )}
          </div>
        </section>
      </div>

      {selectedDoc && (
        <DocumentDetailsModal 
          document={selectedDoc} 
          onClose={() => setSelectedDoc(null)}
          onDispatch={(docId) => {
            setSelectedDoc(null);
            setView({ name: 'dispatch', docId });
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
