import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const UserDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const ProfileSection = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
        {title}
      </h2>
      {children}
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b last:border-b-0">
      <span className="text-gray-600 font-medium">{label}:</span>
      <span className="text-gray-800">{value || "N/A"}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-8 mb-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome, {user?.firstName || "User"}! 👋
              </h1>
              <p className="text-purple-100">
                Manage your profile and settings
              </p>
            </div>
            <Button
              onClick={handleLogout}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Personal Information */}
        <ProfileSection title="Personal Information">
          <InfoRow
            label="Full Name"
            value={`${user?.firstName || ""} ${user?.middleName || ""} ${
              user?.lastName || ""
            }`.trim()}
          />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Phone Number" value={user?.phoneNumber} />
          <InfoRow
            label="Date of Birth"
            value={formatDate(user?.dateOfBirth)}
          />
          <InfoRow
            label="Gender"
            value={user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : "N/A"}
          />
          <InfoRow
            label="Profile For"
            value={user?.for_Profile ? user.for_Profile.charAt(0).toUpperCase() + user.for_Profile.slice(1) : "N/A"}
          />
        </ProfileSection>

        {/* Account Status */}
        <ProfileSection title="Account Status">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Email Verified</span>
              <Badge
                className={
                  user?.isEmailVerified
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-yellow-500 hover:bg-yellow-600"
                }
              >
                {user?.isEmailVerified ? "Verified" : "Pending"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Phone Verified</span>
              <Badge
                className={
                  user?.isPhoneVerified
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-yellow-500 hover:bg-yellow-600"
                }
              >
                {user?.isPhoneVerified ? "Verified" : "Pending"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Onboarding Status</span>
              <Badge
                className={
                  user?.isOnboardingCompleted
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-blue-500 hover:bg-blue-600"
                }
              >
                {user?.isOnboardingCompleted ? "Completed" : "In Progress"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Account Status</span>
              <Badge
                className={
                  user?.isActive
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }
              >
                {user?.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </ProfileSection>

        {/* Account Details */}
        <ProfileSection title="Account Details">
          <InfoRow label="Role" value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "N/A"} />
          <InfoRow
            label="Email Login"
            value={user?.isEmailLoginEnabled ? "Enabled" : "Disabled"}
          />
          <InfoRow
            label="Mobile Login"
            value={user?.isMobileLoginEnabled ? "Enabled" : "Disabled"}
          />
          <InfoRow
            label="Account Created"
            value={formatDate(user?.createdAt)}
          />
          <InfoRow
            label="Last Login"
            value={formatDate(user?.lastLoginAt)}
          />
        </ProfileSection>

        {/* Completed Steps (if any) */}
        {user?.completedSteps && user.completedSteps.length > 0 && (
          <ProfileSection title="Profile Completion Progress">
            <div className="flex flex-wrap gap-2">
              {user.completedSteps.map((step, index) => (
                <Badge
                  key={index}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {step}
                </Badge>
              ))}
            </div>
          </ProfileSection>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;



