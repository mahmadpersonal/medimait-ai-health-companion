import React, { useState } from "react";
import { Plus, User, Trash2, Heart, ShieldAlert, X, Sparkles, Smile, HelpCircle } from "lucide-react";
import { Profile } from "../types";

interface MePageProps {
  profiles: Profile[];
  onAddProfile: (profile: Omit<Profile, "id">) => Profile;
  onDeleteProfile: (id: string) => void;
}

export function MePage({ profiles, onAddProfile, onDeleteProfile }: MePageProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<"Myself" | "Father" | "Mother" | "Other">("Myself");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert("Please provide profile name!");
      return;
    }

    onAddProfile({
      name,
      type,
      age: age || undefined,
      gender: gender || undefined,
      allergies: allergies || undefined,
      medicalConditions: conditions || undefined,
    });

    // Reset fields
    setName("");
    setType("Myself");
    setAge("");
    setGender("");
    setAllergies("");
    setConditions("");
    setShowAddModal(false);
  };

  // Profile type styles (Match Image 1)
  const getProfileTheme = (pType: "Myself" | "Father" | "Mother" | "Other") => {
    switch (pType) {
      case "Myself":
        return {
          emoji: "👦",
          color: "bg-blue-50/80 hover:bg-blue-100 border-blue-100/70 text-blue-800",
        };
      case "Father":
        return {
          emoji: "👨",
          color: "bg-emerald-50/80 hover:bg-emerald-100 border-emerald-100/70 text-emerald-800",
        };
      case "Mother":
        return {
          emoji: "👩",
          color: "bg-amber-50/80 hover:bg-amber-100 border-amber-101/70 text-amber-800",
        };
      case "Other":
        return {
          emoji: "👤",
          color: "bg-purple-50/80 hover:bg-purple-100 border-purple-100/70 text-purple-800",
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 select-none">
      
      {/* HEADER TITLE */}
      <h1 className="text-2xl font-extrabold text-slate-900">Me</h1>
      <p className="text-xs text-slate-500 font-medium font-sans">Set personal metrics and parent medical profiles.</p>

      {/* DETAILED EMPTY STATE PORT (Image 1 Mockup) */}
      {profiles.length === 0 && (
        <div className="mt-6 border border-slate-100 bg-white rounded-3xl p-8 text-center shadow-xs">
          {/* Dash ring avatar placeholder */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto mb-4 bg-slate-50">
            <User className="w-9 h-9 text-slate-400 stroke-[1.5]" />
          </div>

          <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">No profile yet</h3>
          <p className="text-xs text-slate-500 max-w-[210px] mx-auto leading-relaxed mb-6">
            Add a personal profile to get personalized health assistant care.
          </p>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-md hover:shadow-blue-105 transition-all cursor-pointer"
          >
            + Add Profile
          </button>
        </div>
      )}

      {/* PROFILES GALLERY DISPLAY */}
      {profiles.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
              Manage Profiles For ({profiles.length})
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 cursor-pointer hover:underline"
            >
              + Add New
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {profiles.map((profile) => {
              const theme = getProfileTheme(profile.type);
              return (
                <div
                  key={profile.id}
                  className={`border rounded-3xl p-4 flex flex-col justify-between min-h-[140px] text-left transition-all ${theme.color} relative overflow-hidden group`}
                >
                  <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        if (confirm(`Delete the profile of ${profile.name}?`)) {
                          onDeleteProfile(profile.id);
                        }
                      }}
                      className="text-slate-500 hover:text-red-650 bg-slate-100 p-1.5 rounded-full shadow-2xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Header emoji and role label */}
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">{theme.emoji}</span>
                    <span className="text-[9.5px] uppercase tracking-wide px-2 py-0.5 rounded-md font-bold bg-white/60">
                      {profile.type}
                    </span>
                  </div>

                  {/* Info details column */}
                  <div className="mt-4">
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                      {profile.name}
                    </h3>

                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      {profile.age ? `${profile.age} years old` : "No age specified"}
                      {profile.gender ? ` • ${profile.gender}` : ""}
                    </p>

                    {(profile.allergies || profile.medicalConditions) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-900/5 space-y-1 text-[9.5px] font-semibold text-slate-600">
                        {profile.allergies && (
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span className="truncate">Allergies: {profile.allergies}</span>
                          </div>
                        )}
                        {profile.medicalConditions && (
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            <span className="truncate">Active Condition: {profile.medicalConditions}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK PRE-SET ROLE TILES (Matching Image 1 tiles exactly at the bottom of Me section!) */}
      <div className="mt-8">
        <h3 className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase mb-3 text-left">
          Quick Roles Selector
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Myself", type: "Myself" as const, emoji: "👦" },
            { label: "Father", type: "Father" as const, emoji: "👨" },
            { label: "Mother", type: "Mother" as const, emoji: "👩" },
            { label: "Other", type: "Other" as const, emoji: "👤" },
          ].map((role) => {
            const theme = getProfileTheme(role.type);
            return (
              <button
                key={role.label}
                onClick={() => {
                  setType(role.type);
                  setName(role.label);
                  setShowAddModal(true);
                }}
                className={`flex items-center justify-between p-4 rounded-3xl border text-left transition-transform active:scale-[0.97] cursor-pointer ${theme.color}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{role.emoji}</span>
                  <span className="text-xs font-bold text-slate-800">{role.label}</span>
                </div>
                <Plus className="w-4 h-4 text-slate-450" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ADD NEW MEMBER MODAL SHEET */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl max-h-[80%] overflow-y-auto animate-slide-up relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 mb-1">Add Family Profile</h3>
            <p className="text-[11px] text-slate-450 mb-5">Create a separate medical file tag for individual care.</p>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-404 mb-1">Full Name</label>
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
                  <label className="block text-[10px] uppercase font-bold text-slate-404 mb-1">Relationship type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs focus:bg-white focus:outline-none bg-white"
                  >
                    <option value="Myself">Myself</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-404 mb-1">Gender</label>
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
                <label className="block text-[10px] uppercase font-bold text-slate-404 mb-1">Age (Years)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 32"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-404 mb-1">Known Drug/Food Allergies</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Peanuts, Penicillin (leave empty if none)"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-404 mb-1">Medical Conditions</label>
                <input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Acid reflux, hypertension status"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-md"
              >
                Create Member Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
