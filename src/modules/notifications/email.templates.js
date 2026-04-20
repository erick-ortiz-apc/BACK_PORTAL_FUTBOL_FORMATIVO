const BRAND = {
  bg: '#fafaf8',
  dark: '#081f11',
  accent: '#c4f135',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
};

function frontendUrl(path = '') {
  const base = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
  return `${base}${path}`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout({ title, bodyHtml, ctaLabel, ctaUrl }) {
  const cta = ctaLabel && ctaUrl
    ? `<div style="margin:28px 0 8px;">
         <a href="${ctaUrl}" style="display:inline-block; background:${BRAND.dark}; color:${BRAND.accent}; text-decoration:none; font-weight:700; font-size:14px; letter-spacing:0.03em; padding:12px 24px; border-radius:8px;">
           ${escapeHtml(ctaLabel)}
         </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0; padding:0; background:${BRAND.bg}; font-family:'Segoe UI',Arial,sans-serif; color:${BRAND.text};">
  <div style="max-width:600px; margin:0 auto; padding:32px 16px;">
    <div style="background:${BRAND.dark}; padding:20px 28px; border-radius:12px 12px 0 0;">
      <h1 style="font-family:'Bebas Neue',Arial,sans-serif; font-size:24px; letter-spacing:0.05em; color:${BRAND.accent}; margin:0; line-height:1;">
        PORTAL FÚTBOL FORMATIVO
      </h1>
    </div>
    <div style="background:white; padding:28px; border:1px solid ${BRAND.border}; border-top:none; border-radius:0 0 12px 12px;">
      <h2 style="font-size:20px; color:${BRAND.dark}; margin:0 0 16px; line-height:1.3;">${escapeHtml(title)}</h2>
      <div style="font-size:14px; line-height:1.6; color:${BRAND.text};">
        ${bodyHtml}
      </div>
      ${cta}
    </div>
    <p style="text-align:center; font-size:11px; color:${BRAND.muted}; margin:16px 0 0;">
      Este es un mensaje automático del Portal de Fútbol Formativo.
    </p>
  </div>
</body>
</html>`;
}

function newPublisher({ publisher }) {
  const name = escapeHtml(publisher.display_name);
  const email = escapeHtml(publisher.email);
  const body = `
    <p>Un nuevo publicador acaba de registrarse en el portal:</p>
    <ul style="padding-left:18px; margin:10px 0;">
      <li><strong>Nombre:</strong> ${name}</li>
      <li><strong>Email:</strong> ${email}</li>
    </ul>
    <p style="color:${BRAND.muted}; font-size:13px;">
      Aún no ha creado una publicación. Recibirás otra notificación cuando cree su primera ficha.
    </p>`;
  return {
    subject: `Nuevo publicador registrado: ${name}`,
    html: layout({
      title: 'Nuevo publicador registrado',
      bodyHtml: body,
      ctaLabel: 'Ir al panel de admin',
      ctaUrl: frontendUrl('/admin'),
    }),
  };
}

function newPublication({ publisher, publication }) {
  const pubName = escapeHtml(publisher.display_name);
  const title = escapeHtml(publication.title);
  const body = `
    <p><strong>${pubName}</strong> ha creado una nueva publicación que requiere tu revisión:</p>
    <div style="background:${BRAND.bg}; border-left:4px solid ${BRAND.accent}; padding:14px 18px; border-radius:6px; margin:16px 0;">
      <p style="margin:0 0 4px; font-weight:700; color:${BRAND.dark};">${title}</p>
      <p style="margin:0; font-size:13px; color:${BRAND.muted};">Estado: <strong>En revisión</strong></p>
    </div>
    <p>Revísala y aprueba o rechaza desde el panel de administración.</p>`;
  return {
    subject: `Nueva publicación para revisar: ${title}`,
    html: layout({
      title: 'Nueva publicación en revisión',
      bodyHtml: body,
      ctaLabel: 'Revisar ahora',
      ctaUrl: frontendUrl('/admin'),
    }),
  };
}

function publicationEdited({ publisher, publication }) {
  const pubName = escapeHtml(publisher.display_name);
  const title = escapeHtml(publication.title);
  const body = `
    <p><strong>${pubName}</strong> ha editado una publicación. Debe volver a revisión antes de ser visible nuevamente:</p>
    <div style="background:${BRAND.bg}; border-left:4px solid #f59e0b; padding:14px 18px; border-radius:6px; margin:16px 0;">
      <p style="margin:0 0 4px; font-weight:700; color:${BRAND.dark};">${title}</p>
      <p style="margin:0; font-size:13px; color:${BRAND.muted};">Estado: <strong>En revisión (re-enviada)</strong></p>
    </div>`;
  return {
    subject: `Publicación editada para re-revisar: ${title}`,
    html: layout({
      title: 'Publicación editada — requiere re-revisión',
      bodyHtml: body,
      ctaLabel: 'Revisar cambios',
      ctaUrl: frontendUrl('/admin'),
    }),
  };
}

function publicationApproved({ publisher, publication }) {
  const name = escapeHtml(publisher.display_name);
  const title = escapeHtml(publication.title);
  const body = `
    <p>Hola ${name},</p>
    <p>Tu publicación ha sido <strong style="color:#1a7a3e;">aprobada</strong> y ya es visible al público:</p>
    <div style="background:${BRAND.bg}; border-left:4px solid ${BRAND.accent}; padding:14px 18px; border-radius:6px; margin:16px 0;">
      <p style="margin:0; font-weight:700; color:${BRAND.dark};">${title}</p>
    </div>
    <p>Puedes gestionar su estado (activar/desactivar) desde tu panel.</p>`;
  return {
    subject: `¡Tu publicación fue aprobada!`,
    html: layout({
      title: 'Tu publicación fue aprobada',
      bodyHtml: body,
      ctaLabel: 'Ver mi panel',
      ctaUrl: frontendUrl('/publisher'),
    }),
  };
}

function publicationRejected({ publisher, publication, notes }) {
  const name = escapeHtml(publisher.display_name);
  const title = escapeHtml(publication.title);
  const reviewNotes = escapeHtml(notes || '');
  const body = `
    <p>Hola ${name},</p>
    <p>Tu publicación <strong>"${title}"</strong> no pudo ser aprobada. Motivos indicados por el equipo:</p>
    <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:14px 18px; border-radius:6px; margin:16px 0; white-space:pre-wrap;">
      <p style="margin:0; font-size:13px; color:#7f1d1d;">${reviewNotes}</p>
    </div>
    <p>Puedes editar tu publicación desde tu panel para abordar los puntos señalados. Al guardar, volverá a revisión (tiempo aprox. 24 horas).</p>`;
  return {
    subject: `Tu publicación requiere ajustes`,
    html: layout({
      title: 'Tu publicación requiere ajustes',
      bodyHtml: body,
      ctaLabel: 'Editar mi publicación',
      ctaUrl: frontendUrl('/publisher'),
    }),
  };
}

module.exports = {
  newPublisher,
  newPublication,
  publicationEdited,
  publicationApproved,
  publicationRejected,
};
