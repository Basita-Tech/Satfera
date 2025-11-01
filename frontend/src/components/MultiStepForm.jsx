import React, { useState, useEffect } from "react";
import StepIndicator from "./StepIndicator";
import PersonalDetails from "./forms/PersonalDetails";
import FamilyDetails from "./forms/FamilyDetails";
import EducationDetails from "./forms/EducationDetails";
import ProfessionDetails from "./forms/ProfessionalDetails";
import HealthLifestyle from "./forms/HealthLifestyle";
import ExpectationDetails from "./forms/ExpectationDetails";
import { getOnboardingStatus, updateOnboardingStatus } from "../api/auth";
import { useLocation, useNavigate } from "react-router-dom";

const steps = [
  { id: "personal", label: "Personal Details" },
  { id: "family", label: "Family Details" },
  { id: "education", label: "Educational Details" },
  { id: "profession", label: "Professional Details" },
  { id: "health", label: "Health & Lifestyle" },
  { id: "expectation", label: "Expectation Details" },
];

const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState("personal");
  const [completedSteps, setCompletedSteps] = useState([]);
  const [maxAllowedStep, setMaxAllowedStep] = useState("personal");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ✅ Fetch onboarding progress
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
  const res = await getOnboardingStatus();
  // API returns { success: true, data: { completedSteps: [...] } }
  const savedSteps = res?.data?.data?.completedSteps || [];
        console.log("📥 Onboarding progress from backend:", savedSteps);

        setCompletedSteps(savedSteps);

        let nextStep = "personal";
        for (const s of steps) {
          if (!savedSteps.includes(s.id)) {
            nextStep = s.id;
            break;
          }
        }

        const lastCompletedIndex =
          savedSteps.length > 0
            ? steps.findIndex((s) => s.id === savedSteps[savedSteps.length - 1])
            : 0;

        const maxAllowedIndex = Math.min(lastCompletedIndex + 1, steps.length - 1);
        const maxAllowed = steps[maxAllowedIndex].id;

        setMaxAllowedStep(maxAllowed);
        setCurrentStep(nextStep);

        navigate(`/onboarding/user?step=${nextStep}`, { replace: true });
      } catch (err) {
        console.error("❌ Failed to fetch onboarding progress:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  // ✅ Save progress and go to next
  const handleNext = async (stepId) => {
    const updatedSteps = [...new Set([...completedSteps, stepId])];
    setCompletedSteps(updatedSteps);

    try {
      if (stepId === "expectation") {
        await updateOnboardingStatus({
          completedSteps: updatedSteps,
          isOnboardingCompleted: true,
        });
        alert("🎉 Onboarding completed successfully!");
      } else {
        await updateOnboardingStatus({ completedSteps: updatedSteps });
        const nextIndex = steps.findIndex((s) => s.id === stepId) + 1;
        if (nextIndex < steps.length) {
          const nextStep = steps[nextIndex].id;
          setCurrentStep(nextStep);
          navigate(`/onboarding/user?step=${nextStep}`, { replace: true });
        }
      }
    } catch (err) {
      console.error("❌ Failed to update onboarding status:", err);
    }
  };

  const handlePrevious = (stepId) => {
    const prevIndex = steps.findIndex((s) => s.id === stepId) - 1;
    if (prevIndex >= 0) {
      const prevStep = steps[prevIndex].id;
      setCurrentStep(prevStep);
      navigate(`/onboarding/user?step=${prevStep}`, { replace: true });
    }
  };

  const handleStepClick = (id) => {
    const clickedIndex = steps.findIndex((s) => s.id === id);
    const maxAllowedIndex = steps.findIndex((s) => s.id === maxAllowedStep);

    if (clickedIndex <= maxAllowedIndex) {
      setCurrentStep(id);
      navigate(`/onboarding/user?step=${id}`, { replace: true });
    } else {
      alert("⚠️ You can only go one step ahead of your last completed step.");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "personal":
        return (
          <PersonalDetails
            onNext={() => handleNext("personal")}
            isCompleted={completedSteps.includes("personal")}
          />
        );
      case "family":
        return (
          <FamilyDetails
            onNext={() => handleNext("family")}
            onPrevious={() => handlePrevious("family")}
          />
        );
      case "education":
        return (
          <EducationDetails
            onNext={() => handleNext("education")}
            onPrevious={() => handlePrevious("education")}
          />
        );
      case "profession":
        return (
          <ProfessionDetails
            onNext={() => handleNext("profession")}
            onPrevious={() => handlePrevious("profession")}
          />
        );
      case "health":
        return (
          <HealthLifestyle
            onNext={() => handleNext("health")}
            onPrevious={() => handlePrevious("health")}
          />
        );
      case "expectation":
        return (
          <ExpectationDetails
            onNext={() => handleNext("expectation")}
            onPrevious={() => handlePrevious("expectation")}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
        Loading your progress...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-6 gap-10 bg-[hsl(30,33%,97%)]">
      <StepIndicator
        steps={steps}
        completedSteps={completedSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />
      <div className="p-8 w-full max-w-3xl transition-all duration-300">
        {renderStep()}
      </div>
    </div>
  );
};

export default MultiStepForm;
