# App Store submission checklist

Work top to bottom. Each step says where you do it and what "done" looks
like. Steps marked **you** need your Apple, GitHub, Supabase or Vercel
login; nothing here asks you to paste a secret into a chat or commit one.

The iOS app is a native shell around the live site, so a **website
change ships with a Vercel deploy, not a TestFlight build.** A new build
is only needed when something native changes (a plugin, an entitlement,
an icon, `Info.plist`).

## 0. Before anything else

- [ ] **Supabase** (you): apply migration `0091_device_push_tokens.sql`.
      Push notifications cannot register a device without it.
      Migrations `0089` and `0090` were applied earlier.

## 1. Apple Developer account (you, developer.apple.com/account)

- [ ] Membership shows **Active**. Activation can take minutes to a day
      or two after payment.
- [ ] **Identifiers → "+" → App IDs → App:** register `com.sorza.app`.
      If it is already taken by another developer, pick a new ID and
      change it in `capacitor.config.ts` and both build configurations in
      `ios/App/App.xcodeproj/project.pbxproj`, plus `APNS_BUNDLE_ID`.
- [ ] On that App ID, tick exactly two capabilities and nothing else:
      **Push Notifications**, and **Sign In with Apple** (click
      Configure and choose **Enable as a primary App ID**). The second
      is required by step 3: the Services ID created there must point at
      a primary App ID that has the capability, or it cannot be saved.
- [ ] Note your **Team ID** (Membership details, 10 characters).

## 2. Push notifications key (you)

- [ ] **Keys → "+":** name it "SORZA APNs", tick **Apple Push
      Notifications service (APNs)**, register, and **download the `.p8`
      now, because Apple only lets you download it once.** Note its
      **Key ID**.
- [ ] **Vercel → your project → Settings → Environment Variables**
      (Production): set `APNS_KEY_ID`, `APNS_TEAM_ID`, and
      `APNS_PRIVATE_KEY` (the full contents of the `.p8`, including the
      BEGIN and END lines; literal `\n` sequences are accepted if the
      dashboard flattens newlines). Leave `APNS_ENVIRONMENT` unset:
      production is correct for TestFlight and the App Store.
- [ ] Redeploy so the variables take effect.

Until these are set the app builds and runs fine; push simply does
nothing, because the mock provider sends nothing.

## 3. Sign in with Apple (you)

The login button is already in the app, and Apple requires it because
you also offer Google login. It works through the browser (OAuth), not
the native sign-in sheet, so **the app binary needs no entitlement**
(the App ID capability in step 1 is a separate thing and is needed).
What it needs on the Apple side:

- [ ] **Identifiers → "+" → Services IDs:** create one (for example
      `com.sorza.app.signin`), enable **Sign in with Apple**, and set the
      domain to your Supabase project's domain and the return URL to
      `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] **Keys → "+":** create a second key with **Sign in with Apple**
      ticked and download it.
- [ ] Make the client secret Supabase needs. It does not accept the
      `.p8` file itself, only a signed token built from it, which this
      repo generates locally so the key never touches a website. Run
      `node scripts/apple-client-secret.mjs` from the repo folder and
      answer the four questions (drag the `.p8` file into the window to
      fill in its path). The token is copied to your clipboard rather
      than printed. Never paste it anywhere except Supabase.
- [ ] **Supabase → Authentication → Providers → Apple:** enable it, set
      Client IDs to the **Services ID** (not `com.sorza.app`), and paste
      the token into Secret Key.
- [ ] Step 4 of Apple's Sign in with Apple screen ("Register Email
      Sources") is optional and can be skipped: it only matters if you
      email people who chose "Hide My Email", and it requires the
      sending domain to pass SPF.
- [ ] **Put a reminder in your calendar.** Apple client secrets expire
      after at most **6 months**, and Apple sign-in then breaks silently
      for everyone until it is regenerated.
- [ ] Test it on a real phone before submitting. I could not test any
      sign-in flow.

## 4. App Store Connect (you, appstoreconnect.apple.com)

- [ ] **My Apps → "+" → New App:** name SORZA, iOS, bundle ID
      `com.sorza.app`, any SKU.
- [ ] **Users and Access → Integrations → App Store Connect API →
      "+":** create a key with the **App Manager** role. Download the
      `.p8` (once only). Note the **Key ID** and the **Issuer ID** shown
      above the key list.

## 5. GitHub, for the automated TestFlight build (you)

Repository → Settings → Secrets and variables → Actions.

- [ ] Secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_P8` (the
      App Store Connect `.p8`, base64-encoded. In PowerShell:
      `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXX.p8"))`).
