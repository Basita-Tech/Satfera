import React from "react";
import { Check } from "lucide-react";

const StepIndicator = ({ steps, completedSteps, currentStep, onStepClick }) => {
  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between max-w-3xl mx-auto relative">
        {steps.map((step, index) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex-1 relative flex items-center min-w-[100px]">
              {/* Step circle */}
              <div
                className="flex flex-col items-center cursor-pointer select-none z-10"
                onClick={() => onStepClick(step.id)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isDone
                      ? "bg-[#E8C27D] border-[#E8C27D] text-white" // ✅ Light gold for completed
                      : isActive
                      ? "border-[#D4A052] text-[#D4A052] bg-white" // ✅ Dark gold for current step
                      : "border-gray-300 text-gray-500 bg-white"
                  }`}
                >
                  {isDone ? <Check size={18} /> : index + 1}
                </div>

                {/* Step label */}
                <span
                  className={`text-xs mt-2 text-center ${
                    isDone
                      ? "text-black font-semibold" // ✅ Completed = darker/bolder black
                      : isActive
                      ? "text-black" // ✅ Active = normal black
                      : "text-gray-700" // ✅ Upcoming = lighter gray
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Horizontal line */}
              {!isLast && (
                <div
                  className="absolute top-1/2 left-1/2 h-0.5 w-full transform -translate-y-1/2 z-0"
                  style={{
                    backgroundColor: completedSteps.includes(step.id)
                      ? "#E8C27D" // ✅ Gold line for completed
                      : isActive
                      ? "#D4A052" // ✅ Dark gold for active
                      : "#D1D5DB", // Gray for upcoming
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
