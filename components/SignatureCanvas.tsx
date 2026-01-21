
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const SignatureCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const getMousePos = (canvas: HTMLCanvasElement, evt: MouseEvent | TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    const touch = (evt as TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (evt as MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (evt as MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getMousePos(canvasRef.current!, e.nativeEvent);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && lastPos.current) {
      const pos = getMousePos(canvas, e.nativeEvent);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useImperativeHandle(ref, () => ({
    getSignature: () => {
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    },
    clear: clearCanvas
  }));

  return (
    <div className="w-full aspect-video border border-gray-300 rounded-lg bg-gray-50 flex flex-col">
      <canvas
        ref={canvasRef}
        width="400"
        height="225"
        className="w-full h-full rounded-t-lg cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button 
        type="button" 
        onClick={clearCanvas} 
        className="bg-gray-200 text-xs text-gray-700 py-1 rounded-b-lg hover:bg-gray-300 transition-colors"
      >
        Clear Signature
      </button>
    </div>
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
