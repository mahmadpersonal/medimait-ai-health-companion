import React, { useState } from "react";
import { 
  Folder, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  User, 
  UserCheck, 
  X, 
  FileText, 
  Stethoscope, 
  MapPin, 
  Pill, 
  Trash, 
  Edit,
  Eye,
  UploadCloud, 
  CheckCircle, 
  Image as ImageIcon,
  AlertTriangle 
} from "lucide-react";
import { MedicalRecord, Profile, Reminder } from "../types";

interface FilesPageProps {
  records: MedicalRecord[];
  onAddRecord: (record: Omit<MedicalRecord, "id">) => MedicalRecord;
  onUpdateRecord: (id: string, record: Partial<MedicalRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onAddReminder: (reminder: Omit<Reminder, "id" | "history">) => void;
  profiles: Profile[];
  setActiveTab: (tab: "scan" | "pills" | "files" | "chat" | "me") => void;
}

export function FilesPage({
  records,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onAddReminder,
  profiles,
  setActiveTab,
}: FilesPageProps) {
  // Filters & searches
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterChip, setActiveFilterChip] = useState<"All" | "Profile" | "Doctor" | "Date">("All");

  // Selected details modal state
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // Manual record form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [clinicHospital, setClinicHospital] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);
  const [profileId, setProfileId] = useState("");
  const [notes, setNotes] = useState("");
  const [recordImage, setRecordImage] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Toast / Status notification in-UI state
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showToast = (message: string) => {
    setActionSuccess(message);
    setTimeout(() => {
      setActionSuccess(null);
    }, 4000);
  };

