# Turning on RSVPs (one-time, about 5 minutes)

The website sends RSVPs to a small Google Apps Script (`Code.gs`). It saves
answers to a Google Sheet and emails sophiamastrangelo6@gmail.com each time.

Do this in a phone or computer **web browser** (not the Google app). On a
phone, switch to the desktop version of the page if things look cramped
(Safari: **aA → Request Desktop Website**; Chrome: **⋮ → Desktop site**).

1. Go to **https://script.google.com** and sign in with your Google account.
2. Tap **New project**.
3. Delete the sample code in the editor.
4. Open https://raw.githubusercontent.com/ezekielgblount-sketch/task-dashboard/main/rsvp/Code.gs,
   select all, copy, and paste it into the editor.
5. Click **Untitled project** at the top and rename it **Wedding RSVP**.
   Click the **Save** (disk) icon.
6. Click **Deploy → New deployment**. Click the gear next to "Select type"
   and pick **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**.
7. Click **Authorize access**, choose your account. Google will say
   "Google hasn't verified this app" because you wrote it yourself:
   click **Advanced → Go to Wedding RSVP (unsafe) → Allow**.
8. Copy the **Web app URL** (it ends in `/exec`).
9. Put it in `wedding-site/script.js` as `RSVP_URL` (or send it to Claude).

## Testing without saving anything

Open the site with `?test` at the end:
https://ezekielgblount-sketch.github.io/task-dashboard/?test

RSVPs sent in test mode email Sophia a preview marked **[TEST]** and are
not saved.

## Changing the guest list later

Edit both `wedding-site/guests.js` (what the site shows) and `PARTIES` in
`Code.gs` (what the RSVP service accepts). After changing `Code.gs`, paste it
into the Apps Script editor again and use **Deploy → Manage deployments →
Edit (pencil) → Version: New version → Deploy**. The URL stays the same.
