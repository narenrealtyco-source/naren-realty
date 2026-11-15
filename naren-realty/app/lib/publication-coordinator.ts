import { validatePropertySubmission, validateSubmissionPhotoCount } from "./property-submission-validation";

type ApprovedSubmission = {
  id: string;
  user_id: string;
  status: "approved";
  title: string;
  category: string;
  locality: string;
  address: string;
  price: number;
  area: number;
  description: string;
  photo_paths: string[];
};

type Claim =
  | { kind: "published" }
  | { kind: "busy" }
  | { kind: "claimed"; token: string; submission: ApprovedSubmission };

type PublicProperty = {
  owner_id: string;
  title: string;
  category: string;
  locality: string;
  price: number;
  details: { carpetArea: number };
  photos: string[];
};

export type PublicationPorts = {
  claim(submissionId: string): Promise<Claim>;
  copyAndVerify(source: string, destination: string): Promise<void>;
  finalize(submissionId: string, token: string, property: PublicProperty): Promise<void>;
  fail(submissionId: string, token: string): Promise<void>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// This coordinator is deliberately not wired to an action or live adapters.
export async function coordinatePublication(submissionId: string, ports: PublicationPorts): Promise<"published" | "already-published"> {
  if (!uuid.test(submissionId)) throw new Error("Invalid submission ID.");
  const claim = await ports.claim(submissionId);
  if (claim.kind === "published") return "already-published";
  if (claim.kind === "busy") throw new Error("Publication is already in progress.");
  try {
    const submission = claim.submission;
    if (submission.id !== submissionId || submission.status !== "approved" || !uuid.test(submission.user_id)) {
      throw new Error("Publication requires a verified approved submission.");
    }
    const input = validatePropertySubmission({
      title: submission.title, category: submission.category, locality: submission.locality,
      address: submission.address, price: submission.price, area: submission.area,
      description: submission.description,
    });
    validateSubmissionPhotoCount(submission.photo_paths.length);
    if (new Set(submission.photo_paths).size !== submission.photo_paths.length) throw new Error("Duplicate photo paths.");
    const paths = submission.photo_paths.map((source) => {
      const parts = source.split("/");
      if (parts.length !== 3 || parts[0] !== submission.user_id || parts[1] !== submission.id || !uuid.test(parts[2])) {
        throw new Error("Invalid private photo path.");
      }
      return { source, destination: `customer-submissions/${submission.id}/${parts[2]}` };
    });
    for (const { source, destination } of paths) await ports.copyAndVerify(source, destination);
    await ports.finalize(submissionId, claim.token, {
      owner_id: submission.user_id, title: input.title, category: input.category,
      locality: input.locality, price: input.price,
      details: { carpetArea: input.area },
      photos: paths.map(({ destination }) => destination),
    });
    return "published";
  } catch (error) {
    try {
      await ports.fail(submissionId, claim.token);
    } catch (failureError) {
      console.error("[publication] Could not record failure", { errorType: failureError instanceof Error ? failureError.name : typeof failureError });
    }
    throw error;
  }
}