  const handleManualRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please enter a card title");
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        doctorName: doctorName.trim() || "Not specified",
        clinicHospital: clinicHospital.trim() || "Not specified",
        date: recordDate,
        patientProfileId: profileId || (profiles[0]?.id || ""),
        medicines: editingRecord?.medicines || [],
        prescriptionImage: recordImage || undefined,
        notes: notes.trim(),
      };

      if (editingRecord) {
        onUpdateRecord(editingRecord.id, payload);
      } else {
        onAddRecord(payload);
      }

      // Reset form variables perfectly to empty blocks for consecutive additions
      setTitle("");
      setDoctorName("");
      setClinicHospital("");
      setNotes("");
      setRecordDate(new Date().toISOString().split("T")[0]);
      setProfileId(profiles[0]?.id || "");
      setRecordImage(null);
      setEditingRecord(null);

      // Dismiss Add record modal
      setShowAddModal(false);
      
      // Gorgeous Success feedback
      showToast(editingRecord ? "Medical Record updated." : "Medical Record successfully saved!");
    } catch (err) {
      showToast("Failed to save record. Try again.");
    }
  };

  const openEditRecord = (record: MedicalRecord) => {
    setEditingRecord(record);
    setTitle(record.title);
    setDoctorName(record.doctorName);
    setClinicHospital(record.clinicHospital);
    setRecordDate(record.date);
    setProfileId(record.patientProfileId);
    setNotes(record.notes || "");
    setRecordImage(record.prescriptionImage || null);
    setSelectedRecord(null);
    setShowAddModal(true);
  };

  const closeRecordForm = () => {
    setShowAddModal(false);
    setEditingRecord(null);
    setTitle("");
    setDoctorName("");
    setClinicHospital("");
    setNotes("");
    setRecordDate(new Date().toISOString().split("T")[0]);
    setProfileId(profiles[0]?.id || "");
    setRecordImage(null);
  };

  // Helper file filters
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clinicHospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Chip categorization filters
    if (activeFilterChip === "Profile" && profiles.length > 0) {
      // Find patient profile name
      const profileName = profiles.find((p) => p.id === r.patientProfileId)?.name || "";
      return profileName.toLowerCase().includes(searchQuery.toLowerCase());
    }

    if (activeFilterChip === "Doctor") {
      return r.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) && r.doctorName !== "Not specified";
    }

    if (activeFilterChip === "Date") {
      return r.date.includes(searchQuery);
    }

    return true;
  });

  const getProfileName = (pId: string) => {
    const p = profiles.find((item) => item.id === pId);
    return p ? `${p.name} (${p.type})` : "Myself";
  };

  const handleImportToReminders = (rec: MedicalRecord) => {
    if (!rec.medicines || rec.medicines.length === 0) {
      showToast("No scan entries found directly on file.");
      return;
    }

    rec.medicines.forEach((med) => {
      let group: "Morning" | "Afternoon" | "Evening" | "Night" = "Morning";
      const timingLower = String(med.timing).toLowerCase();
      if (timingLower.includes("afternoon")) {
        group = "Afternoon";
      } else if (timingLower.includes("evening")) {
        group = "Evening";
      } else if (timingLower.includes("night") || timingLower.includes("sleep")) {
        group = "Night";
      }

      onAddReminder({
        medicineName: med.name,
        dose: med.dosage,
        time: group === "Morning" ? "08:00" : group === "Afternoon" ? "13:00" : group === "Evening" ? "18:00" : "21:00",
        timingGroup: group,
        frequency: "Daily",
        startDate: new Date().toISOString().split("T")[0],
        notes: `${med.instructions}. Purpose: ${med.purpose}`,
        patientProfileId: rec.patientProfileId,
      });
    });

    showToast(`💊 Imported ${rec.medicines.length} medicines to schedules!`);
    setSelectedRecord(null);
    setActiveTab("pills");
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 select-none relative bg-slate-50">
      
      {/* Dynamic inline status toasts */}
      {actionSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 w-[88%] max-w-[360px] bg-slate-900/95 backdrop-blur-md text-white py-3 px-4.5 rounded-2xl flex items-center gap-3 shadow-2xl transition-all duration-300 border border-slate-700/50">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-extrabold tracking-wide">{actionSuccess}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Files</h1>
          <p className="text-xs text-slate-500 font-medium">Manage prescription photos and clinical reports.</p>
        </div>
        {records.length > 0 && (
          <button
            onClick={() => {
              if (profiles.length === 0) {
                showToast("Please add a profile under 'Me' before adding records!");
                setActiveTab("me");
              } else {
                setShowAddModal(true);
              }
            }}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 cursor-pointer transition-all"
            title="Add new Record"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="mt-4 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search records..."
          className="w-full bg-slate-100 hover:bg-slate-150/80 rounded-2xl py-3 px-11 text-xs border border-transparent focus:bg-white focus:border-slate-200 focus:outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
        />
        <Search className="w-4.5 h-4.5 absolute left-4 top-3.5 text-slate-400 stroke-[2.2]" />
      </div>

      {/* FILTER CHIPS */}
      <div className="flex gap-2 mt-3.5 overflow-x-auto pb-1.5 scrollbar-none shrink-0 select-none">
        {(["All", "Profile", "Doctor", "Date"] as const).map((chip) => {
          const isActive = activeFilterChip === chip;
          return (
            <button
              key={chip}
              onClick={() => setActiveFilterChip(chip)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-150 text-slate-500 hover:text-slate-700"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* RECORDS CARDS LIST */}
      <div className="space-y-4 mt-4">
        {filteredRecords.map((record) => (
          <div
            key={record.id}
            onClick={() => {
              setSelectedRecord(record);
            }}
            className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer hover:border-blue-400"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                  {record.prescriptionImage ? (
                    <img
                      src={record.prescriptionImage}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <FileText className="w-5.25 h-5.25 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-[13.5px] font-extrabold text-slate-900 leading-snug line-clamp-1">
                    {record.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {getProfileName(record.patientProfileId)}
                  </p>
                  
                  {/* Doctor Info */}
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-505 mt-2 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-100">
                    <Stethoscope className="w-3 h-3 text-blue-500" />
                    {record.doctorName}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 tracking-wide">
                  {record.date}
                </span>
                
                {record.medicines && record.medicines.length > 0 && (
                  <span className="block text-[9.5px] font-semibold text-green-600 bg-green-50 rounded px-1.5 py-0.5 mt-2 max-w-max ml-auto border border-green-100">
                    {record.medicines.length} Pills Scan
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RECORDS EMPTY STATE */}
      {filteredRecords.length === 0 && (
        <div className="mt-8 border border-slate-100 bg-white rounded-[32px] p-8 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Folder className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">No records saved yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mb-6">
            Your scanned prescriptions, doctor notes, and medical files will appear here. Include profiles for personal care tags.
          </p>

          <button
            onClick={() => {
              if (profiles.length === 0) {
                showToast("Please add a profile under 'Me' before saving notes!");
                setActiveTab("me");
              } else {
                setShowAddModal(true);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-md hover:shadow-blue-100 transition-all cursor-pointer"
          >
            + Add Record
          </button>
        </div>
      )}

      {/* ADD MANUAL RECORD MODAL */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl max-h-[85%] overflow-y-auto animate-slide-up relative border-t border-slate-100">
            <button
              onClick={closeRecordForm}
              className="absolute top-5 right-5 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 mb-1">{editingRecord ? "Edit Record Card" : "Add Record Card"}</h3>
            <p className="text-[11px] text-slate-500 mb-4">Manually input diagnosis, clinical notes, and doctors lists.</p>

            <form onSubmit={handleManualRecordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">File Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Flu Vaccine Certificate, Blood Report"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* IMAGE SELECTION BLOCK */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Record Cover Photo / Attachment</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {/* Hidden input */}
                    <input
                      type="file"
                      id="record-image-[edit]"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setRecordImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {/* Custom button trigger */}
                    <label
                      htmlFor="record-image-[edit]"
                      className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center text-slate-500 hover:text-blue-600 transition-all text-xs"
                    >
                      <UploadCloud className="w-5 h-5 text-slate-400" />
                      <div>
                        <span className="font-extrabold block text-slate-700">Upload Photo File</span>
                        <span className="text-[9.5px] text-slate-400">Scan code, slip, or report</span>
                      </div>
                    </label>

                  </div>

                  {/* Preview component */}
                  {recordImage && (
                    <div className="flex items-center gap-3 bg-blue-50/40 border border-blue-105 rounded-xl p-2.5">
                      <img
                        src={recordImage}
                        alt="Selected record target"
                        className="w-11 h-11 rounded-lg object-cover bg-white border border-slate-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-extrabold text-blue-800 truncate">Document image loaded</p>
                        <p className="text-[9px] text-slate-400">Attached successfully</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecordImage(null)}
                        className="text-[9.5px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded-lg shrink-0 transition-all border border-red-150 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Doctor name"
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 text-slate-800 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Clinic / Hospital</label>
                  <input
                    type="text"
                    value={clinicHospital}
                    onChange={(e) => setClinicHospital(e.target.value)}
                    placeholder="Clinic or hospital"
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 text-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Record Date</label>
                  <input
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Family Profile</label>
                  <select
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs focus:bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="">Myself</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Clinical Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record summary details..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-md cursor-pointer"
              >
                {editingRecord ? "Save Record Changes" : "Save Record Card"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECORD DETAILS MODAL / BOTTOM SHEET */}
      {selectedRecord && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl max-h-[85%] overflow-y-auto animate-slide-up relative border-t border-slate-100">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-5 right-5 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title & Metadata */}
            <h3 className="text-base font-extrabold text-slate-900 mt-2 pr-6 leading-snug">
              {selectedRecord.title}
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Patient: {getProfileName(selectedRecord.patientProfileId)}
            </p>

            {/* Attached Photo View */}
            {selectedRecord.prescriptionImage && (
              <div className="mt-4 border-b border-slate-100 pb-4">
                <p className="text-[9.5px] uppercase text-slate-400 font-bold mb-1.5">Attached Document Image</p>
                <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 h-52 flex items-center justify-center shadow-inner group">
                  <img
                    src={selectedRecord.prescriptionImage}
                    alt={selectedRecord.title}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={() => setViewingImage(selectedRecord.prescriptionImage || null)}
                    className="absolute bottom-2.5 right-2.5 bg-slate-900/80 hover:bg-slate-950/90 backdrop-blur-md text-[9.5px] font-bold text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3 h-3" /> View Original Image
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3.5 bg-slate-50 rounded-2.5xl p-4 text-xs font-semibold text-slate-700">
              <div className="flex gap-2">
                <Stethoscope className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Diagnosed doctor</p>
                  <p className="text-slate-800 mt-0.5 truncate">{selectedRecord.doctorName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Clinic / Location</p>
                  <p className="text-slate-800 mt-0.5 truncate">{selectedRecord.clinicHospital}</p>
                </div>
              </div>
              <div className="flex gap-2 col-span-2 border-t border-slate-150 pt-2.5 mt-2.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Diagnostic Date</p>
                  <p className="text-slate-800 mt-0.5">{selectedRecord.date}</p>
                </div>
              </div>
            </div>

            {/* Description Notes */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-800">Clinical Notes</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100">
                {selectedRecord.notes || "No additional clinical notes specified."}
              </p>
            </div>

            {/* Scanned medicines */}
            {selectedRecord.medicines && selectedRecord.medicines.length > 0 && (
              <div className="mt-5">
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-xs font-bold text-slate-880">Scanned Medicines</h4>
                  <button
                    onClick={() => handleImportToReminders(selectedRecord)}
                    className="text-[10px] font-bold text-blue-600 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200"
                  >
                    <Pill className="w-3 h-3" /> Set Pill Reminders
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedRecord.medicines.map((med, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{med.name}</span>
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                          {med.dosage}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 leading-snug">{med.instructions}</p>
                      <p className="text-slate-450 text-[10px] mt-0.5">Simple Term: {med.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SAFETY WARNING */}
            <div className="mt-5 bg-amber-50 rounded-2xl p-3.5 text-[10px] leading-relaxed text-amber-800 border border-amber-100/70">
              Disclaimer: Scanned medicinals content is parsed with AI OCR. Always discuss with professional doctors prior to modification.
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => openEditRecord(selectedRecord)}
                className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit className="w-4 h-4" /> Edit Record
              </button>
              <button
                onClick={() => {
                  onDeleteRecord(selectedRecord.id);
                  setSelectedRecord(null);
                  showToast("Record deleted.");
                }}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-705 font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash className="w-4 h-4" /> Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingImage && (
        <div className="absolute inset-0 bg-slate-950/90 z-60 flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between text-white">
            <span className="text-xs font-extrabold">Original Image</span>
            <button
              onClick={() => setViewingImage(null)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img src={viewingImage} alt="Original record" className="max-w-full max-h-full object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
