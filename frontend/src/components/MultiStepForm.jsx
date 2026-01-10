import React, { useState, useEffect, useContext } from "react";
import StepIndicator from "./StepIndicator";
import PersonalDetails from "./forms/PersonalDetails";
import FamilyDetails from "./forms/FamilyDetails";
import EducationDetails from "./forms/EducationDetails";
import ProfessionDetails from "./forms/ProfessionalDetails";
import HealthLifestyle from "./forms/HealthLifestyle";
import ExpectationDetails from "./forms/ExpectationDetails";
import UploadPhotos from "./forms/UploadPhotos";
import { getOnboardingStatus, getProfileReviewStatus, updateOnboardingStatus } from "../api/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContextr } from "./context/AuthContext";
const steps = [{
  id: "personal",
  label: "Personal Details"
}, {
  id: "family",
  label: "Family Details"
}, {
  id: "education",
  label: "Educational Details"
}, {
  id: "profession",
  label: "Professional Details"
}, {
  id: "health",
  label: "Health & Lifestyle"
}, {
  id: "expectation",
  label: "Expectation Details"
}, {
  id: "photos",
  label: "Upload Photos"
}];
const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState("personal");
  const [completedSteps, setCompletedSteps] = useState([]);
  const [maxAllowedStep, setMaxAllowedStep] = useState("personal");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const {
    token,
    user
  } = useContext(AuthContextr);
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await getOnboardingStatus();
        const savedSteps = res?.data?.data?.completedSteps || [];
        setCompletedSteps(savedSteps);
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlStep = urlParams.get('step');
        
        let nextStep = "personal";
        for (const s of steps) {
          if (!savedSteps.includes(s.id)) {
            nextStep = s.id;
            break;
          }
        }
        
        const lastCompletedIndex = savedSteps.length > 0 ? steps.findIndex(s => s.id === savedSteps[savedSteps.length - 1]) : -1;
        const maxAllowedIndex = Math.min(lastCompletedIndex + 1, steps.length - 1);
        setMaxAllowedStep(steps[maxAllowedIndex].id);
        
        // Validate URL step against allowed steps
        if (urlStep) {
          const urlStepIndex = steps.findIndex(s => s.id === urlStep);
          if (urlStepIndex > maxAllowedIndex) {
            // User trying to access a step they haven't unlocked
            toast.error("Please complete the previous steps first.");
            setCurrentStep(nextStep);
            navigate(`/onboarding/user?step=${nextStep}`, { replace: true });
            return;
          }
          setCurrentStep(urlStep);
        } else {
          setCurrentStep(nextStep);
          navigate(`/onboarding/user?step=${nextStep}`, { replace: true });
        }
      } catch (err) {
        console.error("❌ Failed to fetch onboarding progress:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);
  const handleNext = async stepId => {
    const updatedSteps = [...new Set([...completedSteps, stepId])];
    setCompletedSteps(updatedSteps);
    try {
      const isLastStep = stepId === "photos";
      await updateOnboardingStatus({
        completedSteps: updatedSteps,
        isOnboardingCompleted: isLastStep
      });
      if (isLastStep) {
        toast.success("🎉 Onboarding completed successfully!");
      } else {
        const nextIndex = steps.findIndex(s => s.id === stepId) + 1;
        if (nextIndex < steps.length) {
          const nextStep = steps[nextIndex].id;
          setCurrentStep(nextStep);
          navigate(`/onboarding/user?step=${nextStep}`, {
            replace: true
          });
        }
      }
    } catch (err) {
      console.error("❌ Failed to update onboarding status:", err);
    }
  };
  const handlePrevious = stepId => {
    const prevIndex = steps.findIndex(s => s.id === stepId) - 1;
    if (prevIndex >= 0) {
      const prevStep = steps[prevIndex].id;
      setCurrentStep(prevStep);
      navigate(`/onboarding/user?step=${prevStep}`, {
        replace: true
      });
    }
  };
  const handleStepClick = id => {
    const clickedIndex = steps.findIndex(s => s.id === id);
    const maxAllowedIndex = steps.findIndex(s => s.id === maxAllowedStep);
    
    
    if (clickedIndex > maxAllowedIndex) {
      toast.error("Please complete the previous steps first.");
      return;
    }
    
   C
    if (clickedIndex >= 1 && !completedSteps.includes("personal")) {
      toast.error("Please complete Personal Details first.");
      setCurrentStep("personal");
      navigate("/onboarding/user?step=personal", { replace: true });
      return;
    }
    
    setCurrentStep(id);
    navigate(`/onboarding/user?step=${id}`, {
      replace: true
    });
  };
  useEffect(() => {
    async function checkUserReview() {
      const res = await getProfileReviewStatus();
      if (res.data.profileReviewStatus === "pending") {
        toast.error("Your profile is under review. You cannot edit your details at this time.");
        navigate("/onboarding/review", {
          replace: true
        });
      } else if (res.data.profileReviewStatus === "approved") {
        toast.success("Your profile has been approved! Redirecting to your dashboard.");
        navigate("/dashboard", {
          replace: true
        });
      }
    }
    checkUserReview();
  }, [currentStep]);
  const renderStep = () => {
    switch (currentStep) {
      case "personal":
        return <PersonalDetails onNext={() => handleNext("personal")} isCompleted={completedSteps.includes("personal")} />;
      case "family":
        return <FamilyDetails onNext={() => handleNext("family")} onPrevious={() => handlePrevious("family")} />;
      case "education":
        return <EducationDetails onNext={() => handleNext("education")} onPrevious={() => handlePrevious("education")} />;
      case "profession":
        return <ProfessionDetails onNext={() => handleNext("profession")} onPrevious={() => handlePrevious("profession")} />;
      case "health":
        return <HealthLifestyle onNext={() => handleNext("health")} onPrevious={() => handlePrevious("health")} />;
      case "expectation":
        return <ExpectationDetails onNext={() => handleNext("expectation")} onPrevious={() => handlePrevious("expectation")} />;
      case "photos":
        return <UploadPhotos onNext={() => handleNext("photos")} onPrevious={() => handlePrevious("photos")} />;
      default:
        return null;
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
        Loading your progress...
      </div>;
  }
  return <div className="min-h-screen flex flex-col items-center bg-[hsl(30,33%,97%)] px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-10 gap-6 sm:gap-8 md:gap-10">
      <StepIndicator steps={steps} completedSteps={completedSteps} currentStep={currentStep} onStepClick={handleStepClick} />
      <div className="w-full max-w-4xl bg-transparent pt-3 sm:p-5 md:p-8 transition-all duration-300">
        {renderStep()}
      </div>
    </div>;
};
export default MultiStepForm;