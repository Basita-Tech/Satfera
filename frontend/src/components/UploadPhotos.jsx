import React, { useState } from "react";

const UploadPhotos = () => {
  const [photos, setPhotos] = useState({
    compulsory1: null,
    compulsory2: null,
    compulsory3: null,
    optional1: null,
    optional2: null,
    governmentId: null,
  });

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ Validate file type
    const validTypes =
      type === "governmentId"
        ? ["image/jpeg", "image/png", "application/pdf"]
        : ["image/jpeg", "image/png"];

    if (!validTypes.includes(file.type)) {
      alert(
        type === "governmentId"
          ? "Only .jpg, .png, or .pdf files are allowed for ID card."
          : "Only .jpg and .png images are allowed."
      );
      e.target.value = "";
      return;
    }

    // ✅ Validate file size (minimum 2MB)
    const minSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size < minSize) {
      alert("File size must be at least 2MB.");
      e.target.value = "";
      return;
    }

    setPhotos((prev) => ({ ...prev, [type]: file }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!agreed) {
      alert("You must agree to the Terms & Conditions before submitting!");
      return;
    }

    if (
      !photos.compulsory1 ||
      !photos.compulsory2 ||
      !photos.compulsory3 ||
      !photos.governmentId
    ) {
      alert("Please upload all required photos and government ID card.");
      return;
    }

    console.log("Form submitted with photos:", photos);
    alert("Photos submitted successfully!");
    // Here you can call your API to upload photos
  };

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-start py-10 px-4">
      <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-xl p-8 border-t-4 border-[#FBFAF7] hover:scale-[1.02] transition-transform duration-300">
        {/* Header */}
        <h2 className="text-2xl font-bold text-[#1f1e1d] text-center mb-8">
          Upload Your Photos & ID
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Compulsory Photo 1 */}
          <div>
            <label className="block font-semibold text-gray-800 mb-1">
              Candidate Full Photo <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e, "compulsory1")}
              className="w-full p-2 border rounded-lg"
              required
            />
            {photos.compulsory1 && (
              <img
                src={URL.createObjectURL(photos.compulsory1)}
                alt="Full Photo"
                className="mt-2 h-24 w-24 object-cover rounded-lg border"
              />
            )}
          </div>

          {/* Compulsory Photo 2 */}
          <div>
            <label className="block font-semibold text-gray-800 mb-1">
              Candidate Family Photo <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e, "compulsory2")}
              className="w-full p-2 border rounded-lg"
              required
            />
            {photos.compulsory2 && (
              <img
                src={URL.createObjectURL(photos.compulsory2)}
                alt="Family Photo"
                className="mt-2 h-24 w-24 object-cover rounded-lg border"
              />
            )}
          </div>

          {/* Compulsory Photo 3 */}
          <div>
            <label className="block font-semibold text-gray-800 mb-1">
              Candidate Closer Photo <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e, "compulsory3")}
              className="w-full p-2 border rounded-lg"
              required
            />
            {photos.compulsory3 && (
              <img
                src={URL.createObjectURL(photos.compulsory3)}
                alt="Closer Photo"
                className="mt-2 h-24 w-24 object-cover rounded-lg border"
              />
            )}
          </div>

          {/* Government ID Card */}
          <div>
            <label className="block font-semibold text-gray-800 mb-1">
              Candidate Government ID Card <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handlePhotoChange(e, "governmentId")}
              className="w-full p-2 border rounded-lg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload Aadhaar / PAN / Passport (jpg, png, or pdf)
            </p>
            {photos.governmentId &&
              photos.governmentId.type !== "application/pdf" && (
                <img
                  src={URL.createObjectURL(photos.governmentId)}
                  alt="Government ID"
                  className="mt-2 h-24 w-24 object-cover rounded-lg border"
                />
              )}
            {photos.governmentId &&
              photos.governmentId.type === "application/pdf" && (
                <p className="text-sm text-green-600 mt-2">📄 PDF file selected</p>
              )}
          </div>

          {/* Optional Photo 1 */}
          <div>
            <label className="block font-semibold text-[#1f1e1d] mb-1">
              Optional Photo 1
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e, "optional1")}
              className="w-full p-2 border rounded-lg"
            />
            {photos.optional1 && (
              <img
                src={URL.createObjectURL(photos.optional1)}
                alt="Optional 1"
                className="mt-2 h-24 w-24 object-cover rounded-lg border"
              />
            )}
          </div>

          {/* Optional Photo 2 */}
          <div>
            <label className="block font-semibold text-[#1f1e1d] mb-1">
              Optional Photo 2
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e, "optional2")}
              className="w-full p-2 border rounded-lg"
            />
            {photos.optional2 && (
              <img
                src={URL.createObjectURL(photos.optional2)}
                alt="Optional 2"
                className="mt-2 h-24 w-24 object-cover rounded-lg border"
              />
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              id="agree"
              className="mt-1"
            />
            <label htmlFor="agree" className="text-sm text-[#1f1e1d]">
              I agree to the{" "}
              <span
                className="text-blue-600 underline cursor-pointer"
                onClick={(e) => {
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
              !photos.governmentId
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
            Submit
          </button>
        </form>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 overflow-y-auto max-h-[80vh]">
            <h3 className="text-xl font-bold mb-4">Disclaimer for SATFERA Matrimony</h3>
            <div className="text-sm text-gray-700 space-y-3">
              <p>
                By registering on SATFERA, you give us permission to use your photos, profile details,
                and other shared information on our website, mobile application, and for sharing with
                suitable profiles for matchmaking purposes.
              </p>
              <p>
                You confirm that all personal details provided by you, including name, age, contact
                number, education, financial details, and any other information, are true, correct, and updated.
              </p>
              <p>
                SATFERA is only a matchmaking platform. We do not guarantee marriage, engagement, or
                confirmation of any relationship.
              </p>
              <p>
                If you are interested in any profile, it is your sole responsibility to verify their past,
                present, financial capacity, family background, and other necessary details before making
                any decision. SATFERA is not responsible for the authenticity of users’ claims.
              </p>
              <p>
                SATFERA will not be held responsible for any issues, disputes, frauds, or misunderstandings
                arising after marriage, engagement, or any personal interactions. We cannot interfere in
                the personal life of any member.
              </p>
              <p>
                SATFERA strongly advises all members to exercise caution, conduct independent verification,
                and use their own judgment before sharing personal, financial, or sensitive information
                with other members.
              </p>
              <p>
                SATFERA does not conduct criminal background checks or financial verifications of its members.
                Users are responsible for due diligence.
              </p>
              <p>
                SATFERA will not be liable for any loss, damage, fraud, or emotional/financial harm arising
                out of interactions with other members.
              </p>
              <p>
                Membership fees or charges paid to SATFERA are non-refundable under any circumstances.
              </p>
              <p>
                By using SATFERA, you agree to abide by our Terms & Conditions and Privacy Policy.
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
