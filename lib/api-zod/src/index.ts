export {
  CompanyProfileSchema,
  MeProfileSchema,
  MeResponse,
  MeWorkspaceSchema,
  UpdateCompanyProfileBody,
} from "./auth.js";
export { ProposalEvidenceResponse } from "./evidence.js";
export type {
  CompanyProfile,
  Me,
  MeProfile,
  MeWorkspace,
  UpdateCompanyProfileRequest,
} from "./auth.js";
export type { ProposalEvidence } from "./evidence.js";
export {
  CopyTemplateBody,
  CreateProposalBody,
  CreateTemplateBody,
  GetTemplateParams,
  RespondToProposalBody,
  SendProposalBody,
  UpdateProposalBody,
  UpdateTemplateBody,
} from "./generated/api.js";
export type {
  CopyTemplateRequest,
  ContentBlock,
  CreateProposalRequest,
  CreateTemplateRequest,
  DocumentDesignSettings,
  PricingRow,
  Proposal,
  ProposalBranding,
  ProposalParties,
  ProposalParty,
  ProposalRecipient,
  ProposalRecipientKind,
  ProposalSection,
  ProposalStatus,
  PublicProposalView,
  RespondToProposalRequest,
  SendProposalRequest,
  Template,
  TemplateCategory,
  UpdateProposalRequest,
  UpdateTemplateRequest,
} from "./generated/types/index.js";
export * from "./generated/api.js";
