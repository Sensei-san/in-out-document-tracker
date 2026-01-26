
import React, { useState, useCallback, useRef } from 'react';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.5.136';
import { extractDocumentDetails } from '../services/geminiService';
import { Document } from '../types';
import Spinner from './Spinner';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;


interface FileUploadBatchFormProps {
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

const FileUploadBatchForm: React.FC<FileUploadBatchFormProps> = ({ onSave, onCancel }) => {
    const [filesToProcess, setFilesToProcess] = useState<ProcessFile[]>([]);
    const [deliveredBy, setDeliveredBy] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

        // Fix: Explicitly convert FileList to File[] to provide type safety in the loop.
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
    };

    const handleDataChange = (id: string, field: keyof Document, value: string) => {
        setFilesToProcess(files => files.map(file => {
            if (file.id === id && file.extractedData) {
                return { ...file, extractedData: { ...file.extractedData, [field]: value } };
            }
            return file;
        }));
    };

    const handleSaveBatch = () => {
        if (!deliveredBy) {
            alert("Please enter who delivered the documents.");
            return;
        }

        const completedDocs = filesToProcess
            .filter(f => f.status === 'complete' && f.extractedData)
            .map(f => ({
                ...f.extractedData,
                deliveredBy: deliveredBy,
                scannedDocument: f.imageDataUrl,
                status: 'Received',
            }));

        if(completedDocs.length === 0) {
            alert("No documents have been successfully processed to save.");
            return;
        }

        onSave(completedDocs as Partial<Document>[]);
    };

    return (
        <div className="max-w-6xl mx-auto bg-white p-4 sm:p-8 rounded-lg shadow-lg">
            <div className="flex items-center mb-6">
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Upload and Process Batch</h2>
            </div>

            {filesToProcess.length === 0 ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-4 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-12 cursor-pointer hover:border-brand-primary hover:bg-gray-50 transition-colors"
                >
                    <input type="file" multiple accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <h3 className="mt-4 text-xl font-semibold text-gray-700">Click to upload files</h3>
                    <p className="text-gray-500 mt-1">Select multiple images or PDFs</p>
                </div>
            ) : (
                <div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Delivered By</label>
                        <input type="text" value={deliveredBy} onChange={e => setDeliveredBy(e.target.value)} className="mt-1 block w-full sm:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Name of person delivering documents" required />
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {filesToProcess.map(file => (
                            <div key={file.id} className="bg-gray-50 p-4 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                <div className="flex flex-col items-center">
                                    <img src={file.imageDataUrl} alt={file.fileName} className="w-full h-auto max-h-48 object-contain rounded border bg-white" />
                                    <p className="text-xs text-gray-600 mt-2 truncate w-full text-center">{file.fileName}{file.pageNumber && ` (p. ${file.pageNumber})`}</p>
                                </div>
                                <div className="md:col-span-2">
                                    {file.status === 'analyzing' && <div className="flex items-center justify-center h-full"><Spinner /></div>}
                                    {file.status === 'error' && <div className="text-red-600 bg-red-100 p-3 rounded">Error: {file.error}</div>}
                                    {file.status === 'complete' && file.extractedData && (
                                        <div className="space-y-2">
                                            <input type="text" placeholder="Subject / Description" value={file.extractedData.subject || ''} onChange={e => handleDataChange(file.id, 'subject', e.target.value)} className="w-full p-2 border rounded" />
                                            <input type="text" placeholder="Sender Name" value={file.extractedData.senderName || ''} onChange={e => handleDataChange(file.id, 'senderName', e.target.value)} className="w-full p-2 border rounded" />
                                            <input type="text" placeholder="Reference Number" value={file.extractedData.referenceNumber || ''} onChange={e => handleDataChange(file.id, 'referenceNumber', e.target.value)} className="w-full p-2 border rounded" />
                                            <input type="text" placeholder="Originating Division" value={file.extractedData.originatingDivision || ''} onChange={e => handleDataChange(file.id, 'originatingDivision', e.target.value)} className="w-full p-2 border rounded" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                       <button onClick={() => fileInputRef.current?.click()} className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-4 rounded-lg">Add More Files</button>
                       <button onClick={handleSaveBatch} disabled={filesToProcess.some(f => f.status === 'analyzing') || !deliveredBy} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400">
                           Save All Documents ({filesToProcess.filter(f=>f.status === 'complete').length})
                       </button>
                    </div>
                </div>
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