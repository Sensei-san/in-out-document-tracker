
import React, { useState, useCallback } from 'react';
import { Document } from '../types';
import CameraCapture from './CameraCapture';
import Spinner from './Spinner';
import { extractDocumentDetails } from '../services/geminiService';

interface DocumentFormProps {
  onSave: (doc: Omit<Document, 'id' | 'status' | 'receivedDate' | 'statusHistory' | 'dispatchedDetails'>) => void;
  onCancel: () => void;
  title?: string;
}

const DocumentForm: React.FC<DocumentFormProps> = ({ onSave, onCancel, title = "Scan New Document" }) => {
  const [formData, setFormData] = useState({
    subject: '',
    senderName: '',
    referenceNumber: '',
    originatingDivision: '',
    letterDate: '',
    scannedDocument: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = useCallback(async (imageDataUrl: string) => {
    setFormData(prev => ({ ...prev, scannedDocument: imageDataUrl }));
    setIsLoading(true);
    setError(null);
    try {
      const details = await extractDocumentDetails(imageDataUrl);
      setFormData(prev => ({
        ...prev,
        subject: details.subject || '',
        senderName: details.senderName || '',
        referenceNumber: details.referenceNumber || '',
        originatingDivision: details.originatingDivision || '',
        letterDate: details.letterDate || '',
      }));
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during AI extraction.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scannedDocument) {
        setError("Please scan a document first.");
        return;
    }
    onSave({
        ...formData,
        letterDate: formData.letterDate ? new Date(formData.letterDate) : null,
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg shadow-lg border dark:border-gray-700 transition-colors">
       <div className="flex items-center mb-6">
          <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
       </div>
      
      {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">1. Capture Document</h3>
          <CameraCapture onCapture={handleCapture} />
        </div>
        <div className="relative">
          {isLoading && <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10 rounded-lg backdrop-blur-[2px]"><Spinner /></div>}
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">2. Review & Confirm Details</h3>
          {formData.scannedDocument ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Extracted Subject..." className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sender Name</label>
                <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} placeholder="Extracted Sender..." className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 transition-colors" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference Number</label>
                    <input type="text" name="referenceNumber" value={formData.referenceNumber} onChange={handleChange} placeholder="Ref#..." className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Letter Date</label>
                    <input type="date" name="letterDate" value={formData.letterDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 transition-colors" />
                  </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Originating Division</label>
                <input type="text" name="originatingDivision" value={formData.originatingDivision} onChange={handleChange} placeholder="Department..." className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 transition-colors" />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-6 rounded-lg transition-all">Cancel</button>
                <button type="submit" className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all active:scale-95">Save Document</button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 italic text-center px-4">Scan or upload a document to begin AI data extraction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentForm;
