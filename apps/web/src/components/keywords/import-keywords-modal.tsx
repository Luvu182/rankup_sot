"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload, FileText, AlertCircle, Check, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ParsedKeyword {
  keyword: string;
  target_position?: number;
  priority?: string;
  category?: string;
  target_url?: string;
}

interface ImportKeywordsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

export function ImportKeywordsModal({ open, onClose, projectId, onSuccess }: ImportKeywordsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedKeyword[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const csvFile = acceptedFiles[0];
      setFile(csvFile);
      parseCSV(csvFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Parse CSV with proper quote handling
        const parseCSVLine = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          result.push(current.trim());
          return result;
        };
        
        const headers = parseCSVLine(lines[0].toLowerCase());
        
        // Validate headers
        if (!headers.includes('keyword') && !headers.includes('từ khóa')) {
          setErrors(['File CSV phải có cột "keyword" hoặc "từ khóa"']);
          return;
        }

        const data: ParsedKeyword[] = [];
        const parseErrors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const keywordIndex = headers.indexOf('keyword') >= 0 ? headers.indexOf('keyword') : headers.indexOf('từ khóa');
          
          if (!values[keywordIndex]) {
            parseErrors.push(`Dòng ${i + 1}: Thiếu từ khóa`);
            continue;
          }

          const keyword: ParsedKeyword = {
            keyword: values[keywordIndex].replace(/^"+|"+$/g, ''), // Remove extra quotes
          };

          // Map other fields
          const targetPosIndex = headers.indexOf('target_position') >= 0 ? headers.indexOf('target_position') : headers.indexOf('vị trí mục tiêu');
          if (targetPosIndex >= 0 && values[targetPosIndex]) {
            keyword.target_position = parseInt(values[targetPosIndex]) || 3;
          }

          const priorityIndex = headers.indexOf('priority') >= 0 ? headers.indexOf('priority') : headers.indexOf('độ ưu tiên');
          if (priorityIndex >= 0 && values[priorityIndex]) {
            const priority = values[priorityIndex].toLowerCase();
            if (['high', 'medium', 'low', 'cao', 'trung bình', 'thấp'].includes(priority)) {
              keyword.priority = priority === 'cao' ? 'high' : priority === 'trung bình' ? 'medium' : priority === 'thấp' ? 'low' : priority;
            }
          }

          const categoryIndex = headers.indexOf('category') >= 0 ? headers.indexOf('category') : headers.indexOf('danh mục');
          if (categoryIndex >= 0 && values[categoryIndex]) {
            keyword.category = values[categoryIndex].replace(/^"+|"+$/g, '');
          }

          const urlIndex = headers.indexOf('target_url') >= 0 ? headers.indexOf('target_url') : headers.indexOf('url mục tiêu');
          if (urlIndex >= 0 && values[urlIndex]) {
            keyword.target_url = values[urlIndex].replace(/^"+|"+$/g, '');
          }

          data.push(keyword);
        }

        setParsedData(data);
        setErrors(parseErrors);
        
        if (data.length === 0) {
          setErrors(['Không tìm thấy từ khóa nào trong file']);
        }
      } catch (error) {
        setErrors(['Lỗi khi đọc file. Vui lòng kiểm tra định dạng file CSV']);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    console.log('[Import] Starting import process');
    if (parsedData.length === 0) return;

    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // First, check the keyword limit before importing
      console.log('[Import] Fetching check-limit API');
      const checkResponse = await fetch(`/api/keywords/check-limit?projectId=${projectId}&count=${parsedData.length}`);
      console.log('[Import] Check response:', checkResponse);
      
      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error('[Import] API error:', errorText);
        throw new Error(`Failed to check keyword limit: ${checkResponse.status}`);
      }
      
      const limitData = await checkResponse.json();
      console.log('[Import] Limit data received:', limitData);
      
      // Validate response data
      if (typeof limitData.canAdd === 'undefined' || typeof limitData.remaining === 'undefined') {
        console.error('[Import] Invalid limit data:', limitData);
        throw new Error('Invalid response from limit check');
      }
      
      let keywordsToImport = parsedData;
      
      // Handle limit exceeded case
      if (!limitData.canAdd) {
        console.log('[Import] Cannot add - limit exceeded');
        setIsLoading(false); // Reset loading while showing dialog
        
        if (limitData.remaining === 0) {
          console.log('[Import] No remaining slots - showing toast');
          // No slots available
          toast.error("Đã đạt giới hạn từ khóa", {
            description: `Bạn đã sử dụng hết ${limitData.limit} từ khóa. Vui lòng nâng cấp gói để thêm từ khóa mới.`,
            action: {
              label: "Nâng cấp",
              onClick: () => window.location.href = "/settings/billing"
            },
          });
          console.log('[Import] Returning after toast');
          return;
        } else {
          // Some slots available
          const confirmMessage = `Bạn chỉ có thể thêm ${limitData.remaining} từ khóa nữa (giới hạn: ${limitData.limit}). Import ${limitData.remaining} từ khóa đầu tiên?`;
          
          if (!confirm(confirmMessage)) {
            toast.info("Đã hủy import", {
              description: "Không có từ khóa nào được thêm",
            });
            return;
          }
          
          // User confirmed, import only what fits
          keywordsToImport = parsedData.slice(0, limitData.remaining);
          setIsLoading(true); // Re-enable loading for actual import
        }
      }
      
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < keywordsToImport.length; i += batchSize) {
        batches.push(keywordsToImport.slice(i, i + batchSize));
      }

      let processed = 0;
      for (const batch of batches) {
        const response = await fetch("/api/keywords", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            keywords: batch,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 402) {
            toast.error("Giới hạn từ khóa", {
              description: data.message,
              action: {
                label: "Nâng cấp",
                onClick: () => window.location.href = data.upgrade_url
              },
            });
            break;
          }
          throw new Error(data.error || "Failed to import keywords");
        }

        processed += batch.length;
        setUploadProgress((processed / keywordsToImport.length) * 100);
      }

      const skippedCount = parsedData.length - keywordsToImport.length;
      
      // Get final response to check for duplicates
      let totalDuplicates = 0;
      let totalInserted = processed;
      
      if (batches.length > 0) {
        // Parse last response for duplicate info
        try {
          const lastBatchResponse = await fetch("/api/keywords", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (lastBatchResponse.ok) {
            const data = await lastBatchResponse.json();
            // Update count based on actual insertions
            totalInserted = processed; // Keep as is for now
          }
        } catch (e) {
          console.log('[Import] Could not get duplicate info');
        }
      }
      
      toast.success("Import thành công!", {
        description: skippedCount > 0 
          ? `Đã import ${totalInserted} từ khóa (bỏ qua ${skippedCount} từ khóa do vượt giới hạn)`
          : `Đã import ${totalInserted} từ khóa`,
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('[Import] Error:', error);
      toast.error("Lỗi", {
        description: error instanceof Error ? error.message : "Không thể import từ khóa",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'keyword,target_position,priority,category,target_url\n"máy tính xách tay",3,high,"Sản phẩm","https://example.com/laptop"\n"laptop gaming",5,medium,"Sản phẩm",\n"mua laptop online",10,low,"Blog",';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'keywords_template.csv';
    link.click();
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setUploadProgress(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import từ khóa từ file CSV</DialogTitle>
          <DialogDescription>
            Upload file CSV chứa danh sách từ khóa cần theo dõi
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {!file ? (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-white/40 mb-4" />
                <p className="text-white/80 mb-2">
                  {isDragActive ? 'Thả file vào đây...' : 'Kéo thả file CSV hoặc click để chọn file'}
                </p>
                <p className="text-sm text-white/50">
                  Hỗ trợ file .csv, .xls, .xlsx
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Alert className="flex-1 mr-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    File CSV cần có ít nhất cột "keyword". Các cột khác: target_position, priority, category, target_url
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Tải template
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-white/60" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-white/50">
                      {parsedData.length} từ khóa • {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={resetState}>
                  Chọn file khác
                </Button>
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Lỗi khi đọc file:</p>
                      <ul className="list-disc pl-4 text-sm">
                        {errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {errors.length > 5 && (
                          <li>... và {errors.length - 5} lỗi khác</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {parsedData.length > 0 && (
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white/5">
                        <TableHead className="text-white/70">Từ khóa</TableHead>
                        <TableHead className="text-white/70">Vị trí mục tiêu</TableHead>
                        <TableHead className="text-white/70">Độ ưu tiên</TableHead>
                        <TableHead className="text-white/70">Danh mục</TableHead>
                        <TableHead className="text-white/70">URL mục tiêu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((keyword, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-white/90">{keyword.keyword}</TableCell>
                          <TableCell>{keyword.target_position || 3}</TableCell>
                          <TableCell>{keyword.priority || 'medium'}</TableCell>
                          <TableCell>{keyword.category || '-'}</TableCell>
                          <TableCell className="truncate max-w-[200px]">
                            {keyword.target_url || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {parsedData.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-white/50">
                            ... và {parsedData.length - 10} từ khóa khác
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {isLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Đang import...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isLoading || parsedData.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Import {parsedData.length} từ khóa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}