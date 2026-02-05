
import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.5.136';
import { extractDocumentDetails } from '../services/geminiService';
import { Document, DocumentStatus } from '../types';
import Spinner from './Spinner';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;


interface FileUploadBatchFormProps {
    docType: 'incoming' | 'outgoing';
    onSave: (docs: Partial<Document>[]) => void;
    onCancel: () => void;
}

type FileStatus = 'pending' | 'analyzing' | 'complete' | 'error';

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
                    id: `${file.name}-${Date.now()}`,
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
                                id: `${file.name}-p${i}-${Date.now()}`,
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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDataChange = (id: string, field: keyof Document, value: string) => {
        setFilesToProcess(files => files.map(file => {
            if (file.id === id && file.extractedData) {
                return { ...file, extractedData: { ...file.extractedData, [field]: value } };
            }
            return file;
        }));
    };

    const handleRemoveFile = (id: string) => {
        if (window.confirm("Remove this document from the batch?")) {
            setFilesToProcess(prev => prev.filter(f => f.id !== id));
        }
    }

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
    
    const renderReviewView = () => {
        const docsToReview = filesToProcess.filter(f => f.status === 'complete' && f.extractedData);
        return (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Review and Confirm {docType} Batch</h3>
                    <span className="bg-brand-light text-brand-primary px-3 py-1 rounded-full text-sm font-bold">{docsToReview.length} Document(s)</span>
                </div>
                 {docType === 'incoming' && <p className="mb-4 text-gray-700"><strong>Delivered By:</strong> {deliveredBy}</p>}
                 <div className="overflow-x-auto bg-white rounded-lg shadow max-h-[60vh] overflow-y-auto">
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S/N</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{docType === 'incoming' ? 'Sender' : 'Recipient'}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {docsToReview.map((doc, index) => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{doc.extractedData?.subject}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{doc.extractedData?.senderName}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500 font-mono">{doc.extractedData?.referenceNumber}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{doc.extractedData?.originatingDivision}</td>
                                    <td className="px-4 py-2 text-sm">
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => setIsReviewing(false)} className="text-blue-600 hover:text-blue-900" title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                            </button>
                                            <button onClick={() => handleRemoveFile(doc.id)} className="text-red-600 hover:text-red-900" title="Remove">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                 </div>
                 <div className="flex justify-between items-center mt-6 pt-4 border-t">
                       <button onClick={() => setIsReviewing(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors">Back to Edit</button>
                       <button 
                            onClick={handleConfirmSave} 
                            className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all active:scale-95"
                        >
                           {submitButtonText}
                       </button>
                    </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto bg-white p-4 sm:p-8 rounded-lg shadow-lg">
            <input type="file" multiple accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex items-center mb-6">
                <button onClick={isReviewing ? () => setIsReviewing(false) : onCancel} className="text-gray-500 hover:text-gray-700 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-800">{isReviewing ? 'Confirm Batch' : `Upload and Process ${docType === 'incoming' ? 'Incoming' : 'Outgoing'} Batch`}</h2>
            </div>
            
            {isReviewing ? renderReviewView() : (
                <>
                    {filesToProcess.length === 0 ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-4 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-12 cursor-pointer hover:border-brand-primary hover:bg-gray-50 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <h3 className="mt-4 text-xl font-semibold text-gray-700">Click to upload files</h3>
                            <p className="text-gray-500 mt-1">Select multiple images or PDFs</p>
                        </div>
                    ) : (
                        <div>
                            {docType === 'incoming' && (
                                <div className="bg-brand-light p-4 rounded-lg border border-brand-secondary mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                                        <span className="bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
                                        Provide Batch Information
                                    </h3>
                                    <label htmlFor="deliveredBy" className="block text-sm font-medium text-gray-700 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        Delivered By
                                    </label>
                                    <input 
                                        id="deliveredBy"
                                        type="text" 
                                        value={deliveredBy} 
                                        onChange={e => setDeliveredBy(e.target.value)} 
                                        className="mt-1 block w-full sm:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3" 
                                        placeholder="Name of person delivering documents" 
                                        required 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This name will be applied to all documents saved in this batch.</p>
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <span className="bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold mr-3">{docType === 'incoming' ? '2' : '1'}</span>
                                    Review Extracted Details
                                </h3>
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                                    {filesToProcess.map(file => (
                                        <div key={file.id} className="bg-gray-50 p-4 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                            <div className="flex flex-col items-center">
                                                <div className="relative group w-full">
                                                    <img src={file.imageDataUrl} alt={file.fileName} className="w-full h-auto max-h-48 object-contain rounded border bg-white" />
                                                    <button onClick={() => handleRemoveFile(file.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-2 truncate w-full text-center">{file.fileName}{file.pageNumber && ` (p. ${file.pageNumber})`}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                {file.status === 'analyzing' && <div className="flex items-center justify-center h-full"><Spinner /></div>}
                                                {file.status === 'error' && <div className="text-red-600 bg-red-100 p-3 rounded">Error: {file.error}</div>}
                                                {file.status === 'complete' && file.extractedData && (
                                                    <div className="space-y-2">
                                                        <input type="text" placeholder="Subject / Description" value={file.extractedData.subject || ''} onChange={e => handleDataChange(file.id, 'subject', e.target.value)} className="w-full p-2 border rounded" />
                                                        <input type="text" placeholder={docType === 'incoming' ? 'Sender Name' : 'Recipient Name'} value={file.extractedData.senderName || ''} onChange={e => handleDataChange(file.id, 'senderName', e.target.value)} className="w-full p-2 border rounded font-semibold text-brand-primary" />
                                                        <input type="text" placeholder="Reference Number" value={file.extractedData.referenceNumber || ''} onChange={e => handleDataChange(file.id, 'referenceNumber', e.target.value)} className="w-full p-2 border rounded" />
                                                        <input type="text" placeholder="Originating Division" value={file.extractedData.originatingDivision || ''} onChange={e => handleDataChange(file.id, 'originatingDivision', e.target.value)} className="w-full p-2 border rounded" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-6 pt-4 border-t">
                               <button onClick={() => fileInputRef.current?.click()} className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-4 rounded-lg">Add More Files</button>
                               <button onClick={handleSaveBatch} disabled={isSaveDisabled} className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-10 rounded-lg disabled:bg-gray-400 shadow-lg transition-all active:scale-95">
                                   Proceed to Review ({filesToProcess.filter(f=>f.status === 'complete').length})
                               </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


export default FileUploadBatchForm;
