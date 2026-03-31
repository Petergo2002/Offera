export {
  CompanyProfileSchema,
  MeProfileSchema,
  MeResponse,
  MeWorkspaceSchema,
  UpdateCompanyProfileBody,
} from "./auth";
export { ProposalEvidenceResponse } from "./evidence";
export type {
  CompanyProfile,
  Me,
  MeProfile,
  MeWorkspace,
  UpdateCompanyProfileRequest,
} from "./auth";
export type { ProposalEvidence } from "./evidence";
export {
  CopyTemplateBody,
  CreateProposalBody,
  CreateTemplateBody,
  GetTemplateParams,
  RespondToProposalBody,
  SendProposalBody,
  UpdateProposalBody,
  UpdateTemplateBody,
} from "./generated/api";
export type {
  CopyTemplateRequest,
  CreateProposalRequest,
  CreateTemplateRequest,
  DocumentDesignSettings,
  Proposal,
  ProposalBranding,
  ProposalParties,
  ProposalParty,
  ProposalRecipient,
  ProposalRecipientKind,
  ProposalSection,
  RespondToProposalRequest,
  SendProposalRequest,
  Template,
  TemplateCategory,
  UpdateProposalRequest,
  UpdateTemplateRequest,
} from "./generated/types";
export * from "./generated/api";
export * from "./generated/types";