- [ ] Variable: `APPLE_TEAM_ID`.
- [ ] **Actions → iOS TestFlight → Run workflow.** It archives on a macOS
      runner and uploads to TestFlight with no Mac of your own. The build
      appears in App Store Connect → TestFlight after Apple finishes
      processing it (usually 10 to 30 minutes).

**This workflow has never been run.** I wrote it without a Mac, so
expect the first run to need a fix or two. Send me the log of any failed
step and I will correct it. Common first-run failures: the API key role,
a wrong Team ID, or Apple's terms needing to be accepted at
developer.apple.com.

## 6. Test the real build on your phone (you)

Install the build from TestFlight and walk **all** of this signed in.
I have never seen this app signed in, so this is the first real test of
several features:

- [ ] Sign up, log in and sign out. Try Google and Apple.
- [ ] Add a vehicle with a photo, then rate the build.
- [ ] Shoot a clip, add a sound in the editor, and post it. Confirm the
      audio is in the finished video.
- [ ] Host a free meet. Confirm it goes to admin review, approve it from
      the admin screen, and confirm it then appears in Discover.
- [ ] Settings → Notifications → turn on. Approve the iOS prompt. Have a
      second account like your post and confirm the banner arrives.
- [ ] Tap that notification and confirm it opens the right post.
- [ ] Sign out, sign in as a different account, and confirm the first
      account's notifications no longer arrive on this phone.
- [ ] Report a post, block a user, and delete a throwaway account.
- [ ] Upload an avatar. Confirm it works.

## 7. The listing (you, in App Store Connect)

- [ ] Description, subtitle, promotional text: use the drafts from the
      chat. Keep them to what the app really does.
- [ ] Screenshots at **1320 x 2868** portrait (6.9-inch iPhone). One set
      is enough; Apple scales it for smaller phones.
- [ ] App Preview video, 15 to 30 seconds, **real in-app footage only**.
- [ ] **Privacy Policy URL:** `https://sorza.net/legal/privacy`.
- [ ] **Support URL:** `https://sorza.net/legal/support`.
- [ ] **App Privacy:** answer using `app-privacy.md` in this folder.
- [ ] **Age rating** questionnaire, category Social Networking (see
      `app-privacy.md`).
- [ ] **App Review Information:** paste the notes from `review-notes.md`
      and enter the demo account in the sign-in fields.
- [ ] Export compliance is already answered in the app
      (`ITSAppUsesNonExemptEncryption` is false: it uses only standard
      HTTPS), so Apple will not ask on each upload.

## 8. Clean up, then submit

- [ ] **Remove the demo meets** if you seeded them for filming:
      `node scripts/seed-meets.mjs --clean`
- [ ] Select the TestFlight build on the listing and **Submit for
      Review**.

## Things that could still get you rejected

I would rather you read these now than in a rejection email.

1. **Guideline 4.2 (minimum functionality).** The app is a WebView of
   sorza.net. Push notifications, haptics, the camera and microphone,
   and location are the native substance, and the review notes describe
   them honestly. Apple may still decide it is a repackaged website. If
   so, the usual answer is more native functionality, not a better
   argument.
2. **Guidelines 3.1.1 and 3.1.3 (purchases).** Paid promotion is sold on
   the website only, and the review notes say so plainly. Apple's stance
   on external purchase links has been changing, so read the current
   text of both guidelines before you submit.
3. **Guideline 5.1.2 (AI data).** Photos go to Google's Gemini AI. This
   is disclosed beside the buttons and in the Privacy Policy. If Apple
   wants an explicit consent screen rather than an adjacent disclosure,
   that is a follow-up.
4. **A broken feature.** Apple tests what the listing claims. Do not
   claim anything you did not walk in step 6.
