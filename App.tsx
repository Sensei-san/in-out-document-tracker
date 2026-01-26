
import React, { useState, useEffect, useCallback } from 'react';
import { Document, DocumentStatus, ViewState } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DocumentForm from './components/DocumentForm';
import DispatchForm from './components/DispatchForm';
import AddMethodSelection from './components/AddMethodSelection';
import ManualEntryForm from './components/ManualEntryForm';
import AddIncomingMethod from './components/AddIncomingMethod';
import ManualIncomingBatchForm from './components/ManualIncomingBatchForm';
import FileUploadBatchForm from './components/FileUploadBatchForm';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [view, setView] = useState<ViewState>({ name: 'dashboard' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeList, setActiveList] = useState<'incoming' | 'outgoing'>('incoming');


  useEffect(() => {
    try {
      const storedDocs = localStorage.getItem('documents');
      if (storedDocs) {
        const parsedDocs = JSON.parse(storedDocs);
        // Ensure dates are parsed correctly
        const docsWithDates = parsedDocs.map((doc: any) => ({
          ...doc,
          receivedDate: new Date(doc.receivedDate),
          letterDate: doc.letterDate ? new Date(doc.letterDate) : null,
          statusHistory: doc.statusHistory.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp)
          })),
          dispatchedDetails: doc.dispatchedDetails ? {
              ...doc.dispatchedDetails,
              dispatchedDate: new Date(doc.dispatchedDetails.dispatchedDate)
          } : null
        }));
        setDocuments(docsWithDates);
      }
    } catch (error) {
      console.error("Failed to load documents from local storage", error);
      setDocuments([]);
    }
  }, []);

  const saveDocuments = useCallback((docs: Document[]) => {
    setDocuments(docs);
    localStorage.setItem('documents', JSON.stringify(docs));
  }, []);

  const addDocument = (doc: Omit<Document, 'id' | 'status' | 'receivedDate' | 'statusHistory'>) => {
    const newDoc: Document = {
      ...doc,
      id: `doc_${Date.now()}`,
      status: DocumentStatus.Received,
      receivedDate: new Date(),
      statusHistory: [{ status: DocumentStatus.Received, timestamp: new Date() }],
      dispatchedDetails: null,
    };
    saveDocuments([...documents, newDoc]);
    setView({ name: 'dashboard' });
  };

  const saveManualDocuments = (docsToCreate: Partial<Document>[]) => {
    const newDocs: Document[] = docsToCreate.map(d => {
        const isOutgoing = d.status === DocumentStatus.Dispatched;
        const timestamp = isOutgoing ? (d.dispatchedDetails?.dispatchedDate || new Date()) : new Date();
        return {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            subject: d.subject || '',
            senderName: d.senderName || '',
            referenceNumber: d.referenceNumber || '',
            originatingDivision: d.originatingDivision || '',
            letterDate: d.letterDate || new Date(),
            receivedDate: timestamp,
            status: d.status || DocumentStatus.Received,
            statusHistory: d.statusHistory || [{ status: d.status || DocumentStatus.Received, timestamp }],
            scannedDocument: d.scannedDocument || '',
            dispatchedDetails: d.dispatchedDetails || null,
            deliveredBy: d.deliveredBy,
        };
    });
    saveDocuments([...documents, ...newDocs]);
    alert(`Successfully saved ${newDocs.length} document(s)!`);
    setView({ name: 'dashboard' });
  };

  const updateDocument = (updatedDoc: Document) => {
    const updatedDocs = documents.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc);
    saveDocuments(updatedDocs);
    setView({ name: 'dashboard' });
  };
  
  const getDocumentById = (id: string): Document | undefined => {
      return documents.find(doc => doc.id === id);
  };

  const renderContent = () => {
    switch (view.name) {
      case 'dashboard':
        return <Dashboard 
                  documents={documents} 
                  setView={setView} 
                  searchTerm={searchTerm}
                  activeList={activeList}
                  setActiveList={setActiveList}
                />;
      case 'add-method':
        return <AddMethodSelection setView={setView} />;
      case 'add-incoming-method':
        return <AddIncomingMethod setView={setView} />;
      case 'upload-batch':
        return <FileUploadBatchForm onSave={saveManualDocuments} onCancel={() => setView({ name: 'add-incoming-method' })} />;
      case 'add':
        return <DocumentForm onSave={addDocument} onCancel={() => setView({ name: 'add-method' })} />;
      case 'manual-entry':
        return <ManualEntryForm onSave={saveManualDocuments} onCancel={() => setView({ name: 'add-method' })} />;
      case 'manual-entry-incoming':
        return <ManualIncomingBatchForm 
                  startMode={view.startMode}
                  onSave={saveManualDocuments} 
                  onCancel={() => setView({ name: 'add-incoming-method' })} 
                />;
      case 'dispatch':
        const docToDispatch = getDocumentById(view.docId);
        if (docToDispatch) {
            return <DispatchForm document={docToDispatch} onSave={updateDocument} onCancel={() => setView({ name: 'dashboard' })} />;
        }
        return <div>Document not found</div>;
      default:
        return <Dashboard 
                  documents={documents} 
                  setView={setView} 
                  searchTerm={searchTerm}
                  activeList={activeList}
                  setActiveList={setActiveList}
                />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        setActiveList={setActiveList}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
