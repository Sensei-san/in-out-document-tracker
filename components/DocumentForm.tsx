
import React, { useState, useCallback } from 'react';
import { Document } from '../types';
import CameraCapture from './CameraCapture';
import Spinner from './Spinner';
import { extractDocumentDetails } from '../services/geminiService';

interface DocumentFormProps {
  onSave: (doc: Omit<Document, 'id' | 'status' | 'receivedDate' | 'statusHistory' | 'dispatchedDetails'>) => void;
  onCancel: () => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({ onSave, onCancel }) => {
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
    <div className="max-w-4xl mx-auto bg-white p-4 sm:p-8 rounded-lg shadow-lg">
       <div className="flex items-center mb-6">
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 mr-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Scan New Document</h2>
       </div>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">1. Capture Document</h3>
          <CameraCapture onCapture={handleCapture} />
        </div>
        <div className="relative">
          {isLoading && <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg"><Spinner /></div>}
          <h3 className="text-lg font-semibold text-gray-700 mb-2">2. Review & Confirm Details</h3>
          {formData.scannedDocument ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sender Name</label>
                <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                <input type="text" name="referenceNumber" value={formData.referenceNumber} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Originating Division</label>
                <input type="text" name="originatingDivision" value={formData.originatingDivision} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Letter Date</label>
                <input type="date" name="letterDate" value={formData.letterDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button type="submit" className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg">Save Document</button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <p className="text-gray-500">Scan a document to see details here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentForm;