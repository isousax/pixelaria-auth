import type { Env } from "../types/Env";

export async function sendPasswordResetEmail(
  env: Env,
  to: string,
  link: string
) {
  const apiKey = env.BREVO_API_KEY;
  const from = env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      "[sendPasswordResetEmail] BREVO_API_KEY ou EMAIL_FROM ausente"
    );
    return;
  }

  const subject = "Redefinição de Senha - Pixelaria";
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinição de Senha - Pixelaria</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            margin: 0;
            padding: 0;
            background-color: #f7fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        }
        .header {
            background: linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%);
            padding: 30px 40px;
            text-align: center;
            color: white;
            position: relative;
        }
        .logo {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
            letter-spacing: -0.5px;
        }
        .tagline {
            font-size: 16px;
            font-weight: 400;
            opacity: 0.9;
            max-width: 400px;
            margin: 0 auto;
        }
        .content {
            padding: 45px 35px;
        }
        .greeting {
            font-size: 20px;
            margin-bottom: 25px;
            color: #2d3748;
            font-weight: 600;
        }
        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%);
            color: white;
            text-decoration: none;
            padding: 18px 40px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(109, 40, 217, 0.25);
            letter-spacing: 0.5px;
        }
        .reset-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 16px rgba(109, 40, 217, 0.35);
        }
        .expiry-note {
            text-align: center;
            font-size: 14px;
            color: #718096;
            margin-top: 20px;
            font-weight: 500;
        }
        .link-backup {
            word-break: break-all;
            font-size: 14px;
            color: #4a5568;
            background: #f8fafc;
            padding: 18px;
            border-radius: 8px;
            margin: 25px 0;
            border: 1px solid #e2e8f0;
            font-family: monospace;
        }
        .security-info {
            background: #fff5f5;
            border-left: 4px solid #fc8181;
            border-radius: 6px;
            padding: 18px;
            margin: 30px 0;
            font-size: 14px;
            color: #c53030;
        }
        .steps {
            background: #f0f9ff;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            border-left: 4px solid #63b3ed;
        }
        .steps h3 {
            color: #2b6cb0;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 16px;
            font-weight: 600;
        }
        .steps ol {
            margin: 0;
            padding-left: 20px;
            color: #4a5568;
        }
        .steps li {
            margin-bottom: 8px;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #718096;
        }
        .contact {
            margin-top: 20px;
            font-size: 14px;
        }
        .social-links {
            margin-top: 20px;
        }
        .social-link {
            display: inline-block;
            margin: 0 8px;
            color: #6D28D9;
            text-decoration: none;
            font-weight: 500;
        }
        .pixel-grid {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 10px;
            background-image: 
                linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%), 
                linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%), 
                linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
            background-size: 10px 10px;
        }
        .icon {
            display: inline-block;
            margin-right: 8px;
            vertical-align: middle;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 12px;
            }
            .header, .content, .footer {
                padding: 35px 25px;
            }
            .header {
                padding: 40px 25px 35px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Pixelaria</div>
            <div class="tagline">Redefinição de Senha</div>
        </div>
        
        <div class="content">
            <div class="greeting">Olá,</div>
            
            <div class="message">
                Recebemos uma solicitação para redefinir a senha da sua conta na <strong>Pixelaria</strong>. 
                Para continuar com o processo, clique no botão abaixo:
            </div>

            <div class="button-container">
                <a href="${link}" class="reset-button">
                    <span class="icon">🔒</span> Redefinir Minha Senha
                </a>
            </div>

            <div class="expiry-note">
                ⏱️ Este link expira em 15 minutos por questões de segurança
            </div>

            <div class="steps">
                <h3>📋 O que acontece depois?</h3>
                <ol>
                    <li>Você será direcionado para uma página segura</li>
                    <li>Poderá criar uma nova senha</li>
                </ol>
            </div>

            <div class="security-info">
                <strong>🔒 Importante:</strong><br>
                Se você não solicitou a redefinição de senha, ignore este e-mail. 
                Sua senha atual permanecerá segura. Recomendamos que você verifique 
                a segurança da sua conta.
            </div>

            <div style="font-size: 14px; color: #4a5568; margin-top: 30px;">
                <strong>Problemas com o botão?</strong><br>
                Se o botão acima não funcionar, copie e cole o link abaixo em seu navegador:
            </div>
            <div class="link-backup">${link}</div>
        </div>
        
        <div class="footer">
            <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px;">Pixelaria Studio Digital</div>
            <div>Transformando ideias em experiências digitais memoráveis</div>
            
            <div class="contact">
                Dúvidas sobre segurança? <a href="mailto:suporte@pixelaria.com.br" style="color: #6D28D9; text-decoration: none; font-weight: 500;">suporte@pixelaria.com.br</a>
            </div>
            
            <div class="social-links">
                <a href="https://pixelaria.com.br" class="social-link">Website</a>
                <a href="https://instagram.com/studiopixelaria" class="social-link">Instagram</a>
            </div>
            
            <div style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                © ${new Date().getFullYear()} Pixelaria. Todos os direitos reservados.
            </div>
        </div>
    </div>
</body>
</html>`;

  const sender = parseSender(from);
  const payload: any = {
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (env.EMAIL_REPLY_TO) payload.replyTo = { email: env.EMAIL_REPLY_TO };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar email (${res.status}): ${bodyText}`);
  }
}

function parseSender(from: string) {
  const m = from.match(/^(.*)<(.+@.+)>$/);
  if (m)
    return { name: m[1].trim().replace(/(^"|"$)/g, ""), email: m[2].trim() };
  return { name: "Pixelaria", email: from.trim() };
}
