/**
 * Ezekiel & Sophia — RSVP service (Google Apps Script)
 *
 * What it does when a guest sends an RSVP from the website:
 *   1. Checks the party is on the guest list, and that everyone marked as
 *      coming belongs to that party.
 *   2. Saves each person's answer in a Google Sheet ("Ezekiel & Sophia RSVPs"),
 *      created automatically and shared with NOTIFY_EMAIL.
 *   3. Emails NOTIFY_EMAIL the new RSVP plus the full list: who's confirmed,
 *      who can't make it, and who hasn't answered yet.
 *   4. If the guest gave an email, sends them a short confirmation.
 *
 * Setup steps are in rsvp/SETUP.md.
 */

const NOTIFY_EMAIL = 'sophiamastrangelo6@gmail.com';
const SITE_URL = 'https://ezekielgblount-sketch.github.io/task-dashboard/';
const SHEET_TITLE = 'Ezekiel & Sophia RSVPs';

// Keep in sync with wedding-site/guests.js
const PARTIES = [
  { id: 'mama', members: ['Mama'] },
  { id: 'papa', members: ['Papa'] },
  { id: 'joe-gianna-michael', members: ['Joe', 'Gianna', 'Michael'] },
  { id: 'anthony-maya', members: ['Anthony', 'Maya'] },
  { id: 'donavon-izy', members: ['Donavon', 'Izy'] },
  { id: 'marcus', members: ['Marcus'] },
  { id: 'meme-papple', members: ['Meme', 'Papple'] },
  { id: 'colleen-david', members: ['Grandma Colleen', 'Grandpa David'] },
  { id: 'kelcys-nelli', members: ['Kelcys', 'Nelli'] },
  { id: 'samara-austin', members: ['Samara', 'Austin'] },
  { id: 'kailey', members: ['Kailey'] },
  { id: 'jackie', members: ['Jackie'] },
  { id: 'christa-greg-ava-michael', members: ['Christa', 'Greg', 'Ava', 'Michael'] },
  { id: 'heather-jeff-ian-vincent', members: ['Heather', 'Jeff', 'Ian', 'Vincent'] },
  { id: 'pj-shanna', members: ['PJ', 'Shanna'] },
  { id: 'amy-randy-esther-jackson', members: ['Amy', 'Randy', 'Esther', 'Jackson'] },
  { id: 'sassy-david', members: ['Sassy', 'David'] },
  { id: 'mema-papa', members: ['Mema', 'Pa Pa'] },
  { id: 'grandpa-cader', members: ['Grandpa Cader'] },
  { id: 'gabe', members: ['Gabe'] },
  { id: 'timmy-mady-mom', members: ['Timmy', 'Mady', "Timmy's Mom"] },
  { id: 'joel', members: ['Joel'] },
  { id: 'moses', members: ['Moses'] },
  { id: 'kadence-steaven', members: ['Kadence', 'Steaven'] },
  { id: 'matthew', members: ['Matthew'] },
  { id: 'regon', members: ['Regon'] },
];

const STATUS_YES = 'Attending';
const STATUS_NO = 'Not attending';
const STATUS_NONE = 'No response yet';
const HEADER = ['Party ID', 'Party', 'Guest', 'Status', 'Answered by', 'Email', 'Note', 'Updated'];

/* ---------- Web endpoints ---------- */

