import { moderateMediaAction, type ModerationCheckResult } from "@/features/moderation/actions";
import { checkCopyOf } from "@/lib/validation/compress-image";

/** Runs a photo past the moderation check from the browser, sending a
 * small copy rather than the photo (see checkCopyOf for why). The one
 * way every uploader and the post composer should call the check. */
export async function checkImage(file: File): Promise<ModerationCheckResult> {
  const formData = new FormData();
  formData.append("file", await checkCopyOf(file));
  return moderateMediaAction(formData);
}
