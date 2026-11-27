-- Social links and a website on a profile: Instagram, TikTok, YouTube,
-- Snapchat handles and one website, all optional, shown as tappable icons
-- on the profile (features/profile/profile-links). Handles are stored bare
-- (no @, no URL); the app builds each link from the handle, so a stored
-- value can only ever point at that platform. The website must be https.
--
-- RLS: profiles already lets people update only their own row (0001), and
-- these columns ride on that. Nothing here is a privileged column.

alter table profiles
  add column if not exists instagram_handle text,
  add column if not exists tiktok_handle text,
  add column if not exists youtube_handle text,
  add column if not exists snapchat_handle text,
  add column if not exists website_url text;

alter table profiles
  add constraint profiles_instagram_handle_check
    check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint profiles_tiktok_handle_check
    check (tiktok_handle is null or tiktok_handle ~ '^[A-Za-z0-9._]{1,24}$'),
  add constraint profiles_youtube_handle_check
    check (youtube_handle is null or youtube_handle ~ '^[A-Za-z0-9._-]{1,30}$'),
  add constraint profiles_snapchat_handle_check
    check (snapchat_handle is null or snapchat_handle ~ '^[A-Za-z][A-Za-z0-9._-]{1,14}$'),
  add constraint profiles_website_url_check
    check (website_url is null or (website_url ~ '^https://[^\s<>"]+$' and char_length(website_url) <= 200));
