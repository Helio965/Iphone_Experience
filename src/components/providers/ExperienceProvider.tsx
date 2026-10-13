"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS, type Finish, type ModelId } from "@/data/products";

interface ExperienceContextValue {
  model: ModelId;
  setModel: (id: ModelId) => void;
  /** Selected finish id per model. */
  finishes: Record<ModelId, string>;
  setFinish: (model: ModelId, finishId: string) => void;
  finishOf: (model: ModelId) => Finish;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export const DEFAULT_FINISHES: Record<ModelId, string> = { proMax: "silver", duo: "star-white" };

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<ModelId>("proMax");
  const [finishes, setFinishes] = useState<Record<ModelId, string>>(DEFAULT_FINISHES);

  const value = useMemo<ExperienceContextValue>(
    () => ({
      model,
      setModel,
      finishes,
      setFinish: (m, id) => setFinishes((prev) => (prev[m] === id ? prev : { ...prev, [m]: id })),
      finishOf: (m) => PRODUCTS[m].finishes.find((f) => f.id === finishes[m]) ?? PRODUCTS[m].finishes[0],
    }),
    [model, finishes],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience() {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience must be used inside <ExperienceProvider>");
  return ctx;
}
