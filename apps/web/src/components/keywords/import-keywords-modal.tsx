"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import GlassButton from "@/components/ui/glass-button";
import { Upload, X, FileText, AlertCircle } from "lucide-react";

interface ImportKeywordsModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (count: number) => void;
}

export default function ImportKeywordsModal({
  projectId,
  open,
  onOpenChange,
  onSuccess
}: ImportKeywordsModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [manualKeywords, setManualKeywords] = useState("");
  const [importType, setImportType] = useState<"file" | "manual">("file");

  const handleImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("projectId", projectId);

      if (importType === "file") {
        if (!file) {
          setError("Please select a file");
          setLoading(false);
          return;
        }
        
        formData.append("source", file.type.includes("csv") ? "csv" : "json");
        formData.append("file", file);
      } else {
        if (!manualKeywords.trim()) {
          setError("Please enter keywords");
          setLoading(false);
          return;
        }
        
        formData.append("source", "manual");
        formData.append("keywords", manualKeywords);
      }

      const response = await fetch("/api/keywords/import", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError(data.message || "Subscription limit reached");
          setTimeout(() => {
            router.push("/settings/billing");
          }, 2000);
        } else {
          setError(data.error || "Import failed");
        }
        return;
      }

      // Success
      onSuccess?.(data.imported);
      onOpenChange(false);
      router.refresh();
      
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-black/90 backdrop-blur-xl border border-white/10 p-6 shadow-xl animate-in fade-in zoom-in-95">
          <Dialog.Title className="text-xl font-semibold text-white mb-4">
            Import Keywords
          </Dialog.Title>
          
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
            <X className="h-4 w-4 text-white" />
          </Dialog.Close>

          <div className="space-y-4">
            {/* Import Type Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
              <button
                onClick={() => setImportType("file")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  importType === "file"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setImportType("manual")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  importType === "manual"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Manual Entry
              </button>
            </div>

            {importType === "file" ? (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Upload CSV or JSON file
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/30 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                    disabled={loading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 text-purple-400 mx-auto" />
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-white/50 text-sm">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 text-white/40 mx-auto" />
                        <p className="text-white/60">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-white/40 text-sm">
                          CSV or JSON files
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                
                <div className="mt-2 text-xs text-white/50">
                  CSV format: keyword,target_position,category,priority,target_url
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Enter keywords (comma or line separated)
                </label>
                <textarea
                  value={manualKeywords}
                  onChange={(e) => setManualKeywords(e.target.value)}
                  placeholder="laptop gaming, macbook pro, iphone 15..."
                  className="w-full h-32 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 transition-colors resize-none"
                  disabled={loading}
                />
                <div className="mt-2 text-xs text-white/50">
                  Enter one keyword per line or separate with commas
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <GlassButton
              onClick={() => onOpenChange(false)}
              variant="secondary"
              size="md"
              disabled={loading}
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleImport}
              variant="gradient"
              size="md"
              disabled={loading || (importType === "file" ? !file : !manualKeywords.trim())}
            >
              {loading ? "Importing..." : "Import Keywords"}
            </GlassButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}