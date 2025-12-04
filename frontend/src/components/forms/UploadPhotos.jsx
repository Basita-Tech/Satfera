import React, { useState, useEffect, useCallback } from "react";
import {
  getUserPhotos,
  getGovernmentId,
  submitProfileForReview,
  updateOnboardingStatus,
} from "../../api/auth";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import usePhotoUpload from "../../hooks/usePhotoUpload";

const UploadPhotos = ({ onNext, onPrevious }) => {
  const navigate = useNavigate();

  const {
    uploadPhotos: uploadPhotosSequentially,
    uploadState,
    isUploading: hookUploading,
    progress: uploadProgress,
    retryFailedUploads,
    resetUpload,
  } = usePhotoUpload();

  const [photos, setPhotos] = useState({
    compulsory1: null,
    compulsory2: null,
    compulsory3: null,
    optional1: null,
    optional2: null,
    governmentId: null,
  });

  const initialPhotosState = {
    compulsory1: null,
    compulsory2: null,
    compulsory3: null,
    optional1: null,
    optional2: null,
    governmentId: null,
  };

  const [uploadedUrls, setUploadedUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [initialHadRequired, setInitialHadRequired] = useState(false);

  const requiredKeys = [
    "compulsory1",
    "compulsory2",
    "compulsory3",
    "governmentId",
  ];

  const photoLabels = {
    compulsory1: "Full Body Photo",
    compulsory2: "Family Photo",
    compulsory3: "Close-up Portrait",
    optional1: "Additional Photo 1",
    optional2: "Additional Photo 2",
    governmentId: "Government ID",
  };

  const previews = React.useMemo(() => {
    const map = {};
    Object.keys(photos).forEach((k) => {
      const f = photos[k];
      if (f && f instanceof File && f.type && f.type.startsWith("image/")) {
        map[k] = URL.createObjectURL(f);
      }
    });
    return map;
  }, [photos]);

  // Whether the user has selected any new files in this step
  const hasNewFiles = Object.keys(photos).some(
    (k) => photos[k] instanceof File
  );

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  useEffect(() => {
    const loadExistingPhotos = async () => {
      try {
        const [photoRes, idRes] = await Promise.all([
          getUserPhotos(),
          getGovernmentId(),
        ]);

        const photosData = photoRes?.data?.photos || {};
        const idData = idRes?.data || {};

        const urls = {
          compulsory1: photosData?.personalPhotos?.[0]?.url || null,
          compulsory2: photosData?.familyPhoto?.url || null,
          compulsory3: photosData?.closerPhoto?.url || null,
          optional1: photosData?.otherPhotos?.[0]?.url || null,
          optional2: photosData?.otherPhotos?.[1]?.url || null,
          governmentId: idData?.url || null,
        };

        setUploadedUrls(urls);

        setInitialHadRequired(requiredKeys.every((k) => Boolean(urls[k])));
      } catch (err) {
        console.error("❌ Error loading photos:", err);
      }
    };

    loadExistingPhotos();
  }, []);

  const handlePhotoChange = useCallback(async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const { validateProfilePhoto, validateGovernmentID } = await import(
      "../../utils/fileValidation"
    );

    const validation =
      type === "governmentId"
        ? await validateGovernmentID(file)
        : await validateProfilePhoto(file);

    if (!validation.valid) {
      toast.error(validation.errors[0] || "File validation failed");
      e.target.value = "";
      return;
    }

    setPhotos((prev) => ({ ...prev, [type]: file }));
    toast.success("File validated successfully");
  }, []);

  const hasAllRequired = () =>
    requiredKeys.every(
      (k) => photos[k] instanceof File || (uploadedUrls && uploadedUrls[k])
    );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasAllRequired()) {
      toast.error(
        "Please upload all required photos and your government ID card."
      );
      return;
    }

    setUploading(true);

    const typeMap = {
      compulsory1: "personal",
      compulsory2: "family",
      compulsory3: "closer",
      optional1: "other",
      optional2: "other",
    };

    const filesToUpload = Object.keys(photos)
      .filter((k) => photos[k] instanceof File)
      .map((key) => ({
        key,
        file: photos[key],
        photoType: key === "governmentId" ? "governmentId" : typeMap[key],
      }));

    // Safety: if this is the first time completing required photos, ensure the
    // upload includes ALL missing required photos so the server receives a
    // complete set. Calculate which required keys are still missing on the
    // client (neither already uploaded nor selected now) and block submission.
    const missingRequired = requiredKeys.filter(
      (k) => !uploadedUrls[k] && !(photos[k] instanceof File)
    );

    if (!initialHadRequired && missingRequired.length > 0) {
      toast.error(
        `Please add the following required photos before submitting: ${missingRequired.join(
          ", "
        )}`
      );
      setUploading(false);
      return;
    }

    if (filesToUpload.length === 0) {
      const isNowComplete = hasAllRequired();
      if (!initialHadRequired && isNowComplete) {
        try {
          setUploading(true);
          const updateRes = await updateOnboardingStatus({
            completedSteps: [
              "personal",
              "family",
              "education",
              "profession",
              "health",
              "expectation",
              "photos",
            ],
            isOnboardingCompleted: true,
          });
          if (updateRes && updateRes.success) {
            toast.success("🎉 Profile marked complete.");
            setShowReviewModal(true);
            // Clear selected files since onboarding completed
            setPhotos(initialPhotosState);
            // Reset native file inputs
            Object.keys(initialPhotosState).forEach((k) => {
              const el = document.getElementById(k);
              if (el && el.value) el.value = "";
            });
          } else {
            toast.error(
              "Failed to update onboarding status. Please try again."
            );
          }
        } catch (err) {
          console.error("⚠️ Failed to update onboarding steps:", err);
          toast.error("Failed to update onboarding status. Please try again.");
        } finally {
          setUploading(false);
        }
        return;
      }

      toast.info("No new photos to upload.");
      setUploading(false);
      return;
    }

    try {
      const uploadResult = await uploadPhotosSequentially(
        filesToUpload,
        uploadedUrls
      );

      if (uploadResult.failedCount > 0) {
        const failedPhotos = uploadResult.errors.map((e) => e.key).join(", ");

        if (uploadResult.successCount > 0) {
          toast.error(
            `${uploadResult.successCount} photo(s) uploaded successfully, but ${uploadResult.failedCount} failed: ${failedPhotos}. Please retry the failed uploads.`,
            { duration: 6000 }
          );

          const newUrls = {};
          uploadResult.results.forEach((result) => {
            newUrls[result.photoKey] = result.url;
          });
          setUploadedUrls((prev) => ({ ...prev, ...newUrls }));
          // Clear only the photos that uploaded successfully from selection
          const succeededKeys = uploadResult.results.map((r) => r.photoKey);
          if (succeededKeys.length > 0) {
            setPhotos((prev) => {
              const next = { ...prev };
              succeededKeys.forEach((k) => {
                next[k] = null;
                const el = document.getElementById(k);
                if (el && el.value) el.value = "";
              });
              return next;
            });
          }
        } else {
          toast.error(
            `All uploads failed. Please check your internet connection and try again.`,
            { duration: 5000 }
          );
        }

        setUploading(false);
        return;
      }

      const newUrls = {};
      uploadResult.results.forEach((result) => {
        newUrls[result.photoKey] = result.url;
      });

      const mergedUrls = { ...(uploadedUrls || {}), ...newUrls };

      setUploadedUrls((prev) => ({ ...prev, ...newUrls }));

      const isNewlyCompleting =
        !initialHadRequired &&
        requiredKeys.every((k) =>
          photos[k] instanceof File
            ? Boolean(newUrls[k])
            : Boolean(mergedUrls[k])
        );

      if (isNewlyCompleting) {
        try {
          const updateRes = await updateOnboardingStatus({
            completedSteps: [
              "personal",
              "family",
              "education",
              "profession",
              "health",
              "expectation",
              "photos",
            ],
            isOnboardingCompleted: true,
          });

          if (updateRes && updateRes.success) {
            toast.success(
              "🎉 All photos uploaded successfully! Profile complete."
            );
            setShowReviewModal(true);
            setPhotos(initialPhotosState);
            Object.keys(initialPhotosState).forEach((k) => {
              const el = document.getElementById(k);
              if (el && el.value) el.value = "";
            });
          } else {
            console.error(
              "⚠️ updateOnboardingStatus returned error:",
              updateRes
            );
            toast.error(
              "Failed to update onboarding status. Please try again."
            );
          }
        } catch (err) {
          console.error("⚠️ Failed to update onboarding steps:", err);
          toast.error("Failed to update onboarding status. Please try again.");
        }
      } else {
        toast.success(
          `✅ ${uploadResult.successCount} photo(s) uploaded successfully.`
        );
        const succeeded = uploadResult.results.map((r) => r.photoKey);
        if (succeeded.length > 0) {
          setPhotos((prev) => {
            const next = { ...prev };
            succeeded.forEach((k) => {
              next[k] = null;
              const el = document.getElementById(k);
              if (el && el.value) el.value = "";
            });
            return next;
          });
        }
      }

      resetUpload();
    } catch (err) {
      console.error("❌ Upload Error:", err);
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      setUploading(true);
      const reviewRes = await submitProfileForReview();
      if (reviewRes.success) {
        toast.success("📋 Profile submitted for review!");
        setShowReviewModal(false);

        setTimeout(() => {
          navigate("/onboarding/review");
        }, 1000);
      }
    } catch (err) {
      console.error("❌ Error submitting for review:", err);
      toast.error("Failed to submit for review. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleNotNow = () => {
    setShowReviewModal(false);
    navigate("/userdashboard");
  };

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-2 px-2">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-4 sm:p-8 border-t-[2px] border-[#F9F7F5] transition-transform duration-300">
        <h2 className="text-2xl font-bold text-[#1f1e1d] text-center mb-8">
          Upload Your Photos & ID
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Compulsory Photos */}
          {[
            {
              label: "Candidate Full Photo(Required)",
              key: "compulsory1",
              hint: "Upload a clear full-length photo",
            },
            {
              label: "Candidate Family Photo (Required)",
              key: "compulsory2",
              hint: "Upload a photo with your family members",
            },
            {
              label: "Candidate Closer Photo (Required)",
              key: "compulsory3",
              hint: "Upload a clear close-up face photo",
            },
          ].map(({ label, key, hint }) => {
            const previewSrc = photos[key]
              ? previews[key]
              : uploadedUrls[key] || null;
            return (
              <div key={key}>
                <label
                  htmlFor={key}
                  className="block font-semibold text-gray-800 mb-1"
                >
                  {label} <span className="text-red-500">*</span>
                </label>
                <input
                  id={key}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, key)}
                  className="w-full p-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPG, PNG — Max size:{" "}
                  <span className="font-semibold">2 MB</span>
                </p>
                {previewSrc && (
                  <img
                    src={previewSrc}
                    alt={label}
                    className="mt-2 h-24 w-24 object-cover rounded-lg border"
                  />
                )}
              </div>
            );
          })}

          {/* Government ID */}
          <div>
            <label
              htmlFor="governmentId"
              className="block font-semibold text-gray-800 mb-1"
            >
              Candidate Government ID Card{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="governmentId"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handlePhotoChange(e, "governmentId")}
              className="w-full p-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported: JPG, PNG, PDF — Max size:{" "}
              <span className="font-semibold">2 MB</span>
            </p>

            {/* ✅ Show immediate preview if user selects an image */}
            {photos.governmentId &&
              photos.governmentId.type.startsWith("image/") && (
                <img
                  src={previews.governmentId}
                  alt="Selected Government ID"
                  className="mt-2 h-24 w-24 object-cover rounded-lg border"
                />
              )}

            {/* ✅ Show text when PDF is selected */}
            {photos.governmentId &&
              photos.governmentId.type === "application/pdf" && (
                <p className="text-sm text-green-600 mt-2">
                  📄 PDF file selected
                </p>
              )}

            {/* ✅ Show uploaded image when page reloads (from backend) */}
            {!photos.governmentId &&
              uploadedUrls.governmentId &&
              !uploadedUrls.governmentId.endsWith(".pdf") && (
                <img
                  src={uploadedUrls.governmentId}
                  alt="Government ID"
                  className="mt-2 h-24 w-24 object-cover rounded-lg border"
                />
              )}

            {/* ✅ Show PDF link when reloaded from backend */}
            {!photos.governmentId &&
              uploadedUrls.governmentId &&
              uploadedUrls.governmentId.endsWith(".pdf") && (
                <a
                  href={uploadedUrls.governmentId}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm mt-2 inline-block"
                >
                  📄 View Uploaded Document (PDF)
                </a>
              )}
          </div>

          {/* Optional Photos */}
          {["optional1", "optional2"].map((key, idx) => {
            const previewSrc = photos[key]
              ? previews[key]
              : uploadedUrls[key] || null;
            return (
              <div key={key}>
                <label
                  htmlFor={key}
                  className="block font-semibold text-[#1f1e1d] mb-1"
                >
                  Optional Photo {idx + 1}
                </label>
                <input
                  id={key}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, key)}
                  className="w-full p-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported: JPG, PNG — Max size:{" "}
                  <span className="font-semibold">2 MB</span>
                </p>
                {previewSrc && (
                  <img
                    src={previewSrc}
                    alt={`Optional ${idx + 1}`}
                    className="mt-2 h-24 w-24 object-cover rounded-lg border"
                  />
                )}
              </div>
            );
          })}

          {(uploading || hookUploading) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900">
                  Uploading Photos...
                </span>
                <span className="text-xs text-blue-700">
                  {uploadState.currentPhotoIndex} / {uploadState.totalPhotos}
                </span>
              </div>

              {uploadState.currentPhoto && (
                <div className="text-xs text-blue-800">
                  Currently uploading:{" "}
                  <span className="font-semibold">
                    {photoLabels[uploadState.currentPhoto] ||
                      uploadState.currentPhoto}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                {Object.entries(uploadProgress).map(([key, info]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-700">
                      {photoLabels[key] || key}
                    </span>
                    <span
                      className={`font-semibold ${
                        info.status === "success"
                          ? "text-green-600"
                          : info.status === "error"
                          ? "text-red-600"
                          : info.status === "uploading"
                          ? "text-blue-600"
                          : "text-gray-500"
                      }`}
                    >
                      {info.status === "success" && "✓ Uploaded"}
                      {info.status === "error" && "✗ Failed"}
                      {info.status === "uploading" && "↻ Uploading..."}
                      {info.status === "pending" && "⋯ Pending"}
                    </span>
                  </div>
                ))}
              </div>

              {!navigator.onLine && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  ⚠️ No internet connection. Waiting for network...
                </div>
              )}
            </div>
          )}

          {!uploading && uploadState.failedCount > 0 && (
            <button
              type="button"
              onClick={async () => {
                setUploading(true);
                const filesToUpload = Object.keys(photos)
                  .filter((k) => photos[k] instanceof File)
                  .map((key) => ({
                    key,
                    file: photos[key],
                    photoType:
                      key === "governmentId"
                        ? "governmentId"
                        : {
                            compulsory1: "personal",
                            compulsory2: "family",
                            compulsory3: "closer",
                            optional1: "other",
                            optional2: "other",
                          }[key],
                  }));

                const result = await retryFailedUploads(filesToUpload);

                if (result.successCount > 0) {
                  const newUrls = {};
                  result.results.forEach((r) => {
                    newUrls[r.photoKey] = r.url;
                  });
                  setUploadedUrls((prev) => ({ ...prev, ...newUrls }));
                  toast.success(
                    `${result.successCount} photo(s) uploaded successfully!`
                  );
                }

                if (result.failedCount > 0) {
                  toast.error(
                    `${result.failedCount} upload(s) still failed. Please check your connection.`
                  );
                }

                setUploading(false);
              }}
              className="w-full py-3 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
            >
              🔄 Retry Failed Uploads ({uploadState.failedCount})
            </button>
          )}

          <button
            type="submit"
            disabled={uploading || !hasNewFiles}
            className="w-full py-3 rounded-lg font-semibold transition text-white hover:brightness-90 disabled:opacity-60"
            style={{
              backgroundColor: hasNewFiles ? "#D4AF37" : "#E0C97A",
              cursor: uploading || !hasNewFiles ? "not-allowed" : "pointer",
            }}
            title={
              !hasNewFiles
                ? "Select or update at least one photo to enable submission"
                : uploading
                ? "Uploading..."
                : "Submit"
            }
            aria-disabled={uploading || !hasNewFiles}
          >
            {uploading ? "Uploading..." : "Submit"}
          </button>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={onPrevious}
              className="px-4 py-2 rounded-lg border border-gray-400 hover:bg-gray-100"
            >
              ← Previous
            </button>
          </div>
        </form>
      </div>

      {/* Terms modal removed from this step (moved to signup) */}

      {/* ✅ Submit for Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#D4A052] to-[#800000] rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h2 className="text-2xl font-bold text-[#800000] mb-2">
                Ready to Review?
              </h2>
              <p className="text-gray-600 text-sm">
                Your profile is complete and ready to be reviewed by our team.
              </p>
            </div>

            {/* Message */}
            <div className="bg-[#F9F7F5] border-l-4 border-[#D4A052] p-4 mb-6 rounded">
              <p className="text-gray-700 text-sm">
                <strong>What happens next?</strong>
                <br />
                We'll review your profile within 24-48 hours. You'll receive an
                email once it's approved or if we need any changes.
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSubmitForReview}
                disabled={uploading}
                className="w-full py-3 rounded-lg font-semibold text-white bg-primary hover:shadow-lg transition disabled:opacity-50"
              >
                {uploading ? "Submitting..." : "Yes, Submit for Review"}
              </button>
              <button
                onClick={handleNotNow}
                disabled={uploading}
                className="w-full py-3 rounded-lg font-semibold text-[#800000] border-2 border-[#D4A052] bg-white hover:bg-[#F9F7F5] transition disabled:opacity-50"
              >
                Not Now
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              You can always submit later from your dashboard
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPhotos;
