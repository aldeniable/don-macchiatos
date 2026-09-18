"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuantityStepper({
  name,
  defaultValue,
  step = 1,
  min = 0,
  onValueChange,
}: {
  name: string;
  defaultValue: number;
  step?: number;
  min?: number;
  onValueChange?: (value: number) => void;
}) {
  function setValue(input: HTMLInputElement, next: number) {
    const value = Math.max(min, next);
    input.value = String(value);
    onValueChange?.(value);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="size-11"
        onClick={(event) => {
          const input = event.currentTarget.parentElement?.querySelector("input");
          if (!input) return;
          setValue(input, Number(input.value || 0) - step);
        }}
        aria-label="Decrease"
      >
        <Minus />
      </Button>
      <Input
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        defaultValue={defaultValue}
        className="h-11 w-20 text-center text-base"
        onChange={(event) => onValueChange?.(Number(event.target.value) || 0)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="size-11"
        onClick={(event) => {
          const input = event.currentTarget.parentElement?.querySelector("input");
          if (!input) return;
          setValue(input, Number(input.value || 0) + step);
        }}
        aria-label="Increase"
      >
        <Plus />
      </Button>
    </div>
  );
}
