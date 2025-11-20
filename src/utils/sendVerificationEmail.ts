import type { Env } from "../types/Env";

export async function sendVerificationEmail(
  env: Env,
  to: string,
  link: string
) {
  const apiKey = env.BREVO_API_KEY;
  const from = env.EMAIL_FROM;

  if (!apiKey) {
    console.warn(
      "[sendVerificationEmail] BREVO_API_KEY não configurado; pulando envio",
      { to }
    );
    return;
  }

  if (!from || typeof from !== "string") {
    throw new Error(
      'EMAIL_FROM não configurado (ex: "Avante Nutri <no-reply@avantenutri.com>").'
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error(`Email inválido: ${to}`);
  }

  console.info("[sendVerificationEmail] preparando e-mail para envio");

  const subject = "Confirme seu e-mail - Avante Nutri";
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de E-mail - Pixelaria</title>
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
        .confirm-button {
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
        .confirm-button:hover {
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
        .security-note {
            background: #fff5f5;
            border-left: 4px solid #fc8181;
            border-radius: 6px;
            padding: 18px;
            margin: 30px 0;
            font-size: 14px;
            color: #c53030;
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
            <div class="tagline">Confirme seu e-mail</div>
        </div>
        
        <div class="content">
            <div class="greeting">Olá, futuro parceiro(a)!</div>
            
            <div class="message">
                Estamos empolgados em tê-lo(a) conosco! Sua presença digital está prestes a ganhar vida.<br><br>
                Para ativar sua conta, confirme seu e-mail abaixo.
            </div>

            <div class="button-container">
                <a href="${link}" class="confirm-button">
                    <span class="icon">✓</span> Confirmar E-mail
                </a>
            </div>

            <div class="expiry-note">
                ⏱️ Este link expira em 15 minutos por questões de segurança
            </div>

            <div class="security-note">
                <strong>Não reconhece este cadastro?</strong><br>
                Se você não solicitou a criação de uma conta na Pixelaria, ignore este e-mail. 
                Suas informações serão removidas automaticamente de nossos sistemas.
            </div>

            <div style="font-size: 14px; color: #4a5568; margin-top: 30px;">
                <strong>Problemas para clicar no botão?</strong><br>
                Copie e cole o link abaixo em seu navegador:
            </div>
            <div class="link-backup">${link}</div>
        </div>
        
        <div class="footer">
            <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px;">Pixelaria Studio Digital</div>
            <div>Transformando ideias em experiências digitais memoráveis</div>
            
            <div class="contact">
                Precisa de ajuda? <a href="mailto:atendimentopixelaria@gmail.com" style="color: #6D28D9; text-decoration: none; font-weight: 500;">atendimentopixelaria@gmail.com</a>
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

  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      try {
        return await res.json();
      } catch {
        return {};
      }
    }

    if (res.status === 429 || res.status >= 500) {
      const backoff = 500 * attempt;
      console.warn(
        `[sendVerificationEmail] Brevo ${res.status} — retry em ${backoff}ms (tentativa ${attempt})`
      );
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `[sendVerificationEmail] Falha (${res.status}): ${bodyText}`
    );
  }

  throw new Error(
    "[sendVerificationEmail] Máximo de tentativas de envio atingido"
  );
}

function parseSender(from: string) {
  const m = from.match(/^(.*)<(.+@.+)>$/);
  if (m)
    return { name: m[1].trim().replace(/(^"|"$)/g, ""), email: m[2].trim() };
  return { name: "Avante Nutri", email: from.trim() };
}
