import { createElement, FC } from "react";
import { Control, useController } from "react-hook-form";

interface ComponentProps {
  value: any;
  onChange: (...e: any[]) => void;
  [x: string]: any;
}

interface ControlledInputProps<component extends FC<ComponentProps>> {
  component: component;
  control: Control<any>;
  name: string;
  [x: string]: any;
}

export const ControlledInput = <C extends FC<ComponentProps>>({
  component,
  control,
  name,
  ...props
}: ControlledInputProps<C>) => {
  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({
    control,
    name,
  });
  return createElement(component, {
    value,
    onChange,
    error: error?.message,
    ...props,
  });
};