function doGet() {
  return json_({ ok: true, message: 'RSVP service is running.' });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }

  const party = PARTIES.find(function (p) { return p.id === data.partyId; });
  if (!party) return json_({ ok: false, error: 'not_on_list' });

  const attending = data.attending === true;
  const coming = attending
    ? (Array.isArray(data.coming) ? data.coming : []).filter(function (n) { return party.members.indexOf(n) !== -1; })
    : [];
  if (attending && coming.length === 0) return json_({ ok: false, error: 'nobody_selected' });

  const rsvp = {
    party: party,
    attending: attending,
    coming: coming,
    notComing: party.members.filter(function (n) { return coming.indexOf(n) === -1; }),
    respondent: clean_(data.respondent, 80) || party.members[0],
    email: clean_(data.email, 120),
    note: clean_(data.note, 1000),
  };

  // Test mode (site opened with ?test): email a preview, save nothing.
  if (data.test === true) {
    sendUpdate_(rsvp, statusRows_(getSheet_()), true);
    return json_({ ok: true, test: true });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_();
    saveRsvp_(sheet, rsvp);
    sendUpdate_(rsvp, statusRows_(sheet), false);
  } finally {
    lock.releaseLock();
  }

  if (rsvp.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rsvp.email)) {
    try { sendGuestConfirmation_(rsvp); } catch (err) { console.warn(err); }
  }
  return json_({ ok: true });
}

/* ---------- Sheet ---------- */

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  const id = props.getProperty('SHEET_ID');
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_TITLE);
    props.setProperty('SHEET_ID', ss.getId());
    try { ss.addEditor(NOTIFY_EMAIL); } catch (err) { console.warn(err); }
    const s = ss.getSheets()[0];
    s.setName('RSVPs');
    s.appendRow(HEADER);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, HEADER.length).setFontWeight('bold');
  }
  const sheet = ss.getSheets()[0];
  addMissingGuests_(sheet);
  return sheet;
}

// Make sure every guest on the list has a row (handles list changes too).
function addMissingGuests_(sheet) {
  const rows = sheet.getDataRange().getValues();
  const have = {};
  rows.slice(1).forEach(function (r) { have[r[0] + '|' + r[2]] = true; });
  const add = [];
  PARTIES.forEach(function (p) {
    p.members.forEach(function (name) {
      if (!have[p.id + '|' + name]) add.push([p.id, partyLabel_(p), name, STATUS_NONE, '', '', '', '']);
    });
  });
  if (add.length) sheet.getRange(sheet.getLastRow() + 1, 1, add.length, HEADER.length).setValues(add);
}

function saveRsvp_(sheet, rsvp) {
  const rows = sheet.getDataRange().getValues();
  const now = new Date();
  rsvp.party.members.forEach(function (name) {
    const status = rsvp.coming.indexOf(name) !== -1 ? STATUS_YES : STATUS_NO;
    const row = [rsvp.party.id, partyLabel_(rsvp.party), name, status, rsvp.respondent, rsvp.email, rsvp.note, now];
    let index = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === rsvp.party.id && rows[i][2] === name) { index = i; break; }
    }
    if (index === -1) sheet.appendRow(row);
    else sheet.getRange(index + 1, 1, 1, row.length).setValues([row]);
  });
}

function statusRows_(sheet) {
  return sheet.getDataRange().getValues().slice(1).map(function (r) {
    return { partyId: r[0], party: r[1], name: r[2], status: r[3] };
  });
}

/* ---------- Emails ---------- */

