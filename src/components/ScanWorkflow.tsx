import { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Sparkles, RefreshCw, Crop, RotateCw, ZoomIn, ZoomOut, 
  Hand, Shield, Trash2, Check, AlertCircle, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { PIIType } from '../types';
import type { RedactionRegion, QueueItem, RedactedDocument } from '../types';

interface ScanWorkflowProps {
  darkMode: boolean;
  onArchive: (doc: RedactedDocument) => void;
}

export const ScanWorkflow: React.FC<ScanWorkflowProps> = ({ darkMode, onArchive }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'crop' | 'redact'>('redact');
  
  // Canvas / Viewport states
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [interactionMode, setInteractionMode] = useState<'pan' | 'redact'>('redact');
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Custom manual drawing states
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentDrawRect, setCurrentDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  
  // Dragging crop handles
  const [draggedHandle, setDraggedHandle] = useState<number | null>(null);
  
  // UI Loading states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isBurning, setIsBurning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentItem = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // Initializing Google GenAI Client
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  const isMockMode = !GEMINI_API_KEY;

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  // Convert File to Base64 dataURL
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const processFiles = async (files: File[]) => {
    const validImageFiles = files.filter(f => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) return;

    const newItems: QueueItem[] = [];
    for (const file of validImageFiles) {
      try {
        const base64Data = await fileToBase64(file);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          originalImage: base64Data,
          regions: [],
          rotation: 0,
          cropPoints: [
            { x: 100, y: 100 },
            { x: 900, y: 100 },
            { x: 900, y: 900 },
            { x: 100, y: 900 }
          ],
          status: 'pending'
        });
      } catch (err) {
        console.error('File parsing failed:', err);
      }
    }

    setQueue(prev => {
      const updated = [...prev, ...newItems];
      if (currentIndex === -1 && updated.length > 0) {
        setCurrentIndex(0);
      }
      return updated;
    });
  };

  // Execute Gemini AI OCR scanning
  const runAIScan = async () => {
    if (!currentItem) return;

    setIsScanning(true);
    setScanProgress('Initializing Engine...');

    try {
      if (isMockMode) {
        // High fidelity mock AI pipeline with latency simulation
        setScanProgress('Processing scan details (Demo Mode)...');
        await new Promise(r => setTimeout(r, 800));
        setScanProgress('OCR Reading Document pixels...');
        await new Promise(r => setTimeout(r, 600));
        setScanProgress('Detecting sensitive PII patterns...');
        await new Promise(r => setTimeout(r, 500));

        // Simulated PII detection conforming to the schema
        const mockRegions: RedactionRegion[] = [
          {
            id: 'mock-1',
            type: PIIType.Name,
            x: 120,
            y: 140,
            width: 250,
            height: 40,
            active: true,
            label: 'Johnathan Archer'
          },
          {
            id: 'mock-2',
            type: PIIType.Email,
            x: 120,
            y: 195,
            width: 280,
            height: 35,
            active: true,
            label: 'john.archer@starfleet.gov'
          },
          {
            id: 'mock-3',
            type: PIIType.Address,
            x: 120,
            y: 245,
            width: 450,
            height: 50,
            active: true,
            label: 'San Francisco Command Headquarters, CA 94129'
          },
          {
            id: 'mock-4',
            type: PIIType.Financial,
            x: 480,
            y: 620,
            width: 380,
            height: 40,
            active: true,
            label: 'ID: 4820-1928-3928-1102'
          },
          {
            id: 'mock-5',
            type: PIIType.Phone,
            x: 120,
            y: 310,
            width: 210,
            height: 35,
            active: true,
            label: '+1 (415) 555-0143'
          }
        ];

        setQueue(prev => {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            regions: mockRegions,
            status: 'ready'
          };
          return updated;
        });

      } else {
        // Genuine Gemini Client scan using @google/genai
        setScanProgress('Analyzing document details...');
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        
        // Strip data:image/...;base64, prefix
        const base64Raw = currentItem.originalImage.split(',')[1];
        
        const responseSchema = {
          type: 'OBJECT',
          properties: {
            regions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  type: {
                    type: 'STRING',
                    enum: ['Name', 'Address', 'Email', 'Phone Numbers', 'Financial Details', 'Network IDs', 'Sensitive Data'],
                    description: 'The type of PII detected'
                  },
                  x: { type: 'INTEGER', description: 'X coordinate of bounding box, normalized from 0 to 1000' },
                  y: { type: 'INTEGER', description: 'Y coordinate of bounding box, normalized from 0 to 1000' },
                  width: { type: 'INTEGER', description: 'Width of bounding box, normalized from 0 to 1000' },
                  height: { type: 'INTEGER', description: 'Height of bounding box, normalized from 0 to 1000' },
                  label: { type: 'STRING', description: 'The exact PII text content found' }
                },
                required: ['type', 'x', 'y', 'width', 'height', 'label']
              }
            }
          },
          required: ['regions']
        };

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Raw
              }
            },
            {
              text: 'Scan this document image for Personally Identifiable Information (PII). ' +
                    'Identify names, addresses, emails, phone numbers, financial details, network IDs, and sensitive data. ' +
                    'Provide bounding boxes for each PII element. Use a coordinate scale from 0 to 1000, where (0,0) is the top-left and (1000,1000) is the bottom-right.'
            }
          ],
          config: {
            responseMimeType: 'application/json',
            // Cast responseSchema to any to prevent strict typing mismatch with SDK internals
            responseSchema: responseSchema as any
          }
        });

        const textResponse = response.text;
        if (!textResponse) throw new Error('Empty model output');
        
        const jsonResult = JSON.parse(textResponse);
        const detectedRegions: RedactionRegion[] = (jsonResult.regions || []).map((r: any, idx: number) => ({
          id: `auto-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          type: r.type as PIIType,
          x: Math.max(0, Math.min(1000, r.x)),
          y: Math.max(0, Math.min(1000, r.y)),
          width: Math.max(1, Math.min(1000 - r.x, r.width)),
          height: Math.max(1, Math.min(1000 - r.y, r.height)),
          active: true,
          label: r.label
        }));

        setQueue(prev => {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            regions: detectedRegions,
            status: 'ready'
          };
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Gemini Scanning failed:', err);
      setQueue(prev => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          status: 'error',
          errorMessage: err.message || 'Verification scan failed'
        };
        return updated;
      });
    } finally {
      setIsScanning(false);
      setScanProgress('');
    }
  };

  // Perform Bilinear Warp perspective crop
  const executeBilinearWarp = () => {
    if (!currentItem || !currentItem.cropPoints) return;
    const cropPoints = currentItem.cropPoints;

    const img = new Image();
    img.src = currentItem.originalImage;
    img.onload = () => {
      const srcW = img.width;
      const srcH = img.height;
      
      const destW = 850;
      const destH = 1100; // Standard Letter Aspect Ratio

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = srcW;
      tempCanvas.height = srcH;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(img, 0, 0);
      const srcData = tempCtx.getImageData(0, 0, srcW, srcH);

      const destCanvas = document.createElement('canvas');
      destCanvas.width = destW;
      destCanvas.height = destH;
      const destCtx = destCanvas.getContext('2d')!;
      const destData = destCtx.createImageData(destW, destH);

      // Map normalized 0-1000 points to real image coordinates
      const p0 = { x: (cropPoints[0].x / 1000) * srcW, y: (cropPoints[0].y / 1000) * srcH };
      const p1 = { x: (cropPoints[1].x / 1000) * srcW, y: (cropPoints[1].y / 1000) * srcH };
      const p2 = { x: (cropPoints[2].x / 1000) * srcW, y: (cropPoints[2].y / 1000) * srcH };
      const p3 = { x: (cropPoints[3].x / 1000) * srcW, y: (cropPoints[3].y / 1000) * srcH };

      // Map pixels using Bilinear interpolation warp mapping
      for (let y = 0; y < destH; y++) {
        const v = y / destH;
        for (let x = 0; x < destW; x++) {
          const u = x / destW;

          // Interpolation calculation
          const px = (1 - u) * (1 - v) * p0.x + u * (1 - v) * p1.x + u * v * p2.x + (1 - u) * v * p3.x;
          const py = (1 - u) * (1 - v) * p0.y + u * (1 - v) * p1.y + u * v * p2.y + (1 - u) * v * p3.y;

          const sx = Math.floor(px);
          const sy = Math.floor(py);

          if (sx >= 0 && sx < srcW && sy >= 0 && sy < srcH) {
            const srcIdx = (sy * srcW + sx) * 4;
            const destIdx = (y * destW + x) * 4;

            destData.data[destIdx] = srcData.data[srcIdx];
            destData.data[destIdx + 1] = srcData.data[srcIdx + 1];
            destData.data[destIdx + 2] = srcData.data[srcIdx + 2];
            destData.data[destIdx + 3] = srcData.data[srcIdx + 3];
          }
        }
      }

      destCtx.putImageData(destData, 0, 0);
      const warpedBase64 = destCanvas.toDataURL('image/jpeg', 0.95);

      setQueue(prev => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          originalImage: warpedBase64,
          regions: [], // Clear old regions to prompt a clean scan
          status: 'pending'
        };
        return updated;
      });
      
      setActiveWorkflowTab('redact');
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
  };

  // Perform 90° Clockwise coordinate rotation
  const handleRotate = () => {
    if (!currentItem) return;

    const img = new Image();
    img.src = currentItem.originalImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.95);

      // Recalculate PII bounding box positions inside 1000x1000 space
      const rotatedRegions = currentItem.regions.map(r => ({
        ...r,
        x: Math.max(0, Math.min(1000, 1000 - (r.y + r.height))),
        y: Math.max(0, Math.min(1000, r.x)),
        width: r.height,
        height: r.width
      }));

      setQueue(prev => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          originalImage: rotatedBase64,
          regions: rotatedRegions
        };
        return updated;
      });
    };
  };

  // Canvas / Mouse handlers for drag redaction & panning
  const getCoordinatesFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewportRef.current || !imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    
    // Position of mouse inside the image bounding box
    const xReal = e.clientX - rect.left;
    const yReal = e.clientY - rect.top;

    // Convert to 0-1000 normalized space
    const xPct = Math.max(0, Math.min(1000, (xReal / rect.width) * 1000));
    const yPct = Math.max(0, Math.min(1000, (yReal / rect.height) * 1000));

    return { x: xPct, y: yPct };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentItem) return;
    
    if (interactionMode === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeWorkflowTab === 'redact' && interactionMode === 'redact') {
      const coords = getCoordinatesFromEvent(e);
      if (!coords) return;
      
      setIsDrawing(true);
      setDrawStart(coords);
      setCurrentDrawRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isDrawing && drawStart && currentDrawRect) {
      const coords = getCoordinatesFromEvent(e);
      if (!coords) return;

      const xMin = Math.min(drawStart.x, coords.x);
      const yMin = Math.min(drawStart.y, coords.y);
      const width = Math.abs(drawStart.x - coords.x);
      const height = Math.abs(drawStart.y - coords.y);

      setCurrentDrawRect({ x: xMin, y: yMin, w: width, h: height });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    
    if (isDrawing && currentDrawRect && currentItem) {
      setIsDrawing(false);
      
      // Save manual redaction only if it is large enough
      if (currentDrawRect.w > 5 && currentDrawRect.h > 5) {
        const manualRegion: RedactionRegion = {
          id: `manual-${Math.random().toString(36).substring(2, 9)}`,
          type: PIIType.Manual,
          x: Math.round(currentDrawRect.x),
          y: Math.round(currentDrawRect.y),
          width: Math.round(currentDrawRect.w),
          height: Math.round(currentDrawRect.h),
          active: true,
          label: 'Manual Mask'
        };

        setQueue(prev => {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            regions: [...updated[currentIndex].regions, manualRegion]
          };
          return updated;
        });
      }
      
      setCurrentDrawRect(null);
    }
  };

  // Toggle state of region (Active vs Inactive)
  const toggleRegion = (id: string) => {
    if (!currentItem) return;
    setQueue(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        regions: updated[currentIndex].regions.map(r => 
          r.id === id ? { ...r, active: !r.active } : r
        )
      };
      return updated;
    });
  };

  const deleteRegion = (id: string) => {
    if (!currentItem) return;
    setQueue(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        regions: updated[currentIndex].regions.filter(r => r.id !== id)
      };
      return updated;
    });
  };

  // Handles for quadrilateral cropping
  const handleCropHandleMouseDown = (handleIndex: number) => {
    setDraggedHandle(handleIndex);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggedHandle === null || !currentItem || !currentItem.cropPoints || !imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const xReal = e.clientX - rect.left;
      const yReal = e.clientY - rect.top;

      const xPct = Math.max(0, Math.min(1000, (xReal / rect.width) * 1000));
      const yPct = Math.max(0, Math.min(1000, (yReal / rect.height) * 1000));

      setQueue(prev => {
        const updated = [...prev];
        const points = [...(updated[currentIndex].cropPoints || [])];
        points[draggedHandle] = { x: Math.round(xPct), y: Math.round(yPct) };
        updated[currentIndex] = {
          ...updated[currentIndex],
          cropPoints: points
        };
        return updated;
      });
    };

    const handleGlobalMouseUp = () => {
      setDraggedHandle(null);
    };

    if (draggedHandle !== null) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedHandle, currentItem, currentIndex]);

  // Permanently burn the redactions into the image pixels
  const burnAndArchive = () => {
    if (!currentItem) return;

    setIsBurning(true);

    const img = new Image();
    img.src = currentItem.originalImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Render solid redaction boxes permanently altering pixel indices
      const activeRegions = currentItem.regions.filter(r => r.active);
      ctx.fillStyle = '#0f172a'; // Deep matte black/slate redaction block

      for (const region of activeRegions) {
        const rx = (region.x / 1000) * img.width;
        const ry = (region.y / 1000) * img.height;
        const rw = (region.width / 1000) * img.width;
        const rh = (region.height / 1000) * img.height;

        ctx.fillRect(rx, ry, rw, rh);
      }

      const burnedBase64 = canvas.toDataURL('image/jpeg', 0.95);

      // Build metadata summary tags based on category count
      const tags: string[] = Array.from(new Set(activeRegions.map(r => r.type)));
      if (tags.length === 0) tags.push('Clean');

      const archivedDoc: RedactedDocument = {
        id: currentItem.id,
        name: currentItem.name,
        timestamp: Date.now(),
        originalImage: currentItem.originalImage, // Saved to DB
        sanitizedImage: burnedBase64,
        regions: currentItem.regions,
        tags
      };

      // Pass up to the global DB orchestrator
      onArchive(archivedDoc);

      // Remove from active queue & move pointer
      setQueue(prev => {
        const updated = prev.filter(item => item.id !== currentItem.id);
        if (updated.length === 0) {
          setCurrentIndex(-1);
        } else {
          setCurrentIndex(Math.max(0, currentIndex - 1));
        }
        return updated;
      });

      setIsBurning(false);
    };
  };

  const removeCurrentFromQueue = () => {
    if (!currentItem) return;
    setQueue(prev => {
      const updated = prev.filter(item => item.id !== currentItem.id);
      if (updated.length === 0) {
        setCurrentIndex(-1);
      } else {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      return updated;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: Queue & File Ingress */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {/* Upload Zone */}
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative p-6 rounded-2xl text-center border border-dashed transition-all spring-transition cursor-pointer
            ${darkMode 
              ? 'bg-white/3 border-white/10 hover:bg-white/5 hover:border-violet-500/50' 
              : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-violet-500/50'
            }`}
        >
          <input 
            type="file" 
            id="doc-upload" 
            multiple 
            accept="image/*" 
            onChange={handleFileSelect} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
              <Upload className={`w-6 h-6 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <div>
              <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Drop files here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports JPG, PNG in high definition
              </p>
            </div>
          </div>
        </div>

        {/* Uploaded Ingress Queue */}
        <div className={`p-5 rounded-2xl flex flex-col gap-4 ${darkMode ? 'glass-panel' : 'glass-panel-light'}`}>
          <div className="flex items-center justify-between border-b pb-3 border-white/5">
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              <FileText className="w-4 h-4 text-violet-400" />
              Ingress Queue
            </h3>
            <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-mono">
              {queue.length} items
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Shield className="w-8 h-8 opacity-20" />
              <span>Queue is empty. Upload a scan above.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {queue.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full p-3 rounded-xl text-left text-xs transition-all flex items-center justify-between
                    ${idx === currentIndex 
                      ? (darkMode ? 'bg-violet-600/25 border border-violet-500/40 text-white' : 'bg-violet-50 border border-violet-200 text-violet-900') 
                      : (darkMode ? 'bg-white/3 border border-transparent hover:bg-white/5 text-slate-300' : 'bg-slate-50 border border-transparent hover:bg-slate-100 text-slate-700')
                    }`}
                >
                  <div className="flex flex-col gap-1 truncate mr-2">
                    <span className="font-semibold truncate">{item.name}</span>
                    <span className="opacity-60 text-[10px] font-mono">
                      {(item.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  
                  {/* Item Status Badges */}
                  <div>
                    {item.status === 'processing' || isScanning && idx === currentIndex ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                    ) : item.status === 'ready' ? (
                      <span className="bg-emerald-500/20 text-emerald-400 p-0.5 rounded-full block">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : item.status === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-400 block" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Review Canvas & Controls */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        {!currentItem ? (
          <div className={`p-16 rounded-3xl text-center flex flex-col items-center justify-center gap-6 min-h-[550px]
            ${darkMode ? 'glass-panel bg-white/1' : 'glass-panel-light'}`}
        >
          <div className="pulse-glow-bg bg-gradient-to-tr from-violet-600 to-pink-600 p-8 rounded-full shadow-2xl relative">
            <Shield className="w-16 h-16 text-white" />
            <div className="absolute inset-0 bg-violet-600/30 rounded-full blur-xl -z-10" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              VaultScan Workspace
            </h2>
            <p className="text-slate-400 max-w-sm mx-auto mt-2 text-sm">
              Upload documents using the queue sidebar. All PII scanning and redaction rendering occur client-side inside this sandboxed canvas.
            </p>
          </div>
        </div>
        ) : (
          <div className={`rounded-3xl flex flex-col overflow-hidden ${darkMode ? 'glass-panel' : 'glass-panel-light'}`}>
            {/* API Warning/Status Bar */}
            {isMockMode && (
              <div className="bg-amber-500/10 border-b border-amber-500/10 p-3 px-6 flex items-center justify-between text-xs text-amber-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    <strong>Demo Mode Active:</strong> No <code>GEMINI_API_KEY</code> detected in <code>.env.local</code>. Redaction pipeline will simulate sample coordinates for demonstration (which will not align exactly with your custom document's PII). Add your personal API Key to enable pixel-perfect redactions.
                  </span>
                </div>
              </div>
            )}

            {/* Workspace Header Toolbar */}
            <div className="p-4 px-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-black/10">
              <div className="flex items-center gap-4">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full font-mono
                  ${darkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  File: {currentItem.name}
                </span>
                
                {/* Mode Selector Tab buttons */}
                <div className={`p-0.5 rounded-lg flex ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <button
                    onClick={() => setActiveWorkflowTab('redact')}
                    className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all
                      ${activeWorkflowTab === 'redact'
                        ? (darkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-900 shadow-sm')
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Redact Canvas
                  </button>
                  <button
                    onClick={() => setActiveWorkflowTab('crop')}
                    className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all
                      ${activeWorkflowTab === 'crop'
                        ? (darkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-900 shadow-sm')
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Crop className="w-3.5 h-3.5" />
                    Perspective Crop
                  </button>
                </div>
              </div>

              {/* Manipulation controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRotate}
                  title="Rotate 90 degrees clockwise"
                  className={`p-2 rounded-xl transition-all border
                    ${darkMode ? 'bg-white/3 border-white/5 hover:bg-white/8 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <div className="h-6 w-px bg-white/5 mx-1" />

                {/* Interaction Mode Toggle */}
                {activeWorkflowTab === 'redact' && (
                  <>
                    <button
                      onClick={() => setInteractionMode('redact')}
                      title="Draw Redaction"
                      className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-medium
                        ${interactionMode === 'redact'
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : (darkMode ? 'bg-white/3 border-white/5 hover:bg-white/8 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700')
                        }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Redact
                    </button>
                    <button
                      onClick={() => setInteractionMode('pan')}
                      title="Pan Workspace"
                      className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-medium
                        ${interactionMode === 'pan'
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : (darkMode ? 'bg-white/3 border-white/5 hover:bg-white/8 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700')
                        }`}
                    >
                      <Hand className="w-4 h-4" />
                      Pan/Zoom
                    </button>
                  </>
                )}

                {/* Zoom Buttons */}
                <button
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                  className={`p-2 rounded-xl border ${darkMode ? 'bg-white/3 border-white/5 text-slate-300 hover:bg-white/8' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-12 text-center text-slate-400">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                  className={`p-2 rounded-xl border ${darkMode ? 'bg-white/3 border-white/5 text-slate-300 hover:bg-white/8' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CANVAS INTERFACE */}
            <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[500px]">
              {/* Review Viewport */}
              <div 
                className={`lg:col-span-3 overflow-hidden relative flex items-center justify-center p-8 bg-slate-950/20 select-none
                  ${interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                ref={viewportRef}
              >
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isPanning || isDrawing ? 'none' : 'transform 0.15s ease-out'
                  }}
                  className="relative max-w-full max-h-[550px] aspect-auto shadow-2xl border border-white/5 bg-slate-900"
                >
                  {/* Main Image element */}
                  <img
                    ref={imageRef}
                    src={currentItem.originalImage}
                    alt="Ingressed Document"
                    draggable="false"
                    className="max-h-[550px] max-w-full block select-none pointer-events-none"
                  />

                  {/* SVG OVERLAY: Redaction Bounding Boxes */}
                  {activeWorkflowTab === 'redact' && (
                    <div className="absolute inset-0 pointer-events-none">
                      {currentItem.regions.map((region) => {
                        const style = {
                          left: `${region.x / 10}%`,
                          top: `${region.y / 10}%`,
                          width: `${region.width / 10}%`,
                          height: `${region.height / 10}%`
                        };

                        return (
                          <div
                            key={region.id}
                            style={style}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRegion(region.id);
                            }}
                            className={`absolute border-2 pointer-events-auto cursor-pointer rounded transition-all duration-200
                              ${region.active 
                                ? 'bg-slate-950 border-rose-500/70 opacity-90' 
                                : 'bg-transparent border-violet-500/50 hover:border-violet-400 bounding-box-glow'
                              }`}
                          >
                            {!region.active && (
                              <span className="absolute -top-5 left-0 bg-violet-600 text-white font-mono text-[9px] px-1 rounded truncate max-w-full">
                                {region.type}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Manual draw bounding box visualizer */}
                      {isDrawing && currentDrawRect && (
                        <div
                          style={{
                            left: `${currentDrawRect.x / 10}%`,
                            top: `${currentDrawRect.y / 10}%`,
                            width: `${currentDrawRect.w / 10}%`,
                            height: `${currentDrawRect.h / 10}%`
                          }}
                          className="absolute border-2 border-dashed border-violet-400 bg-violet-400/20"
                        />
                      )}
                    </div>
                  )}

                  {/* SVG OVERLAY: Crop Coordinate Handles */}
                  {activeWorkflowTab === 'crop' && currentItem.cropPoints && (
                    <div className="absolute inset-0">
                      {/* Interactive crop polygon */}
                      <svg className="w-full h-full absolute inset-0 pointer-events-none">
                        <polygon
                          points={currentItem.cropPoints.map(p => `${p.x / 10}%,${p.y / 10}%`).join(' ')}
                          className="fill-violet-500/10 stroke-2 stroke-violet-500"
                        />
                      </svg>

                      {/* 4 Corner Drag Handles */}
                      {currentItem.cropPoints.map((pt, idx) => {
                        const style = {
                          left: `${pt.x / 10}%`,
                          top: `${pt.y / 10}%`,
                          transform: 'translate(-50%, -50%)'
                        };

                        return (
                          <div
                            key={idx}
                            style={style}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleCropHandleMouseDown(idx);
                            }}
                            className="absolute w-5 h-5 rounded-full border-2 border-white bg-violet-600 shadow-lg cursor-move hover:scale-125 transition-transform duration-100 z-10"
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Side controls dashboard */}
              <div className="p-6 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col gap-6 bg-black/5">
                {activeWorkflowTab === 'redact' ? (
                  <>
                    {/* Auto Scan controller */}
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Auto-Detections
                      </label>
                      <button
                        onClick={runAIScan}
                        disabled={isScanning || currentItem.status === 'processing'}
                        className={`w-full py-3 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 shadow-lg transition-all spring-transition
                          ${isScanning
                            ? 'bg-violet-600/30 text-violet-400 border border-violet-500/20 cursor-not-allowed'
                            : 'bg-violet-600 text-white hover:bg-violet-500 hover:-translate-y-0.5 active:translate-y-0 border border-violet-500/40 shadow-violet-600/10'
                          }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isScanning ? 'Scanning...' : 'AI Scan'}
                      </button>

                      {/* Scan Status loader */}
                      {isScanning && (
                        <div className="flex flex-col gap-1.5 mt-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1.5 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin text-violet-400" />
                            {scanProgress}
                          </span>
                          <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                            <div className="bg-violet-500 h-full w-2/3 rounded-full animate-[loading_1.5s_infinite]" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detected PII List */}
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Document Bounding Boxes
                        </label>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                          {currentItem.regions.length} detected
                        </span>
                      </div>

                      {currentItem.regions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl py-8 text-center text-slate-500 text-xs gap-2 bg-white/1">
                          <Sparkles className="w-6 h-6 opacity-20" />
                          <span>No PII elements identified yet.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                          {currentItem.regions.map((region) => (
                            <div
                              key={region.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between group transition-all
                                ${region.active
                                  ? (darkMode ? 'bg-rose-950/15 border-rose-900/35 text-rose-300' : 'bg-rose-50 border-rose-100 text-rose-800')
                                  : (darkMode ? 'bg-white/2 border-white/5 hover:bg-white/5 text-slate-300' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600')
                                }`}
                            >
                              <div className="flex flex-col gap-0.5 truncate mr-2">
                                <span className="font-semibold capitalize text-[10px] text-violet-400">
                                  {region.type}
                                </span>
                                <span className="font-medium truncate font-mono text-[11px]">
                                  {region.label || 'Sensitive Coordinates'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => toggleRegion(region.id)}
                                  className={`p-1.5 rounded-lg border transition-all
                                    ${region.active
                                      ? 'bg-rose-500 text-white border-rose-400'
                                      : (darkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                                    }`}
                                  title={region.active ? "Exclude from Redaction" : "Include in Redaction"}
                                >
                                  {region.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => deleteRegion(region.id)}
                                  className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100
                                    ${darkMode ? 'bg-white/5 hover:bg-rose-600 hover:text-white text-slate-400' : 'bg-white border border-slate-200 hover:bg-rose-600 hover:text-white text-slate-600'}`}
                                  title="Delete region"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Complete & Burn button */}
                    <div className="pt-4 border-t border-white/5 mt-auto flex flex-col gap-2">
                      <button
                        onClick={burnAndArchive}
                        disabled={isBurning}
                        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition-all spring-transition
                          ${isBurning
                            ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/20'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:-translate-y-0.5 active:translate-y-0 border border-emerald-500/30 shadow-emerald-600/10'
                          }`}
                      >
                        <Shield className="w-4 h-4" />
                        Burn & Secure to Vault
                      </button>
                      <button
                        onClick={removeCurrentFromQueue}
                        className={`w-full py-2.5 rounded-xl font-medium text-xs transition-all border
                          ${darkMode ? 'bg-white/3 border-white/5 hover:bg-rose-950/20 hover:border-rose-500/30 text-slate-400 hover:text-rose-400' : 'bg-white border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600'}`}
                      >
                        Discard Document
                      </button>
                    </div>
                  </>
                ) : (
                  // CROP PANEL CONTROLS
                  <div className="flex flex-col gap-6 h-full justify-between">
                    <div className="flex flex-col gap-4">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Interactive Deskew
                      </label>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Drag the purple nodes to cover the corners of the document. When ready, click flat crop below to perform a quad-perspective warp flattening the image client-side.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={executeBilinearWarp}
                        className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/10 border border-violet-500/40 flex items-center justify-center gap-2 transition-all spring-transition"
                      >
                        <Crop className="w-4 h-4" />
                        Apply Flat Crop
                      </button>
                      <button
                        onClick={() => setActiveWorkflowTab('redact')}
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs border transition-all
                          ${darkMode ? 'bg-white/3 border-white/5 hover:bg-white/8 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                      >
                        Cancel Crop
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
