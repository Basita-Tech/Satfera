import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "../../lib/utils";
function Checkbox({
  className,
  ...props
}) {
  return <CheckboxPrimitive.Root data-slot="checkbox" className={cn("peer inline-flex items-center justify-center w-5 h-5 rounded-sm border border-gray-300 bg-white dark:bg-neutral-800 data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 disabled:opacity-50", className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex items-center justify-center text-current">
        <CheckIcon className="w-4 h-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>;
}
export { Checkbox };