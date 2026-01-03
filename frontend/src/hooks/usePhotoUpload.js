import { useState, useCallback, useRef } from "react";
import { uploadUserPhoto, uploadGovernmentId, updateUserPhoto, updateGovernmentId } from "../api/auth";
const usePhotoUpload = () => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    currentPhoto: null,
    currentPhotoIndex: 0,
    totalPhotos: 0,
    progress: {},
    errors: [],
    successCount: 0,
    failedCount: 0
  });
  const abortControllerRef = useRef(null);
  const isOnlineRef = useRef(navigator.onLine);
  const setupNetworkMonitoring = useCallback(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const waitForNetwork = useCallback(async (maxWaitTime = 10000) => {
    if (isOnlineRef.current) return true;
    const startTime = Date.now();
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (isOnlineRef.current) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 500);
    });
  }, []);
  const uploadPhotoWithRetry = useCallback(async (file, photoType, photoKey, isUpdate = false, photoIndex = null, maxRetries = 3) => {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!isOnlineRef.current) {
          const networkRestored = await waitForNetwork(10000);
          if (!networkRestored) {
            throw new Error("No network connection. Please check your internet and try again.");
          }
        }
        setUploadState(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            [photoKey]: {
              ...prev.progress[photoKey],
              attempts: attempt,
              status: "uploading"
            }
          }
        }));
        const formData = new FormData();
        formData.append("file", file);
        formData.append("photoType", photoType);
        if (isUpdate && photoIndex !== null && (photoType === "personal" || photoType === "other")) {
          formData.append("photoIndex", photoIndex.toString());
        }
        let uploadPromise;
        if (isUpdate) {
          uploadPromise = photoType === "governmentId" ? updateGovernmentId(formData) : updateUserPhoto(formData);
        } else {
          uploadPromise = photoType === "governmentId" ? uploadGovernmentId(formData) : uploadUserPhoto(formData);
        }
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Upload timeout after 30 seconds")), 30000);
        });
        const response = await Promise.race([uploadPromise, timeoutPromise]);
        let uploadedUrl = null;
        if (response.data?.photos || response.data?.governmentIdImage) {
          const photos = response.data.photos;
          const govId = response.data.governmentIdImage;
          switch (photoType) {
            case "closer":
              uploadedUrl = photos?.closerPhoto?.url;
              break;
            case "personal":
              const personalPhotos = photos?.personalPhotos || [];
              uploadedUrl = personalPhotos[personalPhotos.length - 1]?.url;
              break;
            case "family":
              uploadedUrl = photos?.familyPhoto?.url;
              break;
            case "other":
              const otherPhotos = photos?.otherPhotos || [];
              uploadedUrl = otherPhotos[otherPhotos.length - 1]?.url;
              break;
            case "governmentId":
              uploadedUrl = govId?.url;
              break;
          }
        }
        if (!uploadedUrl) {
          throw new Error("No URL returned from server");
        }
        return {
          success: true,
          url: uploadedUrl,
          photoKey,
          photoType
        };
      } catch (error) {
        lastError = error;
        console.error(`[PhotoUpload] Attempt ${attempt}/${maxRetries} failed for ${photoKey}:`, error.message);
        const status = error.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429 && status !== 408) {
          break;
        }
        if (attempt < maxRetries) {
          const backoffDelay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    return {
      success: false,
      error: lastError?.response?.data?.message || lastError?.message || "Upload failed after multiple attempts",
      photoKey,
      photoType
    };
  }, [waitForNetwork]);
  const uploadPhotos = useCallback(async (photosToUpload, existingPhotos = {}) => {
    const cleanupNetwork = setupNetworkMonitoring();
    if (!photosToUpload || photosToUpload.length === 0) {
      console.warn("[PhotoUpload] No photos to upload");
      return {
        success: true,
        results: [],
        errors: []
      };
    }
    const initialProgress = {};
    photosToUpload.forEach(({
      key
    }) => {
      initialProgress[key] = {
        status: "pending",
        progress: 0,
        attempts: 0,
        url: null,
        error: null
      };
    });
    setUploadState({
      isUploading: true,
      currentPhoto: null,
      currentPhotoIndex: 0,
      totalPhotos: photosToUpload.length,
      progress: initialProgress,
      errors: [],
      successCount: 0,
      failedCount: 0
    });
    abortControllerRef.current = new AbortController();
    const results = [];
    const errors = [];
    let successCount = 0;
    let failedCount = 0;
    try {
      for (let i = 0; i < photosToUpload.length; i++) {
        const {
          key,
          file,
          photoType
        } = photosToUpload[i];
        if (abortControllerRef.current.signal.aborted) {
          break;
        }
        setUploadState(prev => ({
          ...prev,
          currentPhoto: key,
          currentPhotoIndex: i + 1
        }));
        const existingUrl = existingPhotos[key];
        const isUpdate = !!existingUrl;
        let photoIndex = null;
        if (photoType === "personal") {
          if (key === "compulsory1") photoIndex = 0;
        } else if (photoType === "other") {
          if (key === "optional1") photoIndex = 0;
          if (key === "optional2") photoIndex = 1;
        }
        const uploadStartTime = Date.now();
        const result = await uploadPhotoWithRetry(file, photoType, key, isUpdate, photoIndex);
        const uploadDuration = Date.now() - uploadStartTime;
        if (result.success) {
          successCount++;
          setUploadState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              [key]: {
                ...prev.progress[key],
                status: "success",
                progress: 100,
                url: result.url
              }
            },
            successCount: successCount
          }));
          results.push(result);
        } else {
          failedCount++;
          setUploadState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              [key]: {
                ...prev.progress[key],
                status: "error",
                progress: 0,
                error: result.error
              }
            },
            errors: [...prev.errors, {
              key,
              error: result.error
            }],
            failedCount: failedCount
          }));
          errors.push({
            key,
            error: result.error
          });
          console.error(`[PhotoUpload] Photo ${i + 1}/${photosToUpload.length} failed: ${result.error}`);
        }
        if (i < photosToUpload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        currentPhoto: null
      }));
      cleanupNetwork();
      return {
        success: failedCount === 0,
        results,
        errors,
        successCount,
        failedCount,
        totalPhotos: photosToUpload.length
      };
    } catch (error) {
      console.error("[PhotoUpload] Fatal error during upload:", error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        currentPhoto: null,
        errors: [...prev.errors, {
          key: "fatal",
          error: error.message
        }]
      }));
      cleanupNetwork();
      return {
        success: false,
        results,
        errors: [...errors, {
          key: "fatal",
          error: error.message
        }],
        successCount,
        failedCount,
        totalPhotos: photosToUpload.length
      };
    }
  }, [setupNetworkMonitoring, uploadPhotoWithRetry]);
  const abortUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      currentPhoto: null,
      currentPhotoIndex: 0,
      totalPhotos: 0,
      progress: {},
      errors: [],
      successCount: 0,
      failedCount: 0
    });
  }, []);
  const retryFailedUploads = useCallback(async photosToUpload => {
    const failedPhotos = photosToUpload.filter(({
      key
    }) => {
      const photoProgress = uploadState.progress[key];
      return photoProgress && photoProgress.status === "error";
    });
    if (failedPhotos.length === 0) {
      return {
        success: true,
        results: [],
        errors: []
      };
    }
    return uploadPhotos(failedPhotos);
  }, [uploadState.progress, uploadPhotos]);
  return {
    uploadPhotos,
    abortUpload,
    resetUpload,
    retryFailedUploads,
    uploadState,
    isUploading: uploadState.isUploading,
    progress: uploadState.progress,
    errors: uploadState.errors,
    currentPhoto: uploadState.currentPhoto,
    currentPhotoIndex: uploadState.currentPhotoIndex,
    totalPhotos: uploadState.totalPhotos,
    successCount: uploadState.successCount,
    failedCount: uploadState.failedCount
  };
};
export default usePhotoUpload;