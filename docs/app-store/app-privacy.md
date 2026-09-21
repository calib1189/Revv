# App Privacy ("nutrition label") answers

App Store Connect → your app → **App Privacy**. These are derived from
what the code stores and sends, not from what would be convenient to
say. Apple compares the label with the app's behaviour and with the
Privacy Policy, and a mismatch is a rejection reason.

**Re-check this whenever a feature changes what is collected.** The label
is a statement about the shipped build, not a one-time form.

## Tracking

**Does this app track users? No.**

No advertising identifiers, no cross-app or cross-site tracking, no data
sold to or shared with data brokers. The feed's sponsored posts are
first-party and are not targeted from data collected elsewhere. Affiliate
links carry no user identifier.

## Data types collected

For every row: **Not used for tracking.** "Linked" means tied to the
person's account.

| Category | Data type | Linked | Purpose | Source in the app |
|---|---|---|---|---|
| Contact Info | Email Address | Yes | App Functionality | Account sign-up and login |
| Contact Info | Name | Yes | App Functionality | Optional display name |
| User Content | Photos or Videos | Yes | App Functionality | Posts, garage, avatars, crews, business profiles |
| User Content | Other User Content | Yes | App Functionality | Captions, comments, messages, garage and build data, meet listings |
| Identifiers | User ID | Yes | App Functionality | Account identifier |
| Identifiers | Device ID | Yes | App Functionality | Push notification token, only if notifications are turned on |
| Location | Precise Location | Yes | App Functionality | Only if the person taps "Use my current location" on a meet they host; sorting meets and finding shops uses it once and discards it |
| Usage Data | Product Interaction | Yes | App Functionality, Analytics | Sign-up and the creation of posts, vehicles and crews (the `events` table), plus post and meet view counts |

### Why each judgement call went the way it did

- **Photos or Videos, and third parties.** Photos go to Google's Gemini AI
  for build rating, vehicle identification and moderation. Data sent to
  a third party is still "collected" for this form. The disclosure
  beside those buttons and the Privacy Policy already name Google.
- **Device ID for the push token.** Apple's guidance is not perfectly
  clear that a push token counts. Declaring it costs nothing and
  understating it is the risky direction, so it is declared.
- **Precise Location.** The Privacy Policy used to say location was
  never stored. That was wrong, because a hosted meet stores the
  coordinates the host chose. The policy has been corrected and this row
  matches it. The app only ever shows other people a distance, never a
  map pin. Be aware the raw coordinates are stored on the meet's row,
  which is publicly readable, so treat a hosted meet's location as
  public. The location is the host's chosen spot for a public event, but
  it is the precise position of wherever they tapped the button.
- **Product Interaction.** The `events` table records only sign-up and
  creating a post, vehicle or crew. It is not page-view tracking.
  `events.user_id` is nullable but is filled for signed-in people, so
  this is linked. Post and meet view counts are recorded per viewer.
- **Search history.** Not declared, because search queries are not
  stored. If that changes, add it.

## Data types NOT collected

Health and fitness, financial info (Stripe handles card data on the
website and none of it touches this app), sensitive info, contacts,
browsing history, search history, diagnostics or crash data, and
advertising data.

## Open questions to resolve before you submit

1. **hCaptcha.** Login and sign-up load an hCaptcha widget, which is a
   third party that processes IP address and device signals to detect
   bots. Read hCaptcha's own privacy documentation and decide whether it
   needs a "Device ID" or "Other Data" declaration. This document does
   not include one because that is a legal judgement, not a code fact.
2. **Hosting logs.** Vercel and Supabase keep request logs, which
   include IP addresses. Apple generally does not require declaring
   routine infrastructure logs as "collected", but confirm against
   Apple's current definition of "collect".
3. **Purchases.** Paid promotion happens on the website, so no purchase
   data is collected inside the app. If the app ever shows purchase
   history, declare Purchases.

## Age rating

Complete Apple's questionnaire honestly. The answers that matter are
the ones about user-generated content and messaging between users:
SORZA has both, so expect a rating higher than 4+. Apple changes this
questionnaire's wording over time, so read each question as it appears
rather than relying on this note. Do not pick a lower rating to look
better; Apple checks it against the reported features.

## Category

Primary: **Social Networking**. Secondary: **Lifestyle** (there is no
Automotive category).
