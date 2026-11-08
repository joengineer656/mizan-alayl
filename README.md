# ميزان الليل

A private challenge tracker for two friends: Quran pages, Qiyam rak'at and Fajr in the mosque, by day, week, Hijri month and all time. Static site on GitHub Pages, with data in Firebase (free plan).

## Setup

1. **Create the project.** At <https://console.firebase.google.com> add a project. Google Analytics is not needed.
2. **Turn on login.** Build > Authentication > Get started > Sign-in method > enable Google.
3. **Create the database.** Build > Firestore Database > Create database > Production mode.
4. **Register the web app.** Project settings > General > Your apps > Web (`</>`). Copy `apiKey`, `authDomain`, `projectId` and `appId` into `firebase-config.js`.
5. **Publish.** Push this folder to a GitHub repository, then Settings > Pages > Deploy from a branch > `main` / root.
6. **Allow the site to log in.** Authentication > Settings > Authorized domains > add `YOUR-NAME.github.io`.
7. **Add the two people.** Each of you opens the site and signs in with Google. The site shows "هذا الحساب غير مضاف" and your user ID. Put both IDs in place of `UID_ONE` and `UID_TWO` in `firestore.rules`, then paste the whole file into Firestore > Rules > Publish. Reopen the site.

Install on Android: open the site in Chrome, then use the "تثبيت التطبيق على الهاتف" button or Chrome's menu > Install app.

## Good to know

- Quran and Qiyam logged before 5:00 am count for the night before. Fajr counts on its real date.
- Today and yesterday can be edited.
- If you add a new file to the site, add it to `SHELL` in `sw.js` and raise `CACHE`.
- Tests: `node stats.test.mjs`
- `content.js` was cut directly from source texts, with the reference shown under each item. Have someone knowledgeable review it before sharing it further.
