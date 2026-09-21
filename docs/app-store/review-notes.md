# App Review notes

Paste the block below into **App Store Connect → your app → App Review
Information → Notes**. Enter the demo account in the **Sign-in
information** fields on that same page.

**Do not put the demo account's password in this file or anywhere else in
the repo.** Type it straight into App Store Connect.

Before submitting, create a dedicated demo account (not yours), give it a
vehicle with a photo and a rated build so the reviewer sees a populated
app, and confirm it can log in from a clean install.

---

```text
SORZA is a social app for car enthusiasts. People post their builds, log
every modification in a digital garage, get a build score from 0 to 100
from an AI vision model, and compete on a leaderboard.

HOW THE APP IS BUILT
SORZA is a native iOS app. Its interface is served from our own site
(sorza.net) so we can ship fixes without waiting on a review cycle. It
uses native iOS capabilities that a website cannot: push notifications
(APNs), the device camera and microphone for in-app capture, haptics,
the status bar and splash screen, and location.

SIGNING IN
Demo account credentials are in the Sign-in information fields above.
Sign in with Apple and Google are also offered.

WHERE TO LOOK
- Garage tab: vehicles, builds, parts, and the AI build rating.
- Feed tab: posts from other members.
- Leaderboard tab: verified builds ranked by score.
- "+" button: post a photo or video, host a meet, create a crew.
- Settings > Notifications: turns on push notifications.

USER-GENERATED CONTENT (Guideline 1.2)
- Terms of Service: accepted at sign-up. The Terms, Community Guidelines
  and Privacy Policy are linked from every page footer.
- Reporting: a Report action is on every post, comment, profile and
  vehicle.
- Blocking: any profile can be blocked from its page.
- Moderation: reports go to an admin review queue. Admins can remove
  content and ban accounts.
- Photos are screened by an automated moderation check before they are
  stored, and a flagged photo is refused with an explanation. This covers
  feed posts (for a video, one frame) and profile pictures, garage
  photos, crew banners and logos, business photos and modification
  photos. Photos on meets and ads are reviewed by an admin before they
  go live.
- Account deletion: Settings > Delete Account removes the account and
  its data from within the app.

AI FEATURES AND DATA (Guideline 5.1.2)
Two features send a user's photos to Google's Gemini AI: vehicle
identification and build rating. Each has a disclosure printed directly
beside its button, naming Google and linking to the Privacy Policy, and
nothing is saved to the account until the user confirms the result.
Posted photos are also sent to Gemini for moderation screening. All of
this is stated in the Privacy Policy (linked from every page footer).

PURCHASES (Guideline 3.1.1)
There are no purchases inside the app, and no payment UI is ever shown
in it. Hosting a meet is free. Optional paid promotion (a higher
listing position for a meet, or a sponsored placement for a business)
is sold only on our website: the app hands off to the system browser
for it, and Stripe processes the payment there. Promoted items appear
in the app once approved. We are stating that plainly so you can judge
it against 3.1.1 and 3.1.3 rather than have you find it.

PERMISSIONS
Camera and microphone: recording and photographing builds in the post
composer. Location: optional, to sort meets by distance and find nearby
shops. Notifications: only after the user turns them on in Settings.
Nothing is requested at first launch.
```

---

## Notes for you (not for Apple)

- **Verify every claim above against the build you submit.** Apple
  rejects for a stated capability that doesn't work. Walk each bullet on
  the TestFlight build first.
- The demo account must be able to reach the "+" menu, so it needs a
  confirmed email.
- If Apple's stance on external links for purchases has changed since
  this was written, adjust the PURCHASES paragraph. Check the current
  text of Guideline 3.1.1 and 3.1.3 before submitting.
