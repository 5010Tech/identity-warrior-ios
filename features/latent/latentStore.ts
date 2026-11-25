import { useSyncExternalStore } from "react";

/** A scaled latent print from the contactless (Digital Lift) capture. */
export interface LatentPrint {
  id: number;
  dpi: number;
  width: number;
  height: number;
  pngBase64: string;
}

/**
 * The latent prints of this session. Held in memory only, outside the screen,
 * so the list survives going to the transaction form and back. Nothing is
 * written to the phone until a print is saved or put in a transaction.
 */
let prints: LatentPrint[] = [];
const listeners = new Set<() => void>();

const publish = (next: LatentPrint[]) => {
  prints = next;
  listeners.forEach((listener) => listener());
};

export const addLatentPrints = (added: LatentPrint[]) =>
  publish([...prints, ...added]);

export const removeLatentPrint = (id: number) =>
  publish(prints.filter((print) => print.id !== id));

export const clearLatentPrints = () => publish([]);

export const getLatentPrint = (id: number) =>
  prints.find((print) => print.id === id);

/** Position of a print in the list, from 1, as its card title shows. */
export const latentPrintNumber = (id: number) =>
  prints.findIndex((print) => print.id === id) + 1;

export const useLatentPrints = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => prints,
  );
