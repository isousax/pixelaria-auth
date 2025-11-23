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
}).refine((data) => data.current_password !== data.new_password, {
  message: "A nova senha deve ser diferente da senha atual.",
  path: ["new_password"],
});

/**
 * Schema para refresh token
 */
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, { message: "Refresh token é obrigatório." }),
});

/**
 * Schema para logout (refresh token + access token opcional)
 */
export const logoutSchema = z.object({
  refresh_token: z.string().min(1, { message: "Refresh token é obrigatório." }),
  access_token: z.string().optional(),
});

/**
 * Schema para confirmação de token de verificação
 */
export const confirmVerificationTokenSchema = z.object({
  token: z.string().min(1, { message: "Token é obrigatório." }),
});

/**
 * Schema para atualização de perfil
 */
export const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .min(3, { message: "Nome completo deve ter pelo menos 3 caracteres." })
      .max(100, { message: "Nome completo deve ter no máximo 100 caracteres." }),
    display_name: z
      .string()
      .min(2, { message: "Nome de exibição deve ter pelo menos 2 caracteres." })
      .max(50, { message: "Nome de exibição deve ter no máximo 50 caracteres." })
      .nullable()
      .optional(),
    phone: z
      .string()
      .regex(/^\+55\d{10,11}$/, { 
        message: "Telefone deve estar no formato internacional +55XXXXXXXXXXX" 
      }),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data de nascimento deve estar no formato YYYY-MM-DD" })
      .refine(
        (val) => {
          const birthDate = new Date(val);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const dayDiff = today.getDate() - birthDate.getDate();
          const adjustedAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
          return adjustedAge >= 18;
        },
        { message: "Você deve ter pelo menos 18 anos." }
      )
      .nullable()
      .optional(),
  })
  .strict();

// Tipos TypeScript inferidos dos schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ConfirmVerificationTokenInput = z.infer<typeof confirmVerificationTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
