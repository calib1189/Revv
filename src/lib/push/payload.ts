export interface PushPayload {
  title: string;
  body: string;
  /** Path to open when the notification is tapped, e.g. "/p/123". */
  url: string;
}
