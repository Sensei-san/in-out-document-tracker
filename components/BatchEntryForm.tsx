
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.5.136';
import { Document, DocumentStatus } from '../types';
import DocumentForm from './DocumentForm'; 
import { extractDocumentDetails } from '../services/geminiService';
import Spinner from './Spinner';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface BatchEntryFormProps {
    docType: 'incoming' | 'outgoing';
    startMode?: 'manual' | 'scan' | 'select';
    existingDocuments?: Document[];
    onSave: (docs: Partial<Document>[]) => void;
    onCancel: () => void;
}

type Mode = 'list' | 'manual-form' | 'scan-form' | 'review' | 'select-incoming';

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const BatchEntryForm: React.FC<BatchEntryFormProps> = ({ docType, startMode, existingDocuments = [], onSave, onCancel }) => {
    const [mode, setMode] = useState<Mode>('list');
    const [batch, setBatch] = useState<Partial<Document>[]>([]);
    const [currentDoc, setCurrentDoc] = useState<Partial<Document> | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isProcessingUpload, setIsProcessingUpload] = useState(false);
    const [selectionSearch, setSelectionSearch] = useState('');
    const [selectedIncomingIds, setSelectedIncomingIds] = useState<Set<string>>(new Set());
    const uploadFileRef = useRef<HTMLInputElement>(null);

    const initialStatus = docType === 'incoming' ? DocumentStatus.Received : DocumentStatus.SentForSigning;

    useEffect(() => {
        if (startMode) {
            if (startMode === 'manual') setMode('manual-form');
            else if (startMode === 'scan') setMode('scan-form');
            else if (startMode === 'select') {
                setSelectedIncomingIds(new Set());
                setMode('select-incoming');
            }
        }
    }, [startMode]);

    const handleStartManualAdd = () => {
        setEditingIndex(null);
        setCurrentDoc({});
        setMode('manual-form');
    };
    
    const handleStartScanAdd = () => {
        setMode('scan-form');
    };

    const handleStartSelectIncoming = () => {
        setSelectedIncomingIds(new Set());
        setMode('select-incoming');
    };

    const processAndAddFiles = useCallback(async (files: File[]) => {
        setIsProcessingUpload(true);
        const newDocs: Partial<Document>[] = [];

        for (const file of files) {
            const processSingleImage = async (imageDataUrl: string) => {
                try {
                    const details = await extractDocumentDetails(imageDataUrl);
                    newDocs.push({
                        id: `imported-${Date.now()}-${Math.random()}`,
                        subject: details.subject || '',
                        senderName: details.senderName || '',
                        referenceNumber: details.referenceNumber || '',
                        originatingDivision: details.originatingDivision || '',
                        scannedDocument: imageDataUrl,
                        status: initialStatus,
                    });
                } catch (e) {
                    console.error("Failed to process file", file.name, e);
                }
            };
            
            if (file.type.startsWith('image/')) {
                const imageDataUrl = await fileToDataUrl(file);
                await processSingleImage(imageDataUrl);
            } else if (file.type === 'application/pdf') {
                try {
                    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (context) {
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({ canvasContext: context, viewport: viewport }).promise;
                            const imageDataUrl = canvas.toDataURL('image/jpeg');
                            await processSingleImage(imageDataUrl);
                        }
                    }
                } catch (error) {
                    console.error("Error processing PDF", error);
                }
            }
        }
        
        setBatch(prev => [...prev, ...newDocs]);
        setIsProcessingUpload(false);
    }, [initialStatus]);

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            processAndAddFiles(Array.from(selectedFiles));
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleAddSimilar = () => {
        if (batch.length === 0) {
            alert("No documents in the list to copy from.");
            return;
        }
        const lastDoc = batch[batch.length - 1];
        setEditingIndex(null);
        setCurrentDoc({ ...lastDoc, id: undefined });
        setMode('manual-form');
    };

    const handleEdit = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setEditingIndex(index);
        setCurrentDoc(batch[index]);
        setMode('manual-form');
    };

    const handleRemove = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to remove this document from the batch?')) {
            const newBatch = batch.filter((_, i) => i !== index);
            setBatch(newBatch);
        }
    };
    
    const handleReviewManualForm = (e: React.FormEvent) => {
        e.preventDefault();
        setMode('review');
    };
    
    const handleSaveFromReview = () => {
        if (currentDoc) {
            const docToSave = { 
                ...currentDoc, 
                id: currentDoc.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: initialStatus 
            };
             if (editingIndex !== null) {
                const updatedBatch = [...batch];
                updatedBatch[editingIndex] = docToSave;
                setBatch(updatedBatch);
            } else {
                setBatch(prev => [...prev, docToSave]);
            }
        }
        setCurrentDoc(null);
        setEditingIndex(null);
        setMode('list');
    };
    
    const handleSaveFromScan = (doc: Omit<Document, 'id' | 'status' | 'receivedDate' | 'statusHistory' | 'dispatchedDetails'>) => {
        const newDoc: Partial<Document> = {
            ...doc,
            id: `scan-${Date.now()}-${Math.random()}`,
            status: initialStatus
        };
        setBatch(prev => [...prev, newDoc]);
        setMode('list');
    };
    
    const toggleIncomingSelection = (id: string) => {
        const next = new Set(selectedIncomingIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIncomingIds(next);
    };

    const confirmSelectIncoming = () => {
        const selectedDocs = existingDocuments
            .filter(d => selectedIncomingIds.has(d.id))
            .map(d => ({
                id: d.id,
                subject: d.subject,
                senderName: d.senderName,
                referenceNumber: d.referenceNumber,
                originatingDivision: d.originatingDivision,
                scannedDocument: d.scannedDocument,
                status: initialStatus // Convert to outgoing
            }));
        
        setBatch(prev => [...prev, ...selectedDocs]);
        setMode('list');
    };

    const handleBack = () => {
        if (batch.length === 0) {
            onCancel();
        } else {
            setMode('list');
        }
    };

    const filteredIncoming = useMemo(() => {
        const batchIds = new Set(batch.map(b => b.id).filter(Boolean));
        return existingDocuments.filter(d => {
            const isIncoming = d.status === DocumentStatus.Received || d.status === DocumentStatus.ReturnedFromSigning;
            const notInBatch = !batchIds.has(d.id);
            const matchesSearch = selectionSearch === '' || 
                d.subject.toLowerCase().includes(selectionSearch.toLowerCase()) ||
                d.referenceNumber.toLowerCase().includes(selectionSearch.toLowerCase()) ||
                d.senderName.toLowerCase().includes(selectionSearch.toLowerCase());
            
            return isIncoming && notInBatch && matchesSearch;
        });
    }, [existingDocuments, batch, selectionSearch]);

    const isGroupedSigningNeeded = useMemo(() => {
        if (docType !== 'outgoing') return false;
        if (batch.length <= 1) return false;
        const firstRecipient = batch[0].senderName;
        return !batch.every(doc => doc.senderName === firstRecipient);
    }, [batch, docType]);

    const submitButtonText = useMemo(() => {
        if (docType === 'incoming') return 'Done & Save All';
        if (batch.length === 1 || !isGroupedSigningNeeded) return 'Continue to Signing';
        return 'Continue to Grouping';
    }, [docType, batch.length, isGroupedSigningNeeded]);

    const renderListView = () => (
        <div className="w-full">
            {batch.length > 0 ? (
                <>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Documents in Current Batch</h3>
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
                         <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                             <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">S/N</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">File No</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{docType === 'incoming' ? 'Sender' : 'Recipient'}</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Division Office</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                             </thead>
                             <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {batch.map((doc, index) => (
                                    <tr key={doc.id || `batch-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                            {doc.subject}
                                            {doc.id && (doc.id.includes('imported') || doc.id.includes('scan')) && <span className="ml-2 px-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] rounded uppercase">Imported</span>}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{doc.referenceNumber}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{doc.senderName}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{doc.originatingDivision}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <div className="flex items-center space-x-3">
                                                <button onClick={(e) => handleEdit(e, index)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Edit">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                                </button>
                                                <button onClick={(e) => handleRemove(e, index)} className="text-red-600 dark:text-red-400 hover:text-red-900 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Remove">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                         </table>
                    </div>
                </>
            ) : (
                <div className="text-center py-10 px-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-2 border-dashed dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Your batch is empty.</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Start by adding your first {docType} document below.</p>
                </div>
            )}

            <div className="mt-6 border-t dark:border-gray-700 pt-6">
                 <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 text-center">Add more documents to the list:</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                     <input type="file" multiple accept="image/*,application/pdf" ref={uploadFileRef} onChange={handleFileSelected} className="hidden" />
                     <button onClick={handleStartManualAdd} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">Add Manually</button>
                     <button onClick={handleStartScanAdd} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">Add by Scan</button>
                     <button onClick={() => uploadFileRef.current?.click()} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">Add by Upload</button>
                     
                     {docType === 'outgoing' && (
                        <button onClick={handleStartSelectIncoming} className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg shadow hover:shadow-md transition-shadow border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-sm font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Select from Incoming
                        </button>
                     )}

                     <button onClick={handleAddSimilar} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">Add Similar Doc</button>
                 </div>
            </div>

            <div className="flex justify-between mt-8">
                <button onClick={onCancel} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-lg">Cancel Batch</button>
                <button 
                    onClick={() => onSave(batch)} 
                    disabled={batch.length === 0 || isProcessingUpload} 
                    className={`font-bold py-2 px-6 rounded-lg shadow-md transition-all ${batch.length === 0 || isProcessingUpload ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-brand-primary hover:bg-brand-dark text-white'}`}
                >
                    {submitButtonText}
                </button>
            </div>
        </div>
    );
    
    const renderSelectIncomingView = () => (
        <div className="w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-gray-100">Select from Incoming List</h3>
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="Search incoming documents..." 
                    value={selectionSearch}
                    onChange={(e) => setSelectionSearch(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-brand-primary dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
                />
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg bg-gray-50 dark:bg-gray-900/30 dark:border-gray-700">
                {filteredIncoming.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Select</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ref No</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredIncoming.map(doc => (
                                <tr key={doc.id} className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => toggleIncomingSelection(doc.id)}>
                                    <td className="px-4 py-2">
                                        <input type="checkbox" checked={selectedIncomingIds.has(doc.id)} readOnly className="h-4 w-4 rounded dark:bg-gray-700 dark:border-gray-600" />
                                    </td>
                                    <td className="px-4 py-2 text-sm dark:text-gray-200">{doc.subject}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{doc.referenceNumber}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic">No matching incoming documents found.</div>
                )}
            </div>

            <div className="flex justify-between mt-6">
                <button onClick={() => setMode('list')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 px-6 rounded-lg font-bold">Back</button>
                <button onClick={confirmSelectIncoming} disabled={selectedIncomingIds.size === 0} className="bg-brand-primary hover:bg-brand-dark text-white py-2 px-6 rounded-lg font-bold disabled:bg-gray-400">Add Selected to Batch</button>
            </div>
        </div>
    );

    const renderManualForm = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold dark:text-gray-100">{editingIndex !== null ? 'Edit' : 'Add'} Document Details</h3>
            <ImagePicker image={currentDoc?.scannedDocument || null} onImageSelect={(url) => setCurrentDoc(prev => ({...prev, scannedDocument: url}))} />
            <form onSubmit={handleReviewManualForm} className="space-y-4">
                <InputField label="Description" name="subject" value={currentDoc?.subject || ''} onChange={(val) => setCurrentDoc(prev => ({...prev, subject: val}))} />
                <InputField label="File No" name="referenceNumber" value={currentDoc?.referenceNumber || ''} onChange={(val) => setCurrentDoc(prev => ({...prev, referenceNumber: val}))} />
                <InputField label={docType === 'incoming' ? 'Sender' : 'Recipient'} name="senderName" value={currentDoc?.senderName || ''} onChange={(val) => setCurrentDoc(prev => ({...prev, senderName: val}))} />
                <InputField label="Division" name="originatingDivision" value={currentDoc?.originatingDivision || ''} onChange={(val) => setCurrentDoc(prev => ({...prev, originatingDivision: val}))} />
                <div className="flex justify-between mt-6">
                    <button type="button" onClick={() => setMode('list')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 px-6 rounded-lg font-bold">Cancel</button>
                    <button type="submit" className="bg-brand-primary hover:bg-brand-dark text-white py-2 px-6 rounded-lg font-bold">Review</button>
                </div>
            </form>
        </div>
    );

    const renderReview = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold dark:text-gray-100">Review Details</h3>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border dark:border-gray-700">
                <p className="mb-2"><strong className="text-gray-600 dark:text-gray-400 uppercase text-[10px]">Description:</strong> <span className="dark:text-gray-100 block font-semibold">{currentDoc?.subject}</span></p>
                <p className="mb-2"><strong className="text-gray-600 dark:text-gray-400 uppercase text-[10px]">Ref No:</strong> <span className="dark:text-gray-100 block font-mono">{currentDoc?.referenceNumber}</span></p>
                <p className="mb-2"><strong className="text-gray-600 dark:text-gray-400 uppercase text-[10px]">Party:</strong> <span className="dark:text-gray-100 block font-bold text-brand-primary dark:text-brand-secondary">{currentDoc?.senderName}</span></p>
            </div>
            <div className="flex justify-between mt-6">
                <button onClick={() => setMode('manual-form')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 px-6 rounded-lg font-bold">Edit</button>
                <button onClick={handleSaveFromReview} className="bg-brand-primary hover:bg-brand-dark text-white py-2 px-6 rounded-lg font-bold">Add to Batch</button>
            </div>
        </div>
    );

    if (mode === 'scan-form') {
        return <DocumentForm onSave={handleSaveFromScan} onCancel={handleBack} title={`Scan ${docType === 'incoming' ? 'Incoming' : 'Outgoing'} Document`} />
    }
    
    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg shadow-lg border dark:border-gray-700 transition-colors">
             <div className="flex items-center mb-6">
                <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Create {docType === 'incoming' ? 'Incoming' : 'Outgoing'} Document Batch</h2>
            </div>
            {mode === 'list' && renderListView()}
            {mode === 'manual-form' && renderManualForm()}
            {mode === 'review' && renderReview()}
            {mode === 'select-incoming' && renderSelectIncomingView()}
        </div>
    );
};

const InputField = ({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: (val: string) => void }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input 
            type="text" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={`Enter ${label}...`}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-3 border outline-none transition-colors" 
            required 
        />
    </div>
);

const ImagePicker = ({ image, onImageSelect }: {image: string | null, onImageSelect: (dataUrl: string) => void}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => onImageSelect(event.target!.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    return (
        <div className="w-full">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:border-brand-primary dark:hover:border-brand-primary transition-all group"
            >
                {image ? (
                    <img src={image} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                ) : (
                    <div className="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 group-hover:text-brand-primary transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-bold group-hover:text-brand-primary transition-colors">Add Document Photo</span>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Camera or Upload</p>
                    </div>
                )}
            </button>
        </div>
    );
};

export default BatchEntryForm;
