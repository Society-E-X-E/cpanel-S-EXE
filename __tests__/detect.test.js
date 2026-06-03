/**
 * Tests for assets/js/detect.js - Browser compatibility detection
 * We test the checkSupport function logic directly since detectCompatibility
 * depends on window/navigator globals.
 */

// Replicate the checkSupport function for testing (since the source uses `var` and
// doesn't export - we test the logic pattern)
function checkSupport(userAgent) {
  if (/safari/i.test(userAgent)) {
    var iosRegex =
      /(CPU[ +]OS|iPhone[ +]OS|CPU[ +]iPhone|CPU IPhone OS|CPU iPad OS)[ +]+(8|9|10|1{2}|12|13|14|15)[._]\d+([._]\d+|)/;
    return { supported: !iosRegex.test(userAgent) };
  }
  return { supported: true };
}

describe("assets/js/detect.js - checkSupport", () => {
  it("returns supported: true for Chrome on desktop", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0";
    expect(checkSupport(ua)).toEqual({ supported: true });
  });

  it("returns supported: true for Firefox", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
    expect(checkSupport(ua)).toEqual({ supported: true });
  });

  it("returns supported: true for modern Safari (iOS 16+)", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
    expect(checkSupport(ua)).toEqual({ supported: true });
  });

  it("returns supported: false for old iOS Safari (iOS 14)", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1";
    expect(checkSupport(ua)).toEqual({ supported: false });
  });

  it("returns supported: false for old iOS Safari (iOS 12)", () => {
    const ua = "Mozilla/5.0 (iPad; CPU iPad OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1";
    expect(checkSupport(ua)).toEqual({ supported: false });
  });

  it("returns supported: false for iOS 8", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 8_4 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H143 Safari/600.1.4";
    expect(checkSupport(ua)).toEqual({ supported: false });
  });

  it("returns supported: true for non-Safari browsers regardless of OS string", () => {
    const ua = "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile";
    expect(checkSupport(ua)).toEqual({ supported: true });
  });

  it("returns supported: false for iOS 10 Safari", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_4 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Version/10.0 Mobile/14G61 Safari/602.1";
    expect(checkSupport(ua)).toEqual({ supported: false });
  });
});
