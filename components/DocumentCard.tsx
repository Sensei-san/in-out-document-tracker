
import React from 'react';
import { Document, DocumentStatus } from '../types';

interface DocumentCardProps {
  document: Document;
  onClick: () => void;
}

const statusColors: { [key in DocumentStatus]: string } = {
    [DocumentStatus.Received]: 'border-status-received',
    [DocumentStatus.SentForSigning]: 'border-status-signing',
    [DocumentStatus.ReturnedFromSigning]: 'border-blue-500',
    [DocumentStatus.Dispatched]: 'border-status-dispatched',
    [DocumentStatus.Archived]: 'border-status-archived',
};

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick }) => {
  const { subject, senderName, status, receivedDate, referenceNumber } = document;
  const borderColor = statusColors[status] || 'border-gray-300';

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer border-l-4 ${borderColor}`}
    >
      <div className="flex justify-between items-start">
        <h4 className="text-lg font-bold text-gray-800 truncate pr-2">{subject}</h4>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white bg-${borderColor.replace('border-', '')}`}>{status}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">From: {senderName}</p>
      <div className="flex justify-between items-end mt-2 text-xs text-gray-500">
        <span>Ref: {referenceNumber || 'N/A'}</span>
        <span>Received: {receivedDate.toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default DocumentCard;
