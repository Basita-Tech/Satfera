import React from "react";
import { Check } from "lucide-react";
const StepIndicator = ({
  steps,
  completedSteps = [],
  currentStep,
  onStepClick
}) => {
  const progressPercent = steps.length > 1 ? (completedSteps.length - 1) / (steps.length - 1) * 100 : 0;
  return <div className="w-full flex flex-col items-center px-3 sm:px-6">
      {}
      <div className="flex flex-col items-center mb-6">
        <img src="/logo.png" alt="Satfera Logo" className="w-[140px] sm:w-[180px] md:w-[200px] object-contain" />
      </div>

      {}
      <div className="w-full overflow-x-auto scrollbar-hide nav-progres-bar flex justify-center max-sm:block">
        <div className="relative flex items-center gap-4 sm:gap-6 md:gap-8 px-4 min-w-fit">
          {}
          <div className="absolute top-[35%] left-0 right-0 h-[2px] bg-gray-300 z-0"></div>

          {}
          <div className="absolute top-[35%] left-0 h-[2px] bg-[#E8C27D] z-[1] transition-all duration-500" style={{
          width: `${progressPercent}%`
        }}></div>

          {}
          {steps.map((step, index) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          return <div key={step.id} onClick={() => onStepClick(step.id)} className="flex flex-col items-center text-center relative z-10 cursor-pointer select-none">
                {}
                <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all duration-300 ${isDone ? "bg-[#E8C27D] border-[#E8C27D] text-white" : isActive ? "border-[#D4A052] text-[#D4A052] bg-white" : "border-gray-300 text-gray-500 bg-white"}`}>
                  {isDone ? <Check size={18} /> : index + 1}
                </div>

                {}
                <span className={`mt-2 text-[10px] sm:text-[12px] font-medium leading-tight whitespace-nowrap ${isDone ? "text-black" : isActive ? "text-[#D4A052]" : "text-gray-700"}`}>
                  {step.label}
                </span>
              </div>;
        })}
        </div>
      </div>
    </div>;
};
export default StepIndicator;