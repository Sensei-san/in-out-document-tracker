
import React, { useState, useRef, useEffect } from 'react';
import { AIConfig, CustomAIField, SpatialExample, TrainingRegion, BoundingBox } from '../types';

interface TrainAIProps {
    config: AIConfig;
    onSave: (config: AIConfig) => void;
    onBack: () => void;
}

const TrainAI: React.FC<TrainAIProps> = ({ config, onSave, onBack }) => {
    const [instructions, setInstructions] = useState(config.systemInstructions);
    const [fields, setFields] = useState<CustomAIField[]>(config.customFields);
    const [spatialExamples, setSpatialExamples] = useState<SpatialExample[]>(config.spatialExamples || []);
    
    // UI State
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldDesc, setNewFieldDesc] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    
    // Training State
    const [trainingImage, setTrainingImage] = useState<string | null>(null);
    const [activeRegions, setActiveRegions] = useState<TrainingRegion[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [selectedLabel, setSelectedLabel] = useState<string>('');
    
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const uploadRef = useRef<HTMLInputElement>(null);

    const addField = () => {
        if (!newFieldLabel) return;
        setFields([...fields, { 
            id: Date.now().toString(), 
            label: newFieldLabel, 
            description: newFieldDesc 
        }]);
        setNewFieldLabel('');
        setNewFieldDesc('');
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const handleSave = () => {
        onSave({
            systemInstructions: instructions,
            customFields: fields,
            spatialExamples: spatialExamples
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setTrainingImage(event.target!.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!trainingImage || !selectedLabel) return;
        const rect = containerRef.current!.getBoundingClientRect();
        setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setCurrentPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setIsDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const rect = containerRef.current!.getBoundingClientRect();
        setCurrentPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        
        const rect = containerRef.current!.getBoundingClientRect();
        const imgWidth = imageRef.current!.clientWidth;
        const imgHeight = imageRef.current!.clientHeight;
        
        // Normalize coordinates to 0-1000 for Gemini
        const xmin = Math.min(startPos.x, currentPos.x) / imgWidth * 1000;
        const ymin = Math.min(startPos.y, currentPos.y) / imgHeight * 1000;
        const xmax = Math.max(startPos.x, currentPos.x) / imgWidth * 1000;
        const ymax = Math.max(startPos.y, currentPos.y) / imgHeight * 1000;

        const newRegion: TrainingRegion = {
            label: selectedLabel,
            box: { 
                ymin: Math.round(ymin), 
                xmin: Math.round(xmin), 
                ymax: Math.round(ymax), 
                xmax: Math.round(xmax) 
            }
        };

        setActiveRegions([...activeRegions, newRegion]);
        setSelectedLabel('');
    };

    const saveSpatialExample = () => {
        if (!trainingImage || activeRegions.length === 0) return;
        const newExample: SpatialExample = {
            id: Date.now().toString(),
            imageData: trainingImage,
            regions: activeRegions
        };
        setSpatialExamples([...spatialExamples, newExample]);
        setTrainingImage(null);
        setActiveRegions([]);
    };

    const allFieldLabels = [
        'subject', 'senderName', 'referenceNumber', 'originatingDivision', 'letterDate',
        ...fields.map(f => f.label)
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Train AI Models</h2>
                    <p className="text-gray-500">Teach Gemini where to find data and how to behave in your specific office context.</p>
                </div>
                <button onClick={onBack} className="flex items-center text-brand-primary font-bold hover:underline">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    Back to Dashboard
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Instructions Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-lg font-bold text-gray-700 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Option 1: System Instructions
                        </label>
                        <textarea 
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            className="w-full h-32 p-4 bg-gray-50 border-gray-200 rounded-xl focus:ring-brand-primary focus:border-brand-primary text-sm"
                            placeholder="Rules: Always flag legal documents as high priority. Categorize documents by department..."
                        />
                    </div>

                    {/* Visual Training Workspace */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-lg font-bold text-gray-700 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Option 2: Visual Training (Spatial Awareness)
                        </label>
                        <p className="text-sm text-gray-500 mb-6">Upload an image and draw boxes over fields to show Gemini where specific data is located.</p>

                        {!trainingImage ? (
                            <div 
                                onClick={() => uploadRef.current?.click()}
                                className="border-4 border-dashed border-gray-100 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <span className="text-gray-400 font-medium mt-2">Upload Sample Document</span>
                                <input type="file" ref={uploadRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 bg-orange-50 p-3 rounded-xl border border-orange-100">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-bold text-orange-700 uppercase">Select Label to Draw</label>
                                        <select 
                                            value={selectedLabel} 
                                            onChange={(e) => setSelectedLabel(e.target.value)}
                                            className="w-full mt-1 bg-white border-orange-200 rounded-lg text-sm"
                                        >
                                            <option value="">-- Choose Field to Label --</option>
                                            {allFieldLabels.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div className="text-xs text-orange-600 font-medium">
                                        Click and drag on the image to define the region for the selected label.
                                    </div>
                                </div>

                                <div 
                                    ref={containerRef}
                                    className="relative cursor-crosshair overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-100"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                >
                                    <img 
                                        ref={imageRef}
                                        src={trainingImage} 
                                        alt="Training Workspace" 
                                        className="w-full h-auto select-none pointer-events-none" 
                                        onLoad={() => {}} // Could adjust canvas size here
                                    />
                                    
                                    {/* Existing Regions */}
                                    {activeRegions.map((region, idx) => {
                                        const { xmin, ymin, xmax, ymax } = region.box;
                                        return (
                                            <div 
                                                key={idx}
                                                className="absolute border-2 border-brand-primary bg-brand-primary/20 pointer-events-none flex items-start"
                                                style={{ 
                                                    left: `${xmin / 10}%`, 
                                                    top: `${ymin / 10}%`, 
                                                    width: `${(xmax - xmin) / 10}%`, 
                                                    height: `${(ymax - ymin) / 10}%` 
                                                }}
                                            >
                                                <span className="bg-brand-primary text-white text-[10px] px-1 font-bold rounded-br">{region.label}</span>
                                            </div>
                                        );
                                    })}

                                    {/* Current Drawing Box */}
                                    {isDrawing && (
                                        <div 
                                            className="absolute border-2 border-dashed border-orange-500 bg-orange-500/10 pointer-events-none"
                                            style={{ 
                                                left: Math.min(startPos.x, currentPos.x), 
                                                top: Math.min(startPos.y, currentPos.y), 
                                                width: Math.abs(currentPos.x - startPos.x), 
                                                height: Math.abs(currentPos.y - startPos.y) 
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="flex justify-between">
                                    <button onClick={() => setTrainingImage(null)} className="text-sm font-bold text-red-500 px-4 py-2 hover:bg-red-50 rounded-lg">Discard Image</button>
                                    <div className="space-x-2">
                                        <button onClick={() => setActiveRegions([])} className="text-sm font-bold text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">Clear All Boxes</button>
                                        <button onClick={saveSpatialExample} className="bg-brand-primary text-white font-bold px-6 py-2 rounded-lg shadow-md">Add to AI Memory</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Custom Fields (Moved to sidebar for space) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-4 uppercase">New Extraction Fields</label>
                        <div className="space-y-4">
                            <input type="text" placeholder="Label" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                            <input type="text" placeholder="Instruction for AI" value={newFieldDesc} onChange={e => setNewFieldDesc(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                            <button onClick={addField} className="w-full bg-blue-100 text-blue-700 py-2 rounded-lg font-bold text-xs">+ Define Field</button>
                        </div>
                        <div className="mt-6 space-y-2">
                            {fields.map(f => (
                                <div key={f.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-xs">
                                    <span className="font-bold">{f.label}</span>
                                    <button onClick={() => removeField(f.id)} className="text-red-400">Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active Examples List */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-4 uppercase">Active Visual Examples</label>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                            {spatialExamples.length === 0 && <p className="text-xs text-gray-400 italic">No spatial examples saved yet.</p>}
                            {spatialExamples.map(example => (
                                <div key={example.id} className="group relative border rounded-xl overflow-hidden shadow-sm">
                                    <img src={example.imageData} className="w-full h-20 object-cover opacity-60" />
                                    <div className="absolute inset-0 p-2 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
                                        <p className="text-[10px] text-white font-bold">{example.regions.length} Defined Regions</p>
                                    </div>
                                    <button 
                                        onClick={() => setSpatialExamples(spatialExamples.filter(e => e.id !== example.id))}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 ${
                            isSaved ? 'bg-green-500 text-white' : 'bg-brand-primary text-white hover:bg-brand-dark'
                        }`}
                    >
                        {isSaved ? 'AI Models Updated! ✅' : 'Deploy Training Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrainAI;
