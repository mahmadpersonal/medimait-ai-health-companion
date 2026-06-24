import React, { useEffect, useState, useRef } from "react";
import { Camera as CameraIcon, Image as ImageIcon, Loader2, AlertCircle, Trash2, Edit2, Play, Save, Plus, Bell, Check, RotateCcw, Eye, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { AppSettings, Medicine, PrescriptionScanResult, Profile, MedicalRecord, Reminder, ScanDraft } from "../types";
import { aiVisionService } from "../services/aiVisionService";
import { usageLimitService } from "../services/usageLimitService";

interface ScanPageProps {
  onAddRecord: (record: Omit<MedicalRecord, "id">) => MedicalRecord;
  onAddReminder: (reminder: Omit<Reminder, "id" | "history">) => void;
  profiles: Profile[];
  setActiveTab: (tab: "scan" | "pills" | "files" | "chat" | "me") => void;
  pillsCount: number;
  scanDraft: ScanDraft;
  onScanDraftChange: React.Dispatch<React.SetStateAction<ScanDraft>>;
  onNewScan: () => void;
  settings?: AppSettings;
}

export function ScanPage({ onAddRecord, onAddReminder, profiles, setActiveTab, pillsCount, scanDraft, onScanDraftChange, onNewScan, settings }: ScanPageProps) {
  const { image, pendingCameraImage, scanResult, selectedProfileId, recordNotes, remindersSaved, recordSaved } = scanDraft;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualAddMode, setManualAddMode] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);

  // Form for manually adding or editing medicines
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);

  // Temp medicine state for adding/editing
  const [tempMedicine, setTempMedicine] = useState<Omit<Medicine, "id">>({
    name: "",
    salt: "",
    dosage: "",
    timing: "Morning",
    duration: "5 days",
    instructions: "After food",
    purpose: "",
    sideEffects: "",
    precautions: "",
  });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const myselfProfileId = profiles.find((profile) => profile.type === "Myself")?.id || profiles[0]?.id || "";
  const compactCards = settings?.compactMedicineCards;
  const quietSafetyCopy = settings?.quietSafetyCopy;
  const isUrdu = settings?.language === "ur";
  const text = {
    brand: isUrdu ? "\u0645\u06cc\u0688\u06cc \u0645\u06cc\u0679" : "MediMait",
    scan: isUrdu ? "\u0627\u0633\u06a9\u06cc\u0646" : "Scan",
    scanSubtitle: isUrdu ? "\u0646\u0633\u062e\u06c1 \u0627\u0633\u06a9\u06cc\u0646 \u06a9\u0631\u06cc\u06ba \u0627\u0648\u0631 \u062f\u0648\u0627 \u06a9\u06cc \u062a\u0641\u0635\u06cc\u0644 \u062f\u06cc\u06a9\u06be\u06cc\u06ba\u06d4" : "Scan prescriptions and review medicine details.",
    scanPrescription: isUrdu ? "\u0646\u0633\u062e\u06c1 \u0627\u0633\u06a9\u06cc\u0646 \u06a9\u0631\u06cc\u06ba" : "Scan Prescription",
    scanHelp: isUrdu ? "\u062a\u0635\u0648\u06cc\u0631 \u0644\u06cc\u06ba \u06cc\u0627 \u0646\u0633\u062e\u06c1 \u0627\u067e \u0644\u0648\u0688 \u06a9\u0631\u06cc\u06ba\u06d4" : "Take a photo or upload a prescription.",
    camera: isUrdu ? "\u06a9\u06cc\u0645\u0631\u06c1" : "Camera",
    gallery: isUrdu ? "\u06af\u06cc\u0644\u0631\u06cc" : "Gallery",
    newScan: isUrdu ? "\u0646\u06cc\u0627 \u0627\u0633\u06a9\u06cc\u0646" : "New Scan",
    retake: isUrdu ? "\u062f\u0648\u0628\u0627\u0631\u06c1" : "Retake",
    usePhoto: isUrdu ? "\u062a\u0635\u0648\u06cc\u0631 \u0627\u0633\u062a\u0639\u0645\u0627\u0644 \u06a9\u0631\u06cc\u06ba" : "Use Photo",
    analyzing: isUrdu ? "\u0646\u0633\u062e\u06c1 \u067e\u0691\u06be\u0627 \u062c\u0627 \u0631\u06c1\u0627 \u06c1\u06d2..." : "Reading prescription...",
    analyzingHelp: isUrdu ? "\u062f\u0648\u0627\u0624\u06ba\u060c \u062e\u0648\u0631\u0627\u06a9 \u0627\u0648\u0631 \u06c1\u062f\u0627\u06cc\u0627\u062a \u0646\u06a9\u0627\u0644\u06cc \u062c\u0627 \u0631\u06c1\u06cc \u06c1\u06cc\u06ba\u06d4" : "Extracting medicines, dosage, salts, and instructions.",
    extractionIncomplete: isUrdu ? "\u0627\u0633\u06a9\u06cc\u0646 \u0645\u06a9\u0645\u0644 \u0646\u06c1\u06cc\u06ba \u06c1\u0648\u0627" : "Extraction Incomplete",
    clear: isUrdu ? "\u062e\u062a\u0645" : "Clear",
    prescriptionImage: isUrdu ? "\u0646\u0633\u062e\u06c1 \u06a9\u06cc \u062a\u0635\u0648\u06cc\u0631" : "Prescription Image",
    view: isUrdu ? "\u062f\u06cc\u06a9\u06be\u06cc\u06ba" : "View",
    save: isUrdu ? "\u0633\u06cc\u0648" : "Save",
    scanDetails: isUrdu ? "\u0627\u0633\u06a9\u06cc\u0646 \u062a\u0641\u0635\u06cc\u0644" : "Scan Details",
    prescribedFor: isUrdu ? "\u0645\u0631\u06cc\u0636" : "Prescribed For",
    doctor: isUrdu ? "\u0688\u0627\u06a9\u0679\u0631" : "Doctor",
    clinic: isUrdu ? "\u06a9\u0644\u06cc\u0646\u06a9 / \u06c1\u0633\u067e\u062a\u0627\u0644" : "Clinic / Hospital",
    condition: isUrdu ? "\u062d\u0627\u0644\u062a" : "Condition",
    notDetected: isUrdu ? "\u0645\u0639\u0644\u0648\u0645 \u0646\u06c1\u06cc\u06ba" : "Not detected",
    generalSymptoms: isUrdu ? "\u0639\u0627\u0645 \u0639\u0644\u0627\u0645\u0627\u062a" : "General symptoms",
    medicinesExtracted: isUrdu ? "\u062f\u0648\u0627\u0626\u06cc\u0627\u06ba" : "Medicines Extracted",
    salt: isUrdu ? "\u0633\u0627\u0644\u0679" : "Salt",
    duration: isUrdu ? "\u0645\u062f\u062a" : "Duration",
    purpose: isUrdu ? "\u06a9\u06cc\u0627 \u06a9\u0631\u062a\u06cc \u06c1\u06d2" : "What it does",
    instructions: isUrdu ? "\u06c1\u062f\u0627\u06cc\u0627\u062a" : "Instructions",
    sideEffects: isUrdu ? "\u0645\u0645\u06a9\u0646\u06c1 \u0627\u062b\u0631\u0627\u062a" : "Side effects",
    precaution: isUrdu ? "\u0627\u062d\u062a\u06cc\u0627\u0637" : "Precaution",
    addMedicine: isUrdu ? "\u062f\u0648\u0627 \u0634\u0627\u0645\u0644 \u06a9\u0631\u06cc\u06ba" : "Add medicine",
    profileAllocation: isUrdu ? "\u0645\u0631\u06cc\u0636 \u067e\u0631\u0648\u0641\u0627\u0626\u0644" : "Patient Profile",
    prescriptionFor: isUrdu ? "\u06cc\u06c1 \u0646\u0633\u062e\u06c1 \u06a9\u0633 \u06a9\u06d2 \u0644\u06cc\u06d2 \u06c1\u06d2\u061f" : "Who is this prescription for?",
    addToPills: isUrdu ? "\u067e\u0644\u0632 \u0645\u06cc\u06ba \u0634\u0627\u0645\u0644" : "Add to Pills",
    addedToPills: isUrdu ? "\u067e\u0644\u0632 \u0645\u06cc\u06ba \u0634\u0627\u0645\u0644 \u06c1\u0648 \u06af\u06cc\u0627" : "Added to Pills",
    saveRecord: isUrdu ? "\u0631\u06cc\u06a9\u0627\u0631\u0688 \u0633\u06cc\u0648" : "Save Record",
    recordSaved: isUrdu ? "\u0631\u06cc\u06a9\u0627\u0631\u0688 \u0633\u06cc\u0648 \u06c1\u0648 \u06af\u06cc\u0627" : "Record Saved",
    recentScans: isUrdu ? "\u062d\u0627\u0644\u06cc\u06c1 \u0627\u0633\u06a9\u06cc\u0646" : "Recent Scans",
    noScan: isUrdu ? "\u0627\u0628\u06be\u06cc \u06a9\u0648\u0626\u06cc \u0627\u0633\u06a9\u06cc\u0646 \u0646\u06c1\u06cc\u06ba" : "No scan results found",
    noScanHelp: isUrdu ? "\u0646\u0633\u062e\u06c1 \u06a9\u06cc \u062a\u0635\u0648\u06cc\u0631 \u0644\u06cc\u06ba \u06cc\u0627 \u0627\u067e \u0644\u0648\u0688 \u06a9\u0631\u06cc\u06ba\u06d4" : "Take or upload a prescription to extract medication data.",
    editMedicine: isUrdu ? "\u062f\u0648\u0627 \u06a9\u06cc \u062a\u0641\u0635\u06cc\u0644 \u0628\u062f\u0644\u06cc\u06ba" : "Edit Medicine",
    cancel: isUrdu ? "\u0645\u0646\u0633\u0648\u062e" : "Cancel",
    medicineName: isUrdu ? "\u062f\u0648\u0627 \u06a9\u0627 \u0646\u0627\u0645" : "Medicine Name",
    saltGeneric: isUrdu ? "\u0633\u0627\u0644\u0679 / \u062c\u0646\u0631\u06a9 \u062c\u0632" : "Salt / Generic Ingredient",
    dosage: isUrdu ? "\u062e\u0648\u0631\u0627\u06a9" : "Dosage",
    timing: isUrdu ? "\u0648\u0642\u062a" : "Timing",
    morning: isUrdu ? "\u0635\u0628\u062d" : "Morning",
    afternoon: isUrdu ? "\u062f\u0648\u067e\u06c1\u0631" : "Afternoon",
    evening: isUrdu ? "\u0634\u0627\u0645" : "Evening",
    night: isUrdu ? "\u0631\u0627\u062a" : "Night",
    applyEdits: isUrdu ? "\u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0645\u062d\u0641\u0648\u0638" : "Save Changes",
    addEntry: isUrdu ? "\u062f\u0648\u0627 \u0634\u0627\u0645\u0644" : "Add Medicine",
    allMedicinesDeleted: isUrdu ? "\u062a\u0645\u0627\u0645 \u062f\u0648\u0627\u0626\u06cc\u0627\u06ba \u062d\u0630\u0641 \u06c1\u0648 \u06af\u0626\u06cc\u06ba\u06d4 \u062f\u0648\u0627 \u0634\u0627\u0645\u0644 \u06a9\u0631\u06cc\u06ba \u06cc\u0627 \u0646\u06cc\u0627 \u0627\u0633\u06a9\u06cc\u0646 \u06a9\u0631\u06cc\u06ba\u06d4" : "All medicines were deleted. Add one manually or start a new scan.",
    verifyShort: isUrdu ? "\u062f\u0648\u0627 \u0644\u06cc\u0646\u06d2 \u0633\u06d2 \u067e\u06c1\u0644\u06d2 \u0688\u0627\u06a9\u0679\u0631 \u06cc\u0627 \u0641\u0627\u0631\u0645\u0627\u0633\u0633\u0679 \u0633\u06d2 \u062a\u0635\u062f\u06cc\u0642 \u06a9\u0631\u06cc\u06ba\u06d4" : "Verify medicines with your doctor or pharmacist before use.",
    verifyFull: isUrdu ? "\u062f\u0648\u0627 \u06a9\u0627 \u0646\u0627\u0645\u060c \u0648\u0642\u062a\u060c \u062e\u0648\u0631\u0627\u06a9 \u0627\u0648\u0631 \u06c1\u062f\u0627\u06cc\u0627\u062a \u062f\u0648\u0627 \u0644\u06cc\u0646\u06d2\u060c \u0628\u062f\u0644\u0646\u06d2 \u06cc\u0627 \u0631\u0648\u06a9\u0646\u06d2 \u0633\u06d2 \u067e\u06c1\u0644\u06d2 \u0688\u0627\u06a9\u0679\u0631 \u06cc\u0627 \u0641\u0627\u0631\u0645\u0627\u0633\u0633\u0679 \u0633\u06d2 \u0636\u0631\u0648\u0631 \u0645\u0644\u0627 \u0644\u06cc\u06ba\u06d4" : "Always confirm medicine names, timing, dosage, and instructions with your doctor or pharmacist before taking, changing, or stopping any prescription.",
    noProfiles: isUrdu ? "\u0627\u0628\u06be\u06cc \u06a9\u0648\u0626\u06cc \u067e\u0631\u0648\u0641\u0627\u0626\u0644 \u0646\u06c1\u06cc\u06ba\u06d4 \u067e\u06c1\u0644\u06d2 Me \u0645\u06cc\u06ba \u067e\u0631\u0648\u0641\u0627\u0626\u0644 \u0628\u0646\u0627\u0626\u06cc\u06ba\u06d4" : "No profiles yet. Add a profile from Me first.",
    remindersAlreadySaved: isUrdu ? "\u0631\u06cc\u0645\u0627\u0626\u0646\u0688\u0631\u0632 \u067e\u06c1\u0644\u06d2 \u0634\u0627\u0645\u0644 \u06c1\u0648 \u0686\u06a9\u06d2 \u06c1\u06cc\u06ba" : "Reminders already added",
    recordAlreadySaved: isUrdu ? "\u0631\u06cc\u06a9\u0627\u0631\u0688 \u067e\u06c1\u0644\u06d2 \u0633\u06cc\u0648 \u06c1\u0648 \u0686\u06a9\u0627 \u06c1\u06d2" : "Record already saved",
    zoomOut: isUrdu ? "\u0632\u0648\u0645 \u0622\u0624\u0679" : "Zoom out",
    zoomIn: isUrdu ? "\u0632\u0648\u0645 \u0627\u0646" : "Zoom in",
    resetZoom: isUrdu ? "\u0632\u0648\u0645 \u0631\u06cc \u0633\u06cc\u0679" : "Reset zoom",
    close: isUrdu ? "\u0628\u0646\u062f" : "Close",
  };

  const detailText = (value: string | undefined, fallback = text.notDetected) => {
    const cleaned = (value || "").trim();
    return cleaned || fallback;
  };

  const updateDraft = (patch: Partial<ScanDraft>) => {
    onScanDraftChange((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    if (!selectedProfileId && myselfProfileId) {
      updateDraft({ selectedProfileId: myselfProfileId });
    }
  }, [selectedProfileId, myselfProfileId]);

  // File change handler
  const handleCameraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, true);
    }
    e.target.value = "";
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = "";
  };

  const processFile = (file: File, reviewBeforeScan = false) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string;
        if (reviewBeforeScan) {
          updateDraft({ pendingCameraImage: base64, scanResult: null, remindersSaved: false, recordSaved: false });
          setError(null);
        } else {
          updateDraft({ image: base64, scanResult: null, remindersSaved: false, recordSaved: false });
          handleScan(base64);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle OCR scanning using aiVisionService
  const handleScan = async (base64Img: string) => {
    if (!usageLimitService.canUse("prescriptionScans", 2)) {
      setError(usageLimitService.message);
      updateDraft({ scanResult: null });
      return;
    }

    usageLimitService.recordUse("prescriptionScans");
    setLoading(true);
    setError(null);
    setNotice(null);
    updateDraft({ scanResult: null, remindersSaved: false, recordSaved: false });

    try {
      const result = await aiVisionService.scanPrescriptionImage(base64Img, settings?.language || "en");
      updateDraft({ scanResult: result });
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          (isUrdu ? "\u0627\u0633\u06a9\u06cc\u0646 \u0645\u06a9\u0645\u0644 \u0646\u06c1\u06cc\u06ba \u06c1\u0648 \u0633\u06a9\u0627\u06d4 \u062a\u0635\u0648\u06cc\u0631 \u0648\u0627\u0636\u062d \u06a9\u0631 \u06a9\u06d2 \u062f\u0648\u0628\u0627\u0631\u06c1 \u06a9\u0648\u0634\u0634 \u06a9\u0631\u06cc\u06ba\u06d4" : "Scanning failed. Please try again with a clearer prescription photo.")
      );
    } finally {
      setLoading(false);
    }
  };

  const triggerCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          promptLabelHeader: "Prescription photo",
          promptLabelPhoto: "Use camera",
          promptLabelPicture: "Take photo",
        });
        if (photo.dataUrl) {
          updateDraft({ pendingCameraImage: photo.dataUrl, scanResult: null, remindersSaved: false, recordSaved: false });
          setError(null);
        }
      } catch (err: any) {
        if (!String(err?.message || "").toLowerCase().includes("cancel")) {
          setError("Camera could not be opened. Please check camera permission and try again.");
        }
      }
      return;
    }

    cameraInputRef.current?.click();
  };

  const triggerGallery = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        if (photo.dataUrl) {
          updateDraft({ image: photo.dataUrl, scanResult: null, remindersSaved: false, recordSaved: false });
          handleScan(photo.dataUrl);
        }
      } catch (err: any) {
        if (!String(err?.message || "").toLowerCase().includes("cancel")) {
          setError("Gallery could not be opened. Please check photo permission and try again.");
        }
      }
      return;
    }

    galleryInputRef.current?.click();
  };

  const acceptCameraImage = () => {
    if (!pendingCameraImage) return;
    updateDraft({ image: pendingCameraImage, pendingCameraImage: null });
    handleScan(pendingCameraImage);
  };

  const retakeCameraImage = () => {
    updateDraft({ pendingCameraImage: null });
    triggerCamera();
  };

  // Medicine edits inside scan review
  const handleEditMedicine = (med: Medicine) => {
    setEditingMedicineId(med.id);
    setTempMedicine({
      name: med.name,
      salt: med.salt || "",
      dosage: med.dosage,
      timing: med.timing,
      duration: med.duration,
      instructions: med.instructions,
      purpose: med.purpose,
      sideEffects: med.sideEffects || "",
      precautions: med.precautions || "",
    });
  };

  const handleSaveEditedMedicine = () => {
    if (!scanResult) return;
    const updatedMedicines = scanResult.medicines.map((m) =>
      m.id === editingMedicineId ? { ...m, ...tempMedicine } : m
    );
    updateDraft({ scanResult: { ...scanResult, medicines: updatedMedicines } });
    setEditingMedicineId(null);
  };

  const handleDeleteMedicine = (medId: string) => {
    if (!scanResult) return;
    const updated = scanResult.medicines.filter((m) => m.id !== medId);
    updateDraft({ scanResult: { ...scanResult, medicines: updated } });
  };

  // Manually add medicine option
  const handleAddMedicineManually = () => {
    const newMed: Medicine = {
      id: `manual_${Date.now()}`,
      ...tempMedicine,
    };

    if (scanResult) {
      updateDraft({
        scanResult: { ...scanResult, medicines: [...scanResult.medicines, newMed] },
        remindersSaved: false,
        recordSaved: false,
      });
    } else {
      updateDraft({
        scanResult: {
          id: `scan_manual_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          medicines: [newMed],
        },
        remindersSaved: false,
        recordSaved: false,
      });
    }

    setManualAddMode(false);
    // Reset form
    setTempMedicine({
      name: "",
      salt: "",
      dosage: "",
      timing: "Morning",
      duration: "5 days",
      instructions: "After food",
      purpose: "",
      sideEffects: "",
      precautions: "",
    });
  };

  // Final Action: Save prescription metadata as medical record in FILES
  const handleSaveAsRecord = () => {
    if (!scanResult || scanResult.medicines.length === 0) return;
    if (recordSaved) {
      setNotice(isUrdu ? "\u06cc\u06c1 \u0631\u06cc\u06a9\u0627\u0631\u0688 \u067e\u06c1\u0644\u06d2 \u0633\u06cc\u0648 \u06c1\u0648 \u0686\u06a9\u0627 \u06c1\u06d2\u06d4" : "This record is already saved.");
      return;
    }

    // Default to first profile if exists, else "Unassigned"
    const profileId = selectedProfileId || myselfProfileId;

    const newRecord: Omit<MedicalRecord, "id"> = {
      title: scanResult.condition ? `Prescription - ${scanResult.condition}` : `Prescription scan ${scanResult.date}`,
      doctorName: scanResult.doctorName || "Not specified",
      clinicHospital: scanResult.clinicName || "Not specified",
      date: scanResult.date,
      patientProfileId: profileId,
      prescriptionImage: image || undefined,
      medicines: scanResult.medicines,
      notes: recordNotes || "Saved prescription record.",
    };

    onAddRecord(newRecord);
    updateDraft({ recordSaved: true, selectedProfileId: profileId });
    setNotice(isUrdu ? "\u0631\u06cc\u06a9\u0627\u0631\u0688 \u0633\u06cc\u0648 \u06c1\u0648 \u06af\u06cc\u0627\u06d4" : "Record saved.");
  };

  // Final Action: Add scanned medicines directly to Pills Reminder
  const handleAddToPillsReminders = () => {
    if (!scanResult || scanResult.medicines.length === 0) return;
    if (remindersSaved) {
      setNotice(isUrdu ? "\u06cc\u06c1 \u062f\u0648\u0627\u0626\u06cc \u0631\u06cc\u0645\u0627\u0626\u0646\u0688\u0631\u0632 \u067e\u06c1\u0644\u06d2 \u0634\u0627\u0645\u0644 \u06c1\u0648 \u0686\u06a9\u06d2 \u06c1\u06cc\u06ba\u06d4" : "These pill reminders are already added.");
      return;
    }

    const profileId = selectedProfileId || myselfProfileId;

    scanResult.medicines.forEach((med) => {
      // Determine appropriate timing group
      let group: "Morning" | "Afternoon" | "Evening" | "Night" = "Morning";
      const timingLower = String(med.timing).toLowerCase();
      if (timingLower.includes("afternoon")) {
        group = "Afternoon";
      } else if (timingLower.includes("evening")) {
        group = "Evening";
      } else if (timingLower.includes("night") || timingLower.includes("sleep") || timingLower.includes("bedtime")) {
        group = "Night";
      }

      onAddReminder({
        medicineName: med.name,
        dose: med.dosage,
        time: group === "Morning" ? "08:00" : group === "Afternoon" ? "13:00" : group === "Evening" ? "18:00" : "21:00",
        timingGroup: group,
        frequency: "Daily",
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startDate: new Date().toISOString().split("T")[0],
        notes: `${med.salt ? `Salt: ${med.salt}. ` : ""}${med.instructions}. Purpose: ${med.purpose}`,
        patientProfileId: profileId,
      });
    });

    updateDraft({ remindersSaved: true, selectedProfileId: profileId });
    setNotice(isUrdu ? "\u062f\u0648\u0627\u0626\u06cc \u0631\u06cc\u0645\u0627\u0626\u0646\u0688\u0631\u0632 \u067e\u0644\u0632 \u0645\u06cc\u06ba \u0634\u0627\u0645\u0644 \u06c1\u0648 \u06af\u0626\u06d2\u06d4" : `${scanResult.medicines.length} reminder${scanResult.medicines.length === 1 ? "" : "s"} added to Pills.`);
  };

  const downloadImage = (source: string, filename = "medimait-prescription.png") => {
    const link = document.createElement("a");
    link.href = source;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotice("Prescription image download started.");
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 select-none">
      <div className="flex justify-between items-center mb-1">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            {text.brand}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{text.scan}</h1>
          <p className="text-xs text-slate-500 font-medium">{text.scanSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("pills")}
            className="relative w-10 h-10 rounded-full bg-white border border-slate-100 text-blue-600 flex items-center justify-center shadow-xs active:scale-95"
            title="Pill reminders"
          >
            <Bell className="w-5 h-5" />
            {pillsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
                {pillsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Primary Scan Upload Box */}
      <div
        ref={dragRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="mt-4 bg-gradient-to-br from-blue-600 to-blue-500 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 text-center relative overflow-hidden group"
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
        <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-lg"></div>

        <div className="relative z-10 flex flex-col items-center justify-center py-4">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
            <CameraIcon className="w-8 h-8 text-white stroke-[2]" />
          </div>

          <h2 className="text-base font-bold">{text.scanPrescription}</h2>
          <p className="text-[11.5px] text-blue-100 mt-1 max-w-sm px-4">
            {text.scanHelp}
          </p>

          <div className="flex gap-3 mt-6 w-full max-w-xs">
            <button
              onClick={triggerCamera}
              className="flex-1 bg-white hover:bg-slate-100 transition-colors text-blue-700 font-extrabold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CameraIcon className="w-4 h-4 stroke-[2.2]" />
              {text.camera}
            </button>
            <button
              onClick={triggerGallery}
              className="flex-1 bg-white/20 hover:bg-white/25 transition-colors text-white font-bold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              {text.gallery}
            </button>
          </div>

          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleCameraFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <input
            type="file"
            ref={galleryInputRef}
            onChange={handleGalleryFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      {(scanResult || image || pendingCameraImage) && (
        <button
          onClick={() => {
            onNewScan();
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full bg-white border border-blue-100 text-blue-700 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-extrabold shadow-sm active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          {text.newScan}
        </button>
      )}

      {pendingCameraImage && !loading && (
        <div className="mt-5 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm animate-fade-in">
          <img src={pendingCameraImage} alt="Camera preview" className="w-full h-64 object-contain bg-slate-950" />
          <div className="grid grid-cols-2 gap-3 p-4">
            <button
              onClick={retakeCameraImage}
              className="bg-slate-100 text-slate-700 font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> {text.retake}
            </button>
            <button
              onClick={acceptCameraImage}
              className="bg-blue-600 text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> {text.usePhoto}
            </button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="mt-8 flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-3xl shadow-sm text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin stroke-[2.2]" />
          <h3 className="text-slate-900 font-bold text-sm mt-4">{text.analyzing}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            {text.analyzingHelp}
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="mt-6 bg-red-50 border border-red-100 text-red-800 rounded-2.5xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold">{text.extractionIncomplete}</h4>
            <p className="text-[11px] text-red-700/90 mt-1 leading-relaxed">
              {error}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setError(null)}
                className="text-[10px] font-bold text-red-650 bg-red-100/50 px-3 py-1.5 rounded-lg cursor-pointer"
              >
                {text.clear}
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && !loading && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 w-[88%] max-w-[360px] bg-slate-900/95 text-white py-3 px-4 rounded-2xl flex items-start gap-3 shadow-2xl">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed font-semibold">{notice}</p>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {scanResult && !loading && (
        <div className="mt-6 animate-fade-in">
          {image && (
            <div className="relative rounded-2.5xl overflow-hidden shadow-xs border border-slate-100 mb-5">
              <span className="absolute top-2.5 left-2.5 bg-slate-920/80 backdrop-blur-md text-white font-bold text-[9px] uppercase px-2.5 py-1 rounded-full">
                {text.prescriptionImage}
              </span>
              <div className="absolute bottom-2.5 right-2.5 flex gap-2">
                <button
                  onClick={() => {
                    setImageScale(1);
                    setViewingImage(image);
                  }}
                  className="bg-slate-900/80 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> {text.view}
                </button>
                <button
                  onClick={() => downloadImage(image)}
                  className="bg-white/90 text-slate-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> {text.save}
                </button>
              </div>
              <img src={image} alt="Prescription snippet" className="w-full h-32 object-cover" />
            </div>
          )}

          {/* Extracted Header Details */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs mb-5">
            <h3 className="text-slate-900 font-bold text-[13.5px] uppercase tracking-wider mb-3">
              {text.scanDetails}
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{text.prescribedFor}</span>
                <span className="font-semibold text-slate-800">{scanResult.patientName || text.notDetected}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{text.doctor}</span>
                <span className="font-semibold text-slate-800">{scanResult.doctorName || text.notDetected}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{text.clinic}</span>
                <span className="font-semibold text-slate-800">{scanResult.clinicName || text.notDetected}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{text.condition}</span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {scanResult.condition || text.generalSymptoms}
                </span>
              </div>
            </div>
          </div>

          {/* EDITING MEDICINE INNER WINDOW / FORM */}
          {editingMedicineId ? (
            <div className="bg-white ring-2 ring-blue-500 rounded-3xl p-5 mb-5 shadow-md">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-slate-900 font-bold text-xs">{text.editMedicine}</h4>
                <button
                  onClick={() => setEditingMedicineId(null)}
                  className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {text.cancel}
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">{text.medicineName}</label>
                  <input
                    type="text"
                    value={tempMedicine.name}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">{text.saltGeneric}</label>
                  <input
                    type="text"
                    value={tempMedicine.salt || ""}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, salt: e.target.value })}
                    placeholder="e.g. Paracetamol, Amoxicillin"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">{text.dosage}</label>
                    <input
                      type="text"
                      value={tempMedicine.dosage}
                      onChange={(e) => setTempMedicine({ ...tempMedicine, dosage: e.target.value })}
                      placeholder="e.g. 500mg, 1 tablet"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">{text.timing}</label>
                    <select
                      value={tempMedicine.timing}
                      onChange={(e) => setTempMedicine({ ...tempMedicine, timing: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="Morning">{text.morning}</option>
                      <option value="Afternoon">{text.afternoon}</option>
                      <option value="Evening">{text.evening}</option>
                      <option value="Night">{text.night}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">{text.duration}</label>
                    <input
                      type="text"
                      value={tempMedicine.duration}
                      onChange={(e) => setTempMedicine({ ...tempMedicine, duration: e.target.value })}
                      placeholder="e.g. 5 days"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">{text.instructions}</label>
                    <input
                      type="text"
                      value={tempMedicine.instructions}
                      onChange={(e) => setTempMedicine({ ...tempMedicine, instructions: e.target.value })}
                      placeholder="e.g. Take after meals"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">{text.purpose}</label>
                  <input
                    type="text"
                    value={tempMedicine.purpose}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, purpose: e.target.value })}
                    placeholder="e.g. Relieves cough and cold"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveEditedMedicine}
                  className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  {text.applyEdits}
                </button>
              </div>
            </div>
          ) : null}

          {/* MEDICINES LIST FOR REVIEW */}
          <h3 className="text-slate-900 font-bold text-[14px] uppercase tracking-wider mb-3">
            {text.medicinesExtracted} ({scanResult.medicines.length})
          </h3>

          <div className="space-y-4">
            {scanResult.medicines.map((med) => (
              <div
                key={med.id}
                className={`bg-white border border-slate-100 rounded-3xl shadow-xs relative overflow-hidden ${
                  compactCards ? "p-3.5" : "p-4.5"
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    {med.dosage && (
                      <span className="inline-flex max-w-[190px] flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-snug font-extrabold text-white bg-blue-600 px-2.5 py-1 rounded-lg shadow-xs">
                        {med.dosage}
                      </span>
                    )}
                    <h4 className="text-base font-extrabold text-slate-900 mt-1.5">{med.name}</h4>
                    {med.salt && (
                      <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">
                        {text.salt}: {med.salt}
                      </p>
                    )}
                    {med.duration && (
                      <span className="text-[11px] text-slate-500 font-medium">{text.duration}: {med.duration}</span>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditMedicine(med)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMedicine(med.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-slate-50 space-y-2 text-xs text-slate-600">
                  <div>
                    <strong className="text-slate-800">{text.purpose}:</strong>{" "}
                    <span className="text-slate-600 whitespace-pre-line">{detailText(med.purpose)}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">{text.instructions}:</strong>{" "}
                    <span className="text-slate-600 whitespace-pre-line">{detailText(med.instructions)}</span>
                  </div>
                  {med.sideEffects && (
                    <div>
                      <strong className="text-red-500">{text.sideEffects}:</strong>{" "}
                    <span className="text-slate-500 text-[11px] whitespace-pre-line">{med.sideEffects}</span>
                    </div>
                  )}
                  {med.precautions && (
                    <div>
                      <strong className="text-amber-600">{text.precaution}:</strong>{" "}
                      <span className="text-slate-500 text-[11px] whitespace-pre-line">{med.precautions}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {scanResult.medicines.length === 0 && (
              <div className="p-6 bg-white border border-dashed text-center rounded-2.5xl text-slate-400">
                {text.allMedicinesDeleted}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setManualAddMode(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 py-2.5 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {text.addMedicine}
            </button>
          </div>

          {/* MANUAL ADD CONTAINER */}
          {manualAddMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 mt-3">
              <h4 className="text-xs font-bold text-slate-800 mb-2.5">{text.addMedicine}</h4>
              
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder={text.medicineName}
                  value={tempMedicine.name}
                  onChange={(e) => setTempMedicine({ ...tempMedicine, name: e.target.value })}
                  className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder={text.saltGeneric}
                  value={tempMedicine.salt || ""}
                  onChange={(e) => setTempMedicine({ ...tempMedicine, salt: e.target.value })}
                  className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={text.dosage}
                    value={tempMedicine.dosage}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, dosage: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  />
                  <select
                    value={tempMedicine.timing}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, timing: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Morning">{text.morning}</option>
                    <option value="Afternoon">{text.afternoon}</option>
                    <option value="Evening">{text.evening}</option>
                    <option value="Night">{text.night}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={text.duration}
                    value={tempMedicine.duration}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, duration: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder={text.instructions}
                    value={tempMedicine.instructions}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, instructions: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder={text.purpose}
                  value={tempMedicine.purpose}
                  onChange={(e) => setTempMedicine({ ...tempMedicine, purpose: e.target.value })}
                  className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddMedicineManually}
                    className="flex-1 bg-slate-900 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
                  >
                    {text.addEntry}
                  </button>
                  <button
                    onClick={() => setManualAddMode(false)}
                    className="bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg"
                  >
                    {text.cancel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WARNING COMPONENT */}
          <div className="mt-5 bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10.5px] leading-relaxed text-amber-800">
              {quietSafetyCopy ? (
                <>
                  <strong>{isUrdu ? "\u067e\u06c1\u0644\u06d2 \u062a\u0635\u062f\u06cc\u0642:" : "Check first:"}</strong> {text.verifyShort}
                </>
              ) : (
                <>
                  <strong>{isUrdu ? "\u0688\u0627\u06a9\u0679\u0631 \u0633\u06d2 \u062a\u0635\u062f\u06cc\u0642:" : "Confirm with your doctor/pharmacist:"}</strong> {text.verifyFull}
                </>
              )}
            </p>
          </div>

          {/* CHOOSE PROFILE CONTEXT */}
          <div className="mt-5 bg-white border border-slate-105 rounded-3xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-800 mb-2">{text.profileAllocation}</h4>
            <label className="block text-[11px] text-slate-500 mb-2">{text.prescriptionFor}</label>
            <select
              value={selectedProfileId}
              onChange={(e) => updateDraft({ selectedProfileId: e.target.value })}
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
            {profiles.length === 0 && (
              <p className="text-[10.5px] text-red-500 mt-2.5">
                {text.noProfiles}
              </p>
            )}
          </div>

          {/* ACTIONS WRAPPER */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleAddToPillsReminders}
              disabled={scanResult.medicines.length === 0 || remindersSaved}
              title={remindersSaved ? text.remindersAlreadySaved : text.addToPills}
              className={`w-full font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed ${
                remindersSaved ? "bg-slate-200 text-slate-500" : "bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
              }`}
            >
              <Play className={`w-4 h-4 stroke-[3] ${remindersSaved ? "text-slate-400" : "text-emerald-400"}`} />
              {remindersSaved ? text.addedToPills : `${text.addToPills} (${scanResult.medicines.length})`}
            </button>

            <button
              onClick={handleSaveAsRecord}
              disabled={scanResult.medicines.length === 0 || recordSaved}
              title={recordSaved ? text.recordAlreadySaved : text.saveRecord}
              className={`w-full font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed ${
                recordSaved ? "bg-slate-200 text-slate-500" : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              }`}
            >
              <Save className="w-4 h-4 stroke-[2]" />
              {recordSaved ? text.recordSaved : text.saveRecord}
            </button>
          </div>
        </div>
      )}

      {/* RECENT SCANS EMPTY STATE */}
      {!scanResult && !loading && (
        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">{text.recentScans}</h3>
          <div className="border border-slate-100 bg-white rounded-3xl p-8 text-center text-slate-400">
            <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <ImageIcon className="w-5 h-5 stroke-[1.8]" />
            </div>
            <h4 className="text-slate-800 font-bold text-xs mb-1">{text.noScan}</h4>
            <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto">
              {text.noScanHelp}
            </p>
          </div>
        </div>
      )}

      {viewingImage && (
        <div className="absolute inset-0 bg-slate-950/95 z-60 flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between text-white border-b border-white/10">
            <span className="text-xs font-extrabold">{text.prescriptionImage}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImageScale((value) => Math.max(1, value - 0.25))}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                title={text.zoomOut}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImageScale((value) => Math.min(4, value + 0.25))}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                title={text.zoomIn}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImageScale(1)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                title={text.resetZoom}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => downloadImage(viewingImage)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                title={text.save}
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setViewingImage(null);
                  setImageScale(1);
                }}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                title={text.close}
              >
                <span className="text-lg leading-none">x</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={viewingImage}
              alt="Prescription original"
              className="max-w-none rounded-2xl transition-transform duration-150"
              style={{ width: `${Math.round(imageScale * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

