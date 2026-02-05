
import React, { useState, useRef, useMemo } from 'react';
import { Document, DocumentStatus, DispatchedDetails } from '../types';
import SignatureCanvas from './SignatureCanvas';
import CameraCapture from './CameraCapture';

interface BatchSigningProps {
  batch: Partial<Document>[];
  onSave: (batch: Partial<Document>[]) => void;
  onCancel: () => void;
}

interface RecipientGroup {
    recipientName: string;
    documents: Partial<Document>[];
    signature: string | null;
    photo: string | null;
    dispatchedBy: string;
    isSigned: boolean;
}

const BatchSigning: React.FC<BatchSigningProps> = ({ batch, onSave, onCancel }) => {
  const [groups, setGroups] = useState<RecipientGroup[]>(() => {
    const grouped = batch.reduce((acc: Record<string, Partial<Document>[]>, doc) => {
        const name = doc.senderName || 'Unknown Recipient';
        if (!acc[name]) acc[name] = [];
        acc[name].push(doc);
        return acc;
    }, {});

    return Object.entries(grouped).map(([name, docs]) => ({
        recipientName: name,
        documents: docs,
        signature: null,
        photo: null,
        dispatchedBy: '',
        isSigned: false
    }));
  });

  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const signatureCanvasRef = useRef<{ getSignature: () => string | null, clear: () => void }>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleGroupExpansion = (index: number) => {
    const next = new Set(expandedGroups);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedGroups(next);
  };

  const handleStartSigning = (index: number) => {
    setActiveGroupIndex(index);
    setError(null);
  };

  const handleCapturePhoto = (imageDataUrl: string) => {
    if (activeGroupIndex !== null) {
      const nextGroups = [...groups];
      nextGroups[activeGroupIndex].photo = imageDataUrl;
      setGroups(nextGroups);
    }
  };

  const confirmGroupSigning = () => {
    if (activeGroupIndex === null) return;
    
    const signature = signatureCanvasRef.current?.getSignature();
    const group = groups[activeGroupIndex];

    // photo is now optional
    if (!group.recipientName || !group.dispatchedBy || !signature) {
      setError('Please provide your name and capture a signature.');
      return;
    }

    const nextGroups = [...groups];
    nextGroups[activeGroupIndex] = {
      ...group,
      signature,
      isSigned: true
    };
    setGroups(nextGroups);
    setActiveGroupIndex(null);
    setError(null);
  };

  const handleFinalSave = () => {
    const allSignedDocs = groups.flatMap(group => {
      const dispatchDate = new Date();
      return group.documents.map(doc => ({
        ...doc,
        status: DocumentStatus.Dispatched,
        dispatchedDetails: group.isSigned ? {
          recipientName: group.recipientName,
          dispatchedBy: group.dispatchedBy,
          dispatchedDate: dispatchDate,
          recipientSignature: group.signature!,
          recipientPhoto: group.photo || '', // Use empty string if no photo taken
        } : null
      }));
    });

    onSave(allSignedDocs);
  };

  const allGroupsSigned = groups.every(g => g.isSigned);

  if (activeGroupIndex !== null) {
    const group = groups[activeGroupIndex];
    return (
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-brand-light">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign for Group: {group.recipientName}</h2>
        <p className="text-gray-600 mb-6">Dispatching {group.documents.length} document(s) to this recipient.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-2">Signer to Verify Documents:</h4>
                <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-xs text-gray-600">
                        <thead className="text-[10px] text-gray-400 uppercase">
                            <tr>
                                <th className="text-left py-1">Subject</th>
                                <th className="text-left py-1">Ref No</th>
                                <th className="text-left py-1">Division</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {group.documents.map((doc, idx) => (
                                <tr key={idx}>
                                    <td className="py-2 pr-2 font-medium text-gray-800">{doc.subject}</td>
                                    <td className="py-2 pr-2 text-gray-500">{doc.referenceNumber || 'N/A'}</td>
                                    <td className="py-2 text-gray-500">{doc.originatingDivision || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatcher Name (Your Name)</label>
                <input 
                  type="text" 
                  value={group.dispatchedBy} 
                  onChange={(e) => {
                    const next = [...groups];
                    next[activeGroupIndex].dispatchedBy = e.target.value;
                    setGroups(next);
                  }} 
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary" 
                  required 
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Signature</label>
              <SignatureCanvas ref={signatureCanvasRef} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photo Proof of Delivery <span className="text-xs font-normal text-gray-400 italic">(Optional)</span></label>
              <CameraCapture onCapture={handleCapturePhoto} />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setActiveGroupIndex(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors">Back to Groups</button>
            <button onClick={confirmGroupSigning} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded-lg shadow-lg transition-all active:scale-95">Confirm Group Signature</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Dispatch Grouping & Signing</h2>
            <p className="text-gray-500">Review documents grouped by recipient for efficient bulk signing.</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((group, index) => (
          <div key={index} className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-colors ${group.isSigned ? 'border-green-100 bg-green-50/10' : 'border-brand-light'}`}>
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-grow">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">{group.recipientName}</h3>
                    {group.isSigned ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            Signed
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full uppercase">Pending</span>
                    )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{group.documents.length} document(s) in this group.</p>
                <button 
                  onClick={() => toggleGroupExpansion(index)} 
                  className="text-brand-primary text-xs font-bold hover:underline mt-2 flex items-center"
                >
                  {expandedGroups.has(index) ? 'Hide Documents' : 'View Documents to Verify'}
                  <svg className={`ml-1 w-3 h-3 transition-transform ${expandedGroups.has(index) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
              <div className="flex-shrink-0">
                {group.isSigned ? (
                    <div className="flex items-center gap-3">
                         <img src={group.signature!} alt="Signature" className="h-10 w-20 object-contain border bg-white rounded p-1" />
                         <button onClick={() => handleStartSigning(index)} className="text-gray-400 hover:text-brand-primary text-xs font-semibold">Change</button>
                    </div>
                ) : (
                    <button 
                        onClick={() => handleStartSigning(index)} 
                        className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-lg shadow transition-all active:scale-95 flex items-center"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"/></svg>
                        Sign for Group
                    </button>
                )}
              </div>
            </div>
            
            {expandedGroups.has(index) && (
                <div className="bg-gray-50 px-6 py-4 border-t overflow-x-auto">
                    <table className="min-w-full text-sm text-gray-600">
                        <thead className="text-xs text-gray-400 uppercase">
                            <tr>
                                <th className="text-left py-2 pr-4">Subject</th>
                                <th className="text-left py-2 pr-4">Ref Number</th>
                                <th className="text-left py-2 pr-4">Recipient (Original)</th>
                                <th className="text-left py-2">Division Office</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {group.documents.map((doc, dIdx) => (
                                <tr key={dIdx}>
                                    <td className="py-2 pr-4 font-medium text-gray-800">{doc.subject}</td>
                                    <td className="py-2 pr-4 text-gray-500 font-mono">{doc.referenceNumber || '-'}</td>
                                    <td className="py-2 pr-4 text-gray-500">{doc.senderName || '-'}</td>
                                    <td className="py-2 text-gray-500">{doc.originatingDivision || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-500">
            {allGroupsSigned ? (
                <span className="text-green-600 font-bold flex items-center">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    All groups signed! Ready to complete.
                </span>
            ) : (
                <span>Signed {groups.filter(g => g.isSigned).length} of {groups.length} groups.</span>
            )}
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
            <button onClick={onCancel} className="bg-white border text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto">Cancel Batch</button>
            <button 
                onClick={handleFinalSave} 
                disabled={!allGroupsSigned}
                className={`font-bold py-3 px-10 rounded-lg shadow-lg transition-all w-full sm:w-auto ${allGroupsSigned ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse-slow' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
                Complete Batch Dispatch
            </button>
        </div>
      </div>
    </div>
  );
};

export default BatchSigning;
