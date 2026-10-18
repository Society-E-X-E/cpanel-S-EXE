import { getSafeAwsErrorDetails } from "../../lib/awsErrorDetails";

describe("safe AWS error details", () => {
  it("includes operational AWS context while redacting email addresses and OTPs", () => {
    const error = new Error(
      "Address test@example.com and code 12345678 are invalid for arn:aws:ses:us-east-2:123456789012:identity/example.com",
    );
    error.name = "AccessDeniedException";
    error.$metadata = { httpStatusCode: 403, requestId: "request-id" };

    expect(getSafeAwsErrorDetails(error)).toEqual({
      name: "AccessDeniedException",
      message: "Address [redacted-email] and code [redacted-code] are invalid for arn:aws:ses:us-east-2:123456789012:identity/example.com",
      httpStatusCode: 403,
      requestId: "request-id",
    });
  });

  it("does not log messages for unexpected errors", () => {
    const error = new Error("database connection contains private detail");

    expect(getSafeAwsErrorDetails(error)).toEqual({ name: "Error" });
  });
});
