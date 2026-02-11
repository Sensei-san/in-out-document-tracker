
import React, { useState, useRef } from 'react';
import { Document, DocumentStatus } from '../types';

interface ManualIncomingBatchFormProps {
    startMode?: 'manual' | 'scan' | 'select';
    onSave: (docs: Partial<Document>[]) => void;
    onCancel: () => void;
}

const ManualIncomingBatchForm: React.FC<ManualIncomingBatchFormProps> = ({ startMode, onSave, onCancel }) => {
    const [batch, setBatch] = useState<Partial<Document>[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleEdit = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setEditingIndex(index);
        // Add form logic here if used separately
    };

    const handleRemove = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to remove this document from the batch?')) {
            setBatch(prev => prev.filter((_, i) => i !== index));
        }
    };
    
    const renderListView = () => (
        <div className="w-full">
            {batch.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S/N</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {batch.map((doc, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{doc.subject}</td>
                                    <td className="px-4 py-2 text-sm">
                                        <div className="flex space-x-2">
                                            <button onClick={(e) => handleEdit(e, index)} className="text-blue-600">Edit</button>
                                            <button onClick={(e) => handleRemove(e, index)} className="text-red-600">Remove</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No documents in this batch yet.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Incoming Batch Manager</h2>
                <button onClick={onCancel} className="text-gray-500">Close</button>
            </div>
            {renderListView()}
            <div className="mt-8 flex justify-end space-x-4">
                <button onClick={onCancel} className="bg-gray-200 py-2 px-6 rounded-lg font-bold">Cancel</button>
                <button onClick={() => onSave(batch)} disabled={batch.length === 0} className="bg-brand-primary text-white py-2 px-6 rounded-lg font-bold disabled:bg-gray-400">Save Batch</button>
            </div>
        </div>
    );
};

export default ManualIncomingBatchForm;
