import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TeamLayout from "@/components/TeamLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  Upload,
  Archive,
  Database,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  MessageSquare,
  BarChart,
} from "lucide-react";

const DataManagement = () => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Tables to export
      const tables = ["employees", "reviews", "qr_code_scans", "profiles"];
      const exportData: Record<string, any[]> = {};

      // Export data from each table
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("company_id", user.id);

        if (error) throw error;
        exportData[table] = data || [];

        // Update progress
        setExportProgress(Math.round(((i + 1) / tables.length) * 100));
      }

      // Create export file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `review-spark-backup-${timestamp}.${exportFormat}`;
      let fileContent: string;
      let fileType: string;

      if (exportFormat === "json") {
        fileContent = JSON.stringify(exportData, null, 2);
        fileType = "application/json";
      } else {
        // Convert JSON to CSV
        fileContent = Object.entries(exportData)
          .map(([tableName, rows]) => {
            if (!rows.length) return `# ${tableName}: No data\n`;

            const headers = Object.keys(rows[0]).join(",");
            const csvRows = rows.map((row) =>
              Object.values(row)
                .map((value) =>
                  typeof value === "string"
                    ? `"${value.replace(/"/g, '""')}"`
                    : value
                )
                .join(",")
            );

            return `# ${tableName}\n${headers}\n${csvRows.join("\n")}`;
          })
          .join("\n\n");

        fileType = "text/csv";
      }

      // Download the file
      const blob = new Blob([fileContent], { type: fileType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleImportData = async () => {
    if (!user || !importFile) return;
    setIsImporting(true);
    setImportProgress(0);

    try {
      // Read the file
      const fileContent = await importFile.text();
      let importData: Record<string, any[]>;

      if (importFile.name.endsWith(".json")) {
        // Parse JSON
        importData = JSON.parse(fileContent);
      } else if (importFile.name.endsWith(".csv")) {
        // Parse CSV
        importData = {};
        let currentTable = "";
        let headers: string[] = [];
        const lines = fileContent.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith("# ")) {
            // New table section
            currentTable = line.substring(2).split(":")[0].trim();
            importData[currentTable] = [];
            headers = [];
          } else if (headers.length === 0 && currentTable) {
            // Headers line
            headers = line.split(",");
          } else if (headers.length > 0 && currentTable) {
            // Data line
            const values = line.split(",");
            const rowData: Record<string, any> = {};

            headers.forEach((header, index) => {
              let value = values[index] || "";
              // Handle quoted values
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value
                  .substring(1, value.length - 1)
                  .replace(/""/g, '"');
              }
              rowData[header] = value;
            });

            importData[currentTable].push(rowData);
          }
        }
      } else {
        throw new Error("Unsupported file format");
      }

      // Validate the data structure
      const requiredTables = [
        "employees",
        "reviews",
        "qr_code_scans",
        "profiles",
      ];
      for (const table of requiredTables) {
        if (!importData[table]) {
          throw new Error(`Missing required table: ${table}`);
        }
      }

      // Confirm import with user
      if (
        !window.confirm(
          `This will import ${
            Object.values(importData).flat().length
          } records. ` +
            `This operation cannot be undone. Are you sure you want to continue?`
        )
      ) {
        setIsImporting(false);
        return;
      }

      // Import data into each table
      const tables = Object.keys(importData);
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const records = importData[table];

        if (records.length > 0) {
          // First delete existing records
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq("company_id", user.id);

          if (deleteError) throw deleteError;

          // Then insert new records
          // Ensure company_id is set correctly
          const recordsWithCompanyId = records.map((record) => ({
            ...record,
            company_id: user.id,
          }));

          // Insert in batches to avoid payload size limits
          const batchSize = 100;
          for (let j = 0; j < recordsWithCompanyId.length; j += batchSize) {
            const batch = recordsWithCompanyId.slice(j, j + batchSize);
            const { error: insertError } = await supabase
              .from(table)
              .insert(batch);

            if (insertError) throw insertError;
          }
        }

        // Update progress
        setImportProgress(Math.round(((i + 1) / tables.length) * 100));
      }

      toast.success("Data imported successfully");
    } catch (error: any) {
      console.error("Error importing data:", error);
      toast.error(`Failed to import data: ${error.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImportFile(null);
    }
  };

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
          <p className="text-gray-600">Backup, restore, and manage your data</p>
        </div>

        <Tabs defaultValue="backup">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
          </TabsList>

          {/* Backup & Restore Tab */}
          <TabsContent value="backup" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Backing up your data regularly helps prevent data loss.
                Restoring data will overwrite your existing data.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Backup Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Backup Data
                  </CardTitle>
                  <CardDescription>
                    Download a complete backup of your data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        className={
                          exportFormat === "json" ? "bg-primary/10" : ""
                        }
                        onClick={() => setExportFormat("json")}
                      >
                        <FileJson className="h-4 w-4 mr-2" />
                        JSON
                      </Button>
                      <Button
                        variant="outline"
                        className={
                          exportFormat === "csv" ? "bg-primary/10" : ""
                        }
                        onClick={() => setExportFormat("csv")}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                    </div>

                    {isExporting && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${exportProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? "Exporting..." : "Download Backup"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Restore Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Restore Data
                  </CardTitle>
                  <CardDescription>
                    Restore data from a previous backup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept=".json,.csv"
                      onChange={(e) =>
                        setImportFile(e.target.files?.[0] || null)
                      }
                      disabled={isImporting}
                    />

                    {importFile && (
                      <p className="text-sm text-gray-600">
                        Selected file: {importFile.name}
                      </p>
                    )}

                    {isImporting && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${importProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleImportData}
                    disabled={isImporting || !importFile}
                    className="w-full"
                    variant="destructive"
                  >
                    {isImporting ? "Importing..." : "Restore Backup"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>
                  Export specific data for analysis or reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Choose what data you want to export and in what format
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24"
                  >
                    <Users className="h-8 w-8 mb-2" />
                    Export Employees
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24"
                  >
                    <MessageSquare className="h-8 w-8 mb-2" />
                    Export Reviews
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24"
                  >
                    <BarChart className="h-8 w-8 mb-2" />
                    Export Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Archive Tab */}
          <TabsContent value="archive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Data Archiving
                </CardTitle>
                <CardDescription>
                  Archive old data to improve system performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertTitle>Archiving Strategy</AlertTitle>
                    <AlertDescription>
                      Archiving moves older data to long-term storage while
                      keeping it accessible when needed.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Reviews</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Archive reviews older than:
                      </p>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          6 Months
                        </Button>
                        <Button variant="outline" size="sm">
                          1 Year
                        </Button>
                        <Button variant="outline" size="sm">
                          2 Years
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">QR Code Scans</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Archive scan data older than:
                      </p>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          3 Months
                        </Button>
                        <Button variant="outline" size="sm">
                          6 Months
                        </Button>
                        <Button variant="outline" size="sm">
                          1 Year
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Configure Archiving Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeamLayout>
  );
};

export default DataManagement;
