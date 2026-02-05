
import React, { useState, useMemo } from 'react';
import { Document, DocumentStatus, ViewState } from '../types';
import DocumentDetailsModal from './DocumentDetailsModal';

type SortByType = 'date' | 'name' | 'description';

interface DashboardProps {
  documents: Document[];
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  searchTerm: string;
  activeList: 'incoming' | 'outgoing';
  setActiveList: (list: 'incoming' | 'outgoing') => void;
  updateDocumentProperty: (docId: string, updates: Partial<Document>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, setView, searchTerm, activeList, setActiveList, updateDocumentProperty }) => {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [sortBy, setSortBy] = useState<SortByType>('date');

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) {
      return documents;
    }
    return documents.filter(doc => 
        doc.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.referenceNumber && doc.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [documents, searchTerm]);

  const sortDocuments = (docs: Document[], listType: 'incoming' | 'outgoing') => {
    return [...docs].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.senderName.localeCompare(b.senderName);
            case 'description':
                return a.subject.localeCompare(b.subject);
            case 'date':
            default:
                if (listType === 'incoming') {
                    return b.receivedDate.getTime() - a.receivedDate.getTime();
                }
                const aDate = a.dispatchedDetails?.dispatchedDate || a.receivedDate;
                const bDate = b.dispatchedDetails?.dispatchedDate || b.receivedDate;
                return bDate.getTime() - aDate.getTime();
        }
    });
  };

  const incomingDocs = useMemo(() => {
    // Show documents that originated as Incoming (first status was Received)
    const filtered = filteredDocuments.filter(doc => 
      doc.statusHistory && doc.statusHistory.length > 0 && doc.statusHistory[0].status === DocumentStatus.Received
    );
    return sortDocuments(filtered, 'incoming');
  }, [filteredDocuments, sortBy]);

  const outgoingDocs = useMemo(() => {
     // Show documents that originated as Outgoing (first status was SentForSigning)
     // OR are currently Dispatched/Archived
     const filtered = filteredDocuments.filter(doc => 
        (doc.statusHistory && doc.statusHistory.length > 0 && doc.statusHistory[0].status === DocumentStatus.SentForSigning) ||
        doc.status === DocumentStatus.Dispatched || 
        doc.status === DocumentStatus.Archived
     );
     return sortDocuments(filtered, 'outgoing');
  }, [filteredDocuments, sortBy]);


  const getFullStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.Received:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Received</span>;
      case DocumentStatus.SentForSigning:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Signing</span>;
      case DocumentStatus.ReturnedFromSigning:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Signed</span>;
      case DocumentStatus.Dispatched:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Dispatched</span>;
      case DocumentStatus.Archived:
         return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Archived</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    }
  };
  
  const handleSigningOfficeToggle = (docId: string, isChecked: boolean) => {
    updateDocumentProperty(docId, { signingOffice: isChecked ? "DCMD's Office" : undefined });
  };

  const isSigned = (status: DocumentStatus) => 
      status === DocumentStatus.ReturnedFromSigning || 
      status === DocumentStatus.Dispatched || 
      status === DocumentStatus.Archived;

  const isDispatched = (status: DocumentStatus) => 
      status === DocumentStatus.Dispatched || status === DocumentStatus.Archived;

  const handleSignedToggle = (docId: string, isChecked: boolean) => {
    updateDocumentProperty(docId, { 
      status: isChecked ? DocumentStatus.ReturnedFromSigning : DocumentStatus.SentForSigning 
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex flex-col sm:flex-row gap-4">
           <button
            onClick={() => setView({ name: 'add-incoming-method' })}
            className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out flex items-center justify-center text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span className="ml-2">Add New Incoming</span>
          </button>
          <button
            onClick={() => setView({ name: 'add-method' })}
            className="bg-brand-secondary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out flex items-center justify-center text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span className="ml-2">Add New Outgoing</span>
          </button>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex space-x-2 border-b">
        <button
            onClick={() => setActiveList('incoming')}
            className={`py-2 px-4 text-lg font-semibold ${activeList === 'incoming' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Incoming
        </button>
        <button
            onClick={() => setActiveList('outgoing')}
            className={`py-2 px-4 text-lg font-semibold ${activeList === 'outgoing' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Outgoing
        </button>
      </div>

      <section className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700 capitalize">Recent {activeList} Documents</h3>
            <div className="flex items-center space-x-2">
                <label htmlFor="sort-by" className="text-sm font-medium text-gray-700">Sort by:</label>
                <select 
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortByType)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="description">Description</option>
                </select>
            </div>
        </div>
        <div className="overflow-x-auto">
          {activeList === 'incoming' ? (
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/N</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File No</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">in DCMDs Office</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {incomingDocs.length > 0 ? (
                        incomingDocs.map((doc, index) => (
                            <tr key={doc.id} onClick={() => setSelectedDoc(doc)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.receivedDate.toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{doc.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.referenceNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.senderName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getFullStatusBadge(doc.status)}</td>
                                <td 
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" 
                                  onClick={(e) => { 
                                    if (isDispatched(doc.status)) return;
                                    e.stopPropagation(); 
                                    handleSigningOfficeToggle(doc.id, !doc.signingOffice); 
                                  }}>
                                    <div className={`flex items-center ${isDispatched(doc.status) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-2 ${!!doc.signingOffice ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                            {!!doc.signingOffice && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span>{doc.signingOffice ? 'Yes' : 'No'}</span>
                                    </div>
                                </td>
                                <td 
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" 
                                  onClick={(e) => { 
                                    if (isDispatched(doc.status)) return;
                                    e.stopPropagation(); 
                                    handleSignedToggle(doc.id, !isSigned(doc.status)); 
                                  }}>
                                     <div className={`flex items-center ${isDispatched(doc.status) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-2 ${isSigned(doc.status) ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                            {isSigned(doc.status) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span>{isSigned(doc.status) ? 'Yes' : 'No'}</span>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={9} className="text-center py-4 text-gray-500">No incoming documents found.</td></tr>
                    )}
                </tbody>
             </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/N</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Whom</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatched By</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Signature</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {outgoingDocs.length > 0 ? (
                        outgoingDocs.map((doc, index) => (
                            <tr key={doc.id} onClick={() => setSelectedDoc(doc)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(doc.dispatchedDetails?.dispatchedDate || doc.receivedDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.dispatchedDetails?.recipientName || <span className="text-gray-400 italic">Pending</span>}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{doc.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getFullStatusBadge(doc.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.dispatchedDetails?.dispatchedBy || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {doc.status === DocumentStatus.ReturnedFromSigning ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setView({ name: 'dispatch', docId: doc.id }); }}
                                            className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded shadow-sm"
                                        >
                                            Dispatch Now
                                        </button>
                                    ) : doc.dispatchedDetails ? (
                                        <div className="flex items-center">
                                            <img src={doc.dispatchedDetails.recipientSignature} alt="signature" className="w-16 h-8 object-contain border rounded-sm mr-2" />
                                            <div className="text-xs text-gray-500">{doc.dispatchedDetails.dispatchedDate.toLocaleDateString()}</div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Awaiting Signature</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={7} className="text-center py-4 text-gray-500">No outgoing documents found.</td></tr>
                    )}
                </tbody>
            </table>
          )}
        </div>
      </section>

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
