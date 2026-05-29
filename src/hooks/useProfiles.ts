import { useState, useEffect } from "react";
import { Profile } from "../types";
import { storageService } from "../services/storageService";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const saved = storageService.getProfiles();
    if (saved.some((profile) => profile.type === "Myself")) {
      setProfiles(saved);
      return;
    }

    const defaultProfile: Profile = {
      id: "profile_myself",
      name: "Myself",
      type: "Myself",
    };
    const updated = [defaultProfile, ...saved];
    setProfiles(updated);
    storageService.saveProfiles(updated);
  }, []);

  const addProfile = (profileData: Omit<Profile, "id">) => {
    const newProfile: Profile = {
      ...profileData,
      id: `profile_${Date.now()}`,
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    storageService.saveProfiles(updated);
    return newProfile;
  };

  const updateProfile = (id: string, updatedData: Partial<Profile>) => {
    const updated = profiles.map((p) => (p.id === id ? { ...p, ...updatedData } : p));
    setProfiles(updated);
    storageService.saveProfiles(updated);
  };

  const deleteProfile = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    storageService.saveProfiles(updated);
  };

  return {
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
  };
}
