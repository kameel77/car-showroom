'use client';

import React, { useState, useRef } from 'react';
import { X, Plus, Image as ImageIcon, Trash2, Loader2, Upload, Star } from 'lucide-react';
import { uploadCarImage } from '@/lib/partners-server';

interface PhotoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  initialMainPhoto: string | null;
  initialPhotos: string[];
  onSave: (offerId: string, mainPhoto: string | null, photos: string[]) => Promise<void>;
}

export function PhotoManagerModal({
  isOpen,
  onClose,
  offerId,
  initialMainPhoto,
  initialPhotos,
  onSave,
}: PhotoManagerModalProps) {
  const [mainPhoto, setMainPhoto] = useState<string | null>(initialMainPhoto || null);
  const [photos, setPhotos] = useState<string[]>(initialPhotos || []);
  const [newUrl, setNewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    
    if (!mainPhoto) {
      setMainPhoto(newUrl.trim());
    } else {
      setPhotos([...photos, newUrl.trim()]);
    }
    setNewUrl('');
  };

  const processFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const url = await uploadCarImage(formData);
        uploadedUrls.push(url);
      }
      
      let nextMain = mainPhoto;
      let newAdditional = [...photos];
      
      if (!nextMain && uploadedUrls.length > 0) {
        nextMain = uploadedUrls[0];
        newAdditional = [...newAdditional, ...uploadedUrls.slice(1)];
      } else {
        newAdditional = [...newAdditional, ...uploadedUrls];
      }
      
      setMainPhoto(nextMain);
      setPhotos(newAdditional);
    } catch (err) {
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await processFiles(e.target.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const onDragLeave = () => {
    setIsDragging(false);
  };
  
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };
  
  const handleRemoveMainPhoto = () => {
    if (photos.length > 0) {
      setMainPhoto(photos[0]);
      setPhotos(photos.slice(1));
    } else {
      setMainPhoto(null);
    }
  };

  const handleMakeMain = (url: string, index: number) => {
    let newPhotos = [...photos];
    newPhotos.splice(index, 1); // remove from array
    if (mainPhoto) {
      newPhotos.push(mainPhoto); // push current main to array
    }
    setMainPhoto(url);
    setPhotos(newPhotos);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(offerId, mainPhoto, photos);
      onClose();
    } catch (err) {
      alert('Failed to save photos: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className={`bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${isDragging ? 'ring-4 ring-blue-500 bg-blue-50' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-500" />
            Zarządzaj zdjęciami pojazdu
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileInput}
          />
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors border border-blue-200 flex-1 border-dashed"
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              {isUploading ? 'Wgrywanie plików...' : 'Wybierz / upuść pliki z komputera'}
            </button>
          </div>

          <form onSubmit={handleAddUrl} className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Wklej adres URL zdjęcia (https://...)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={!newUrl.trim() || isUploading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Dodaj urlem
            </button>
          </form>

          {/* Main Photo Area */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              Zdjęcie główne
            </h3>
            {mainPhoto ? (
               <div className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-amber-300 max-w-sm">
                <img
                  src={mainPhoto}
                  alt="Zdjęcie główne"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={handleRemoveMainPhoto}
                    className="p-2 bg-white/20 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"
                    title="Usuń zdjęcie główne"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 max-w-sm aspect-video flex items-center justify-center">
                Brak zdjęcia głównego
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* Photos Grid */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dodatkowe zdjęcia ({photos.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((url, i) => (
                <div key={i} className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={url}
                    alt={`Dodatkowe zdjęcie ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button
                      onClick={() => handleMakeMain(url, i)}
                      className="px-3 py-1.5 bg-amber-500/90 hover:bg-amber-500 rounded-md text-white text-xs font-medium backdrop-blur-sm transition-colors flex items-center gap-1"
                    >
                      <Star className="h-3 w-3" /> Ustaw jako główne
                    </button>
                    <button
                      onClick={() => handleRemovePhoto(i)}
                      className="p-2 bg-white/20 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"
                      title="Usuń zdjęcie"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {photos.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  Brak dodatkowych zdjęć.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving || isUploading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
             onClick={handleSave}
            disabled={isSaving || isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Zapisz zmiany
          </button>
        </div>
      </div>
    </div>
  );
}
