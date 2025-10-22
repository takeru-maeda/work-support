import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { EffortEntry, EffortFormData } from "@/features/effort/types";

const STORAGE_KEY = "work-support-effort";

interface ProjectBreakdownItem {
  project: string;
  estimated: number;
  actual: number;
  difference: number;
}

interface UseEffortFormManagerResult {
  formData: EffortFormData;
  setDate: (date?: Date) => void;
  setMemo: (value: string) => void;
  addEntry: () => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, field: keyof EffortEntry, value: string | number) => void;
  handleSubmit: () => void;
  projectBreakdown: ProjectBreakdownItem[];
  totalEstimated: number;
  totalActual: number;
  draggedIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragOver: (event: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
}

const createEmptyEntry = (): EffortEntry => ({
  id: Date.now().toString(),
  project: "",
  task: "",
  estimatedHours: 0,
  actualHours: 0,
});

export function useEffortFormManager(): UseEffortFormManagerResult {
  const [formData, setFormData] = useState<EffortFormData>({
    date: new Date(),
    entries: [],
    memo: "",
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as EffortFormData;
      setFormData({
        ...parsed,
        date: new Date(parsed.date),
      });
    } catch (error) {
      console.error("Failed to load saved effort data:", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...formData,
        date: formData.date.toISOString(),
      }),
    );
  }, [formData]);

  const setDate = useCallback((date?: Date) => {
    setFormData((prev) => ({
      ...prev,
      date: date ?? new Date(),
    }));
  }, []);

  const setMemo = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      memo: value,
    }));
  }, []);

  const addEntry = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      entries: [...prev.entries, createEmptyEntry()],
    }));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      entries: prev.entries.filter((entry) => entry.id !== id),
    }));
  }, []);

  const updateEntry = useCallback(
    (id: string, field: keyof EffortEntry, value: string | number) => {
      setFormData((prev) => ({
        ...prev,
        entries: prev.entries.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry,
        ),
      }));
    },
    [],
  );

  const projectBreakdown = useMemo<ProjectBreakdownItem[]>(() => {
    const breakdown = new Map<
      string,
      {
        estimated: number;
        actual: number;
      }
    >();

    formData.entries.forEach((entry) => {
      if (!entry.project) return;
      const current = breakdown.get(entry.project) ?? { estimated: 0, actual: 0 };
      breakdown.set(entry.project, {
        estimated: current.estimated + entry.estimatedHours,
        actual: current.actual + entry.actualHours,
      });
    });

    return Array.from(breakdown.entries()).map(([project, totals]) => ({
      project,
      estimated: totals.estimated,
      actual: totals.actual,
      difference: totals.actual - totals.estimated,
    }));
  }, [formData.entries]);

  const totalEstimated = useMemo(
    () => formData.entries.reduce((sum, entry) => sum + entry.estimatedHours, 0),
    [formData.entries],
  );

  const totalActual = useMemo(
    () => formData.entries.reduce((sum, entry) => sum + entry.actualHours, 0),
    [formData.entries],
  );

  const handleSubmit = useCallback(() => {
    console.log("Submitting:", formData);

    setFormData({
      date: new Date(),
      entries: [],
      memo: "",
    });
    localStorage.removeItem(STORAGE_KEY);

    alert("工数を送信しました");
  }, [formData]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent, index: number) => {
      event.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      setFormData((prev) => {
        const newEntries = [...prev.entries];
        const draggedItem = newEntries[draggedIndex];
        newEntries.splice(draggedIndex, 1);
        newEntries.splice(index, 0, draggedItem);
        return { ...prev, entries: newEntries };
      });

      setDraggedIndex(index);
    },
    [draggedIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return {
    formData,
    setDate,
    setMemo,
    addEntry,
    removeEntry,
    updateEntry,
    handleSubmit,
    projectBreakdown,
    totalEstimated,
    totalActual,
    draggedIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
