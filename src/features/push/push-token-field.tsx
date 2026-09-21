"use client";

import { useEffect, useState } from "react";
import { readStoredPushToken } from "@/lib/native/push";

/** A hidden form field carrying this device's push token, for the
 * sign-out form.
 *
 * Signing out has to detach the device from the account it's leaving, or
 * that account keeps receiving notifications on a phone someone else may
 * now be holding. Only this device knows its own token, so it has to be
 * handed to the server action explicitly. Renders nothing meaningful off
 * the native app, where there is no token. */
export function PushTokenField() {
  const [token, setToken] = useState("");

  useEffect(() => {
    // Read after mount: localStorage doesn't exist during server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external store
    setToken(readStoredPushToken() ?? "");
  }, []);

  return <input type="hidden" name="pushToken" value={token} />;
}
