"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function VerifyDomainPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const projectId = params.id as Id<"projects">;
  
  // Fetch project data
  const project = useQuery(api.projects.getProject, { projectId });
  const verificationInfo = useQuery(api.projects.getDomainVerificationCode, { projectId });
  const verifyDomainMutation = useMutation(api.projects.verifyDomain);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/verify-domain`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.verified) {
        // Update Convex
        await verifyDomainMutation({ projectId });
        
        toast({
          title: "Domain verified!",
          description: "Your domain has been successfully verified.",
        });
        
        router.push(`/projects/${projectId}/settings`);
      } else {
        toast({
          title: "Verification failed",
          description: data.message || "Please ensure you've added the verification code correctly.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify domain. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try selecting and copying manually.",
        variant: "destructive",
      });
    }
  };

  if (!project || !verificationInfo) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (project.domainVerified) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Domain Already Verified</h2>
            <p className="text-muted-foreground mb-4">
              {project.domain} has already been verified.
            </p>
            <Button onClick={() => router.push(`/projects/${projectId}/settings`)}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dnsMethod = verificationInfo.methods.find(m => m.type === "dns");
  const metaMethod = verificationInfo.methods.find(m => m.type === "meta");
  const fileMethod = verificationInfo.methods.find(m => m.type === "file");

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Verify Domain Ownership</h1>
            <p className="text-muted-foreground">
              Verify that you own <span className="font-medium">{project.domain}</span> to
              unlock all features.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Globe className="mr-1 h-3 w-3" />
            {project.domain}
          </Badge>
        </div>
      </div>

      {/* Verification Methods */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Verification Methods</CardTitle>
          <CardDescription>
            Choose one of the following methods to verify your domain ownership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dns" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dns">
                <Server className="mr-2 h-4 w-4" />
                DNS Record
              </TabsTrigger>
              <TabsTrigger value="meta">
                <Globe className="mr-2 h-4 w-4" />
                HTML Tag
              </TabsTrigger>
              <TabsTrigger value="file">
                <FileText className="mr-2 h-4 w-4" />
                File Upload
              </TabsTrigger>
            </TabsList>

            {/* DNS Method */}
            <TabsContent value="dns" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Add a TXT record to your domain's DNS settings. This may take up to
                  48 hours to propagate.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div>
                  <Label>Record Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={dnsMethod?.record || ""} readOnly />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(dnsMethod?.record || "", "Record type")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Name/Host</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={dnsMethod?.name || ""} readOnly />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(dnsMethod?.name || "", "Record name")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Value/Content</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={dnsMethod?.value || ""} readOnly className="font-mono text-sm" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(dnsMethod?.value || "", "Verification code")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* HTML Meta Tag Method */}
            <TabsContent value="meta" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Add this meta tag to the <code>&lt;head&gt;</code> section of your
                  website's homepage.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label>Meta Tag</Label>
                <div className="mt-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {metaMethod?.tag}
                </div>
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={() => copyToClipboard(metaMethod?.tag || "", "Meta tag")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Meta Tag
                </Button>
              </div>
            </TabsContent>

            {/* File Upload Method */}
            <TabsContent value="file" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Upload a text file to your website's root directory.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div>
                  <Label>File Path</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value={`https://${project.domain}${fileMethod?.path}`} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(
                        `https://${project.domain}${fileMethod?.path}`,
                        "File path"
                      )}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>File Content</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md font-mono text-sm">
                    {fileMethod?.content}
                  </div>
                  <Button
                    className="mt-2"
                    variant="outline"
                    onClick={() => copyToClipboard(fileMethod?.content || "", "File content")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Content
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Your Domain</CardTitle>
          <CardDescription>
            Once you've added the verification code using one of the methods above,
            click the button below to verify your domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex-1"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verify Domain
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`https://${project.domain}`, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Visit Website
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}