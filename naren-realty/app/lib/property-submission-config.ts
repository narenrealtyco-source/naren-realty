import "server-only";
import { createPrivateSubmissionClient } from "./private-submission-server";
import { MAX_SUBMISSION_PHOTO_BYTES, MAX_SUBMISSION_VIDEO_BYTES, SUPPORTED_SUBMISSION_PHOTO_TYPES } from "./property-submission-validation";

const PRIVATE_BUCKET = "private-property-submissions";

export function propertySubmissionsEnabled(): boolean {
  return process.env.PROPERTY_SUBMISSIONS_ENABLED === "true";
}

export async function propertySubmissionUploadsReady(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return false;
  }

  try {
    const { data, error } = await createPrivateSubmissionClient().storage.getBucket(PRIVATE_BUCKET);
    if (error) {
      console.error("[property-submission] Private storage bucket readiness check failed", { name: error.name });
      return false;
    }
    if (!data) {
      console.error("[property-submission] Private storage bucket readiness check returned no bucket");
      return false;
    }

    const allowedMimeTypes = data.allowed_mime_types;
    const supportedTypes = [...SUPPORTED_SUBMISSION_PHOTO_TYPES, "video/mp4"].sort();
    const configuredTypes = Array.isArray(allowedMimeTypes) ? [...allowedMimeTypes].sort() : [];
    const ready = data.id === PRIVATE_BUCKET &&
      data.public === false &&
      data.file_size_limit === MAX_SUBMISSION_VIDEO_BYTES &&
      configuredTypes.length === supportedTypes.length &&
      configuredTypes.every((type, index) => type === supportedTypes[index]);

    const { data: documentBucket, error: documentBucketError } = await createPrivateSubmissionClient().storage.getBucket("private-property-owner-documents");
    const documentTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"].sort();
    const configuredDocumentTypes = Array.isArray(documentBucket?.allowed_mime_types) ? [...documentBucket.allowed_mime_types].sort() : [];
    const documentsReady = !documentBucketError && documentBucket?.public === false &&
      documentBucket.file_size_limit === 10 * 1024 * 1024 &&
      configuredDocumentTypes.length === documentTypes.length &&
      configuredDocumentTypes.every((type, index) => type === documentTypes[index]);

    if (!documentsReady) {
      console.error("[property-submission] Private owner document bucket is not ready", {
        private: documentBucket?.public === false,
        sizeLimitMatches: documentBucket?.file_size_limit === 10 * 1024 * 1024,
        mimeTypesMatch: configuredDocumentTypes.length === documentTypes.length &&
          configuredDocumentTypes.every((type, index) => type === documentTypes[index]),
      });
    }

    if (!ready) {
      console.error("[property-submission] Private storage bucket configuration is not ready", {
        private: data.public === false,
        sizeLimitMatches: data.file_size_limit === MAX_SUBMISSION_VIDEO_BYTES,
        mimeTypesMatch: configuredTypes.length === supportedTypes.length &&
          configuredTypes.every((type, index) => type === supportedTypes[index]),
      });
    }
    return ready && documentsReady;
  } catch (error) {
    console.error("[property-submission] Private storage bucket readiness check failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return false;
  }
}
