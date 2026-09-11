import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Star,
  Plus,
} from 'lucide-react';
import { processDeviceImageFile } from '../lib/imageUtils';

interface FarmPhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  isMandatory?: boolean;
}

const SAMPLE_FARM_PHOTOS = [
  {
    name: 'Green Field & Crop Rows',
    url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80',
  },
  {
    name: 'Organic Greenhouse Harvest',
    url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&q=80',
  },
  {
    name: 'Fruit Orchard & Trees',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23ef9?w=1200&q=80',
  },
];

export const FarmPhotoUpload: React.FC<FarmPhotoUploadProps> = ({
  photos,
  onChange,
  maxPhotos = 6,
  isMandatory = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setIsProcessing(true);

    try {
      const remainingSlots = maxPhotos - photos.length;
      if (remainingSlots <= 0) {
        setUploadError(`You have already uploaded the maximum of ${maxPhotos} farm photos.`);
        setIsProcessing(false);
        return;
      }

      const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
      const newPhotoPromises = filesToProcess.map((file) => processDeviceImageFile(file));
      const newPhotos = await Promise.all(newPhotoPromises);

      onChange([...photos, ...newPhotos]);
    } catch (err: any) {
      setUploadError(err.message || 'Error processing image from device.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const item = photos[index];
    const without = photos.filter((_, idx) => idx !== index);
    onChange([item, ...without]);
  };

  const handleAddSample = (url: string) => {
    if (photos.includes(url)) return;
    if (photos.length >= maxPhotos) {
      setUploadError(`Maximum of ${maxPhotos} photos reached.`);
      return;
    }
    onChange([...photos, url]);
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        id="device-farm-photos-input"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        id="device-farm-camera-input"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Header & Requirement Badge */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-[#2D3A26]">
            Upload Farm Pictures {isMandatory && <span className="text-red-600 font-bold">*</span>}
          </label>
          <span className="text-[11px] text-[#5D6D56]">
            Upload real pictures of your farm, fields, or greenhouse from your device.
          </span>
        </div>
        {isMandatory && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              photos.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
            }`}
          >
            {photos.length > 0 ? `✓ Mandatory Met (${photos.length})` : 'Mandatory: Upload 1+ Photo'}
          </span>
        )}
      </div>

      {uploadError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        id="farm-photo-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-[#5D7A4F] bg-[#EBF1E8]'
            : photos.length === 0
            ? 'border-[#5D7A4F]/60 bg-white hover:bg-[#F9F7F2]'
            : 'border-[#D4CDBC] bg-white hover:bg-[#F9F7F2]'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shadow-2xs">
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-[#5D7A4F] border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-[#2D3A26]">
            {isProcessing ? 'Optimizing device photos...' : 'Click to browse device or drag & drop photos here'}
          </p>
          <p className="text-[10px] text-[#8C9886] mt-0.5">
            Supports JPG, PNG, WEBP from your phone camera or desktop gallery ({photos.length}/{maxPhotos} uploaded)
          </p>
        </div>

        <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            id="browse-device-photos-btn"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Browse Device Files
          </button>

          <button
            type="button"
            id="open-device-camera-btn"
            onClick={() => cameraInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#D4CDBC] text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-[#5D7A4F]" />
            Take Photo
          </button>
        </div>
      </div>

      {/* Uploaded Photos Grid */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5D6D56]">
            <span className="font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Uploaded Farm Pictures ({photos.length})
            </span>
            <span className="text-[10px] text-[#8C9886]">First picture is used as Main Farm Cover</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {photos.map((photoUrl, idx) => {
              const isPrimary = idx === 0;
              return (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border border-[#D4CDBC] bg-[#FAF8F5] shadow-2xs aspect-4/3"
                >
                  <img
                    src={photoUrl}
                    alt={`Farm photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Badge */}
                  {isPrimary ? (
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#5D7A4F] text-white text-[9px] font-bold flex items-center gap-1 shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-current" /> Main Cover
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 hover:bg-black/80 text-white text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                      title="Set as Main Farm Cover"
                    >
                      Set as Cover
                    </button>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white">
                    #{idx + 1}
                  </div>
                </div>
              );
            })}

            {photos.length < maxPhotos && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-[#D4CDBC] hover:border-[#5D7A4F] bg-white hover:bg-[#F9F7F2] flex flex-col items-center justify-center p-3 text-[#5D6D56] transition-colors cursor-pointer aspect-4/3"
              >
                <Plus className="w-5 h-5 text-[#5D7A4F] mb-1" />
                <span className="text-[11px] font-semibold">+ Add Another</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick sample photos shortcut (for testing if user has no photo files on device) */}
      <div className="pt-2 border-t border-[#E5E0D5]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-[#8C9886]">
            No device photo handy? Add verified farm photos for instant testing:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_FARM_PHOTOS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => handleAddSample(sample.url)}
              disabled={photos.includes(sample.url) || photos.length >= maxPhotos}
              className="text-[10px] px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF1E8] text-[#2D3A26] border border-[#D4CDBC] disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5 text-[#5D7A4F]" />
              {sample.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
