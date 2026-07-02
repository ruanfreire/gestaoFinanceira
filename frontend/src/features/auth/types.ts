export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  roles?: string[];
};

export type LoginCredentials = {
  email: string;
  password: string;
  remember?: boolean;
};

export type LoginResponse = {
  ok: boolean;
  accessToken?: string;
  user?: AuthUser;
  message?: string;
};
