import * as React from "react";

import { cn } from "../../lib/utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none w-full rounded-md border border-[#D4A052] bg-white p-2.5 sm:p-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
