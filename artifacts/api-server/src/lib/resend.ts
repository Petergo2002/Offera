type SendEmailInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type ResendSendEmailResponse = {
  id?: string;
};

function requireResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set to send signing emails.");
  }

  return apiKey;
}

export function requireResendFromEmail() {
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL must be set to send signing emails.");
  }

  return from;
}

export async function sendEmail(input: SendEmailInput) {
  const apiKey = requireResendApiKey();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: [input.replyTo] } : {}),
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `Resend email request failed: ${response.status} ${response.statusText}${
        payload ? ` - ${payload}` : ""
      }`,
    );
  }

  return (await response.json()) as ResendSendEmailResponse;
}
