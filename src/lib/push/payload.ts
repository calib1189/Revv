export interface PushPayload {
  title: string;
  body: string;
  /** Path to open when the notification is tapped, e.g. "/p/123". */
  url: string;
  /** A big picture under the text (absolute URL). Shown by Android and
   * desktop browsers; the iOS app shows text only. */
  image?: string;
  /** Something people shouldn't miss (a prize day): iOS sorts it to the
   * top of the notification summary, browsers keep it on screen until
   * it's tapped or dismissed. Use sparingly. */
  important?: boolean;
}
