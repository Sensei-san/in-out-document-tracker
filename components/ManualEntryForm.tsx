
import React, { useState, useRef } from 'react';
import { Document, DocumentStatus, DispatchedDetails } from '../types';
import SignatureCanvas from './SignatureCanvas';

interface ManualEntryFormProps {
    onSave: (docs: Partial<Document>[]) => void;
    onCancel: () => void;
}

const ProgressIndicator = ({ steps, currentStep }: { steps: string[], currentStep: number }) => (
    <div className="flex items-center justify-center mb-8 w-full">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index + 1 <= currentStep ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              {index + 1}
            </div>
            <p className={`ml-2 hidden sm:block ${index + 1 === currentStep ? 'text-brand-primary font-bold' : 'text-gray-500'}`}>{step}</p>
          </div>
          {index < steps.length - 1 && <div className="flex-auto border-t-2 mx-4 border-gray-200"></div>}
        </React.Fragment>
      ))}
    </div>
);

const NavButton = ({ onClick, direction, text }: { onClick: () => void, direction: 'back' | 'next', text: string }) => (
    <button onClick={onClick} className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold rounded-lg transition-colors">
        {direction === 'back' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>}
        <span>{text}</span>
        {direction === 'next' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
    </button>
);

const ImagePicker = ({ image, onImageSelect }: {image: string | null, onImageSelect: (dataUrl: string) => void}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => onImageSelect(event.target!.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:border-brand-primary dark:hover:border-brand-primary transition-all group">
                {image ? (
                    <img src={image} alt="Document preview" className="w-full h-full object-contain rounded-lg" />
                ) : (
                    <div className="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 group-hover:text-brand-primary transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="mt-2 text-sm font-bold group-hover:text-brand-primary transition-colors">Add Document Photo</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Camera or Upload</span>
                    </div>
                )}
            </button>
        </div>
    );
};


const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onSave, onCancel }) => {
    const [step, setStep] = useState(1);
    const [docType, setDocType] = useState<'incoming' | 'outgoing'>('incoming');
    const [formData, setFormData] = useState<any>({});
    const [docImage, setDocImage] = useState<string | null>(null);
    const [batch, setBatch] = useState<any[]>([]);
    const signatureCanvasRef = useRef<{ getSignature: () => string | null, clear: () => void }>(null);

    const stepsConfig = {
        incoming: ['Enter Details', 'Confirm & Save'],
        outgoing: ['Enter Details', 'Confirm', 'Sign & Dispatch']
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);
    
    const handleSave = () => {
        if (docType === 'incoming') {
            const newDoc: Partial<Document> = {
                subject: formData.description,
                referenceNumber: formData.fileNo,
                senderName: formData.name,
                originatingDivision: formData.divisionOffice,
                deliveredBy: formData.deliveredBy,
                scannedDocument: docImage || '',
                status: DocumentStatus.Received,
            };
            onSave([newDoc]);
        } else {
             // Outgoing final save after signing
            const dispatchedDate = new Date();
            const recipientSignature = signatureCanvasRef.current?.getSignature();
            if(!recipientSignature) {
                alert("Signature is required.");
                return;
            }
            
            const docsToSave = [...batch, {...formData, docImage}].map(docData => {
                const dispatchDetails: DispatchedDetails = {
                  recipientName: docData.minutedTo,
                  dispatchedBy: formData.dispatchedBy, // from signing form
                  dispatchedDate: dispatchedDate,
                  recipientSignature,
                  recipientPhoto: docData.docImage || '',
                };
                return {
                    subject: docData.description,
                    referenceNumber: docData.fileNo,
                    senderName: docData.name,
                    status: DocumentStatus.Dispatched,
                    dispatchedDetails: dispatchDetails,
                    scannedDocument: docData.docImage || '',
                };
            });
            onSave(docsToSave);
        }
    };

    const handleAddMore = () => {
        setBatch(prev => [...prev, {...formData, docImage}]);
        setFormData({});
        setDocImage(null);
    };
    
    const renderDetailsStep = () => {
        const isIncoming = docType === 'incoming';
        const requiredFields = isIncoming 
            ? ['description', 'fileNo', 'name', 'divisionOffice', 'deliveredBy']
            : ['minutedTo', 'description', 'fileNo', 'name'];

        const isFormValid = requiredFields.every(field => formData[field]);

        return (
            <div className="w-full">
                <div className="flex justify-center mb-6">
                    <div className="relative bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex">
                        <button onClick={() => setDocType('incoming')} className={`px-6 py-2 text-sm font-bold rounded-full transition-colors ${isIncoming ? 'bg-white dark:bg-gray-800 shadow dark:text-brand-secondary' : 'text-gray-600 dark:text-gray-400'}`}>Incoming</button>
                        <button onClick={() => setDocType('outgoing')} className={`px-6 py-2 text-sm font-bold rounded-full transition-colors ${!isIncoming ? 'bg-white dark:bg-gray-800 shadow dark:text-brand-secondary' : 'text-gray-600 dark:text-gray-400'}`}>Outgoing</button>
                    </div>
                </div>

                <form className="space-y-4">
                    <ImagePicker image={docImage} onImageSelect={setDocImage} />
                    {isIncoming ? (
                        <>
                            <InputField label="Description" name="description" value={formData.description || ''} onChange={setFormData} />
                            <InputField label="File No" name="fileNo" value={formData.fileNo || ''} onChange={setFormData} />
                            <InputField label="Name" name="name" value={formData.name || ''} onChange={setFormData} />
                            <InputField label="Division Office" name="divisionOffice" value={formData.divisionOffice || ''} onChange={setFormData} />
                            <InputField label="Delivered By" name="deliveredBy" value={formData.deliveredBy || ''} onChange={setFormData} />
                        </>
                    ) : (
                         <>
                            <InputField label="Minuted To Whom" name="minutedTo" value={formData.minutedTo || ''} onChange={setFormData} />
                            <InputField label="Description" name="description" value={formData.description || ''} onChange={setFormData} />
                            <InputField label="File No" name="fileNo" value={formData.fileNo || ''} onChange={setFormData} />
                            <InputField label="Name (Author)" name="name" value={formData.name || ''} onChange={setFormData} />
                        </>
                    )}
                </form>
                
                <div className="flex justify-between mt-8">
                    <NavButton onClick={onCancel} direction="back" text="Back to Methods" />
                    <button onClick={handleNext} disabled={!isFormValid} className="flex items-center space-x-2 px-6 py-2 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md">
                        <span>Next</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
            </div>
        );
    };
    
    const renderConfirmStep = () => {
        const currentData = {...formData, docImage};
        const allData = docType === 'outgoing' ? [...batch, currentData] : [currentData];
        return (
             <div className="w-full">
                <h3 className="text-xl font-bold text-center mb-4 dark:text-gray-100">Review Your Details</h3>
                <div className="max-h-96 overflow-y-auto space-y-4 bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg border dark:border-gray-700">
                    {allData.map((data, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded shadow border dark:border-gray-700">
                           {docType === 'outgoing' && <p className="font-bold mb-4 dark:text-brand-secondary border-b dark:border-gray-700 pb-2 uppercase text-xs tracking-widest">Document {index + 1}</p>}
                           <DetailView data={data} type={docType} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-8">
                    <NavButton onClick={handleBack} direction="back" text="Back" />
                     <div className="flex space-x-4">
                        {docType === 'incoming' ? (
                            <button onClick={handleSave} className="px-8 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all active:scale-95">Done</button>
                        ) : (
                            <>
                                <button onClick={handleAddMore} className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold rounded-lg transition-colors border dark:border-blue-800/50">Add More to List</button>
                                <button onClick={handleNext} className="px-6 py-2 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-lg shadow-md transition-all active:scale-95">Continue to Signing</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    };
    
    const renderSigningStep = () => (
        <div className="w-full">
             <h3 className="text-xl font-bold text-center mb-4 dark:text-gray-100">Sign & Dispatch</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                     <InputField label="Recipient Name" name="recipientName" value={formData.recipientName || ''} onChange={setFormData} />
                     <InputField label="Dispatched By (Your Name)" name="dispatchedBy" value={formData.dispatchedBy || ''} onChange={setFormData} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Recipient Signature</label>
                    <SignatureCanvas ref={signatureCanvasRef} />
                </div>
            </div>
            <div className="flex justify-between mt-8">
                <NavButton onClick={handleBack} direction="back" text="Back" />
                <button onClick={handleSave} disabled={!formData.recipientName || !formData.dispatchedBy} className="px-8 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 disabled:bg-gray-400">Done</button>
            </div>
        </div>
    );

    const renderStep = () => {
        const currentStepName = stepsConfig[docType][step - 1];
        switch(currentStepName) {
            case 'Enter Details': return renderDetailsStep();
            case 'Confirm & Save':
            case 'Confirm': return renderConfirmStep();
            case 'Sign & Dispatch': return renderSigningStep();
            default: return <div>Unknown Step</div>;
        }
    }

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg shadow-lg border dark:border-gray-700 transition-colors">
             <div className="flex items-center mb-6">
                <button onClick={step === 1 ? onCancel : handleBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Enter Document Manually</h2>
            </div>
            <ProgressIndicator steps={stepsConfig[docType]} currentStep={step} />
            {renderStep()}
        </div>
    )
};

const InputField = ({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: React.Dispatch<any> }) => (
    <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
        <input 
            type="text" 
            name={name} 
            value={value} 
            placeholder={`Enter ${label}...`}
            onChange={e => onChange((prev:any) => ({...prev, [name]: e.target.value}))} 
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-3 border outline-none transition-colors" 
            required 
        />
    </div>
);

const DetailView = ({ data, type }: { data: any, type: 'incoming' | 'outgoing' }) => (
    <div className="text-sm space-y-2">
        {data.docImage && (
            <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded border dark:border-gray-700 mb-4">
                <img src={data.docImage} className="max-h-48 rounded mx-auto object-contain" />
            </div>
        )}
        {type === 'incoming' ? (
            <div className="grid grid-cols-1 gap-2">
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">Description:</strong> <span className="dark:text-gray-100 font-semibold">{data.description}</span></p>
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">File No:</strong> <span className="dark:text-gray-100 font-mono">{data.fileNo}</span></p>
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">Name:</strong> <span className="dark:text-gray-100 font-bold">{data.name}</span></p>
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">Division Office:</strong> <span className="dark:text-gray-100">{data.divisionOffice}</span></p>
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">Delivered By:</strong> <span className="dark:text-gray-100 italic">{data.deliveredBy}</span></p>
            </div>
        ) : (
             <div className="grid grid-cols-1 gap-2">
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">Minuted To:</strong> <span className="dark:text-gray-100 font-bold text-brand-primary dark:text-brand-secondary">{data.minutedTo}</span></p>
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">Description:</strong> <span className="dark:text-gray-100 font-semibold">{data.description}</span></p>
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">File No:</strong> <span className="dark:text-gray-100 font-mono">{data.fileNo}</span></p>
                <p><strong className="text-gray-500 dark:text-gray-400 uppercase text-[10px]">Author Name:</strong> <span className="dark:text-gray-100">{data.name}</span></p>
            </div>
        )}
    </div>
);

export default ManualEntryForm;
