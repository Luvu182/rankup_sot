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
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

const currencies = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "AUD", label: "Australian Dollar (A$)" },
  { value: "CAD", label: "Canadian Dollar (C$)" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
];

const searchEngines = [
  { value: "google", label: "Google", icon: "🔍" },
  { value: "bing", label: "Bing", icon: "🅱️" },
  { value: "yahoo", label: "Yahoo", icon: "🟣" },
  { value: "yandex", label: "Yandex", icon: "🔴" },
  { value: "baidu", label: "Baidu", icon: "🔵" },
];

const locations = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Japan",
  "Brazil",
  "Mexico",
  "India",
  "China",
  "Russia",
  "South Korea",
];

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");

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
            timezone: "UTC",
            currency: "USD",
            language: "en",
            locations: ["United States"],
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
        await createProjectMutation(values);
        toast({
          title: "Project created",
          description: "Your new project has been created successfully.",
        });
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
                  <FormLabel>Project Name</FormLabel>
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
                  <FormLabel>Domain</FormLabel>
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
              name="settings.searchEngines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Engines</FormLabel>
                  <FormDescription>
                    Select which search engines to track rankings on.
                  </FormDescription>
                  <div className="space-y-2 mt-2">
                    {searchEngines.map((engine) => (
                      <div
                        key={engine.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          checked={field.value.includes(engine.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, engine.value]);
                            } else {
                              field.onChange(
                                field.value.filter((v) => v !== engine.value)
                              );
                            }
                          }}
                          disabled={isLoading}
                        />
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <span>{engine.icon}</span>
                          {engine.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.locations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Locations</FormLabel>
                  <FormDescription>
                    Select locations to track rankings from.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {locations.map((location) => (
                      <div
                        key={location}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          checked={field.value.includes(location)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, location]);
                            } else {
                              field.onChange(
                                field.value.filter((v) => v !== location)
                              );
                            }
                          }}
                          disabled={isLoading}
                        />
                        <Label className="cursor-pointer">{location}</Label>
                      </div>
                    ))}
                  </div>
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
  );
}