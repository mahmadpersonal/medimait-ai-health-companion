import React, { useEffect, useState, useRef } from "react";
import { Camera as CameraIcon, Image as ImageIcon, Loader2, AlertCircle, Trash2, Edit2, Play, Save, Plus, Bell, Check, RotateCcw } from "lucide-react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Medicine, PrescriptionScanResult, Profile, MedicalRecord, Reminder, ScanDraft } from "../types";
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
}

export function ScanPage({ onAddRecord, onAddReminder, profiles, setActiveTab, pillsCount, scanDraft, onScanDraftChange, onNewScan }: ScanPageProps) {
  const { image, pendingCameraImage, scanResult, selectedProfileId, recordNotes, remindersSaved, recordSaved } = scanDraft;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualAddMode, setManualAddMode] = useState(false);

  // Form for manually adding or editing medicines
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);

  // Temp medicine state for adding/editing
  const [tempMedicine, setTempMedicine] = useState<Omit<Medicine, "id">>({
    name: "",
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
      const result = await aiVisionService.scanPrescriptionImage(base64Img);
      updateDraft({ scanResult: result });
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          "Scanning failed. Ensure you configure your VITE_GEMINI_API_KEY inside AI Studio Settings."
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
      setNotice("This prescription is already saved to Files.");
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
    setNotice("Prescription saved to Files. Your scan is still active.");
  };

  // Final Action: Add scanned medicines directly to Pills Reminder
  const handleAddToPillsReminders = () => {
    if (!scanResult || scanResult.medicines.length === 0) return;
    if (remindersSaved) {
      setNotice("Pill reminders are already saved for this scan.");
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
        notes: `${med.instructions}. Purpose: ${med.purpose}`,
        patientProfileId: profileId,
      });
    });

    updateDraft({ remindersSaved: true, selectedProfileId: profileId });
    setNotice(`${scanResult.medicines.length} pill reminder${scanResult.medicines.length === 1 ? "" : "s"} saved. Your scan is still active.`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 select-none">
      <div className="flex justify-between items-center mb-1">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            MediMait
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Scan</h1>
          <p className="text-xs text-slate-500 font-medium">Read a prescription in seconds using smart OCR.</p>
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

          <h2 className="text-base font-bold">Scan Prescription</h2>
          <p className="text-[11.5px] text-blue-100 mt-1 max-w-sm px-4">
            Drag & drop an image, point your scanner, or upload from your library file.
          </p>

          <div className="flex gap-3 mt-6 w-full max-w-xs">
            <button
              onClick={triggerCamera}
              className="flex-1 bg-white hover:bg-slate-100 transition-colors text-blue-700 font-extrabold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CameraIcon className="w-4 h-4 stroke-[2.2]" />
              Camera
            </button>
            <button
              onClick={triggerGallery}
              className="flex-1 bg-white/20 hover:bg-white/25 transition-colors text-white font-bold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              Gallery
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
          Start New Scan
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
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
            <button
              onClick={acceptCameraImage}
              className="bg-blue-600 text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Use Photo
            </button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="mt-8 flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-3xl shadow-sm text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin stroke-[2.2]" />
          <h3 className="text-slate-900 font-bold text-sm mt-4">Analyzing Handwritings...</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Please wait while MediMait AI extracts dosages, medicines, durations, and instructions from your photo.
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="mt-6 bg-red-50 border border-red-100 text-red-800 rounded-2.5xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold">Extraction Incomplete</h4>
            <p className="text-[11px] text-red-700/90 mt-1 leading-relaxed">
              {error}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setError(null)}
                className="text-[10px] font-bold text-red-650 bg-red-100/50 px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && !loading && (
        <div className="mt-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 flex items-start gap-3">
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
                Prescription Upload
              </span>
              <img src={image} alt="Prescription snippet" className="w-full h-32 object-cover" />
            </div>
          )}

          {/* Extracted Header Details */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs mb-5">
            <h3 className="text-slate-900 font-bold text-[13.5px] uppercase tracking-wider mb-3">
              Scan Details
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Prescribed For</span>
                <span className="font-semibold text-slate-800">{scanResult.patientName || "Not detected"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Doctor</span>
                <span className="font-semibold text-slate-800">{scanResult.doctorName || "Not detected"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Clinic / Hospital</span>
                <span className="font-semibold text-slate-800">{scanResult.clinicName || "Not detected"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Condition</span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {scanResult.condition || "General symptoms"}
                </span>
              </div>
            </div>
          </div>

          {/* EDITING MEDICINE INNER WINDOW / FORM */}
          {editingMedicineId ? (
            <div className="bg-white ring-2 ring-blue-500 rounded-3xl p-5 mb-5 shadow-md">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-slate-900 font-bold text-xs">Edit Medicine Entry</h4>
                <button
                  onClick={() => setEditingMedicineId(null)}
                  className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Medicine Name</label>
                  <input
                    type="text"
                    value={tempMedicine.name}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Dosage</label>
                    <input
                      type="text"
                      value={tempMedicine.dosage}
                      onChange={(e) => setTempMedicine({ ...tempMedicine, dosage: e.target.value })}
                      placeholder="e.g. 500mg, 1 tablet"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Timing Group</label>
                    <select
                      value={tempMedicine.timing}
                      onChange={(e) => setTempMedicine({ ...tempMedicine, timing: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Duration</label>
                    <input
                      type="text"
                      value={tempMedicine.duration}
                      onChange={(e) => setTempMedicine({ ...tempMedicine, duration: e.target.value })}
                      placeholder="e.g. 5 days"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Instructions</label>
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
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Simple Purpose (Everyday words)</label>
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
                  Apply Review Edits
                </button>
              </div>
            </div>
          ) : null}

          {/* MEDICINES LIST FOR REVIEW */}
          <h3 className="text-slate-900 font-bold text-[14px] uppercase tracking-wider mb-3">
            Medicines Extracted ({scanResult.medicines.length})
          </h3>

          <div className="space-y-4">
            {scanResult.medicines.map((med) => (
              <div
                key={med.id}
                className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-xs relative overflow-hidden"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                      {med.dosage} · {med.timing}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1.5">{med.name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">Duration: {med.duration}</span>
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
                    <strong className="text-slate-800">What it does:</strong>{" "}
                    <span className="text-slate-600">{med.purpose}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Instructions:</strong>{" "}
                    <span className="text-slate-600">{med.instructions}</span>
                  </div>
                  {med.sideEffects && (
                    <div>
                      <strong className="text-red-500">Side effects:</strong>{" "}
                      <span className="text-slate-500 text-[11px]">{med.sideEffects}</span>
                    </div>
                  )}
                  {med.precautions && (
                    <div>
                      <strong className="text-amber-600">Precaution:</strong>{" "}
                      <span className="text-slate-500 text-[11px]">{med.precautions}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {scanResult.medicines.length === 0 && (
              <div className="p-6 bg-white border border-dashed text-center rounded-2.5xl text-slate-400">
                All Extracted medicines deleted. Please add manually or scan another.
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setManualAddMode(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 py-2.5 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add medicine manually
            </button>
          </div>

          {/* MANUAL ADD CONTAINER */}
          {manualAddMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 mt-3">
              <h4 className="text-xs font-bold text-slate-800 mb-2.5">Add Medicine Entry</h4>
              
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Medicine Name"
                  value={tempMedicine.name}
                  onChange={(e) => setTempMedicine({ ...tempMedicine, name: e.target.value })}
                  className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dosage (dosage amount)"
                    value={tempMedicine.dosage}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, dosage: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  />
                  <select
                    value={tempMedicine.timing}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, timing: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Duration (e.g. 10 days)"
                    value={tempMedicine.duration}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, duration: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Instructions"
                    value={tempMedicine.instructions}
                    onChange={(e) => setTempMedicine({ ...tempMedicine, instructions: e.target.value })}
                    className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Purpose (simple explanation)"
                  value={tempMedicine.purpose}
                  onChange={(e) => setTempMedicine({ ...tempMedicine, purpose: e.target.value })}
                  className="w-full text-xs border border-slate-250 bg-white rounded-lg p-2 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddMedicineManually}
                    className="flex-1 bg-slate-900 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
                  >
                    Add entry
                  </button>
                  <button
                    onClick={() => setManualAddMode(false)}
                    className="bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WARNING COMPONENT */}
          <div className="mt-5 bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10.5px] leading-relaxed text-amber-800">
              <strong>Confirm with your doctor/pharmacist:</strong> Always verify medicine names, timing dosages,
              and instructions before taking, changing, or stopping any prescription.
            </p>
          </div>

          {/* CHOOSE PROFILE CONTEXT */}
          <div className="mt-5 bg-white border border-slate-105 rounded-3xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Patient Profile allocation</h4>
            <label className="block text-[11px] text-slate-500 mb-2">Who is this prescription for?</label>
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
                No profiles created yet. Navigate to the &quot;Me&quot; screen to add parent or user profiles first!
              </p>
            )}
          </div>

          {/* ACTIONS WRAPPER */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleAddToPillsReminders}
              disabled={scanResult.medicines.length === 0 || remindersSaved}
              title={remindersSaved ? "Pill reminders already saved for this scan" : "Set pill reminders"}
              className={`w-full font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed ${
                remindersSaved ? "bg-slate-200 text-slate-500" : "bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
              }`}
            >
              <Play className={`w-4 h-4 stroke-[3] ${remindersSaved ? "text-slate-400" : "text-emerald-400"}`} />
              {remindersSaved ? "Pill Reminders Saved" : `Set Pill Reminders (${scanResult.medicines.length})`}
            </button>

            <button
              onClick={handleSaveAsRecord}
              disabled={scanResult.medicines.length === 0 || recordSaved}
              title={recordSaved ? "Prescription already saved to Files" : "Save prescription to Files"}
              className={`w-full font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed ${
                recordSaved ? "bg-slate-200 text-slate-500" : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              }`}
            >
              <Save className="w-4 h-4 stroke-[2]" />
              {recordSaved ? "Saved to Files" : "Save to Files / Records"}
            </button>
          </div>
        </div>
      )}

      {/* RECENT SCANS EMPTY STATE */}
      {!scanResult && !loading && (
        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">Recent Scans</h3>
          <div className="border border-slate-100 bg-white rounded-3xl p-8 text-center text-slate-400">
            <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <ImageIcon className="w-5 h-5 stroke-[1.8]" />
            </div>
            <h4 className="text-slate-800 font-bold text-xs mb-1">No scan results found</h4>
            <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto">
              Please take a photo of your doctor prescription with camera or upload file to extract medication data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
