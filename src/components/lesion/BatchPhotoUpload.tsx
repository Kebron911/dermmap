import { useState, useRef, useCallback } from 'react';
import { Upload, Camera, X, Plus, Image, Grid3x3, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface BatchPhotoUploadProps {
  onPhotosSelected: (photos: { url: string; type: 'clinical' | 'dermoscopic'; file?: File }[]) => void;
  onOpenCamera: () => void;
  existingCount?: number;
  maxPhotos?: number;
}

export function BatchPhotoUpload({
  onPhotosSelected,
  onOpenCamera,
  existingCount = 0,
  maxPhotos = 10,
}: BatchPhotoUploadProps) {
  const [photos, setPhotos] = useState<{ url: string; type: 'clinical' | 'dermoscopic'; file?: File }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = maxPhotos - existingCount - photos.length;

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, remaining);
      const newPhotos = fileArray.map((file) => ({
        url: URL.createObjectURL(file),
        type: 'clinical' as const,
        file,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [remaining],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const toggleType = (index: number) => {
    setPhotos((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, type: p.type === 'clinical' ? 'dermoscopic' : 'clinical' }
          : p,
      ),
    );
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed.url.startsWith('blob:')) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const confirmAll = () => {
    onPhotosSelected(photos);
    setPhotos([]);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
          isDragging
            ? 'border-teal-400 bg-teal-50'
            : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50',
          remaining <= 0 && 'opacity-50 pointer-events-none',
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={28} className="mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-700">
          Drop photos here or click to browse
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {remaining > 0 ? `${remaining} photo${remaining !== 1 ? 's' : ''} remaining` : 'Maximum photos reached'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onOpenCamera}
          disabled={remaining <= 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-100 transition disabled:opacity-50"
        >
          <Camera size={16} />
          Open Camera
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={remaining <= 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition disabled:opacity-50"
        >
          <Image size={16} />
          Browse Files
        </button>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} ready
            </span>
            <button
              onClick={confirmAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition"
            >
              <Check size={14} />
              Add All to Lesion
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                {/* Type badge */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleType(i); }}
                  className={clsx(
                    'absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md transition',
                    photo.type === 'clinical'
                      ? 'bg-teal-600 text-white'
                      : 'bg-purple-600 text-white',
                  )}
                >
                  {photo.type === 'clinical' ? '📷' : '🔬'}
                </button>
                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
