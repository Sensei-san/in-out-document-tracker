
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
    const term = searchTerm.toLowerCase();
    return documents.filter(doc => 
        doc.subject.toLowerCase().includes(term) ||
        doc.senderName.toLowerCase().includes(term) ||
        (doc.referenceNumber && doc.referenceNumber.toLowerCase().includes(term))
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

  // Improved filtering: 
  // Incoming list shows everything that started as Received
  const incomingDocs = useMemo(() => {
    const filtered = filteredDocuments.filter(doc => 
      doc.status === DocumentStatus.Received || 
      (doc.statusHistory && doc.statusHistory.some(h => h.status === DocumentStatus.Received))
    );
    return sortDocuments(filtered, 'incoming');
  }, [filteredDocuments, sortBy]);

  // Outgoing list shows docs that have moved beyond registry
  const outgoingDocs = useMemo(() => {
     const filtered = filteredDocuments.filter(doc => 
        doc.status !== DocumentStatus.Received ||
        (doc.statusHistory && doc.statusHistory.some(h => 
          h.status === DocumentStatus.SentForSigning || 
          h.status === DocumentStatus.Dispatched || 
          h.status === DocumentStatus.Archived ||
          h.status === DocumentStatus.ReturnedFromSigning
        ))
     );
     return sortDocuments(filtered, 'outgoing');
  }, [filteredDocuments, sortBy]);


  const getFullStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.Received:
        return <span className="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-tighter">Received</span>;
      case DocumentStatus.SentForSigning:
        return <span className="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 uppercase tracking-tighter">Signing</span>;
      case DocumentStatus.ReturnedFromSigning:
        return <span className="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 uppercase tracking-tighter">Signed</span>;
      case DocumentStatus.Dispatched:
        return <span className="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 uppercase tracking-tighter">Dispatched</span>;
      case DocumentStatus.Archived:
         return <span className="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 uppercase tracking-tighter">Archived</span>;
      default:
        return <span className="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full bg-gray-100 text-gray-800 uppercase tracking-tighter">Unknown</span>;
    }
  };
  
  const handleSigningOfficeToggle = (docId: string, isCurrentlyIn: boolean) => {
    updateDocumentProperty(docId, { 
        signingOffice: !isCurrentlyIn ? "DCMD's Office" : undefined,
        location: !isCurrentlyIn ? "DCMD's Office" : "Registry",
        locationUpdatedAt: new Date()
    });
  };

  const isSigned = (status: DocumentStatus) => 
      status === DocumentStatus.ReturnedFromSigning || 
      status === DocumentStatus.Dispatched || 
      status === DocumentStatus.Archived;

  const isDispatched = (status: DocumentStatus) => 
      status === DocumentStatus.Dispatched || status === DocumentStatus.Archived;

  const handleSignedToggle = (docId: string, isCurrentlySigned: boolean) => {
    updateDocumentProperty(docId, { 
      status: !isCurrentlySigned ? DocumentStatus.ReturnedFromSigning : DocumentStatus.SentForSigning 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Dashboard</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage daily registry workflow and tracking.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
           <button
            onClick={() => setView({ name: 'add-incoming-method' })}
            className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out flex items-center justify-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add New Incoming
          </button>
          <button
            onClick={() => setView({ name: 'add-method' })}
            className="bg-brand-secondary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out flex items-center justify-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            Add New Outgoing
          </button>
        </div>
      </div>

      <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit border dark:border-gray-700">
        <button
            onClick={() => setActiveList('incoming')}
            className={`py-2 px-6 text-sm font-bold rounded-lg transition-all ${activeList === 'incoming' ? 'bg-white dark:bg-gray-800 text-brand-primary shadow-sm dark:text-brand-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
        >
            Incoming Register
        </button>
        <button
            onClick={() => setActiveList('outgoing')}
            className={`py-2 px-6 text-sm font-bold rounded-lg transition-all ${activeList === 'outgoing' ? 'bg-white dark:bg-gray-800 text-brand-primary shadow-sm dark:text-brand-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
        >
            Outgoing Register
        </button>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700">
            <h3 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center">
                <span className="w-2 h-2 bg-brand-primary rounded-full mr-3 animate-pulse"></span>
                Recent {activeList} Logs
            </h3>
            <div className="flex items-center space-x-3">
                <label htmlFor="sort-by" className="text-xs font-bold text-gray-400 uppercase">Sort By</label>
                <select 
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortByType)}
                    className="p-1 text-xs font-bold bg-transparent border-none text-brand-primary dark:text-brand-secondary outline-none"
                >
                    <option value="date">Latest Date</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="description">Subject</option>
                </select>
            </div>
        </div>
        <div className="overflow-x-auto">
          {activeList === 'incoming' ? (
             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">S/N</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Received</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ref No</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">In Office</th>
                        <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Signed</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {incomingDocs.length > 0 ? (
                        incomingDocs.map((doc, index) => (
                            <tr key={doc.id} onClick={() => setSelectedDoc(doc)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500 font-mono">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 font-medium">{doc.receivedDate.toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{doc.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">{doc.referenceNumber || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900 dark:text-gray-200">{doc.senderName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getFullStatusBadge(doc.status)}</td>
                                <td 
                                  className="px-6 py-4 whitespace-nowrap text-center" 
                                  onClick={(e) => { 
                                    if (isDispatched(doc.status)) return;
                                    e.stopPropagation(); 
                                    handleSigningOfficeToggle(doc.id, !!doc.signingOffice); 
                                  }}>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-lg border-2 transition-all ${doc.signingOffice ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'} ${isDispatched(doc.status) ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{doc.signingOffice ? 'In Office' : 'Not In'}</span>
                                    </div>
                                </td>
                                <td 
                                  className="px-6 py-4 whitespace-nowrap text-center" 
                                  onClick={(e) => { 
                                    if (isDispatched(doc.status)) return;
                                    e.stopPropagation(); 
                                    handleSignedToggle(doc.id, isSigned(doc.status)); 
                                  }}>
                                     <div className={`inline-flex items-center px-3 py-1 rounded-lg border-2 transition-all ${isSigned(doc.status) ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'} ${isDispatched(doc.status) ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{isSigned(doc.status) ? 'Signed' : 'Awaiting'}</span>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={8} className="text-center py-20 text-gray-400 dark:text-gray-500 italic text-sm">No incoming documents found in local storage.</td></tr>
                    )}
                </tbody>
             </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                    <tr>
                         <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">S/N</th>
                         <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispatch Date</th>
                         <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipient</th>
                         <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                         <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                         <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender / Author</th>
                         <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Proof</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {outgoingDocs.length > 0 ? (
                        outgoingDocs.map((doc, index) => (
                            <tr key={doc.id} onClick={() => setSelectedDoc(doc)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500 font-mono">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 font-medium">{(doc.dispatchedDetails?.dispatchedDate || doc.receivedDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 dark:text-gray-100">{doc.dispatchedDetails?.recipientName || <span className="text-gray-400 dark:text-gray-500 italic">Pending</span>}</td>
                                <td className="px-6 py-4 text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{doc.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getFullStatusBadge(doc.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{doc.senderName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    {doc.status === DocumentStatus.ReturnedFromSigning ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setView({ name: 'dispatch', docId: doc.id }); }}
                                            className="bg-brand-primary hover:bg-brand-dark text-white text-[10px] font-black py-1 px-3 rounded-lg shadow-sm transition-all uppercase tracking-tighter"
                                        >
                                            Dispatch
                                        </button>
                                    ) : doc.dispatchedDetails ? (
                                        <div className="flex items-center justify-end">
                                            <div className="w-10 h-6 overflow-hidden rounded border border-gray-200 dark:border-gray-600 bg-white mr-2">
                                                <img src={doc.dispatchedDetails.recipientSignature} alt="sig" className="w-full h-full object-contain" />
                                            </div>
                                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic font-bold">AWAITING</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={7} className="text-center py-20 text-gray-400 dark:text-gray-500 italic text-sm">No outgoing documents logged yet.</td></tr>
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
