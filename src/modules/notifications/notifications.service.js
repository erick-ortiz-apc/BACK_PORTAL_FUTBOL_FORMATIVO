const { sendMail, getAdminEmails } = require('./mailer');
const tpl = require('./email.templates');

async function notifyNewPublisher(publisher) {
  const admins = await getAdminEmails();
  if (admins.length === 0) return;
  const { subject, html } = tpl.newPublisher({ publisher });
  await sendMail({ to: admins, subject, html });
}

async function notifyNewPublication({ publisher, publication }) {
  const admins = await getAdminEmails();
  if (admins.length === 0) return;
  const { subject, html } = tpl.newPublication({ publisher, publication });
  await sendMail({ to: admins, subject, html });
}

async function notifyPublicationEdited({ publisher, publication }) {
  const admins = await getAdminEmails();
  if (admins.length === 0) return;
  const { subject, html } = tpl.publicationEdited({ publisher, publication });
  await sendMail({ to: admins, subject, html });
}

async function notifyPublicationApproved({ publisher, publication }) {
  if (!publisher?.email) return;
  const { subject, html } = tpl.publicationApproved({ publisher, publication });
  await sendMail({ to: publisher.email, subject, html });
}

async function notifyPublicationRejected({ publisher, publication, notes }) {
  if (!publisher?.email) return;
  const { subject, html } = tpl.publicationRejected({ publisher, publication, notes });
  await sendMail({ to: publisher.email, subject, html });
}

module.exports = {
  notifyNewPublisher,
  notifyNewPublication,
  notifyPublicationEdited,
  notifyPublicationApproved,
  notifyPublicationRejected,
};
