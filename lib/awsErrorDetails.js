const AWS_OPERATION_ERRORS = new Set([
  "AccessDeniedException",
  "InvalidIdentityTokenException",
  "MessageRejected",
  "ResourceNotFoundException",
  "ThrottlingException",
]);

export function getSafeAwsErrorDetails(error) {
  if (!(error instanceof Error)) return { name: "UnknownError" };

  const details = { name: error.name };
  if (!AWS_OPERATION_ERRORS.has(error.name)) return details;

  details.message = error.message
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b\d{8}\b/g, "[redacted-code]");

  const metadata = error.$metadata;
  if (metadata?.httpStatusCode) details.httpStatusCode = metadata.httpStatusCode;
  if (metadata?.requestId) details.requestId = metadata.requestId;
  return details;
}
