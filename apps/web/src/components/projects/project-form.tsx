"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import { Loader2, Globe, MapPin, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProjectSyncModal } from "./project-sync-modal";

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
      "Please enter a valid domain (e.g., example.com)"
    ),
  isPublic: z.boolean().default(false),
  settings: z.object({
    timezone: z.string().default("UTC"),
    currency: z.string().default("USD"),
    language: z.string().default("en"),
    locations: z.array(z.string()).default(["United States"]),
    searchEngines: z.array(z.string()).default(["google"]),
    trackingFrequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
    competitorDomains: z.array(z.string()).default([]),
    notificationSettings: z.object({
      email: z.boolean().default(true),
      slack: z.boolean().default(false),
      webhook: z.string().optional(),
    }),
  }),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  project?: {
    _id: Id<"projects">;
    name: string;
    domain: string;
    isPublic: boolean;
    settings: ProjectFormValues["settings"];
  };
  onSuccess?: () => void;
}

const timezones = [
  { value: "Asia/Ho_Chi_Minh", label: "Vietnam (UTC+7) - Hồ Chí Minh, Hà Nội 🇻🇳" },
  { value: "Asia/Bangkok", label: "Thailand (UTC+7) - Bangkok 🇹🇭" },
  { value: "Asia/Jakarta", label: "Indonesia WIB (UTC+7) - Jakarta 🇮🇩" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8) - Singapore 🇸🇬" },
  { value: "Asia/Manila", label: "Philippines (UTC+8) - Manila 🇵🇭" },
  { value: "Asia/Kuala_Lumpur", label: "Malaysia (UTC+8) - Kuala Lumpur 🇲🇾" },
  { value: "Asia/Tokyo", label: "Japan (UTC+9) - Tokyo, Osaka 🇯🇵" },
  { value: "Asia/Seoul", label: "South Korea (UTC+9) - Seoul 🇰🇷" },
  { value: "America/New_York", label: "US Eastern (UTC-5/-4) - New York 🇺🇸" },
  { value: "America/Los_Angeles", label: "US Pacific (UTC-8/-7) - Los Angeles 🇺🇸" },
  { value: "Europe/London", label: "UK (UTC+0/+1) - London 🇬🇧" },
  { value: "Europe/Paris", label: "France (UTC+1/+2) - Paris 🇫🇷" },
  { value: "Australia/Sydney", label: "Australia Eastern (UTC+10/+11) - Sydney 🇦🇺" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

const currencies = [
  { value: "VND", label: "Việt Nam Đồng (₫) 🇻🇳" },
  { value: "USD", label: "US Dollar ($) 🇺🇸" },
  { value: "EUR", label: "Euro (€) 🇪🇺" },
  { value: "GBP", label: "British Pound (£) 🇬🇧" },
  { value: "JPY", label: "Japanese Yen (¥) 🇯🇵" },
  { value: "SGD", label: "Singapore Dollar (S$) 🇸🇬" },
  { value: "THB", label: "Thai Baht (฿) 🇹🇭" },
  { value: "AUD", label: "Australian Dollar (A$) 🇦🇺" },
  { value: "CAD", label: "Canadian Dollar (C$) 🇨🇦" },
];

const languages = [
  { value: "vi", label: "Tiếng Việt 🇻🇳" },
  { value: "en", label: "English 🇬🇧" },
  { value: "es", label: "Spanish 🇪🇸" },
  { value: "fr", label: "French 🇫🇷" },
  { value: "de", label: "German 🇩🇪" },
  { value: "it", label: "Italian 🇮🇹" },
  { value: "pt", label: "Portuguese 🇵🇹" },
  { value: "ja", label: "Japanese 🇯🇵" },
  { value: "ko", label: "Korean 🇰🇷" },
  { value: "zh", label: "Chinese 🇨🇳" },
  { value: "th", label: "Thai 🇹🇭" },
  { value: "id", label: "Indonesian 🇮🇩" },
];

const searchEngines = [
  { value: "google", label: "Google", icon: "🔍" },
  { value: "bing", label: "Bing", icon: "🅱️" },
  { value: "yahoo", label: "Yahoo", icon: "🟣" },
  { value: "yandex", label: "Yandex", icon: "🔴" },
  { value: "baidu", label: "Baidu", icon: "🔵" },
];

const locations = [
  { value: "Vietnam", label: "Vietnam 🇻🇳" },
  { value: "United States", label: "United States 🇺🇸" },
  { value: "United Kingdom", label: "United Kingdom 🇬🇧" },
  { value: "Canada", label: "Canada 🇨🇦" },
  { value: "Australia", label: "Australia 🇦🇺" },
  { value: "Singapore", label: "Singapore 🇸🇬" },
  { value: "Thailand", label: "Thailand 🇹🇭" },
  { value: "Japan", label: "Japan 🇯🇵" },
  { value: "South Korea", label: "South Korea 🇰🇷" },
  { value: "Germany", label: "Germany 🇩🇪" },
  { value: "France", label: "France 🇫🇷" },
  { value: "Netherlands", label: "Netherlands 🇳🇱" },
  { value: "Spain", label: "Spain 🇪🇸" },
  { value: "Italy", label: "Italy 🇮🇹" },
  { value: "Brazil", label: "Brazil 🇧🇷" },
  { value: "Mexico", label: "Mexico 🇲🇽" },
  { value: "India", label: "India 🇮🇳" },
  { value: "China", label: "China 🇨🇳" },
  { value: "Russia", label: "Russia 🇷🇺" },
  { value: "Indonesia", label: "Indonesia 🇮🇩" },
  { value: "Malaysia", label: "Malaysia 🇲🇾" },
  { value: "Philippines", label: "Philippines 🇵🇭" },
];

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState<{
    projectId: string;
    bigQueryProjectId: string;
    name: string;
    domain: string;
  } | null>(null);

  const createProjectMutation = useMutation(api.projects.createProject);
  const updateProjectMutation = useMutation(api.projects.updateProject);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          name: project.name,
          domain: project.domain,
          isPublic: project.isPublic,
          settings: project.settings,
        }
      : {
          name: "",
          domain: "",
          isPublic: false,
          settings: {
            timezone: "Asia/Ho_Chi_Minh",
            currency: "VND",
            language: "vi",
            locations: ["Vietnam"],
            searchEngines: ["google"],
            trackingFrequency: "daily",
            competitorDomains: [],
            notificationSettings: {
              email: true,
              slack: false,
            },
          },
        },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    setIsLoading(true);
    try {
      if (project) {
        await updateProjectMutation({
          projectId: project._id,
          updates: values,
        });
        toast({
          title: "Project updated",
          description: "Your project settings have been saved.",
        });
      } else {
        const result = await createProjectMutation(values);
        
        console.log('[PROJECT-FORM] Create project result:', result);
        
        // Show sync modal
        setNewProjectData({
          projectId: result.projectId,
          bigQueryProjectId: result.bigQueryProjectId,
          name: values.name,
          domain: values.domain,
        });
        setSyncModalOpen(true);
      }
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addCompetitor = () => {
    const domain = competitorInput.trim();
    if (
      domain &&
      !form.getValues("settings.competitorDomains").includes(domain)
    ) {
      const currentCompetitors = form.getValues("settings.competitorDomains");
      form.setValue("settings.competitorDomains", [
        ...currentCompetitors,
        domain,
      ]);
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (domain: string) => {
    const currentCompetitors = form.getValues("settings.competitorDomains");
    form.setValue(
      "settings.competitorDomains",
      currentCompetitors.filter((d) => d !== domain)
    );
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Website SEO"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify your project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="example.com"
                        {...field}
                        disabled={isLoading || !!project}
                        className="pl-9"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The website domain you want to track (without https://).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Make project public</FormLabel>
                    <FormDescription>
                      Allow anyone with the link to view this project's data.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Competitor Domains</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="competitor.com"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                  />
                  <Button type="button" onClick={addCompetitor} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("settings.competitorDomains").map((domain) => (
                    <Badge key={domain} variant="secondary">
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeCompetitor(domain)}
                        className="ml-2 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="settings.timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Timezone for scheduling and reporting.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Primary language for search results.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.trackingFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How often to check keyword rankings.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.locations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Location</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange([value])}
                    defaultValue={field.value[0]}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.value} value={location.value}>
                          {location.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the primary location to track rankings from.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="settings.notificationSettings.email"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Email Notifications</FormLabel>
                    <FormDescription>
                      Receive ranking updates and alerts via email.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.notificationSettings.slack"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Slack Notifications</FormLabel>
                    <FormDescription>
                      Send ranking updates to a Slack channel.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.notificationSettings.webhook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://your-webhook.com/endpoint"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Send ranking updates to a custom webhook endpoint.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {project ? "Update Project" : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>

    {/* Sync Modal */}
    {newProjectData && (
      <ProjectSyncModal
        open={syncModalOpen}
        projectId={newProjectData.projectId as any}
        bigQueryProjectId={newProjectData.bigQueryProjectId}
        projectName={newProjectData.name}
        projectDomain={newProjectData.domain}
        onClose={() => {
          setSyncModalOpen(false);
          onSuccess?.();
        }}
      />
    )}
    </>
  );
}