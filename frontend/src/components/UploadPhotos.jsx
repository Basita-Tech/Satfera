import React, { useState, useEffect } from "react";
import {
  uploadUserPhoto,
  uploadGovernmentId,
  getUserPhotos,
  getGovernmentId,
} from "../api/auth";

const UploadPhotos = () => {
  const [photos, setPhotos] = useState({
    compulsory1: null, // full
    compulsory2: null, // family
    compulsory3: null, // closer
    optional1: null,
    optional2: null,
    governmentId: null,
  });

  const [uploadedUrls, setUploadedUrls] = useState({});
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ✅ Load existing photos from backend
  useEffect(() => {
    const loadExistingPhotos = async () => {
      try {
        const [photoRes, idRes] = await Promise.all([
          getUserPhotos(),
          getGovernmentId(),
        ]);

        console.log("📸 photoRes.data:", photoRes?.data);
        console.log("🪪 idRes.data:", idRes?.data);

        const photosData = photoRes?.data || {};
        const idData = idRes?.data || {};

        // ✅ Map backend keys -> frontend keys
        const urls = {
          compulsory1: photosData?.personalPhotos?.[0].url || photosData?.personalPhoto?.url|| null,
          compulsory2: photosData?.familyPhoto?.url || null,
          compulsory3: photosData?.closerPhoto?.url || null,
          optional1: photosData?.otherPhotos?.[0]?.url || null,
          optional2: photosData?.otherPhotos?.[1]?.url || null,
          governmentId: idData?.url || null,
        };

        setUploadedUrls(urls);
        console.log("✅ Final Loaded photo URLs:", urls);
      } catch (err) {
        console.error("❌ Error loading photos:", err);
      }
    };

    loadExistingPhotos();
  }, []);

  // ✅ Upload file to Cloudinary
  const uploadToCloudinary = async (file) => {
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
      if (data.secure_url) return data.secure_url;
      throw new Error(data.error?.message || "Upload failed");
    } catch (err) {
      console.error("❌ Cloudinary upload failed:", err);
      alert(`Upload failed: ${err.message}`);
      return null;
    }
  };

  // ✅ Handle file change
  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes =
      type === "governmentId"
        ? ["image/jpeg", "image/png", "application/pdf"]
        : ["image/jpeg", "image/png"];

    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Please select a valid image or PDF.");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File must be smaller than 2 MB.");
      e.target.value = "";
      return;
    }

    setPhotos((prev) => ({ ...prev, [type]: file }));
  };

  // ✅ Submit photos to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreed) {
      alert("Please agree to the Terms & Conditions before continuing.");
      return;
    }

    if (
      !photos.compulsory1 ||
      !photos.compulsory2 ||
      !photos.compulsory3 ||
      !photos.governmentId
    ) {
      alert("Please upload all required photos and your government ID card.");
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem("authToken");
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:8000";

      // ✅ Map frontend keys -> backend photoType
      const typeMap = {
        compulsory1: "personal",
        compulsory2: "family",
        compulsory3: "closer",
        optional1: "other",
        optional2: "other",
      };

      const uploadResults = {};

      for (const key in photos) {
        const file = photos[key];
        if (!file) continue;

        // 1️⃣ Upload to Cloudinary
        const url = await uploadToCloudinary(file);
        if (!url) continue;
        uploadResults[key] = url;

        // 2️⃣ Backend endpoint
        const endpoint =
          key === "governmentId"
            ? `${API_BASE_URL}/user-personal/upload/government-id`
            : `${API_BASE_URL}/user-personal/upload/photos`;

        // 3️⃣ Request body
        const body =
          key === "governmentId"
            ? { url }
            : { photoType: typeMap[key] || "other", url };

        // 4️⃣ Send to backend
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`Backend upload failed: ${msg}`);
        }
      }

      alert("🎉 All photos uploaded and saved successfully!");
      setUploadedUrls(uploadResults);
    } catch (err) {
      console.error("❌ Upload Error:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-10 px-4">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-8 border-t-4 border-[#FBFAF7] hover:scale-[1.02] transition-transform duration-300">
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
            const previewSrc =
              photos[key]
                ? URL.createObjectURL(photos[key])
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
                  required
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
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported: JPG, PNG, PDF — Max size:{" "}
              <span className="font-semibold">2 MB</span>
            </p>
            {uploadedUrls.governmentId &&
              uploadedUrls.governmentId.endsWith(".pdf") === false && (
                <img
                  src={uploadedUrls.governmentId}
                  alt="Government ID"
                  className="mt-2 h-24 w-24 object-cover rounded-lg border"
                />
              )}
            {photos.governmentId &&
              photos.governmentId.type === "application/pdf" && (
                <p className="text-sm text-green-600 mt-2">
                  📄 PDF file selected
                </p>
              )}
          </div>

          {/* Optional Photos */}
          {["optional1", "optional2"].map((key, idx) => {
            const previewSrc =
              photos[key]
                ? URL.createObjectURL(photos[key])
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
          <div className="flex items-center space-x-2 mt-4">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
            />
            <label
              htmlFor="agree"
              className="text-sm text-[#1f1e1d] cursor-pointer select-none"
            >
              I agree to the{" "}
              <span
                className="text-blue-600 underline hover:text-blue-700"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDisclaimer(true);
                }}
              >
                Terms & Conditions
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              !agreed ||
              !photos.compulsory1 ||
              !photos.compulsory2 ||
              !photos.compulsory3 ||
              !photos.governmentId ||
              uploading
            }
            className="w-full py-3 rounded-lg font-semibold transition text-white hover:brightness-90"
            style={{
              backgroundColor:
                agreed &&
                photos.compulsory1 &&
                photos.compulsory2 &&
                photos.compulsory3 &&
                photos.governmentId
                  ? "#D4AF37"
                  : "#E0C97A",
              cursor:
                !agreed ||
                !photos.compulsory1 ||
                !photos.compulsory2 ||
                !photos.compulsory3 ||
                !photos.governmentId
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "Submit"}
          </button>
        </form>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 overflow-y-auto max-h-[80vh]">
            <h3 className="text-xl font-bold mb-4">
              Disclaimer for SATFERA Matrimony
            </h3>
            <div className="text-sm text-gray-700 space-y-3">
              <p>
                By registering on SATFERA, you give us permission to use your
                photos and shared information for matchmaking purposes.
              </p>
              <p>
                You confirm all personal details provided by you are true,
                correct, and updated.
              </p>
              <p>
                SATFERA is only a matchmaking platform and is not responsible
                for any personal or financial outcomes.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 rounded-lg border border-gray-400 hover:bg-gray-100"
                onClick={() => setShowDisclaimer(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPhotos;
