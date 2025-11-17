
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../lib/utils";

export function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}) {
  const _values = React.useMemo(() => {
    return Array.isArray(value)
      ? value
      : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max];
  }, [value, defaultValue, min, max]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      {/* Track */}
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-[#f5f0e8] data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2"
        )}
      >
        {/* Range (active part) */}
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-[#c8a227] data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>

      {/* Thumbs */}
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block size-5 rounded-full bg-white border-[2px] border-[#c8a227] shadow-sm 
                     hover:ring-4 hover:ring-[#c8a227]/30 focus-visible:ring-4 focus-visible:ring-[#c8a227]/30 
                     transition-all"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
