export type MeOut = {
  id: string;
  assistant_name: string;
  timezone: string;
};

export type MeOnboard = {
  assistant_name: string;
  timezone?: string;
};

export type MeOnboardOut = {
  user_id: string;
  assistant_name: string;
  timezone: string;
  api_key: string;
};

export type MePatch = {
  assistant_name?: string | null;
  timezone?: string | null;
};
