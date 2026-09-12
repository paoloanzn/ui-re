/** Domain failures are returned; I/O and malformed input remain boundary errors. */
export type VerificationResult =
  | { readonly status: 'compared'; readonly accepted: boolean; readonly report: string }
  | { readonly status: 'policy-conflict'; readonly message: string }
  | { readonly status: 'iteration-limit'; readonly message: string };
