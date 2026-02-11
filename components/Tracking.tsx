
import React, { useMemo } from 'react';
import { Document, DocumentStatus } from '../types';

interface TrackingProps {
    documents: Document[];
    onBack: () => void;
}

const Tracking: React.FC<TrackingProps> = ({ documents, onBack }) => {
    const stats = useMemo(() => {
        const received = documents.filter(d => 
            d.statusHistory?.[0]?.status === DocumentStatus.Received
        ).length;
        
        const dispatched = documents.filter(d => 
            d.status === DocumentStatus.Dispatched
        ).length;

        const pendingSigning = documents.filter(d => 
            d.status === DocumentStatus.SentForSigning
        ).length;

        const archived = documents.filter(d => 
            d.status === DocumentStatus.Archived
        ).length;

        return { received, dispatched, pendingSigning, archived };
    }, [documents]);

    const activityData = useMemo(() => {
        const countsByDay: Record<string, number> = {};
        const now = new Date();
        
        // Count for last 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            countsByDay[d.toLocaleDateString()] = 0;
        }

        documents.forEach(doc => {
            const dateStr = doc.receivedDate.toLocaleDateString();
            if (countsByDay[dateStr] !== undefined) {
                countsByDay[dateStr]++;
            }
        });

        return Object.entries(countsByDay).reverse();
    }, [documents]);

    const streaks = useMemo(() => {
        let currentStreak = 0;
        const days = new Set(documents.map(d => d.receivedDate.toLocaleDateString()));
        // Fix: Explicitly type sort parameters (a, b) as strings to resolve inference issues on line 55.
        const sortedDays = Array.from(days).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
        
        if (sortedDays.length === 0) return 0;
        
        let checkDate = new Date();
        while (days.has(checkDate.toLocaleDateString())) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return currentStreak;
    }, [documents]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Tracking & Insights</h2>
                    <p className="text-gray-500">Live intelligence on document flow and office performance.</p>
                </div>
                <button 
                    onClick={onBack}
                    className="flex items-center text-brand-primary font-bold hover:underline"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    Back to Dashboard
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Received" value={stats.received} color="bg-blue-500" icon="📥" />
                <StatCard label="Total Dispatched" value={stats.dispatched} color="bg-green-500" icon="📤" />
                <StatCard label="Pending Signing" value={stats.pendingSigning} color="bg-yellow-500" icon="✍️" />
                <StatCard label="Current Streak" value={`${streaks} Days`} color="bg-purple-500" icon="🔥" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Graph */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-6">Volume Trend (Last 7 Days)</h3>
                    <div className="flex items-end justify-between h-48 px-2">
                        {activityData.map(([date, count]) => {
                            const max = Math.max(...activityData.map(d => d[1]), 1);
                            const height = `${(count / max) * 100}%`;
                            return (
                                <div key={date} className="flex flex-col items-center flex-1 group">
                                    <div className="relative w-full flex justify-center items-end h-full px-2">
                                        <div 
                                            style={{ height }} 
                                            className="w-full max-w-[40px] bg-brand-light group-hover:bg-brand-secondary transition-all rounded-t-md relative"
                                        >
                                            <div className="absolute -top-6 left-0 right-0 text-center text-xs font-bold text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                {count}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-2 rotate-45 sm:rotate-0 truncate max-w-[40px]">{date.split('/')[0]}/{date.split('/')[1]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Insights Panel */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Office Insights</h3>
                    <div className="space-y-4">
                        <InsightItem 
                            title="Busiest Day" 
                            value={activityData.reduce((a, b) => a[1] > b[1] ? a : b)[0]} 
                            desc="Highest document inflow this week."
                        />
                        <InsightItem 
                            title="Dispatch Ratio" 
                            value={`${((stats.dispatched / (stats.received || 1)) * 100).toFixed(0)}%`} 
                            desc="Efficiency of outgoing vs incoming."
                        />
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 mt-6">
                            <p className="text-sm font-bold text-purple-700 flex items-center">
                                <span className="mr-2">💡</span> Network Potential
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                                Connect other office devices to see live "Handover Tracking" between departments.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location Tracking */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-bold text-gray-700">Live Chain of Custody</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Handover</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {documents.slice(0, 10).map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{doc.subject}</div>
                                        <div className="text-xs text-gray-400">{doc.referenceNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {doc.status === DocumentStatus.Dispatched ? 'External Recipient' : (doc.signingOffice || 'Registry / Central Office')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {doc.statusHistory?.[doc.statusHistory.length - 1]?.timestamp.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                                            doc.status === DocumentStatus.Dispatched ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color, icon }: { label: string, value: any, color: string, icon: string }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-gray-200`}>
            {icon}
        </div>
    </div>
);

const InsightItem = ({ title, value, desc }: { title: string, value: string, desc: string }) => (
    <div className="p-4 rounded-xl hover:bg-gray-50 transition-colors">
        <div className="flex justify-between items-baseline">
            <h4 className="text-sm font-medium text-gray-500">{title}</h4>
            <span className="text-lg font-bold text-brand-primary">{value}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{desc}</p>
    </div>
);

export default Tracking;
