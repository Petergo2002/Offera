import {
  CompanyProfileSchema,
  CopyTemplateBody,
  CreateProposalBody,
  CreateTemplateBody,
  MeResponse,
  ProposalEvidenceResponse,
  GetProposalResponse,
  GetPublicProposalResponse,
  GetTemplateResponse,
  ListProposalsResponse,
  ListTemplatesResponse,
  RespondToProposalBody,
  RespondToProposalResponse,
  SendProposalBody,
  SendProposalResponse,
  UpdateProposalBody,
  UpdateProposalResponse,
  UpdateCompanyProfileBody,
  UpdateTemplateBody,
  type CompanyProfile,
  type CopyTemplateRequest,
  type CreateProposalRequest,
  type CreateTemplateRequest,
  type Me,
  type ProposalEvidence,
  type Proposal,
  type PublicProposalView,
  type RespondToProposalRequest,
  type SendProposalRequest,
  type Template,
  type UpdateProposalRequest,
  type UpdateTemplateRequest,
  type UpdateCompanyProfileRequest,
} from "@workspace/api-zod";
import { customFetch, setBaseUrl } from "@workspace/api-client-react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || null;

// Configure the API origin eagerly so public routes work before React effects run.
setBaseUrl(apiBaseUrl);

async function request<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  return await customFetch<T>(input, {
    responseType: "json",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
}

export const api = {
  getMe: async () => MeResponse.parse(await request<unknown>("/api/me")),
  getCompanyProfile: async () =>
    CompanyProfileSchema.parse(
      await request<unknown>("/api/company-profile"),
    ),
  updateCompanyProfile: async (data: UpdateCompanyProfileRequest) =>
    CompanyProfileSchema.parse(
      await request<unknown>("/api/company-profile", {
        method: "PUT",
        body: JSON.stringify(UpdateCompanyProfileBody.parse(data)),
      }),
    ),
  listProposals: async () =>
    ListProposalsResponse.parse(await request<unknown>("/api/proposals")),
  getProposal: async (id: number) =>
    GetProposalResponse.parse(await request<unknown>(`/api/proposals/${id}`)),
  getProposalEvidence: async (id: number) =>
    ProposalEvidenceResponse.parse(
      await request<unknown>(`/api/proposals/${id}/evidence`),
    ),
  getProposalPdf: async (id: number) =>
    customFetch<Blob>(`/api/proposals/${id}/pdf`, {
      responseType: "blob",
    }),
  createProposal: async (data: CreateProposalRequest) =>
    GetProposalResponse.parse(
      await request<unknown>("/api/proposals", {
        method: "POST",
        body: JSON.stringify(CreateProposalBody.parse(data)),
      }),
    ),
  updateProposal: async (id: number, data: UpdateProposalRequest) =>
    UpdateProposalResponse.parse(
      await request<unknown>(`/api/proposals/${id}`, {
        method: "PUT",
        body: JSON.stringify(UpdateProposalBody.parse(data)),
      }),
    ),
  sendProposal: async (id: number, data: SendProposalRequest) =>
    SendProposalResponse.parse(
      await request<unknown>(`/api/proposals/${id}/send`, {
        method: "POST",
        body: JSON.stringify(SendProposalBody.parse(data)),
      }),
    ),
  deleteProposal: async (id: number) =>
    request<void>(`/api/proposals/${id}`, { method: "DELETE" }),
  getPublicProposal: async (slug: string, token?: string) =>
    GetPublicProposalResponse.parse(
      await request<unknown>(
        `/api/proposals/public/${slug}${
          token
            ? `?token=${encodeURIComponent(token)}`
            : ""
        }`,
      ),
    ),
  getPublicProposalPdf: async (slug: string, token?: string) =>
    customFetch<Blob>(
      `/api/proposals/public/${slug}/pdf${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }`,
      {
        responseType: "blob",
      },
    ),
  respondToProposal: async (
    slug: string,
    data: RespondToProposalRequest,
    token?: string,
  ) =>
    RespondToProposalResponse.parse(
      await request<unknown>(
        `/api/proposals/public/${slug}/respond${
          token ? `?token=${encodeURIComponent(token)}` : ""
        }`,
        {
          method: "POST",
          body: JSON.stringify(RespondToProposalBody.parse(data)),
        },
      ),
    ),
  listTemplates: async () =>
    ListTemplatesResponse.parse(await request<unknown>("/api/templates")),
  getTemplate: async (id: number) =>
    GetTemplateResponse.parse(await request<unknown>(`/api/templates/${id}`)),
  createTemplate: async (data: CreateTemplateRequest) =>
    GetTemplateResponse.parse(
      await request<unknown>("/api/templates", {
        method: "POST",
        body: JSON.stringify(CreateTemplateBody.parse(data)),
      }),
    ),
  updateTemplate: async (id: number, data: UpdateTemplateRequest) =>
    GetTemplateResponse.parse(
      await request<unknown>(`/api/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(UpdateTemplateBody.parse(data)),
      }),
    ),
  copyTemplate: async (id: number, data: CopyTemplateRequest = {}) =>
    GetTemplateResponse.parse(
      await request<unknown>(`/api/templates/${id}/copy`, {
        method: "POST",
        body: JSON.stringify(CopyTemplateBody.parse(data)),
      }),
    ),
  deleteTemplate: async (id: number) =>
    request<void>(`/api/templates/${id}`, { method: "DELETE" }),
};

export type {
  CompanyProfile,
  Me,
  Proposal,
  ProposalEvidence,
  PublicProposalView,
  Template,
};
