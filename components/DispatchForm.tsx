
import React, { useState, useRef } from 'react';
import { Document, DocumentStatus, DispatchedDetails } from '../types';
import SignatureCanvas from './SignatureCanvas';
import CameraCapture from './CameraCapture';

interface DispatchFormProps {
  document: Document;
  onSave: (document: Document) => void;
  onCancel: () => void;
}

const DispatchForm: React.FC<DispatchFormProps> = ({ document, onSave, onCancel }) => {
  const [recipientName, setRecipientName] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [recipientPhoto, setRecipientPhoto] = useState<string | null>(null);
  const signatureCanvasRef = useRef<{ getSignature: () => string | null, clear: () => void }>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const signature = signatureCanvasRef.current?.getSignature();

    if (!recipientName || !dispatchedBy || !signature || !recipientPhoto) {
      setError('Please fill all fields, capture a signature, and take a photo.');
      return;
    }
    setError(null);
    
    const dispatchDetails: DispatchedDetails = {
      recipientName,
      dispatchedBy,
      dispatchedDate: new Date(),
      recipientSignature: signature,
      recipientPhoto,
    };

    const updatedDocument: Document = {
      ...document,
      status: DocumentStatus.Dispatched,
      dispatchedDetails: dispatchDetails,
      statusHistory: [...document.statusHistory, { status: DocumentStatus.Dispatched, timestamp: new Date() }],
    };
    
    onSave(updatedDocument);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-4 sm:p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Dispatch Document</h2>
      <p className="text-gray-600 mb-6">Subject: <span className="font-semibold">{document.subject}</span></p>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Recipient Name</label>
            <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Dispatched By (Your Name)</label>
            <input type="text" value={dispatchedBy} onChange={(e) => setDispatchedBy(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Signature</label>
                <SignatureCanvas ref={signatureCanvasRef} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo Proof of Delivery</label>
                <CameraCapture onCapture={setRecipientPhoto} />
            </div>
        </div>
        
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
          <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Confirm Dispatch</button>
        </div>
      </form>
    </div>
  );
};

export default DispatchForm;
