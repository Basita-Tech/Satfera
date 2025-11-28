import React, { useState, useEffect, useCallback } from "react";
import axios from "../../api/http";
import {
  getUserPhotos,
  getGovernmentId,
  submitProfileForReview,
  updateOnboardingStatus,
} from "../../api/auth";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const UploadPhotos = ({ onNext, onPrevious }) => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState({
    compulsory1: null,
    compulsory2: null,
    compulsory3: null,
    optional1: null,
    optional2: null,
    governmentId: null,
  });

  const [uploadedUrls, setUploadedUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [uploadedCloudinaryUrls, setUploadedCloudinaryUrls] = useState([]);
  const [initialHadRequired, setInitialHadRequired] = useState(false);

  const requiredKeys = [
    "compulsory1",
    "compulsory2",
    "compulsory3",
    "governmentId",
  ];

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

        const photosData = photoRes?.data || {};
        const idData = idRes?.data || {};

        const urls = {
          compulsory1:
            photosData?.personalPhotos?.[0].url ||
            photosData?.personalPhoto?.url ||
            null,
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

  const uploadToCloudinary = useCallback(async (file) => {
    const CLOUD_NAME = "dpmdvt00f";
    const UPLOAD_PRESET = "satfera";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (data.secure_url) {
        setUploadedCloudinaryUrls((prev) => [...prev, data.secure_url]);
        return data.secure_url;
      }
      throw new Error(data.error?.message || "Upload failed");
    } catch (err) {
      console.error("❌ Cloudinary upload failed:", err);
      throw err;
    }
  }, []);

  const deleteFromCloudinary = useCallback(async (publicUrl) => {
    try {
      const urlParts = publicUrl.split("/");
      const fileNameWithExt = urlParts[urlParts.length - 1];
      const publicId = `satfera/${fileNameWithExt.split(".")[0]}`;

      return true;
    } catch (err) {
      console.error("❌ Error deleting from Cloudinary:", err);
      return false;
    }
  }, []);

  const handlePhotoChange = useCallback(async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Import validation utilities
    const { validateProfilePhoto, validateGovernmentID } = await import(
      "../../utils/fileValidation"
    );

    // Perform comprehensive validation
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
    setUploadedCloudinaryUrls([]);
    // ✅ No need to get token - axios interceptor handles authentication
    const API_BASE_URL =
      import.meta.env.VITE_API_URL || "http://localhost:8000";

    const typeMap = {
      compulsory1: "personal",
      compulsory2: "family",
      compulsory3: "closer",
      optional1: "other",
      optional2: "other",
    };

    const filesToUpload = Object.keys(photos).filter(
      (k) => photos[k] instanceof File
    );

    const newlyUploaded = {};
    const createdCloudinaryUrls = [];

    try {
      const uploadPromises = filesToUpload.map((key) =>
        uploadToCloudinary(photos[key]).then((url) => ({ key, url }))
      );

      const uploadResults = await Promise.allSettled(uploadPromises);

      const uploadFailures = uploadResults.filter(
        (r) => r.status === "rejected"
      );
      const uploadSuccesses = uploadResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      uploadSuccesses.forEach(({ key, url }) => {
        newlyUploaded[key] = url;
        createdCloudinaryUrls.push(url);
      });

      if (uploadFailures.length > 0) {
        await Promise.allSettled(
          createdCloudinaryUrls.map((u) => deleteFromCloudinary(u))
        );
        throw new Error("One or more file uploads failed. Please try again.");
      }

      const backendPromises = Object.keys(newlyUploaded).map((key) => {
        const url = newlyUploaded[key];
        const endpoint =
          key === "governmentId"
            ? `${API_BASE_URL}/user-personal/upload/government-id`
            : `${API_BASE_URL}/user-personal/upload/photos`;

        const body =
          key === "governmentId"
            ? { url }
            : { photoType: typeMap[key] || "other", url };

        // ✅ Use axios instead of fetch - handles authentication automatically via cookies
        return axios
          .post(endpoint, body)
          .then((res) => {
            return { key, url };
          })
          .catch((error) => {
            const msg =
              error.response?.data?.message ||
              error.message ||
              "Backend rejected file";
            throw new Error(msg);
          });
      });

      const backendResults = await Promise.allSettled(backendPromises);
      const backendFailures = backendResults.filter(
        (r) => r.status === "rejected"
      );

      if (backendFailures.length > 0) {
        await Promise.allSettled(
          createdCloudinaryUrls.map((u) => deleteFromCloudinary(u))
        );
        throw new Error("Saving photos failed on server. Please try again.");
      }

      setUploadedUrls((prev) => ({ ...prev, ...newlyUploaded }));

      const isNewlyCompleting = !initialHadRequired && hasAllRequired();

      if (isNewlyCompleting) {
        try {
          await updateOnboardingStatus({
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
        } catch (err) {
          console.error("⚠️ Failed to update onboarding steps:", err);
        }

        toast.success("🎉 Photos saved successfully.");
        setShowReviewModal(true);
      } else {
        toast.success("✅ Photos updated successfully.");
      }
    } catch (err) {
      console.error("❌ Upload Error:", err);
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setUploadedCloudinaryUrls(createdCloudinaryUrls);
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
            { label: "Candidate Full Photo", key: "compulsory1" },
            { label: "Candidate Family Photo", key: "compulsory2" },
            { label: "Candidate Closer Photo", key: "compulsory3" },
          ].map(({ label, key }) => {
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

          {/* Terms */}
          {/* Terms moved to signup page — removed from this step */}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!hasAllRequired() || uploading}
            className="w-full py-3 rounded-lg font-semibold transition text-white hover:brightness-90"
            style={{
              backgroundColor: hasAllRequired() ? "#D4AF37" : "#E0C97A",
              cursor: hasAllRequired() ? "pointer" : "not-allowed",
            }}
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
