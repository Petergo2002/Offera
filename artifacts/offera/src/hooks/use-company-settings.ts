import React from "react";
import { z } from "zod";
import { useAuth } from "@/components/auth-provider";

/**
 * Schema for Company/Business Settings
 */
export const CompanySettingsSchema = z.object({
  companyName: z.string().default(""),
  contactName: z.string().default(""),
  orgNumber: z.string().default(""),
  email: z.string().default(""), // Lax for typing, validate in UI
  phone: z.string().default(""),
  address: z.string().default(""),
  postalCode: z.string().default(""),
  city: z.string().default(""),
  website: z.string().default(""), // Lax for typing
  logoUrl: z.string().optional(), // Base64 string
  defaultCurrency: z.string().default("SEK"),
  defaultTaxRate: z.number().default(25),
});

export type CompanySettings = z.infer<typeof CompanySettingsSchema>;

/**
 * Utility to compress logo image before storing in localStorage
 */
async function compressImage(base64: string, maxWidth = 300): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = img.height / img.width;
      canvas.width = maxWidth;
      canvas.height = maxWidth * ratio;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/png", 0.7));
    };
    img.src = base64;
  });
}

/**
 * Hook to manage persistent Company information
 */
export function useCompanySettings() {
  const { companyProfile, updateCompanyProfile } = useAuth();
  const [settings, setSettings] = React.useState<CompanySettings>(() =>
    CompanySettingsSchema.parse({}),
  );
  const [savedSettings, setSavedSettings] = React.useState<CompanySettings>(() =>
    CompanySettingsSchema.parse({}),
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const latestSettingsRef = React.useRef<CompanySettings>(settings);

  React.useEffect(() => {
    const nextSettings = CompanySettingsSchema.parse(companyProfile ?? {});
    setSettings(nextSettings);
    setSavedSettings(nextSettings);
    latestSettingsRef.current = nextSettings;
  }, [companyProfile]);

  const updateSettings = async (updates: Partial<CompanySettings>) => {
    let finalUpdates = { ...updates };

    if ("logoUrl" in updates && updates.logoUrl === undefined) {
      finalUpdates.logoUrl = "";
    }

    // Compress logo if it's being updated
    if (updates.logoUrl && updates.logoUrl.startsWith("data:image")) {
      try {
        finalUpdates.logoUrl = await compressImage(updates.logoUrl);
      } catch (e) {
        console.error("Compression failed", e);
      }
    }

    const newSettings = CompanySettingsSchema.parse({
      ...latestSettingsRef.current,
      ...finalUpdates,
    });

    setSettings(newSettings);
    latestSettingsRef.current = newSettings;
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const nextCompanyProfile = await updateCompanyProfile(
        latestSettingsRef.current,
      );
      const normalized = CompanySettingsSchema.parse(nextCompanyProfile);
      setSettings(normalized);
      setSavedSettings(normalized);
      latestSettingsRef.current = normalized;
      return normalized;
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(savedSettings);
    latestSettingsRef.current = savedSettings;
  };

  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(savedSettings);

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isDirty,
    isSaving,
  };
}
