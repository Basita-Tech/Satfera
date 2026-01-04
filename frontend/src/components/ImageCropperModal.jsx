import React, { useRef, useState } from 'react';
import { Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import './ImageCropperModal.css';

const ImageCropperModal = ({
  isOpen,
  imageSrc,
  onClose,
  onSave,
  aspectRatio,
  title = "Crop Image"
}) => {
  const cropperRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!cropperRef.current) return;
    
    setIsSaving(true);
    try {
      const canvas = cropperRef.current.getCanvas();
      if (canvas) {
        // Convert canvas to blob with high quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result;
                onSave(base64);
                setIsSaving(false);
              };
              reader.readAsDataURL(blob);
            }
          },
          'image/jpeg',
          0.95 // High quality
        );
      }
    } catch (error) {
      console.error('Error saving cropped image:', error);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              disabled={isSaving}
              style={{
                width: 'fit-content',
                padding: '10px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cropper Area */}
        <div className="flex-1 overflow-hidden">
          <div className="w-full h-full min-h-[300px] max-h-[500px]">
            <Cropper
              ref={cropperRef}
              src={imageSrc}
              className="cropper"
              stencilProps={{
                aspectRatio: aspectRatio,
                grid: true,
              }}
              backgroundWrapperProps={{
                scaleImage: true,
                moveImage: true,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3  border-t">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 font-medium text-white bg-[#C8A227] rounded-lg hover:bg-[#B49520] disabled:opacity-50 inline-flex items-center gap-2"
            style={{ fontSize: '9px' }}
          >
            {isSaving ? (
              <>
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              'Crop & Save Photo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
