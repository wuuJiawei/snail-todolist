import { create } from "zustand";

export interface UserProfile {
  username: string;
  avatarUrl: string | null;
}

interface UserProfileState {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
}

export const useUserProfileStore = create<UserProfileState>((set) => ({
  profile: {
    username: "离线用户",
    avatarUrl: null,
  },
  setProfile: (profile) =>
    set((state) => ({
      profile: { ...state.profile, ...profile },
    })),
}));
