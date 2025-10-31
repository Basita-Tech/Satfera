import React from "react";
import { Check } from "lucide-react";

const StepIndicator = ({ steps, completedSteps, currentStep, onStepClick }) => {
  return (
    <div className="w-full relative flex flex-col items-center">
      {/* ✅ Satfera logo + text above the step indicator */}
      <div className="flex flex-col items-center mb-4">
        <span className="text-[#D4A052] font-semibold text-xl mb-1"></span>
        <img src="/logo.png" width={150} height={150} alt="Satfera Logo" />
      </div>

      {/* Step Indicator section */}
      <div className="flex items-center justify-between max-w-3xl w-full relative">
        {steps.map((step, index) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className="flex-1 relative flex items-center min-w-[100px]"
            >
              {/* Step circle */}
              <div
                className="flex flex-col items-center cursor-pointer select-none z-10"
                onClick={() => onStepClick(step.id)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isDone
                      ? "bg-[#E8C27D] border-[#E8C27D] text-white"
                      : isActive
                      ? "border-[#D4A052] text-[#D4A052] bg-white"
                      : "border-gray-300 text-gray-500 bg-white"
                  }`}
                >
                  {isDone ? <Check size={18} /> : index + 1}
                </div>

                {/* Step label */}
                <span
                  className={`text-xs mt-2 text-center ${
                    isDone
                      ? "text-black font-semibold"
                      : isActive
                      ? "text-black"
                      : "text-gray-700"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className="absolute top-1/2 left-1/2 h-0.5 w-full transform -translate-y-1/2 z-0"
                  style={{
                    backgroundColor: completedSteps.includes(step.id)
                      ? "#E8C27D"
                      : isActive
                      ? "#D4A052"
                      : "#D1D5DB",
                  }}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
