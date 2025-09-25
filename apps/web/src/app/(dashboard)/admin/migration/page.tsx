"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2, Database, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MigrationPage() {
  const [projectStats, setProjectStats] = useState<any>(null);
  const [deleteStatus, setDeleteStatus] = useState<{
    running: boolean;
    result?: any;
    error?: string;
  }>({ running: false });
  
  const getProjectStats = useMutation(api.migrations.getProjectStats);
  const deleteAllProjects = useMutation(api.migrations.deleteAllProjects);
  
  const handleCheckMigration = async () => {
    setCheckStatus({ checking: true });
    try {
      const result = await checkMigration({});
      setCheckStatus({ checking: false, result });
    } catch (error) {
      setCheckStatus({ checking: false });
      console.error("Check failed:", error);
    }
  };
  
  const handleRunMigration = async () => {
    setMigrationStatus({ running: true });
    try {
      const result = await migrateProjects({});
      setMigrationStatus({ running: false, result });
      // Re-check status after migration
      handleCheckMigration();
    } catch (error) {
      setMigrationStatus({ 
        running: false, 
        error: error instanceof Error ? error.message : 'Migration failed' 
      });
    }
  };
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Migration</h1>
        <p className="text-muted-foreground">
          Migrate old project data to new schema structure
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Check Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Migration Status Check
            </CardTitle>
            <CardDescription>
              Check if database migration is needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCheckMigration}
              disabled={checkStatus.checking}
            >
              {checkStatus.checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Migration Status'
              )}
            </Button>
            
            {checkStatus.result && (
              <Alert className={checkStatus.result.ready ? "border-green-500" : "border-orange-500"}>
                <div className="flex items-start gap-2">
                  {checkStatus.result.ready ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertTitle>
                      {checkStatus.result.ready ? 'Database is up to date' : 'Migration needed'}
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>Total projects: {checkStatus.result.totalProjects}</p>
                      <p>Need migration: {checkStatus.result.needsMigration}</p>
                      {checkStatus.result.issues.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Issues found:</p>
                          <ul className="text-sm mt-1 space-y-1">
                            {checkStatus.result.issues.map((issue: string, i: number) => (
                              <li key={i} className="text-muted-foreground">• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        {/* Migration Card */}
        {checkStatus.result && !checkStatus.result.ready && (
          <Card>
            <CardHeader>
              <CardTitle>Run Migration</CardTitle>
              <CardDescription>
                This will update all projects to the new schema format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This migration will:
                  <ul className="mt-2 list-disc list-inside text-sm">
                    <li>Remove legacy domain verification fields</li>
                    <li>Add syncStatus field to projects without it</li>
                    <li>Set syncStatus to "synced" for existing projects</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleRunMigration}
                disabled={migrationStatus.running}
                variant="default"
              >
                {migrationStatus.running ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  'Run Migration'
                )}
              </Button>
              
              {migrationStatus.result && (
                <Alert className="border-green-500">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <AlertTitle>Migration Completed</AlertTitle>
                  <AlertDescription>
                    {migrationStatus.result.message}
                  </AlertDescription>
                </Alert>
              )}
              
              {migrationStatus.error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Migration Failed</AlertTitle>
                  <AlertDescription>{migrationStatus.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}