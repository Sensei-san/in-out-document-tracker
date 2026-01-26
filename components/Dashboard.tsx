
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
}

const Dashboard: React.FC<DashboardProps> = ({ documents, setView, searchTerm, activeList, setActiveList }) => {
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
                return (b.dispatchedDetails?.dispatchedDate.getTime() ?? 0) - (a.dispatchedDetails?.dispatchedDate.getTime() ?? 0);
        }
    });
  };

  const incomingDocs = useMemo(() => {
    const filtered = filteredDocuments.filter(doc => doc.status !== DocumentStatus.Dispatched && doc.status !== DocumentStatus.Archived);
    return sortDocuments(filtered, 'incoming');
  }, [filteredDocuments, sortBy]);

  const dispatchedDocs = useMemo(() => {
     const filtered = filteredDocuments.filter(doc => doc.status === DocumentStatus.Dispatched || doc.status === DocumentStatus.Archived);
     return sortDocuments(filtered, 'outgoing');
  }, [filteredDocuments, sortBy]);


  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.ReturnedFromSigning:
      case DocumentStatus.Dispatched:
      case DocumentStatus.Archived:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Signed</span>;
      case DocumentStatus.SentForSigning:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Signature</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Not Signed</span>;
    }
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Originating Division</th>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.originatingDivision}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.signingOffice || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getStatusBadge(doc.status)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={8} className="text-center py-4 text-gray-500">No incoming documents found.</td></tr>
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
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File No</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatched By</th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signature</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {dispatchedDocs.length > 0 ? (
                        dispatchedDocs.map((doc, index) => (
                            <tr key={doc.id} onClick={() => setSelectedDoc(doc)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.dispatchedDetails?.dispatchedDate.toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.dispatchedDetails?.recipientName}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{doc.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.referenceNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.senderName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.dispatchedDetails?.dispatchedBy}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {doc.dispatchedDetails && (
                                        <div className="flex items-center">
                                            <img src={doc.dispatchedDetails.recipientSignature} alt="signature" className="w-20 h-10 object-contain border rounded-sm mr-2" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{doc.dispatchedDetails.recipientName}</div>
                                                <div className="text-xs text-gray-500">{doc.dispatchedDetails.dispatchedDate.toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={8} className="text-center py-4 text-gray-500">No outgoing documents found.</td></tr>
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