function sendUpdate_(rsvp, rows, isTest) {
  // In test mode, show the list as it would look after this RSVP.
  if (isTest) {
    rows = rows.map(function (r) {
      if (r.partyId !== rsvp.party.id) return r;
      return { partyId: r.partyId, party: r.party, name: r.name, status: rsvp.coming.indexOf(r.name) !== -1 ? STATUS_YES : STATUS_NO };
    });
  }
  const yes = rows.filter(function (r) { return r.status === STATUS_YES; });
  const no = rows.filter(function (r) { return r.status === STATUS_NO; });
  const none = rows.filter(function (r) { return r.status !== STATUS_YES && r.status !== STATUS_NO; });

  const who = esc_(rsvp.respondent) + ' (' + esc_(partyLabel_(rsvp.party)) + ')';
  const headline = rsvp.attending
    ? who + ' is coming: <b>' + esc_(joinNames_(rsvp.coming)) + '</b>'
    : who + " can't make it.";

  let html = '<div style="font-family:Georgia,serif;color:#2e2624;max-width:560px">';
  if (isTest) html += '<p style="background:#fff3cd;padding:8px 12px;border-radius:6px"><b>TEST</b>: nothing was saved.</p>';
  html += '<h2 style="color:#7a2433;font-weight:normal;margin:0 0 8px">New RSVP</h2>';
  html += '<p style="font-size:17px">' + headline + '</p>';
  if (rsvp.attending && rsvp.notComing.length) {
    html += '<p>Not coming from this party: ' + esc_(joinNames_(rsvp.notComing)) + '</p>';
  }
  if (rsvp.note) html += '<p><i>Note:</i> “' + esc_(rsvp.note) + '”</p>';
  if (rsvp.email) html += '<p>Email: ' + esc_(rsvp.email) + '</p>';

  html += '<hr style="border:none;border-top:1px solid #e3d6c4;margin:20px 0">';
  html += '<h3 style="color:#7a2433;font-weight:normal;margin:0 0 4px">Guest list so far</h3>';
  html += '<p style="margin:0 0 12px;color:#6a5f5a">' + yes.length + ' confirmed · ' + no.length + " can't come · " +
          none.length + ' no response yet</p>';
  html += section_('✅ Confirmed', yes, '#556b4c');
  html += section_("❌ Can't make it", no, '#b4646e');
  html += section_('⏳ No response yet', none, '#6a5f5a');
  try {
    const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (id) html += '<p><a href="https://docs.google.com/spreadsheets/d/' + id + '">Open the RSVP spreadsheet</a></p>';
  } catch (err) { /* ignore */ }
  html += '</div>';

  const subject = (isTest ? '[TEST] ' : '') + 'RSVP: ' + rsvp.respondent + ' — ' +
    (rsvp.attending ? rsvp.coming.length + ' coming' : "can't make it") +
    ' (' + yes.length + ' confirmed so far)';

  MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, htmlBody: html, name: 'Wedding RSVPs' });
}

// Lists names grouped by party, e.g. "Joe, Gianna & Michael"
function section_(title, rows, color) {
  let html = '<p style="margin:14px 0 4px;color:' + color + '"><b>' + title + ' (' + rows.length + ')</b></p>';
  if (!rows.length) return html + '<p style="margin:0;color:#999">None</p>';
  const byParty = {};
  const order = [];
  rows.forEach(function (r) {
    if (!byParty[r.partyId]) { byParty[r.partyId] = []; order.push(r.partyId); }
    byParty[r.partyId].push(r.name);
  });
  html += '<ul style="margin:0;padding-left:20px">';
  order.forEach(function (id) { html += '<li>' + esc_(joinNames_(byParty[id])) + '</li>'; });
  return html + '</ul>';
}

function sendGuestConfirmation_(rsvp) {
  const body = rsvp.attending
    ? 'Thank you for your RSVP! We have ' + joinNames_(rsvp.coming) + ' down as coming.\n\n' +
      'Saturday, January 2, 2027 at 1:00 PM\nAll Saints Episcopal Church\n106 West Church Street, Frederick, MD 21701\n\n' +
      'Attire: cocktail attire.\n\nDetails: ' + SITE_URL + '\n\nWe can\'t wait to celebrate with you!\nEzekiel & Sophia'
    : 'Thank you for letting us know. We\'ll miss you, and we\'re grateful you took the time to reply.\n\nEzekiel & Sophia';
  MailApp.sendEmail({
    to: rsvp.email,
    subject: 'Your RSVP for Ezekiel & Sophia\'s wedding',
    body: body + '\n\nNeed to change your answer? Just RSVP again on the website.',
    name: 'Ezekiel & Sophia',
    replyTo: NOTIFY_EMAIL,
  });
}

/* ---------- Helpers ---------- */

function partyLabel_(p) { return joinNames_(p.members); }

function joinNames_(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

function clean_(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function esc_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Optional: run this once from the editor to check that emails reach Sophia. */
function sendTestEmail() {
  sendUpdate_({
    party: PARTIES[0], attending: true, coming: PARTIES[0].members, notComing: [],
    respondent: 'Test', email: '', note: 'This is a test.',
  }, statusRows_(getSheet_()), true);
}
