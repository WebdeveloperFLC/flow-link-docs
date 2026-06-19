import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAndLinkProfileDocument } from "@/lib/profile/clientDocumentUpload";
import type { ProfileLinkedDocument } from "@/lib/profile/types";

export interface ClientDocumentOption {
  id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
}

export interface UseProfileDocumentsResult {
  documents: ClientDocumentOption[];
  loading: boolean;
  reload: () => Promise<void>;
  uploadAndLink: (input: {
    file: File;
    documentType: string;
    refKey: string;
    slot: string;
  }) => Promise<ProfileLinkedDocument | null>;
}

export function useProfileDocuments(clientId: string | null | undefined): UseProfileDocumentsResult {
  const [documents, setDocuments] = useState<ClientDocumentOption[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!clientId) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_documents")
        .select("id, file_name, document_type, uploaded_at")
        .eq("client_id", clientId)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      setDocuments((data ?? []) as ClientDocumentOption[]);
    } catch (e) {
      console.error("[useProfileDocuments] load failed", e);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const uploadAndLink = useCallback(
    async (input: {
      file: File;
      documentType: string;
      refKey: string;
      slot: string;
    }): Promise<ProfileLinkedDocument | null> => {
      if (!clientId) return null;
      const result = await uploadAndLinkProfileDocument({
        clientId,
        file: input.file,
        documentType: input.documentType,
        refKey: input.refKey,
        slot: input.slot,
      });
      await reload();
      return {
        document_id: result.document_id,
        slot: result.slot,
        label: result.label,
        linked_at: result.linked_at,
        file_name: result.file_name,
      };
    },
    [clientId, reload],
  );

  return { documents, loading, reload, uploadAndLink };
}
