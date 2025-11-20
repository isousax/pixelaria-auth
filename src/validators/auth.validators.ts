import { z } from "zod";

/**
 * Schema de validação para requisição de login
 */
export const loginSchema = z.object({
  email: z.string().email({ message: "O formato do e-mail informado é inválido." }),
  password: z.string().min(1, { message: "Senha é obrigatória." }),
  remember: z.boolean().optional().default(false),
});

/**
 * Schema de validação para registro de usuário
 */
export const registerSchema = z.object({
  email: z.string().email({ message: "O formato do e-mail informado é inválido." }),
  password: z
    .string()
    .min(8, { message: "A senha deve ter pelo menos 8 caracteres." })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula." })
    .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula." })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número." })
    .regex(/[\W_]/, { message: "A senha deve conter pelo menos um caractere especial." }),
  full_name: z.string().min(1, { message: "Nome completo é obrigatório." }),
  phone: z.string().min(1, { message: "Telefone é obrigatório." }),
  birth_date: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: "A data de nascimento informada é inválida." }
  ),
});

/**
 * Schema para reset de senha
 */
export const requestPasswordResetSchema = z.object({
  email: z.string().email({ message: "O formato do e-mail informado é inválido." }),
});

/**
 * Schema para confirmar reset de senha
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token é obrigatório." }),
  new_password: z
    .string()
    .min(8, { message: "A senha deve ter pelo menos 8 caracteres." })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula." })
    .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula." })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número." }),
});

/**
 * Schema para mudança de senha (usuário autenticado)
 */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, { message: "Senha atual é obrigatória." }),
  new_password: z
    .string()
    .min(8, { message: "A senha deve ter pelo menos 8 caracteres." })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula." })
    .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula." })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número." }),
});

/**
 * Schema para refresh token
 */
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, { message: "Refresh token é obrigatório." }),
});

/**
 * Schema para confirmação de token de verificação
 */
export const confirmVerificationTokenSchema = z.object({
  token: z.string().min(1, { message: "Token é obrigatório." }),
});

// Tipos TypeScript inferidos dos schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ConfirmVerificationTokenInput = z.infer<typeof confirmVerificationTokenSchema>;
