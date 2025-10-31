// src/ForgotUsername.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HeartFill } from "react-bootstrap-icons";

const ForgotUsername = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
  });
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameType, setUsernameType] = useState(""); // email or mobile

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setUsername("");
    setUsernameType("");
  };

  const maskMobile = (mobile) => {
    // Example: +91 9876543210 → +91 ******3210
    if (!mobile) return "";
    return mobile.replace(/(\+\d{1,3})\s?(\d{6})(\d{4})/, "$1 ******$3");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setUsername("");
    setUsernameType("");

    if (!formData.fullName.trim() || !formData.dob) {
      setError("Please enter both Name and Date of Birth.");
      return;
    }

    setLoading(true);

    // ✅ Mock user database (simulate backend)
    const mockUsers = [
      {
        fullName: "Roshan Bisoyi",
        dob: "2000-05-10",
        username: "roshan.bisoyi@example.com",
        type: "email",
      },
      {
        fullName: "Ankit Sharma",
        dob: "1999-03-20",
        username: "+91 9876543210",
        type: "mobile",
      },
    ];

    setTimeout(() => {
      const foundUser = mockUsers.find(
        (u) =>
          u.fullName.toLowerCase() === formData.fullName.trim().toLowerCase() &&
          u.dob === formData.dob
      );

      if (foundUser) {
        setUsername(foundUser.username);
        setUsernameType(foundUser.type);
      } else {
        setError("No account found with that Name and DOB.");
      }

      setLoading(false);
    }, 1200);
  };

  return (
    <div className="container d-flex justify-content-center align-items-center py-4">
      <div className="col-lg-6 col-md-8 col-sm-12">
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-4">
            {/* Header */}
            <div className="mb-3 text-center">
              <Link
                to="/login"
                className="text-secondary d-inline-flex align-items-center mb-2 text-decoration-none fs-6"
              >
                <ArrowLeft size={16} className="me-1" />
                Back to Login
              </Link>
              <div className="d-flex justify-content-center align-items-center mb-2">
                <HeartFill size={28} className="text-danger me-2" />
                <h5 className="fw-bold text-dark mb-0">Forgot Username</h5>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  className="form-control form-control-sm"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  name="dob"
                  className="form-control form-control-sm"
                  value={formData.dob}
                  onChange={handleChange}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              {error && <div className="text-danger small mb-2">{error}</div>}

              <button
                type="submit"
                className="btn btn-danger w-100 py-2"
                disabled={loading}
              >
                {loading ? "Checking..." : "Retrieve Username"}
              </button>
            </form>

            {/* Result */}
            {username && (
              <div className="alert alert-success mt-3 text-center small">
                ✅ Your username is:&nbsp;
                <strong>
                  {usernameType === "mobile" ? maskMobile(username) : username}
                </strong>
                <div className="text-muted mt-1">
                  ({usernameType === "mobile" ? "Mobile" : "Email"} based login)
                </div>
              </div>
            )}

            <p className="text-center text-secondary mt-3">
              Remembered it?{" "}
              <Link to="/login" className="text-danger fw-semibold">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotUsername;
