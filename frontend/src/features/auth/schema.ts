import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
  remember: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  company: z.string().min(2, "Informe o nome da empresa"),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
});

export type SignupFormData = z.infer<typeof signupSchema>;
