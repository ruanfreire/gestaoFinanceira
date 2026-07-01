import { Schema } from 'mongoose';

export const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: { type: [String], default: ['user'] },
    refreshTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

