
import React, { useState, useMemo } from 'react';
import { Document, DocumentStatus } from '../types';

interface PrintLogsProps {
    documents: Document[];
    officeName: string;
    onBack: () => void;
}

const PrintLogs: React.FC<PrintLogsProps> = ({ documents, officeName, onBack }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [logType, setLogType] = useState<'incoming' | 'outgoing'>('incoming');

    const filteredDocs = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return documents.filter(doc => {
            const dateToCompare = logType === 'incoming' 
                ? doc.receivedDate 
                : (doc.dispatchedDetails?.dispatchedDate || doc.receivedDate);
            
            const isInRange = dateToCompare >= start && dateToCompare <= end;
            const isCorrectType = logType === 'incoming' 
                ? (doc.statusHistory?.[0]?.status === DocumentStatus.Received)
                : (doc.status === DocumentStatus.Dispatched || doc.status === DocumentStatus.Archived || doc.status === DocumentStatus.ReturnedFromSigning);

            return isInRange && isCorrectType;
        }).sort((a, b) => {
            const dateA = logType === 'incoming' ? a.receivedDate : (a.dispatchedDetails?.dispatchedDate || a.receivedDate);
            const dateB = logType === 'incoming' ? b.receivedDate : (b.dispatchedDetails?.dispatchedDate || b.receivedDate);
            return dateA.getTime() - dateB.getTime();
        });
    }, [documents, startDate, endDate, logType]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 print:m-0 print:max-w-none">
            {/* UI Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Print & Archive Logs</h2>
                    <p className="text-gray-500 dark:text-gray-400">Generate formal document registers for your physical files.</p>
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={onBack}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handlePrint}
                        disabled={filteredDocs.length === 0}
                        className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-dark transition-all disabled:bg-gray-400"
                    >
                        Print Register
                    </button>
                </div>
            </div>

            {/* Print Controls Sidebar & Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
                {/* Controls (Hidden on Print) */}
                <div className="space-y-6 print:hidden">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                            Filter Logs
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Log Type</label>
                                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setLogType('incoming')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${logType === 'incoming' ? 'bg-white dark:bg-gray-800 shadow text-brand-primary' : 'text-gray-500'}`}
                                    >
                                        Incoming
                                    </button>
                                    <button 
                                        onClick={() => setLogType('outgoing')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${logType === 'outgoing' ? 'bg-white dark:bg-gray-800 shadow text-brand-primary' : 'text-gray-500'}`}
                                    >
                                        Outgoing
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Start Date</label>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">End Date</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
                        <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                            Tip: Printing logs at the end of each day helps maintain a physical audit trail alongside your digital tracker.
                        </p>
                    </div>
                </div>

                {/* Print Preview Area */}
                <div className="lg:col-span-3 bg-white p-8 sm:p-12 shadow-2xl min-h-[1000px] border dark:border-gray-700 print:shadow-none print:border-none print:p-0 dark:bg-gray-800 transition-colors">
                    {/* Print Only Header */}
                    <div className="hidden print:block mb-8 text-center border-b-2 border-gray-800 pb-4">
                        <h1 className="text-2xl font-black uppercase tracking-widest">{officeName}</h1>
                        <h2 className="text-lg font-bold text-gray-600 uppercase mt-1">
                            Official {logType === 'incoming' ? 'Incoming' : 'Outgoing'} Document Register
                        </h2>
                        <p className="text-sm text-gray-500 mt-2 font-mono">
                            Period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Web Preview Header (Hidden on Print) */}
                    <div className="flex justify-between items-end mb-8 print:hidden">
                        <div>
                            <span className="text-xs font-black text-brand-primary uppercase tracking-tighter">Live Preview</span>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase">
                                {logType} Log: {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-gray-200 dark:text-gray-700">{filteredDocs.length}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Entries Found</p>
                        </div>
                    </div>

                    {filteredDocs.length > 0 ? (
                        <table className="w-full border-collapse border border-gray-800 dark:border-gray-600 text-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700 print:bg-gray-100">
                                    <th className="border border-gray-800 dark:border-gray-600 px-2 py-3 text-center w-10 font-bold uppercase text-[10px]">S/N</th>
                                    <th className="border border-gray-800 dark:border-gray-600 px-2 py-3 text-left w-24 font-bold uppercase text-[10px]">Date</th>
                                    <th className="border border-gray-800 dark:border-gray-600 px-3 py-3 text-left font-bold uppercase text-[10px]">Description / Subject</th>
                                    <th className="border border-gray-800 dark:border-gray-600 px-3 py-3 text-left w-32 font-bold uppercase text-[10px]">File / Ref No</th>
                                    <th className="border border-gray-800 dark:border-gray-600 px-3 py-3 text-left font-bold uppercase text-[10px]">
                                        {logType === 'incoming' ? 'From (Sender)' : 'To (Recipient)'}
                                    </th>
                                    <th className="border border-gray-800 dark:border-gray-600 px-3 py-3 text-center w-24 font-bold uppercase text-[10px]">Signature</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y border-gray-800">
                                {filteredDocs.map((doc, index) => (
                                    <tr key={doc.id} className="h-16">
                                        <td className="border border-gray-800 dark:border-gray-600 px-2 py-2 text-center font-mono">{index + 1}</td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-2 py-2 font-mono text-xs">
                                            {logType === 'incoming' 
                                                ? doc.receivedDate.toLocaleDateString() 
                                                : (doc.dispatchedDetails?.dispatchedDate || doc.receivedDate).toLocaleDateString()}
                                        </td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-3 py-2 font-bold text-gray-800 dark:text-gray-100">
                                            {doc.subject}
                                        </td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-3 py-2 text-xs font-mono text-gray-500">
                                            {doc.referenceNumber || '-'}
                                        </td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-3 py-2 font-medium">
                                            {logType === 'incoming' 
                                                ? doc.senderName 
                                                : (doc.dispatchedDetails?.recipientName || doc.senderName)}
                                        </td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-2 py-2 text-center">
                                            {logType === 'outgoing' && doc.dispatchedDetails?.recipientSignature ? (
                                                <img src={doc.dispatchedDetails.recipientSignature} alt="sig" className="h-10 w-auto mx-auto mix-blend-multiply dark:invert" />
                                            ) : (
                                                <div className="h-10 border-b border-dotted border-gray-300"></div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {/* Fill remaining space with empty rows for physical register aesthetic */}
                                {Array.from({ length: Math.max(0, 10 - filteredDocs.length) }).map((_, i) => (
                                    <tr key={`empty-${i}`} className="h-16 opacity-10 print:opacity-100">
                                        <td className="border border-gray-800 dark:border-gray-600 px-2 py-2 text-center text-gray-300">{filteredDocs.length + i + 1}</td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-2 py-2"></td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-3 py-2"></td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-3 py-2"></td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-3 py-2"></td>
                                        <td className="border border-gray-800 dark:border-gray-600 px-3 py-2"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-2xl border-gray-200 dark:border-gray-700">
                            <span className="text-4xl mb-4">📭</span>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No entries found for this range</p>
                        </div>
                    )}

                    {/* Print Footer */}
                    <div className="hidden print:grid grid-cols-2 mt-12 gap-12 text-center">
                        <div>
                            <div className="border-b border-gray-800 h-10 w-64 mx-auto"></div>
                            <p className="text-xs font-bold uppercase mt-2">Certified By (Registry Head)</p>
                        </div>
                        <div>
                            <div className="border-b border-gray-800 h-10 w-64 mx-auto"></div>
                            <p className="text-xs font-bold uppercase mt-2">Internal Audit / Verification</p>
                        </div>
                    </div>
                    <p className="hidden print:block text-[8px] text-gray-400 mt-20 text-center uppercase tracking-widest">
                        Generated via {officeName} Digital Document Tracker on {new Date().toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Print Styling */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; color: black !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .print\\:m-0 { margin: 0 !important; }
                    table { border-color: black !important; }
                    th, td { border-color: black !important; color: black !important; }
                    @page { margin: 1cm; }
                }
            `}} />
        </div>
    );
};

export default PrintLogs;
