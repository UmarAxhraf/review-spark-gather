//========================================>>>>>>>>>>>>>>>>>>>>>>=======================================

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
import { BackButton } from "@/components/ui/back-button";

const DataManagement = () => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);

  // Helper function to properly escape CSV values
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Helper function to parse CSV line properly
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current);
    return result;
  };

  // // Helper function to convert string values back to proper types
  // const convertValue = (value: string, key: string): any => {
  //   if (value === "" || value === "null" || value === "undefined") return null;

  //   // Boolean fields
  //   if (["is_active", "is_approved", "qr_is_active"].includes(key)) {
  //     return value.toLowerCase() === "true";
  //   }

  //   // Number fields
  //   if (["rating", "qr_scan_limit"].includes(key)) {
  //     const num = parseInt(value);
  //     return isNaN(num) ? null : num;
  //   }

  //   // Date fields
  //   if (key.includes("_at") || key.includes("_date")) {
  //     return value ? new Date(value).toISOString() : null;
  //   }

  //   return value;
  // };

  // Enhanced helper function to convert string values back to proper types
  const convertValue = (value: string, key: string): any => {
    if (value === "" || value === "null" || value === "undefined") return null;

    // Boolean fields - be more specific about which fields are boolean
    const booleanFields = [
      "is_active",
      "is_approved",
      "qr_is_active",
      "flagged_as_spam",
    ];
    if (booleanFields.includes(key)) {
      return value.toLowerCase() === "true";
    }

    // Number fields - be more specific about numeric fields
    const numberFields = ["rating", "qr_scan_limit", "sentiment_score"];
    if (numberFields.includes(key)) {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }

    // Integer fields
    const integerFields = ["rating", "qr_scan_limit"];
    if (integerFields.includes(key)) {
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    }

    // Date fields - be more specific about date field patterns
    const dateFields = [
      "created_at",
      "updated_at",
      "responded_at",
      "assigned_at",
      "qr_expires_at",
      "scan_date",
      "processed_at",
    ];
    if (dateFields.includes(key)) {
      try {
        return value ? new Date(value).toISOString() : null;
      } catch (error) {
        console.warn(`Invalid date value for ${key}: ${value}`);
        return null;
      }
    }

    // Array fields (for keywords, topics, etc.)
    if (key === "keywords" || key === "topics") {
      try {
        return value ? JSON.parse(value) : [];
      } catch (error) {
        // If JSON parsing fails, treat as comma-separated string
        return value ? value.split(",").map((item) => item.trim()) : [];
      }
    }

    return value;
  };

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

        try {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("company_id", user.id);

          if (error) {
            console.warn(`Warning: Could not export ${table}:`, error.message);
            exportData[table] = [];
          } else {
            exportData[table] = data || [];
          }
        } catch (tableError) {
          console.warn(`Warning: Error accessing ${table}:`, tableError);
          exportData[table] = [];
        }

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
        // Create proper CSV format
        const csvSections: string[] = [];

        Object.entries(exportData).forEach(([tableName, rows]) => {
          if (!rows.length) {
            csvSections.push(`# ${tableName}\n# No data available\n`);
            return;
          }

          const headers = Object.keys(rows[0]);
          const headerRow = headers.map((h) => escapeCsvValue(h)).join(",");

          const dataRows = rows.map((row) =>
            headers.map((header) => escapeCsvValue(row[header])).join(",")
          );

          csvSections.push(
            `# ${tableName}\n${headerRow}\n${dataRows.join("\n")}`
          );
        });

        fileContent = csvSections.join("\n\n");
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

      toast.success(`Data exported successfully as ${fileName}`);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast.error(`Failed to export data: ${error.message}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Enhanced validation function
  const validateImportData = (
    importData: Record<string, any[]>
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const requiredTables = [
      "employees",
      "reviews",
      "qr_code_scans",
      "profiles",
    ];

    // Check for required tables
    const missingTables = requiredTables.filter((table) => !importData[table]);
    if (missingTables.length > 0) {
      errors.push(`Missing required tables: ${missingTables.join(", ")}`);
    }

    // Validate employees table structure
    if (importData.employees && importData.employees.length > 0) {
      const requiredEmployeeFields = ["name", "company_id"];
      const employeeFields = Object.keys(importData.employees[0]);
      const missingEmployeeFields = requiredEmployeeFields.filter(
        (field) => !employeeFields.includes(field)
      );
      if (missingEmployeeFields.length > 0) {
        errors.push(
          `Missing required employee fields: ${missingEmployeeFields.join(
            ", "
          )}`
        );
      }
    }

    // Validate reviews table structure
    if (importData.reviews && importData.reviews.length > 0) {
      const requiredReviewFields = [
        "customer_name",
        "rating",
        "employee_id",
        "company_id",
      ];
      const reviewFields = Object.keys(importData.reviews[0]);
      const missingReviewFields = requiredReviewFields.filter(
        (field) => !reviewFields.includes(field)
      );
      if (missingReviewFields.length > 0) {
        errors.push(
          `Missing required review fields: ${missingReviewFields.join(", ")}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // const handleImportData = async () => {
  //   if (!user || !importFile) return;
  //   setIsImporting(true);
  //   setImportProgress(0);

  //   try {
  //     // Read the file
  //     const fileContent = await importFile.text();
  //     let importData: Record<string, any[]>;

  //     if (importFile.name.endsWith(".json")) {
  //       // Parse JSON
  //       try {
  //         importData = JSON.parse(fileContent);
  //       } catch (parseError) {
  //         throw new Error(
  //           "Invalid JSON format. Please check your file structure."
  //         );
  //       }
  //     } else if (importFile.name.endsWith(".csv")) {
  //       // ... existing CSV parsing logic ...
  //     } else {
  //       throw new Error(
  //         "Unsupported file format. Please use .json or .csv files."
  //       );
  //     }

  //     // Enhanced validation
  //     const validation = validateImportData(importData);
  //     if (!validation.isValid) {
  //       throw new Error(
  //         `Data validation failed:\n${validation.errors.join("\n")}`
  //       );
  //     }

  //     const totalRecords = Object.values(importData).reduce(
  //       (sum, records) => sum + records.length,
  //       0
  //     );

  //     // Confirm import with user
  //     if (
  //       !window.confirm(
  //         `This will import ${totalRecords} records across ${
  //           Object.keys(importData).length
  //         } tables. ` +
  //           `This operation will REPLACE all existing data and cannot be undone. Are you sure you want to continue?`
  //       )
  //     ) {
  //       setIsImporting(false);
  //       return;
  //     }

  //     // Get existing QR code IDs to avoid duplicates
  //     const { data: existingQRCodes } = await supabase
  //       .from("employees")
  //       .select("qr_code_id")
  //       .not("qr_code_id", "is", null);

  //     const existingQRCodeIds = new Set(
  //       existingQRCodes?.map((emp) => emp.qr_code_id) || []
  //     );

  //     // Function to generate unique QR code ID
  //     const generateUniqueQRCodeId = (): string => {
  //       let qrCodeId: string;
  //       do {
  //         qrCodeId = `qr_${Date.now()}_${Math.random()
  //           .toString(36)
  //           .substr(2, 9)}`;
  //       } while (existingQRCodeIds.has(qrCodeId));

  //       // Add to set to avoid duplicates within this import
  //       existingQRCodeIds.add(qrCodeId);
  //       return qrCodeId;
  //     };

  //     // Import data into each table with better error handling
  //     const tables = ["profiles", "employees", "reviews", "qr_code_scans"]; // Order matters for foreign keys
  //     const importResults: {
  //       table: string;
  //       success: boolean;
  //       error?: string;
  //     }[] = [];

  //     for (let i = 0; i < tables.length; i++) {
  //       const table = tables[i];
  //       const records = importData[table] || [];

  //       try {
  //         if (records.length > 0) {
  //           // First delete existing records (except profiles)
  //           if (table !== "profiles") {
  //             const { error: deleteError } = await supabase
  //               .from(table)
  //               .delete()
  //               .eq("company_id", user.id);

  //             if (deleteError) {
  //               console.warn(
  //                 `Warning: Could not clear ${table}:`,
  //                 deleteError.message
  //               );
  //             }
  //           }

  //           // Prepare records for insertion
  //           const recordsWithCompanyId = records.map((record) => {
  //             const cleanRecord = { ...record };
  //             cleanRecord.company_id = user.id;

  //             // Remove id to let database generate new ones
  //             if (cleanRecord.id) {
  //               delete cleanRecord.id;
  //             }

  //             // Handle special cases for different tables
  //             if (table === "employees") {
  //               // Always generate a new unique QR code ID
  //               cleanRecord.qr_code_id = generateUniqueQRCodeId();
  //               cleanRecord.is_active = cleanRecord.is_active ?? true;
  //               cleanRecord.qr_is_active = cleanRecord.qr_is_active ?? true;
  //             }

  //             if (table === "reviews") {
  //               cleanRecord.is_approved = cleanRecord.is_approved ?? false;
  //               cleanRecord.review_type = cleanRecord.review_type ?? "text";
  //             }

  //             return cleanRecord;
  //           });

  //           // Insert in smaller batches for better reliability
  //           const batchSize = 25;
  //           for (let j = 0; j < recordsWithCompanyId.length; j += batchSize) {
  //             const batch = recordsWithCompanyId.slice(j, j + batchSize);
  //             const { error: insertError } = await supabase
  //               .from(table)
  //               .insert(batch);

  //             if (insertError) {
  //               throw new Error(
  //                 `Failed to insert batch for ${table}: ${insertError.message}`
  //               );
  //             }
  //           }

  //           importResults.push({ table, success: true });
  //         } else {
  //           importResults.push({ table, success: true }); // Empty table is OK
  //         }
  //       } catch (tableError: any) {
  //         console.error(`Error processing ${table}:`, tableError);
  //         importResults.push({
  //           table,
  //           success: false,
  //           error: tableError.message,
  //         });
  //       }

  //       // Update progress
  //       setImportProgress(Math.round(((i + 1) / tables.length) * 100));
  //     }

  //     // Report results
  //     const failedTables = importResults.filter((result) => !result.success);
  //     if (failedTables.length > 0) {
  //       const errorMessage = failedTables
  //         .map((result) => `${result.table}: ${result.error}`)
  //         .join("\n");
  //       toast.error(`Import completed with errors:\n${errorMessage}`);
  //     } else {
  //       toast.success(
  //         "Data imported successfully! Please refresh the page to see the changes."
  //       );
  //     }
  //   } catch (error: any) {
  //     console.error("Error importing data:", error);
  //     toast.error(`Failed to import data: ${error.message}`);
  //   } finally {
  //     setIsImporting(false);
  //     setImportProgress(0);
  //     setImportFile(null);
  //   }
  // };

  const handleImportData = async () => {
    if (!importFile || !user) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const fileContent = await importFile.text();
      let importData: Record<string, any[]> = {};

      if (importFile.name.endsWith(".json")) {
        importData = JSON.parse(fileContent);
      } else if (importFile.name.endsWith(".csv")) {
        // ... existing CSV parsing logic ...
      }

      // Validate import data
      const validation = validateImportData(importData);
      if (!validation.isValid) {
        toast.error(
          `Import validation failed:\n${validation.errors.join("\n")}`
        );
        return;
      }

      // Confirm with user
      const confirmed = window.confirm(
        `This will replace all existing data with the imported data. Are you sure you want to continue?`
      );
      if (!confirmed) return;

      // Create ID mapping to maintain foreign key relationships
      const idMappings: Record<string, Record<string, string>> = {
        employees: {},
        reviews: {},
        profiles: {},
        qr_code_scans: {},
      };

      // Create QR code ID mapping to maintain qr_code_id relationships
      const qrCodeMappings: Record<string, string> = {};

      // Generate unique QR code IDs
      const existingQRCodes = new Set<string>();
      const { data: existingEmployees } = await supabase
        .from("employees")
        .select("qr_code_id");

      existingEmployees?.forEach((emp) => existingQRCodes.add(emp.qr_code_id));

      const generateUniqueQRCodeId = (): string => {
        let qrCodeId: string;
        do {
          qrCodeId = `qr_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        } while (existingQRCodes.has(qrCodeId));
        existingQRCodes.add(qrCodeId);
        return qrCodeId;
      };

      // Import data in correct order to maintain foreign key relationships
      const tables = ["profiles", "employees", "reviews", "qr_code_scans"];

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const records = importData[table] || [];

        try {
          if (records.length > 0) {
            // Delete existing records (except profiles)
            if (table !== "profiles") {
              const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq("company_id", user.id);

              if (deleteError) {
                console.warn(
                  `Warning: Could not clear ${table}:`,
                  deleteError.message
                );
              }
            }

            // Prepare records for insertion with ID mapping
            const recordsWithCompanyId = records.map((record) => {
              const cleanRecord = { ...record };
              const oldId = cleanRecord.id;
              const oldQRCodeId = cleanRecord.qr_code_id; // Store old QR code ID

              // Remove old ID to let database generate new ones
              delete cleanRecord.id;

              // Set company_id
              cleanRecord.company_id = user.id;

              // Handle special cases for different tables
              if (table === "employees") {
                // Generate new unique QR code ID and store mapping
                const newQRCodeId = generateUniqueQRCodeId();
                if (oldQRCodeId) {
                  qrCodeMappings[oldQRCodeId] = newQRCodeId;
                }
                cleanRecord.qr_code_id = newQRCodeId;
                cleanRecord.is_active = cleanRecord.is_active ?? true;
                cleanRecord.qr_is_active = cleanRecord.qr_is_active ?? true;
              }

              if (table === "reviews") {
                // Map old employee_id to new employee_id
                if (
                  cleanRecord.employee_id &&
                  idMappings.employees[cleanRecord.employee_id]
                ) {
                  cleanRecord.employee_id =
                    idMappings.employees[cleanRecord.employee_id];
                }
                cleanRecord.is_approved = cleanRecord.is_approved ?? false;
                cleanRecord.review_type = cleanRecord.review_type ?? "text";
              }

              if (table === "qr_code_scans") {
                // Map old employee_id to new employee_id
                if (
                  cleanRecord.employee_id &&
                  idMappings.employees[cleanRecord.employee_id]
                ) {
                  cleanRecord.employee_id =
                    idMappings.employees[cleanRecord.employee_id];
                }
                // Map old qr_code_id to new qr_code_id
                if (
                  cleanRecord.qr_code_id &&
                  qrCodeMappings[cleanRecord.qr_code_id]
                ) {
                  cleanRecord.qr_code_id =
                    qrCodeMappings[cleanRecord.qr_code_id];
                }
              }

              return { cleanRecord, oldId };
            });

            // Insert records and capture new IDs
            const batchSize = 25;
            for (let j = 0; j < recordsWithCompanyId.length; j += batchSize) {
              const batch = recordsWithCompanyId.slice(j, j + batchSize);
              const recordsToInsert = batch.map((item) => item.cleanRecord);

              const { data: insertedData, error: insertError } = await supabase
                .from(table)
                .insert(recordsToInsert)
                .select("id");

              if (insertError) {
                throw new Error(
                  `Failed to insert batch for ${table}: ${insertError.message}`
                );
              }

              // Map old IDs to new IDs
              if (insertedData) {
                insertedData.forEach((newRecord, index) => {
                  const batchIndex = j + index;
                  const oldId = recordsWithCompanyId[batchIndex].oldId;
                  if (oldId && newRecord.id) {
                    idMappings[table][oldId] = newRecord.id;
                  }
                });
              }
            }
          }
        } catch (tableError: any) {
          console.error(`Error processing ${table}:`, tableError);
          throw new Error(`Failed to import ${table}: ${tableError.message}`);
        }

        // Update progress
        setImportProgress(Math.round(((i + 1) / tables.length) * 100));
      }

      toast.success(
        "Data imported successfully! The page will refresh to show the updated data."
      );

      // Refresh the page to reload all data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error importing data:", error);
      toast.error(`Failed to import data: ${error.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImportFile(null);
    }
  };

  // New function for selective export
  const handleSelectiveExport = async (
    dataType: "employees" | "reviews" | "analytics"
  ) => {
    if (!user) return;

    try {
      let data: any[] = [];
      let fileName = "";

      switch (dataType) {
        case "employees":
          const { data: employeeData, error: empError } = await supabase
            .from("employees")
            .select("*")
            .eq("company_id", user.id);
          if (empError) throw empError;
          data = employeeData || [];
          fileName = `employees-export-${
            new Date().toISOString().split("T")[0]
          }`;
          break;

        case "reviews":
          const { data: reviewData, error: revError } = await supabase
            .from("reviews")
            .select(
              `
              *,
              employee:employees(name, position)
            `
            )
            .eq("company_id", user.id);
          if (revError) throw revError;
          data = reviewData || [];
          fileName = `reviews-export-${new Date().toISOString().split("T")[0]}`;
          break;

        case "analytics":
          const { data: scanData, error: scanError } = await supabase
            .from("qr_code_scans")
            .select("*")
            .eq("company_id", user.id);
          if (scanError) throw scanError;
          data = scanData || [];
          fileName = `analytics-export-${
            new Date().toISOString().split("T")[0]
          }`;
          break;
      }

      if (data.length === 0) {
        toast.info(`No ${dataType} data found to export.`);
        return;
      }

      // Export as CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.map((h) => escapeCsvValue(h)).join(","),
        ...data.map((row) =>
          headers.map((header) => escapeCsvValue(row[header])).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${dataType} data exported successfully!`);
    } catch (error: any) {
      console.error(`Error exporting ${dataType}:`, error);
      toast.error(`Failed to export ${dataType}: ${error.message}`);
    }
  };

  return (
    <TeamLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <BackButton />
        </div>
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
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
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
                    {isExporting
                      ? `Exporting... ${exportProgress}%`
                      : "Download Backup"}
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
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
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
                    {isImporting
                      ? `Importing... ${importProgress}%`
                      : "Restore Backup"}
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
                    onClick={() => handleSelectiveExport("employees")}
                  >
                    <Users className="h-8 w-8 mb-2" />
                    Export Employees
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24"
                    onClick={() => handleSelectiveExport("reviews")}
                  >
                    <MessageSquare className="h-8 w-8 mb-2" />
                    Export Reviews
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24"
                    onClick={() => handleSelectiveExport("analytics")}
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
