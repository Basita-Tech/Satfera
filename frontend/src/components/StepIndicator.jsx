import React from "react";
import { Check } from "lucide-react";

const StepIndicator = ({ steps, completedSteps, currentStep, onStepClick }) => {
  return (
    <div className="w-full flex flex-col items-center px-3 sm:px-6 overflow-x-auto">
      {/* ✅ Logo Section */}
      <div className="flex flex-col items-center mb-4 w-full">
        <img
          src="/logo.png"
          alt="Satfera Logo"
          className="w-[140px] sm:w-[180px] md:w-[200px] object-contain"
        />
      </div>

      {/* ✅ Step Indicator Row */}
      <div className="w-full max-w-5xl overflow-x-auto scrollbar-hide">
        <div className="relative flex flex-nowrap items-center justify-start sm:justify-center gap-6 sm:gap-8 px-2 py-3 min-w-max">
          {steps.map((step, index) => {
            const isDone = completedSteps.includes(step.id);
            const isActive = currentStep === step.id;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.id}
                className="relative flex flex-col items-center cursor-pointer select-none min-w-[70px] sm:min-w-[90px]"
                onClick={() => onStepClick(step.id)}
              >
                {/* Connecting Line (placed first so it stays behind the circle) */}
                {!isLast && (
                  <div
                    className="absolute top-1/2 left-[calc(50%+18px)] sm:left-[calc(50%+22px)] h-[2px] w-[45px] sm:w-[70px] -translate-y-1/2 z-0"
                    style={{
                      backgroundColor: isDone
                        ? "#E8C27D"
                        : isActive
                        ? "#D4A052"
                        : "#D1D5DB",
                    }}
                  ></div>
                )}

                {/* Step Circle */}
                <div
                  className={`relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isDone
                      ? "bg-[#E8C27D] border-[#E8C27D] text-white"
                      : isActive
                      ? "border-[#D4A052] text-[#D4A052] bg-white"
                      : "border-gray-300 text-gray-500 bg-white"
                  }`}
                >
                  {isDone ? <Check size={18} /> : index + 1}
                </div>

                {/* Step Label */}
                <span
                  className={`text-[10px] sm:text-xs mt-2 text-center leading-tight ${
                    isDone
                      ? "text-black font-semibold"
                      : isActive
                      ? "text-black"
                      : "text-gray-600"
                  }`}
                  style={{
                    width: "70px",
                    maxWidth: "90px",
                    whiteSpace: "normal",
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
