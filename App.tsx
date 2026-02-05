
import React, { useState, useEffect, useCallback } from 'react';
import { Document, DocumentStatus, ViewState } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DocumentForm from './components/DocumentForm';
import DispatchForm from './components/DispatchForm';
import AddMethodSelection from './components/AddMethodSelection';
import ManualEntryForm from './components/ManualEntryForm';
import AddIncomingMethod from './components/AddIncomingMethod';
import BatchEntryForm from './components/BatchEntryForm';
import FileUploadBatchForm from './components/FileUploadBatchForm';
import BatchSigning from './components/BatchSigning';

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
    setDocuments(docs); // Keep full data in memory for the current session
    try {
      // Create a version of documents for storage that omits large base64 strings
      // to avoid exceeding localStorage limits and causing a crash.
      const docsForStorage = docs.map(doc => {
        // Destructure to separate large fields
        const { scannedDocument, dispatchedDetails, ...restOfDoc } = doc;

        // Also handle large fields within dispatchedDetails
        const lightDispatchedDetails = dispatchedDetails ? {
          ...dispatchedDetails,
          recipientSignature: dispatchedDetails.recipientSignature ? '[Signature Omitted]' : '',
          recipientPhoto: dispatchedDetails.recipientPhoto ? '[Photo Omitted]' : '',
        } : null;

        return {
          ...restOfDoc,
          scannedDocument: scannedDocument ? '[Scan Omitted]' : '',
          dispatchedDetails: lightDispatchedDetails,
        };
      });

      localStorage.setItem('documents', JSON.stringify(docsForStorage));
    } catch (error) {
      console.error("Failed to save documents to local storage. The data might be too large.", error);
    }
  }, []);

  const addOutgoingDocument = (doc: Omit<Document, 'id' | 'status' | 'receivedDate' | 'statusHistory'>) => {
    const newDoc: Document = {
      ...doc,
      id: `doc_${Date.now()}`,
      status: DocumentStatus.SentForSigning,
      receivedDate: new Date(),
      statusHistory: [{ status: DocumentStatus.SentForSigning, timestamp: new Date() }],
      dispatchedDetails: null,
    };
    saveDocuments([...documents, newDoc]);
    setView({ name: 'dashboard' });
    setActiveList('outgoing'); // Switch to outgoing list to see the new record
  };

  const saveManualDocuments = (docsToCreate: Partial<Document>[]) => {
    const timestamp = new Date();
    const updatedDocsList = [...documents];
    let outgoingCreated = false;

    docsToCreate.forEach(d => {
        if (d.id) {
            // Update existing document (e.g. from Select from Incoming)
            const index = updatedDocsList.findIndex(doc => doc.id === d.id);
            if (index !== -1) {
                const existing = updatedDocsList[index];
                const newStatus = d.status || existing.status;
                
                updatedDocsList[index] = {
                    ...existing,
                    ...d,
                    id: existing.id, // Ensure ID is preserved
                    status: newStatus,
                    statusHistory: d.status && d.status !== existing.status 
                        ? [...existing.statusHistory, { status: d.status, timestamp }] 
                        : existing.statusHistory
                } as Document;
                
                if (newStatus === DocumentStatus.SentForSigning || newStatus === DocumentStatus.Dispatched) {
                    outgoingCreated = true;
                }
            }
        } else {
            // Create new document
            const newDoc: Document = {
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
            updatedDocsList.push(newDoc);
            if (newDoc.status === DocumentStatus.SentForSigning || newDoc.status === DocumentStatus.Dispatched) {
                outgoingCreated = true;
            }
        }
    });

    saveDocuments(updatedDocsList);
    setView({ name: 'dashboard' });
    
    // Switch to appropriate tab
    if (outgoingCreated) {
        setActiveList('outgoing');
    } else {
        setActiveList('incoming');
    }
  };

  const updateDocument = (updatedDoc: Document) => {
    const updatedDocs = documents.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc);
    saveDocuments(updatedDocs);
    setView({ name: 'dashboard' });
  };
  
  const updateDocumentProperty = (docId: string, updates: Partial<Document>) => {
    const updatedDocs = documents.map(doc => {
        if (doc.id === docId) {
            const newDoc = { ...doc, ...updates };
            // If status is being updated, add a history entry.
            if (updates.status && updates.status !== doc.status) {
                newDoc.statusHistory = [...doc.statusHistory, { status: updates.status, timestamp: new Date() }];
            }
            return newDoc;
        }
        return doc;
    });
    saveDocuments(updatedDocs);
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
                  updateDocumentProperty={updateDocumentProperty}
                />;
      case 'add-method':
        return <AddMethodSelection setView={setView} />;
      case 'add-incoming-method':
        return <AddIncomingMethod setView={setView} />;
      case 'upload-batch': {
        const currentDocType = view.docType;
        return <FileUploadBatchForm 
                  docType={currentDocType}
                  onSave={(batch) => {
                    if (currentDocType === 'outgoing') {
                        setView({ name: 'batch-signing', batch });
                    } else {
                        saveManualDocuments(batch);
                    }
                  }} 
                  onCancel={() => setView({ name: currentDocType === 'incoming' ? 'add-incoming-method' : 'add-method' })} 
                />;
      }
      case 'batch-entry': {
        const currentDocType = view.docType;
        const currentStartMode = view.startMode;
        return <BatchEntryForm 
                  docType={currentDocType}
                  startMode={currentStartMode}
                  existingDocuments={documents}
                  onSave={(batch) => {
                    if (currentDocType === 'outgoing') {
                        setView({ name: 'batch-signing', batch });
                    } else {
                        saveManualDocuments(batch);
                    }
                  }} 
                  onCancel={() => setView({ name: currentDocType === 'incoming' ? 'add-incoming-method' : 'add-method' })} 
                />;
      }
      case 'batch-signing':
        return <BatchSigning 
                    batch={view.batch} 
                    onSave={saveManualDocuments} 
                    onCancel={() => setView({ name: 'dashboard' })} 
               />;
      case 'add':
        return <DocumentForm 
                  onSave={addOutgoingDocument} 
                  onCancel={() => setView({ name: 'add-method' })} 
                  title="Scan New Outgoing Document"
                />;
      case 'manual-entry':
        return <BatchEntryForm 
                  docType="outgoing"
                  startMode="manual"
                  existingDocuments={documents}
                  onSave={(batch) => setView({ name: 'batch-signing', batch })}
                  onCancel={() => setView({ name: 'add-method' })}
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
                  updateDocumentProperty={updateDocumentProperty}
                />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        setActiveList={setActiveList}
        setView={setView}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
