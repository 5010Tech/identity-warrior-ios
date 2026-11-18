import { useState } from "react";

export type UserInterface = {
  progress: number;
  status: string;
  update: (value: number, status: string) => void;
};

export function useCreateUserInterface(): UserInterface {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");

  const update = (value: number, status: string): void => {
    setProgress(value);
    setStatus(status);
  };

  return {
    progress,
    status,
    update,
  };
}
