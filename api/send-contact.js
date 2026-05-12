import nodemailer from 'nodemailer';

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDetails(payload) {
  const details = [
    ['Tipo de formulario', payload.formType],
    ['Nombre', payload.name],
    ['Correo', payload.email],
    ['Empresa', payload.company],
    ['Telefono', payload.phone],
    ['Tipo de proyecto', payload.projectType],
    ['Presupuesto', payload.budget],
    ['Plazo', payload.timeline],
    ['Sector', payload.industry],
    ['Objetivo', payload.goals],
    ['Funciones', payload.features?.length ? payload.features.join(', ') : 'No especificadas'],
    ['Mensaje', payload.message],
    ['Origen', payload.source],
    ['Fecha', new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })]
  ];

  const text = details
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');

  const html = details
    .filter(([, value]) => value)
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:700">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #e5e7eb">${escapeHtml(String(value))}</td></tr>`)
    .join('');

  return { text, html };
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...init.headers
    }
  });
}

async function processContact(request) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const contactReceiver = process.env.CONTACT_RECEIVER || 'systemsoptimal@gmail.com';

  if (!gmailUser || !gmailAppPassword) {
    return jsonResponse(
      { error: 'Faltan las variables GMAIL_USER o GMAIL_APP_PASSWORD en Vercel.' },
      { status: 500 }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'No se pudo leer el contenido del formulario.' }, { status: 400 });
  }

  const sanitizedPayload = {
    formType: (payload.formType || 'mensaje').toString().trim(),
    name: (payload.name || '').toString().trim(),
    email: (payload.email || '').toString().trim(),
    company: (payload.company || '').toString().trim(),
    phone: (payload.phone || '').toString().trim(),
    message: (payload.message || '').toString().trim(),
    projectType: (payload.projectType || '').toString().trim(),
    budget: (payload.budget || '').toString().trim(),
    timeline: (payload.timeline || '').toString().trim(),
    industry: (payload.industry || '').toString().trim(),
    goals: (payload.goals || '').toString().trim(),
    features: Array.isArray(payload.features)
      ? payload.features.map(item => item.toString().trim()).filter(Boolean)
      : [],
    source: (payload.source || '').toString().trim()
  };

  if (!sanitizedPayload.name || !sanitizedPayload.email || !sanitizedPayload.message) {
    return jsonResponse({ error: 'Nombre, correo y mensaje son obligatorios.' }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  const { text, html } = buildDetails(sanitizedPayload);
  const isQuote = sanitizedPayload.formType === 'cotizacion';
  const subject = isQuote
    ? `Nueva solicitud de cotizacion de ${sanitizedPayload.name}`
    : `Nuevo mensaje web de ${sanitizedPayload.name}`;

  try {
    await transporter.sendMail({
      from: `"Optimal Software Web" <${gmailUser}>`,
      to: contactReceiver,
      replyTo: sanitizedPayload.email,
      subject,
      text: `Has recibido un nuevo contacto desde la web.\n\n${text}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#111827">
          <h2 style="margin-bottom:16px">${escapeHtml(subject)}</h2>
          <p style="margin-bottom:16px">Este mensaje fue enviado desde el formulario web y puedes responder directamente a <strong>${escapeHtml(sanitizedPayload.email)}</strong> desde Gmail.</p>
          <table style="border-collapse:collapse;width:100%;max-width:760px">${html}</table>
        </div>
      `
    });

    await transporter.sendMail({
      from: `"Optimal Software" <${gmailUser}>`,
      to: sanitizedPayload.email,
      subject: 'Recibimos tu mensaje y te responderemos pronto',
      text: `Hola ${sanitizedPayload.name},\n\nRecibimos tu ${isQuote ? 'solicitud de cotizacion' : 'mensaje'} correctamente.\n\nResumen:\n${text}\n\nTe responderemos pronto desde este mismo correo.\n\nOptimal Software`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#111827;max-width:640px;margin:0 auto">
          <h2 style="margin-bottom:12px">Recibimos tu mensaje</h2>
          <p style="margin-bottom:16px">Hola ${escapeHtml(sanitizedPayload.name)}, gracias por escribirnos. Ya recibimos tu ${isQuote ? 'solicitud de cotizacion' : 'mensaje'} y te responderemos pronto desde este mismo correo.</p>
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px">
            <h3 style="margin-top:0;margin-bottom:12px">Resumen enviado</h3>
            <table style="border-collapse:collapse;width:100%">${html}</table>
          </div>
          <p style="color:#4b5563">Si deseas agregar más detalles, solo responde a este correo y continuamos la conversación por ahí.</p>
        </div>
      `
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      {
        error: 'No se pudo enviar el correo desde el servidor.',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return jsonResponse({
    ok: true,
    endpoint: '/api/send-contact',
    methods: ['GET', 'POST', 'OPTIONS'],
    message: 'Endpoint activo. Usa POST para enviar formularios.'
  });
}

export async function POST(request) {
  return processContact(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, OPTIONS'
    }
  });
}
