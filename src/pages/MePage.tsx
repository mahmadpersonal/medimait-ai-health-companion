import React, { useState } from "react";
import { Plus, User, Trash2, X, Pencil, Languages, ShieldCheck, Database, RotateCcw, Type, LayoutList } from "lucide-react";
import { AppSettings, Profile } from "../types";
import { storageService } from "../services/storageService";

interface MePageProps {
  profiles: Profile[];
  onAddProfile: (profile: Omit<Profile, "id">) => Profile;
  onUpdateProfile: (id: string, profile: Partial<Profile>) => void;
  onDeleteProfile: (id: string) => void;
  settings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onResetSettings: () => void;
}

const profileTypes = ["Myself", "Father", "Mother", "Other"] as const;

export function MePage({
  profiles,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  settings,
  onSettingsChange,
  onResetSettings,
}: MePageProps) {
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<Profile["type"]>("Myself");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");

  const resetForm = () => {
    setEditingProfileId(null);
    setName("");
    setType("Myself");
    setAge("");
    setGender("");
    setAllergies("");
    setConditions("");
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const resetLocalData = () => {
    if (!window.confirm("Clear profiles, files, reminders, and chats from this phone?")) return;
    storageService.clearAll();
    window.location.reload();
  };

  const openCreate = (presetType: Profile["type"] = "Myself", presetName = "") => {
    resetForm();
    setType(presetType);
    setName(presetName);
    setShowModal(true);
  };

  const openEdit = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setName(profile.name);
    setType(profile.type);
    setAge(profile.age || "");
    setGender(profile.gender || "");
    setAllergies(profile.allergies || "");
    setConditions(profile.medicalConditions || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please provide profile name.");
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      age: age || undefined,
      gender: gender || undefined,
      allergies: allergies || undefined,
      medicalConditions: conditions || undefined,
    };

    if (editingProfileId) {
      onUpdateProfile(editingProfileId, payload);
    } else {
      onAddProfile(payload);
    }

    closeModal();
  };

  const getProfileTheme = (pType: Profile["type"]) => {
    switch (pType) {
      case "Myself":
        return { color: "bg-blue-50/80 hover:bg-blue-100 border-blue-100/70 text-blue-800" };
      case "Father":
        return { color: "bg-emerald-50/80 hover:bg-emerald-100 border-emerald-100/70 text-emerald-800" };
      case "Mother":
        return { color: "bg-amber-50/80 hover:bg-amber-100 border-amber-100/70 text-amber-800" };
      default:
        return { color: "bg-purple-50/80 hover:bg-purple-100 border-purple-100/70 text-purple-800" };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 select-none">
      {notice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 w-[88%] max-w-[360px] bg-slate-900/95 text-white py-3 px-4 rounded-2xl shadow-2xl">
          <p className="text-[11px] font-bold leading-relaxed">{notice}</p>
        </div>
      )}

      <h1 className="text-2xl font-extrabold text-slate-900">Me</h1>
      <p className="text-xs text-slate-500 font-medium">Set personal metrics and family medical profiles.</p>

      {profiles.length === 0 && (
        <div className="mt-6 border border-slate-100 bg-white rounded-3xl p-8 text-center shadow-xs">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto mb-4 bg-slate-50">
            <User className="w-9 h-9 text-slate-400 stroke-[1.5]" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">No profile yet</h3>
          <p className="text-xs text-slate-500 max-w-[210px] mx-auto leading-relaxed mb-6">
            Add a personal profile to get personalized health assistant care.
          </p>
          <button
            onClick={() => openCreate("Myself", "Myself")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-md transition-all"
          >
            Add Profile
          </button>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
              Manage Profiles For ({profiles.length})
            </span>
            <button
              onClick={() => openCreate()}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add New
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {profiles.map((profile) => {
              const theme = getProfileTheme(profile.type);
              const isDefaultMyself = profile.id === "profile_myself";

              return (
                <div
                  key={profile.id}
                  className={`border rounded-3xl p-4 flex flex-col justify-between min-h-[148px] text-left transition-all ${theme.color} relative overflow-hidden`}
                >
                  <div className="absolute right-2.5 top-2.5 flex gap-1.5">
                    <button
                      onClick={() => openEdit(profile)}
                      className="text-slate-600 hover:text-blue-700 bg-white/75 p-1.5 rounded-full shadow-2xs"
                      title="Edit profile"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!isDefaultMyself && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete the profile of ${profile.name}?`)) onDeleteProfile(profile.id);
                        }}
                        className="text-slate-600 hover:text-red-600 bg-white/75 p-1.5 rounded-full shadow-2xs"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-start pr-14">
                    <span className="text-[9.5px] uppercase tracking-wide px-2 py-0.5 rounded-md font-bold bg-white/60">
                      {profile.type}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight truncate">{profile.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      {profile.age ? `${profile.age} years old` : "No age specified"}
                      {profile.gender ? ` - ${profile.gender}` : ""}
                    </p>

                    {(profile.allergies || profile.medicalConditions) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-900/5 space-y-1 text-[9.5px] font-semibold text-slate-600">
                        {profile.allergies && <p className="truncate">Allergies: {profile.allergies}</p>}
                        {profile.medicalConditions && <p className="truncate">Condition: {profile.medicalConditions}</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase mb-3 text-left">
          Quick Roles Selector
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {profileTypes.map((role) => {
            const theme = getProfileTheme(role);
            return (
              <button
                key={role}
                onClick={() => openCreate(role, role === "Myself" ? "Myself" : "")}
                className={`flex items-center justify-between p-4 rounded-3xl border text-left transition-transform active:scale-[0.97] ${theme.color}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-800">{role}</span>
                </div>
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <h3 className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase mb-3 text-left">
            Settings
          </h3>

          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Language</h4>
                <p className="text-[10.5px] text-slate-500">Choose the app reading direction and labels.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                onClick={() => onSettingsChange({ language: "en" })}
                className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  settings.language === "en" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500"
                }`}
              >
                English
              </button>
              <button
                onClick={() => onSettingsChange({ language: "ur" })}
                className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  settings.language === "ur" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500"
                }`}
              >
                {"\u0627\u0631\u062f\u0648"}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Urdu mode applies right-to-left layout now. Full medical copy translation can be expanded safely screen by screen.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xs space-y-3">
          {[
            {
              label: "Larger text",
              help: "Slightly increases app text size.",
              icon: Type,
              checked: settings.largeText,
              key: "largeText" as const,
            },
            {
              label: "Compact medicine cards",
              help: "Shows medicine lists with tighter spacing.",
              icon: LayoutList,
              checked: settings.compactMedicineCards,
              key: "compactMedicineCards" as const,
            },
            {
              label: "Short safety notes",
              help: "Keeps reminders and scan warnings quieter.",
              icon: ShieldCheck,
              checked: settings.quietSafetyCopy,
              key: "quietSafetyCopy" as const,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <label key={item.key} className="flex items-center justify-between gap-3 border-b last:border-b-0 border-slate-100 pb-3 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.help}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => onSettingsChange({ [item.key]: e.target.checked })}
                  className="w-5 h-5 accent-blue-600"
                />
              </label>
            );
          })}
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Privacy & Data</h4>
              <p className="text-[10.5px] text-slate-500">Profiles, scans, chats, and pills stay on this phone.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onResetSettings();
                showNotice("Settings restored to default.");
              }}
              className="bg-slate-100 text-slate-700 text-[10.5px] font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Settings
            </button>
            <button
              onClick={resetLocalData}
              className="bg-red-50 text-red-700 text-[10.5px] font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Data
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl max-h-[80%] overflow-y-auto animate-slide-up relative">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              {editingProfileId ? "Edit Profile" : "Add Family Profile"}
            </h3>
            <p className="text-[11px] text-slate-500 mb-5">
              {editingProfileId ? "Update the saved medical profile details." : "Create a separate medical file tag for individual care."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Patient or family member name"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Relationship</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Profile["type"])}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-white text-xs focus:outline-none"
                  >
                    {profileTypes.map((profileType) => (
                      <option key={profileType} value={profileType}>{profileType}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Gender</label>
                  <input
                    type="text"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    placeholder="e.g. Male, Female"
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 32"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, peanuts"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Medical Conditions</label>
                <input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Acid reflux, hypertension"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-md"
              >
                {editingProfileId ? "Save Profile" : "Create Member Profile"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
