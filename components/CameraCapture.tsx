
import React, { useState, useRef, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      // Use environment facing mode for better document scanning on mobile
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      setImage(null);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No camera detected on this device. Please use the upload option below.");
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please enable camera access in your browser settings.");
      } else {
        setError("Could not access camera. Please check your connection or use the upload option.");
      }
      setIsCameraOpen(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  const takePicture = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImage(dataUrl);
        onCapture(dataUrl);
      }
      stopCamera();
    }
  }, [onCapture, stopCamera]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);
        onCapture(dataUrl);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 aspect-video flex flex-col items-center justify-center transition-all hover:border-brand-primary group">
      {/* Hidden file input for fallback */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        capture="environment" // Triggers camera on mobile
        className="hidden" 
      />

      {error && (
        <div className="text-center mb-4 px-4">
          <p className="text-red-500 text-sm font-medium">{error}</p>
        </div>
      )}
      
      {isCameraOpen ? (
        <div className="w-full h-full relative">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-lg shadow-inner" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
            <button onClick={takePicture} className="bg-brand-primary text-white rounded-full p-4 shadow-xl hover:bg-brand-dark transition-transform active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button onClick={stopCamera} className="bg-white text-gray-700 rounded-full p-4 shadow-xl hover:bg-gray-100 transition-transform active:scale-95 border">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : image ? (
        <div className="w-full h-full relative group/image">
          <img src={image} alt="Captured" className="w-full h-full object-contain rounded-lg" />
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover/image:opacity-100 flex items-center justify-center transition-opacity rounded-lg space-x-4">
            <button onClick={startCamera} className="bg-white text-brand-primary font-bold py-2 px-4 rounded-lg shadow hover:bg-brand-light transition-colors">
              Retake
            </button>
            <button onClick={triggerFileSelect} className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-brand-dark transition-colors">
              Upload New
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={startCamera} 
              className="bg-brand-primary text-white font-bold py-3 px-6 rounded-xl flex items-center shadow-lg hover:bg-brand-dark hover:scale-105 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use Live Camera
            </button>
            
            <button 
              onClick={triggerFileSelect} 
              className="bg-white border-2 border-brand-primary text-brand-primary font-bold py-3 px-6 rounded-xl flex items-center shadow-md hover:bg-brand-light hover:scale-105 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose Image File
            </button>
          </div>
          <p className="text-gray-400 text-xs italic">Camera works best on mobile devices</p>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
