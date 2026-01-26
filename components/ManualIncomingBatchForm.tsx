
import React, { useState, useEffect, useRef } from 'react';
import { Document, DocumentStatus } from '../types';
import DocumentForm from './DocumentForm'; // Re-using the scan form

interface ManualIncomingBatchFormProps {
    startMode?: 'manual' | 'scan';
    onSave: (docs: Partial<Document>[]) => void;
    onCancel: () => void;
}

type Mode = 'list' | 'manual-form' | 'scan-form' | 'review';

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
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-brand-primary transition-colors">
                {image ? (
                    <img src={image} alt="Document preview" className="w-full h-full object-contain rounded-lg" />
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="mt-2 text-sm font-semibold">Add Document Photo</span>
                        <span className="text-xs">(Optional)</span>
                    </>
                )}
            </button>
        </div>
    );
};

const ManualIncomingBatchForm: React.FC<ManualIncomingBatchFormProps> = ({ startMode, onSave, onCancel }) => {
    const [mode, setMode] = useState<Mode>('list');
    const [batch, setBatch] = useState<Partial<Document>[]>([]);
    const [currentDoc, setCurrentDoc] = useState<Partial<Document> | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        if (startMode) {
            setMode(startMode === 'manual' ? 'manual-form' : 'scan-form');
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

    const handleAddSimilar = () => {
        if (batch.length === 0) {
            alert("No documents in the list to copy from.");
            return;
        }
        const lastDoc = batch[batch.length - 1];
        setEditingIndex(null);
        setCurrentDoc({ ...lastDoc });
        setMode('manual-form');
    };

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setCurrentDoc(batch[index]);
        setMode('manual-form');
    };
    
    const handleReviewManualForm = (e: React.FormEvent) => {
        e.preventDefault();
        setMode('review');
    };
    
    const handleSaveFromReview = () => {
        if (currentDoc) {
            const docToSave = { ...currentDoc, status: DocumentStatus.Received };
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
            status: DocumentStatus.Received
        };
        setBatch(prev => [...prev, newDoc]);
        setMode('list');
    };
    
    const handleBack = () => {
        if (batch.length === 0) {
            onCancel();
        } else {
            setMode('list');
        }
    };

    const renderListView = () => (
        <div className="w-full">
            {batch.length > 0 ? (
                <>
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Documents in Current Batch</h3>
                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                         <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S/N</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File No</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                {batch.map((doc, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 truncate max-w-xs">{doc.subject}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{doc.referenceNumber}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900">{doc.senderName}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <button onClick={() => handleEdit(index)} className="text-blue-600 hover:text-blue-900">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                         </table>
                    </div>
                </>
            ) : (
                <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-800">Your batch is empty.</h3>
                    <p className="text-gray-500 mt-1">Start by adding your first document below.</p>
                </div>
            )}

            <div className="mt-6 border-t pt-6">
                 <p className="text-sm font-semibold text-gray-600 mb-3 text-center">Add more documents to the list:</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     <button onClick={handleStartManualAdd} className="p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow border flex items-center justify-center text-sm font-semibold text-gray-700">Add Manually</button>
                     <button onClick={handleStartScanAdd} className="p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow border flex items-center justify-center text-sm font-semibold text-gray-700">Add by Scan</button>
                     <button onClick={() => alert('Feature coming soon!')} className="p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow border flex items-center justify-center text-sm font-semibold text-gray-700">Add by Upload</button>
                     <button onClick={handleAddSimilar} className="p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow border flex items-center justify-center text-sm font-semibold text-gray-700">Add Similar Doc</button>
                 </div>
            </div>

            <div className="flex justify-between mt-8">
                <button onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel Batch</button>
                <button onClick={() => onSave(batch)} disabled={batch.length === 0} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">Done & Save All</button>
            </div>
        </div>
    );
    
    const renderManualForm = () => (
        <div>
            <h3 className="text-xl font-bold mb-4">{editingIndex !== null ? 'Edit' : 'Add'} Document Details</h3>
            <div className="space-y-4">
                <ImagePicker 
                    image={currentDoc?.scannedDocument || null} 
                    onImageSelect={(dataUrl: string) => setCurrentDoc(prev => prev ? {...prev, scannedDocument: dataUrl} : {scannedDocument: dataUrl})} 
                />
                 <form onSubmit={handleReviewManualForm} className="space-y-4">
                    <InputField label="Description" name="subject" value={currentDoc?.subject || ''} onChange={setCurrentDoc} />
                    <InputField label="File No" name="referenceNumber" value={currentDoc?.referenceNumber || ''} onChange={setCurrentDoc} />
                    <InputField label="Name" name="senderName" value={currentDoc?.senderName || ''} onChange={setCurrentDoc} />
                    <InputField label="Division Office" name="originatingDivision" value={currentDoc?.originatingDivision || ''} onChange={setCurrentDoc} />
                    <InputField label="Delivered By" name="deliveredBy" value={currentDoc?.deliveredBy || ''} onChange={setCurrentDoc} />
                    <div className="flex justify-between mt-6">
                        <button type="button" onClick={handleBack} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                           {batch.length === 0 ? 'Back to Methods' : 'Back to List'}
                        </button>
                        <button type="submit" className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg">Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
    
    const renderReview = () => (
        <div>
            <h3 className="text-xl font-bold mb-4">Review Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                 {currentDoc?.scannedDocument && <img src={currentDoc.scannedDocument} alt="Document Preview" className="max-h-32 rounded border mb-2"/>}
                <p><strong>Description:</strong> {currentDoc?.subject}</p>
                <p><strong>File No:</strong> {currentDoc?.referenceNumber}</p>
                <p><strong>Name:</strong> {currentDoc?.senderName}</p>
                <p><strong>Division Office:</strong> {currentDoc?.originatingDivision}</p>
                <p><strong>Delivered By:</strong> {currentDoc?.deliveredBy}</p>
            </div>
             <div className="flex justify-between mt-6">
                <button type="button" onClick={() => setMode('manual-form')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Back to Edit</button>
                <button type="button" onClick={handleSaveFromReview} className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg">Confirm & Add to List</button>
            </div>
        </div>
    );
    
    if (mode === 'scan-form') {
        return <DocumentForm onSave={handleSaveFromScan} onCancel={handleBack} />
    }
    
    return (
        <div className="max-w-4xl mx-auto bg-white p-4 sm:p-8 rounded-lg shadow-lg">
             <div className="flex items-center mb-6">
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Create Incoming Document Batch</h2>
            </div>
            {mode === 'list' && renderListView()}
            {mode === 'manual-form' && renderManualForm()}
            {mode === 'review' && renderReview()}
        </div>
    );
};

const InputField = ({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: React.Dispatch<any> }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input type="text" name={name} value={value} onChange={e => onChange((prev:any) => ({...prev, [name]: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
    </div>
);


export default ManualIncomingBatchForm;
