import { describe, expect, it } from "vitest";
import { detectInAppBrowser } from "@/lib/in-app-browser";

const SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

describe("detectInAppBrowser", () => {
  it("recognizes TikTok on iPhone and Android", () => {
    expect(
      detectInAppBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_37.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US",
      ),
    ).toBe("TikTok");
    expect(
      detectInAppBrowser(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 trill_370504 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/trill",
      ),
    ).toBe("TikTok");
  });

  it("recognizes Instagram, Facebook and Snapchat", () => {
    expect(detectInAppBrowser(`${SAFARI} Instagram 350.0.0.0.0 (iPhone16,2; iOS 18_1; en_US)`)).toBe("Instagram");
    expect(detectInAppBrowser(`${SAFARI} [FBAN/FBIOS;FBAV/480.0.0.0;FBBV/1]`)).toBe("Facebook");
    expect(detectInAppBrowser(`${SAFARI} Snapchat/13.20.0.40 (iPhone16,2; iOS 18.1)`)).toBe("Snapchat");
  });

  it("leaves normal browsers alone", () => {
    expect(detectInAppBrowser(SAFARI)).toBeNull();
    expect(detectInAppBrowser(CHROME_ANDROID)).toBeNull();
    expect(detectInAppBrowser(null)).toBeNull();
  });
});
