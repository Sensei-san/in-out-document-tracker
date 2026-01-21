
import React from 'react';
import { Document, DocumentStatus } from '../types';

interface DocumentDetailsModalProps {
  document: Document;
  onClose: () => void;
  onDispatch: (docId: string) => void;
}

const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({ document, onClose, onDispatch }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 sticky top-0 bg-white border-b z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800">{document.subject}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500">From: {document.senderName}</p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-600 mb-2">Document Details</h4>
            <ul className="text-sm space-y-2 text-gray-700">
              <li><strong>Reference:</strong> {document.referenceNumber || 'N/A'}</li>
              <li><strong>Origin:</strong> {document.originatingDivision || 'N/A'}</li>
              <li><strong>Letter Date:</strong> {document.letterDate?.toLocaleDateString() || 'N/A'}</li>
              <li><strong>Received Date:</strong> {document.receivedDate.toLocaleDateString()}</li>
              <li><strong>Current Status:</strong> <span className="font-bold">{document.status}</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-600 mb-2">Scanned Document</h4>
            <img src={document.scannedDocument} alt="Scanned document" className="rounded-lg border w-full"/>
          </div>

          {document.dispatchedDetails && (
             <div>
              <h4 className="font-semibold text-gray-600 mb-2">Dispatch Details</h4>
               <ul className="text-sm space-y-2 text-gray-700">
                  <li><strong>Recipient:</strong> {document.dispatchedDetails.recipientName}</li>
                  <li><strong>Dispatched By:</strong> {document.dispatchedDetails.dispatchedBy}</li>
                  <li><strong>Date:</strong> {document.dispatchedDetails.dispatchedDate.toLocaleDateString()}</li>
               </ul>
             </div>
          )}

          {document.dispatchedDetails && (
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <h4 className="font-semibold text-gray-600 mb-2">Recipient Signature</h4>
                  <img src={document.dispatchedDetails.recipientSignature} alt="Recipient signature" className="rounded-lg border w-full"/>
               </div>
               <div>
                  <h4 className="font-semibold text-gray-600 mb-2">Proof of Delivery</h4>
                  <img src={document.dispatchedDetails.recipientPhoto} alt="Recipient photo" className="rounded-lg border w-full"/>
               </div>
            </div>
          )}

          <div className="md:col-span-2">
            <h4 className="font-semibold text-gray-600 mb-2">Status History</h4>
            <div className="border rounded-lg p-2">
              {document.statusHistory.slice().reverse().map((entry, index) => (
                <div key={index} className="flex items-start p-2 border-b last:border-b-0">
                  <div className="bg-brand-secondary text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-xs mr-3">{document.statusHistory.length - index}</div>
                  <div>
                    <p className="font-semibold">{entry.status}</p>
                    <p className="text-xs text-gray-500">{entry.timestamp.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 rounded-b-lg flex justify-end space-x-4 sticky bottom-0 z-10">
           {document.status !== DocumentStatus.Dispatched && document.status !== DocumentStatus.Archived && (
              <button
                onClick={() => onDispatch(document.id)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition"
              >
                Dispatch Document
              </button>
           )}
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailsModal;
