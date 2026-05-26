import { useState, useEffect } from "react";
import { MedicalRecord } from "../types";
import { storageService } from "../services/storageService";

export function useRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    setRecords(storageService.getRecords());
  }, []);

  const addRecord = (recordData: Omit<MedicalRecord, "id">) => {
    const newRecord: MedicalRecord = {
      ...recordData,
      id: `record_${Date.now()}`,
    };
    const updated = [newRecord, ...records]; // Newest first
    setRecords(updated);
    storageService.saveRecords(updated);
    return newRecord;
  };

  const updateRecord = (id: string, updatedData: Partial<MedicalRecord>) => {
    const updated = records.map((r) => (r.id === id ? { ...r, ...updatedData } : r));
    setRecords(updated);
    storageService.saveRecords(updated);
  };

  const deleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    storageService.saveRecords(updated);
  };

  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}
