
import React, { useState, useEffect, useCallback } from 'react';
import { Document, DocumentStatus, ViewState, AIConfig, AppSettings } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DocumentForm from './components/DocumentForm';
import DispatchForm from './components/DispatchForm';
import AddMethodSelection from './components/AddMethodSelection';
import AddIncomingMethod from './components/AddIncomingMethod';
import BatchEntryForm from './components/BatchEntryForm';
import FileUploadBatchForm from './components/FileUploadBatchForm';
import BatchSigning from './components/BatchSigning';
import Tracking from './components/Tracking';
import TrainAI from './components/TrainAI';
import Settings from './components/Settings';
import PrintLogs from './components/PrintLogs';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [view, setView] = useState<ViewState>({ name: 'dashboard' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeList, setActiveList] = useState<'incoming' | 'outgoing'>('incoming');
  const [aiConfig, setAiConfig] = useState<AIConfig>({
      systemInstructions: '',
      customFields: [],
      spatialExamples: []
  });
  const [settings, setSettings] = useState<AppSettings>({
      darkMode: false,
      officeName: 'Main Office Registry',
      userName: 'Admin User',
      userRole: 'Registrar',
      autoExtract: true,
      defaultView: 'dashboard',
      accentColor: '#005A9C',
      notificationsEnabled: true,
  });

  // Load Data
  useEffect(() => {
    try {
      const storedDocs = localStorage.getItem('documents');
      const storedConfig = localStorage.getItem('aiConfig');
      const storedSettings = localStorage.getItem('appSettings');
      
      if (storedDocs) {
        const parsedDocs = JSON.parse(storedDocs);
        const docsWithDates = parsedDocs.map((doc: any) => ({
          ...doc,
          receivedDate: new Date(doc.receivedDate || Date.now()),
          letterDate: doc.letterDate ? new Date(doc.letterDate) : null,
          locationUpdatedAt: doc.locationUpdatedAt ? new Date(doc.locationUpdatedAt) : undefined,
          statusHistory: (doc.statusHistory || []).map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp)
          })),
          dispatchedDetails: doc.dispatchedDetails ? {
              ...doc.dispatchedDetails,
              dispatchedDate: new Date(doc.dispatchedDetails.dispatchedDate)
          } : null
        }));
        
        // Migration: Ensure statusHistory exists
        const migratedDocs = docsWithDates.map((d: any) => {
            if (!d.statusHistory || d.statusHistory.length === 0) {
                return { ...d, statusHistory: [{ status: d.status, timestamp: d.receivedDate }] };
            }
            return d;
        });
        
        setDocuments(migratedDocs);
      }

      if (storedConfig) {
          setAiConfig(JSON.parse(storedConfig));
      }

      if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
          if (parsed.defaultView === 'tracking') setView({ name: 'tracking' });
      }
    } catch (error) {
      console.error("Failed to load data from local storage", error);
    }
  }, []);

  // Handle Dark Mode Class
  useEffect(() => {
    if (settings.darkMode) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('bg-gray-900');
        document.body.classList.remove('bg-gray-50');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('bg-gray-900');
        document.body.classList.add('bg-gray-50');
    }
  }, [settings.darkMode]);

  const saveDocuments = useCallback((docs: Document[]) => {
    setDocuments([...docs]); // Use spread to ensure new reference
    try {
      localStorage.setItem('documents', JSON.stringify(docs));
    } catch (error) {
      console.error("Failed to save documents", error);
    }
  }, []);

  const saveAiConfig = (config: AIConfig) => {
      setAiConfig(config);
      localStorage.setItem('aiConfig', JSON.stringify(config));
  };

  const saveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem('appSettings', JSON.stringify(newSettings));
  };

  const saveManualDocuments = (docsToCreate: Partial<Document>[]) => {
    const timestamp = new Date();
    const updatedDocsList = [...documents];
    let outgoingCreated = false;

    docsToCreate.forEach(d => {
        const existingIndex = d.id ? updatedDocsList.findIndex(doc => doc.id === d.id) : -1;

        if (existingIndex !== -1) {
            const existing = updatedDocsList[existingIndex];
            const newStatus = d.status || existing.status;
            updatedDocsList[existingIndex] = {
                ...existing,
                ...d,
                status: newStatus,
                statusHistory: d.status && d.status !== existing.status 
                    ? [...existing.statusHistory, { status: d.status, timestamp }] 
                    : existing.statusHistory
            } as Document;
            if (newStatus !== DocumentStatus.Received) outgoingCreated = true;
        } else {
            const initialStatus = d.status || DocumentStatus.Received;
            const newDoc: Document = {
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                subject: d.subject || '',
                senderName: d.senderName || '',
                referenceNumber: d.referenceNumber || '',
                originatingDivision: d.originatingDivision || '',
                letterDate: d.letterDate || null,
                receivedDate: timestamp,
                status: initialStatus,
                statusHistory: [{ status: initialStatus, timestamp }],
                scannedDocument: d.scannedDocument || '',
                dispatchedDetails: d.dispatchedDetails || null,
                deliveredBy: d.deliveredBy,
            };
            updatedDocsList.push(newDoc);
            if (initialStatus !== DocumentStatus.Received) outgoingCreated = true;
        }
    });

    saveDocuments(updatedDocsList);
    setView({ name: 'dashboard' });
    if (outgoingCreated) setActiveList('outgoing');
    else setActiveList('incoming');
  };

  const updateDocumentProperty = (docId: string, updates: Partial<Document>) => {
    const updatedDocs = documents.map(doc => {
        if (doc.id === docId) {
            const newDoc = { ...doc, ...updates };
            if (updates.status && updates.status !== doc.status) {
                newDoc.statusHistory = [...doc.statusHistory, { status: updates.status, timestamp: new Date() }];
            }
            return newDoc;
        }
        return doc;
    });
    saveDocuments(updatedDocs);
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
      case 'tracking':
        return <Tracking documents={documents} onBack={() => setView({ name: 'dashboard' })} />;
      case 'train-ai':
        return <TrainAI config={aiConfig} onSave={saveAiConfig} onBack={() => setView({ name: 'dashboard' })} />;
      case 'print':
        return <PrintLogs documents={documents} officeName={settings.officeName} onBack={() => setView({ name: 'dashboard' })} />;
      case 'settings':
        return <Settings settings={settings} onSave={saveSettings} onBack={() => setView({ name: 'dashboard' })} onReset={() => {
            localStorage.clear();
            window.location.reload();
        }} />;
      case 'add-method':
        return <AddMethodSelection setView={setView} />;
      case 'add-incoming-method':
        return <AddIncomingMethod setView={setView} />;
      case 'upload-batch': {
        const currentDocType = view.docType;
        return <FileUploadBatchForm 
                  docType={currentDocType}
                  onSave={(batch) => {
                    if (currentDocType === 'outgoing') setView({ name: 'batch-signing', batch });
                    else saveManualDocuments(batch);
                  }} 
                  onCancel={() => setView({ name: currentDocType === 'incoming' ? 'add-incoming-method' : 'add-method' })} 
                />;
      }
      case 'batch-entry': {
        const currentDocType = view.docType;
        return <BatchEntryForm 
                  docType={currentDocType}
                  startMode={view.startMode}
                  existingDocuments={documents}
                  onSave={(batch) => {
                    if (currentDocType === 'outgoing') setView({ name: 'batch-signing', batch });
                    else saveManualDocuments(batch);
                  }} 
                  onCancel={() => setView({ name: currentDocType === 'incoming' ? 'add-incoming-method' : 'add-method' })} 
                />;
      }
      case 'batch-signing':
        return <BatchSigning batch={view.batch} onSave={saveManualDocuments} onCancel={() => setView({ name: 'dashboard' })} />;
      case 'dispatch': {
          const docToDispatch = documents.find(d => d.id === view.docId);
          if (docToDispatch) {
              return <DispatchForm document={docToDispatch} onSave={(updated) => {
                  const updatedDocs = documents.map(doc => doc.id === updated.id ? updated : doc);
                  saveDocuments(updatedDocs);
                  setView({ name: 'dashboard' });
              }} onCancel={() => setView({ name: 'dashboard' })} />;
          }
          return <div>Document not found</div>;
      }
      default:
        return <Dashboard documents={documents} setView={setView} searchTerm={searchTerm} activeList={activeList} setActiveList={setActiveList} updateDocumentProperty={updateDocumentProperty} />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${settings.darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        setActiveList={setActiveList}
        setView={setView}
        officeName={settings.officeName}
        userName={settings.userName}
      />
      <main className="p-4 sm:p-6 lg:p-8 print:p-0">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
