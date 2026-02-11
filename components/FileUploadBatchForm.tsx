
import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.5.136';
import { extractDocumentDetails } from '../services/geminiService';
import { Document, DocumentStatus } from '../types';
import Spinner from './Spinner';
import DocumentForm from './DocumentForm';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface FileUploadBatchFormProps {
    docType: 'incoming' | 'outgoing';
    onSave: (docs: Partial<Document>[]) => void;
    onCancel: () => void;
}

type FileStatus = 'pending' | 'analyzing' | 'complete' | 'error';
type SubMode = 'main' | 'manual-form' | 'scan-form';

interface ProcessFile {
    id: string;
    fileName: string;
    pageNumber?: number;
    status: FileStatus;
    imageDataUrl: string;
    extractedData: Partial<Document> | null;
    error: string | null;
}

const FileUploadBatchForm: React.FC<FileUploadBatchFormProps> = ({ docType, onSave, onCancel }) => {
    const [filesToProcess, setFilesToProcess] = useState<ProcessFile[]>([]);
    const [deliveredBy, setDeliveredBy] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);
    const [subMode, setSubMode] = useState<SubMode>('main');
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [manualDoc, setManualDoc] = useState<Partial<Document>>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialStatus = docType === 'incoming' ? DocumentStatus.Received : DocumentStatus.SentForSigning;

    const processFiles = useCallback(async (files: ProcessFile[]) => {
        const promises = files.map(async (file) => {
            try {
                const details = await extractDocumentDetails(file.imageDataUrl);
                return { 
                    ...file, 
                    status: 'complete' as FileStatus, 
                    extractedData: {
                        subject: details.subject || '',
                        senderName: details.senderName || '',
                        referenceNumber: details.referenceNumber || '',
                        originatingDivision: details.originatingDivision || '',
                    }
                };
            } catch (e: any) {
                return { ...file, status: 'error' as FileStatus, error: e.message || "Failed to analyze." };
            }
        });

        const results = await Promise.all(promises);
        
        setFilesToProcess(currentFiles => {
            const newFiles = [...currentFiles];
            results.forEach(result => {
                const index = newFiles.findIndex(f => f.id === result.id);
                if (index !== -1) {
                    newFiles[index] = result;
                }
            });
            return newFiles;
        });
    }, []);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles) return;
        let newFiles: ProcessFile[] = [];
        const files: File[] = Array.from(selectedFiles);

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const imageDataUrl = await fileToDataUrl(file);
                newFiles.push({
                    id: `${file.name}-${Date.now()}-${Math.random()}`,
                    fileName: file.name,
                    status: 'analyzing',
                    imageDataUrl,
                    extractedData: null,
                    error: null,
                });
            } else if (file.type === 'application/pdf') {
                try {
                    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        if(context){
                           await page.render({ canvasContext: context, viewport: viewport }).promise;
                           const imageDataUrl = canvas.toDataURL('image/jpeg');
                           newFiles.push({
                                id: `${file.name}-p${i}-${Date.now()}-${Math.random()}`,
                                fileName: file.name,
                                pageNumber: i,
                                status: 'analyzing',
                                imageDataUrl,
                                extractedData: null,
                                error: null,
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error processing PDF", error);
                }
            }
        }
        
        setFilesToProcess(prev => [...prev, ...newFiles]);
        processFiles(newFiles);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDataChange = (id: string, field: keyof Document, value: string) => {
        setFilesToProcess(files => files.map(file => {
            if (file.id === id && file.extractedData) {
                return { ...file, extractedData: { ...file.extractedData, [field]: value } };
            }
            return file;
        }));
    };

    const handleRemoveFile = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Remove this document from the batch?")) {
            setFilesToProcess(prev => prev.filter(f => f.id !== id));
        }
    }

    const handleEditItem = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const doc = filesToProcess.find(f => f.id === id);
        if (doc && doc.extractedData) {
            setEditingDocId(id);
            setManualDoc(doc.extractedData);
            setSubMode('manual-form');
        }
    };

    const handleSaveBatch = () => {
        if (docType === 'incoming' && !deliveredBy.trim()) {
            alert("Please enter who delivered the documents.");
            return;
        }
        const completedDocs = filesToProcess.filter(f => f.status === 'complete' && f.extractedData);
        if(completedDocs.length === 0) {
            alert("No documents have been successfully processed to save.");
            return;
        }
        setIsReviewing(true);
    };
    
    const handleConfirmSave = () => {
         const completedDocs = filesToProcess
            .filter(f => f.status === 'complete' && f.extractedData)
            .map(f => ({
                ...f.extractedData,
                deliveredBy: docType === 'incoming' ? deliveredBy : undefined,
                scannedDocument: f.imageDataUrl,
                status: initialStatus,
            }));
        onSave(completedDocs as Partial<Document>[]);
    }

    const handleAddSimilar = () => {
        const lastDoc = filesToProcess.findLast(f => f.status === 'complete');
        if (lastDoc && lastDoc.extractedData) {
            setEditingDocId(null);
            setManualDoc({ ...lastDoc.extractedData });
            setSubMode('manual-form');
        } else {
            alert("No processed documents to copy from.");
        }
    };

    const handleSaveManualDoc = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDocId) {
            setFilesToProcess(prev => prev.map(f => f.id === editingDocId ? { ...f, extractedData: manualDoc } : f));
        } else {
            setFilesToProcess(prev => [...prev, {
                id: `manual-${Date.now()}`,
                fileName: 'Manual Entry',
                status: 'complete',
                imageDataUrl: '',
                extractedData: manualDoc,
                error: null
            }]);
        }
        setSubMode('main');
        setEditingDocId(null);
        setManualDoc({});
    };

    const handleScanSave = (doc: any) => {
        setFilesToProcess(prev => [...prev, {
            id: `scan-${Date.now()}`,
            fileName: 'Scan Entry',
            status: 'complete',
            imageDataUrl: doc.scannedDocument,
            extractedData: {
                subject: doc.subject,
                senderName: doc.senderName,
                referenceNumber: doc.referenceNumber,
                originatingDivision: doc.originatingDivision,
            },
            error: null
        }]);
        setSubMode('main');
    };

    const isGroupedSigningNeeded = useMemo(() => {
        if (docType !== 'outgoing') return false;
        const completedDocs = filesToProcess.filter(f => f.status === 'complete' && f.extractedData);
        if (completedDocs.length <= 1) return false;
        const firstRecipient = completedDocs[0].extractedData?.senderName;
        return !completedDocs.every(f => f.extractedData?.senderName === firstRecipient);
    }, [filesToProcess, docType]);

    const submitButtonText = useMemo(() => {
        if (docType === 'incoming') return 'Done & Save All';
        const completedCount = filesToProcess.filter(f => f.status === 'complete').length;
        if (completedCount === 1 || !isGroupedSigningNeeded) return 'Continue to Signing';
        return 'Continue to Grouping';
    }, [docType, filesToProcess, isGroupedSigningNeeded]);

    const isAnalyzing = filesToProcess.some(f => f.status === 'analyzing');
    const hasCompletedDocs = filesToProcess.some(f => f.status === 'complete');
    const isSaveDisabled = isAnalyzing || (docType === 'incoming' && !deliveredBy.trim()) || !hasCompletedDocs;
    
    if (subMode === 'manual-form') {
        return (
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border dark:border-gray-700 transition-colors">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">{editingDocId ? 'Edit' : 'Add'} Document Details</h2>
                <form onSubmit={handleSaveManualDoc} className="space-y-4">
                    <InputField label="Description" name="subject" value={manualDoc.subject || ''} onChange={(val) => setManualDoc(prev => ({...prev, subject: val}))} />
                    <InputField label="File No" name="referenceNumber" value={manualDoc.referenceNumber || ''} onChange={(val) => setManualDoc(prev => ({...prev, referenceNumber: val}))} />
                    <InputField label={docType === 'incoming' ? 'Sender Name' : 'Recipient Name'} name="senderName" value={manualDoc.senderName || ''} onChange={(val) => setManualDoc(prev => ({...prev, senderName: val}))} />
                    <InputField label="Division Office" name="originatingDivision" value={manualDoc.originatingDivision || ''} onChange={(val) => setManualDoc(prev => ({...prev, originatingDivision: val}))} />
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={() => setSubMode('main')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 px-6 rounded-lg font-bold transition-colors">Cancel</button>
                        <button type="submit" className="bg-brand-primary hover:bg-brand-dark text-white py-2 px-6 rounded-lg font-bold shadow-lg transition-all active:scale-95">Save Details</button>
                    </div>
                </form>
            </div>
        );
    }

    if (subMode === 'scan-form') {
        return <DocumentForm onSave={handleScanSave} onCancel={() => setSubMode('main')} title={`Scan ${docType} Document`} />;
    }

    const renderReviewView = () => {
        const docsToReview = filesToProcess.filter(f => f.status === 'complete' && f.extractedData);
        return (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Review and Confirm {docType} Batch</h3>
                    <span className="bg-brand-light dark:bg-brand-dark/50 text-brand-primary dark:text-brand-secondary px-3 py-1 rounded-full text-sm font-bold border dark:border-brand-primary/30">{docsToReview.length} Document(s)</span>
                </div>
                 {docType === 'incoming' && <p className="mb-4 text-gray-700 dark:text-gray-300"><strong>Delivered By:</strong> <span className="text-brand-primary dark:text-brand-secondary">{deliveredBy}</span></p>}
                 <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg shadow-inner border dark:border-gray-700 max-h-[50vh] overflow-y-auto transition-colors">
                     <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                         <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 transition-colors">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S/N</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{docType === 'incoming' ? 'Sender' : 'Recipient'}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Division</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                            {docsToReview.map((doc, index) => (
                                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 font-medium">{doc.extractedData?.subject}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 font-bold text-brand-primary dark:text-brand-secondary">{doc.extractedData?.senderName}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 font-mono">{doc.extractedData?.referenceNumber}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">
                                            <span>{doc.extractedData?.originatingDivision}</span>
                                            <button onClick={(e) => handleEditItem(e, doc.id)} className="ml-2 text-brand-secondary hover:text-brand-primary transition-colors" title="Edit Division">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                        <div className="flex items-center space-x-3">
                                            <button onClick={(e) => handleEditItem(e, doc.id)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all" title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                            </button>
                                            <button onClick={(e) => handleRemoveFile(e, doc.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-all" title="Remove">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                 </div>

                 <div className="mt-6 border-t dark:border-gray-700 pt-6">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 text-center">Need to add more documents?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button onClick={() => setSubMode('manual-form')} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all active:scale-95">Add Manually</button>
                        <button onClick={() => setSubMode('scan-form')} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all active:scale-95">Add by Scan</button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all active:scale-95">Add by Upload</button>
                        <button onClick={handleAddSimilar} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all active:scale-95">Add Similar Doc</button>
                    </div>
                 </div>

                 <div className="flex justify-between items-center mt-6 pt-4 border-t dark:border-gray-700">
                       <button onClick={() => setIsReviewing(false)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-6 rounded-lg transition-all">Back to List</button>
                       <button 
                            onClick={handleConfirmSave} 
                            disabled={docsToReview.length === 0}
                            className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all active:scale-95 disabled:bg-gray-400"
                        >
                           {submitButtonText}
                       </button>
                    </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg shadow-lg border dark:border-gray-700 transition-colors">
            <input type="file" multiple accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex items-center mb-6">
                <button onClick={isReviewing ? () => setIsReviewing(false) : onCancel} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{isReviewing ? 'Confirm Batch' : `Upload and Process ${docType === 'incoming' ? 'Incoming' : 'Outgoing'} Batch`}</h2>
            </div>
            
            {!isReviewing && (
                <>
                    {filesToProcess.length === 0 ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center p-12 cursor-pointer hover:border-brand-primary hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <h3 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">Click to upload files</h3>
                            <p className="text-gray-500 dark:text-gray-500 mt-1">Select multiple images or PDFs</p>
                        </div>
                    ) : (
                        <div>
                            {docType === 'incoming' && (
                                <div className="bg-brand-light dark:bg-brand-dark/20 p-4 rounded-lg border border-brand-secondary/30 dark:border-brand-primary/20 mb-6 transition-colors">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
                                        <span className="bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
                                        Provide Batch Information
                                    </h3>
                                    <label htmlFor="deliveredBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        Delivered By
                                    </label>
                                    <input 
                                        id="deliveredBy"
                                        type="text" 
                                        value={deliveredBy} 
                                        onChange={e => setDeliveredBy(e.target.value)} 
                                        className="mt-1 block w-full sm:w-1/2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-3 transition-colors outline-none" 
                                        placeholder="Name of person delivering documents" 
                                        required 
                                    />
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider italic">Required for logging this batch.</p>
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                                    <span className="bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold mr-3">{docType === 'incoming' ? '2' : '1'}</span>
                                    AI Analysis Results
                                </h3>
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {filesToProcess.map(file => (
                                        <div key={file.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-start relative border dark:border-gray-700 transition-colors">
                                            <div className="flex flex-col items-center">
                                                <div className="relative group w-full">
                                                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-700">
                                                      <img src={file.imageDataUrl} alt={file.fileName} className="w-full h-auto max-h-48 object-contain rounded" />
                                                    </div>
                                                    <button onClick={(e) => handleRemoveFile(e, file.id)} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-95">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 truncate w-full text-center font-mono">{file.fileName}{file.pageNumber && ` (page ${file.pageNumber})`}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                {file.status === 'analyzing' && <div className="flex items-center justify-center h-full min-h-[160px]"><Spinner /></div>}
                                                {file.status === 'error' && <div className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-4 rounded-lg border dark:border-red-900/50 flex items-center">
                                                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                                  Analysis Failed: {file.error}
                                                </div>}
                                                {file.status === 'complete' && file.extractedData && (
                                                    <div className="space-y-3">
                                                        <input type="text" placeholder="Subject / Description" value={file.extractedData.subject || ''} onChange={e => handleDataChange(file.id, 'subject', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 outline-none focus:ring-1 focus:ring-brand-primary" />
                                                        <input type="text" placeholder={docType === 'incoming' ? 'Sender Name' : 'Recipient Name'} value={file.extractedData.senderName || ''} onChange={e => handleDataChange(file.id, 'senderName', e.target.value)} className="w-full p-2 border rounded font-semibold text-brand-primary dark:text-brand-secondary dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-1 focus:ring-brand-primary" />
                                                        <div className="grid grid-cols-2 gap-3">
                                                          <input type="text" placeholder="Ref No" value={file.extractedData.referenceNumber || ''} onChange={e => handleDataChange(file.id, 'referenceNumber', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 outline-none text-xs" />
                                                          <input type="text" placeholder="Division" value={file.extractedData.originatingDivision || ''} onChange={e => handleDataChange(file.id, 'originatingDivision', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 outline-none text-xs" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-6 pt-6 border-t dark:border-gray-700">
                               <button onClick={() => fileInputRef.current?.click()} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold py-2 px-6 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all border dark:border-blue-800/50">Add More Files</button>
                               <button onClick={handleSaveBatch} disabled={isSaveDisabled} className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-10 rounded-lg disabled:bg-gray-400 shadow-lg transition-all active:scale-95 flex items-center">
                                   Proceed to Review
                                   <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-xs">{filesToProcess.filter(f=>f.status === 'complete').length}</span>
                               </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const InputField = ({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: (val: string) => void }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input type="text" name={name} value={value} onChange={e => onChange(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border outline-none transition-colors" required />
    </div>
);

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default FileUploadBatchForm;
