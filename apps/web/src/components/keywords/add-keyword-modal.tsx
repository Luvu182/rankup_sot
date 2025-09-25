"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Target, Tag, Link } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const keywordSchema = z.object({
  keywords: z.string().min(1, "Vui lòng nhập ít nhất 1 từ khóa"),
  target_position: z.coerce.number().min(1).max(100).default(3),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  category: z.string().optional(),
  target_url: z.string().optional(),
});

type KeywordFormValues = z.infer<typeof keywordSchema>;

interface AddKeywordModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

export function AddKeywordModal({ open, onClose, projectId, onSuccess }: AddKeywordModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<KeywordFormValues>({
    resolver: zodResolver(keywordSchema),
    defaultValues: {
      keywords: "",
      target_position: 3,
      priority: "medium",
      category: "",
      target_url: "",
    },
  });

  const onSubmit = async (values: KeywordFormValues) => {
    setIsLoading(true);
    try {
      // Parse keywords (one per line)
      const keywordsList = values.keywords
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          keywords: keywordsList.map(keyword => ({
            keyword,
            target_position: values.target_position,
            priority: values.priority,
            category: values.category || null,
            target_url: values.target_url || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          // Subscription limit reached
          toast({
            title: "Giới hạn từ khóa",
            description: data.message,
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = data.upgrade_url}
              >
                Nâng cấp
              </Button>
            ),
          });
        } else {
          throw new Error(data.error || "Failed to add keywords");
        }
        return;
      }

      toast({
        title: "Thành công!",
        description: `Đã thêm ${keywordsList.length} từ khóa`,
      });

      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể thêm từ khóa",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm từ khóa mới</DialogTitle>
          <DialogDescription>
            Thêm từ khóa để theo dõi thứ hạng SEO. Mỗi dòng là một từ khóa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Từ khóa <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập từ khóa (mỗi dòng một từ)&#10;Ví dụ:&#10;máy tính xách tay&#10;laptop gaming&#10;mua laptop"
                      {...field}
                      rows={5}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Nhập mỗi từ khóa trên một dòng riêng
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Target className="w-4 h-4 inline mr-1" />
                      Vị trí mục tiêu
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Vị trí mong muốn (1-100)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Độ ưu tiên</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn độ ưu tiên" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">Cao</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="low">Thấp</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Tag className="w-4 h-4 inline mr-1" />
                    Danh mục
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ví dụ: Sản phẩm, Blog, Trang chủ..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Phân loại từ khóa để dễ quản lý
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Link className="w-4 h-4 inline mr-1" />
                    URL mục tiêu
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/san-pham"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Trang bạn muốn xếp hạng cho từ khóa này
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Thêm từ khóa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}