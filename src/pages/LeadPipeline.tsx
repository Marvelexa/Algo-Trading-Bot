import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Eye, 
  Search, 
  MapPin, 
  Upload, 
  Download, 
  Link2, 
  Phone, 
  Mail, 
  ArrowLeft, 
  Video,
  Save, 
  Database,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  Send,
  Settings,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveLeadToSheet } from "../lib/sheets";

// Frontend dynamic score calculator matching server logic
const calculateFrontendScore = (lead: any) => {
  let score = 50; // Base score
  const hasWebsite = lead.website && lead.website !== "NO have yet" && lead.website.trim() !== "";
  if (!hasWebsite) {
    score += 20; // High value for web agency: no website
  }
  const rating = parseFloat(lead.rating);
  if (!isNaN(rating) && rating >= 4.0) {
    score += 15; // Reputable business
  }
  const reviews = parseInt(lead.reviewsCount || lead.reviews);
  if (!isNaN(reviews) && reviews > 50) {
    score += 15; // High volume (paying customers)
  }
  return Math.min(100, score);
};

const getArchivedLeads = () => {
  try {
    return JSON.parse(localStorage.getItem('crm_archived_leads') || '[]');
  } catch(e) { return []; }
};

const isLeadArchived = (lead: any) => {
  const ids = getArchivedLeads();
  return ids.includes(lead.mapsUrl) || ids.includes(lead.phone) || ids.includes(lead.name);
};

export function LeadPipeline() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const searchLocation = state?.location || "Imported Leads";
  const incomingLeads = state?.leads || [];
  
  const [leads, setLeads] = useState<any[]>(() => {
    const saved = localStorage.getItem("crm_pipeline_leads");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse crm_pipeline_leads from localStorage", e);
      }
    }
    return incomingLeads;
  });
  const [isGeneratingWebsite, setIsGeneratingWebsite] = useState(false);
  const [generatingLeadId, setGeneratingLeadId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Outreach Modal states
  const [activeOutreachLead, setActiveOutreachLead] = useState<any | null>(null);
  const [outreachStep, setOutreachStep] = useState<"idle" | "website" | "video" | "pitch" | "done" | "error">("idle");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>("");
  const [outreachMessage, setOutreachMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  // Batch generation states
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [showBatchGenModal, setShowBatchGenModal] = useState(false);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchTotalCount, setBatchTotalCount] = useState(0);
  const [batchCurrentLeadName, setBatchCurrentLeadName] = useState("");
  const [batchLogs, setBatchLogs] = useState<string[]>([]);
  const abortBatchGenRef = useRef(false);

  // WhatsApp Bulk Sending states
  const [isBatchSendingWhatsApp, setIsBatchSendingWhatsApp] = useState(false);
  const [isSendingSingleWhatsApp, setIsSendingSingleWhatsApp] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendCurrentIndex, setSendCurrentIndex] = useState(0);
  const [sendTotalCount, setSendTotalCount] = useState(0);
  const [sendCurrentLeadName, setSendCurrentLeadName] = useState("");
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const abortBatchSendRef = useRef(false);
  const [copied, setCopied] = useState(false);
  
  // CRM Settings overrides
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("WACRM_TEST_API_KEY") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "videos">("pipeline");

  useEffect(() => {
    localStorage.setItem("WACRM_TEST_API_KEY", apiKey);
  }, [apiKey]);

  // Template System states
  const [templateText, setTemplateText] = useState(() => 
    localStorage.getItem("WACRM_OUTREACH_TEMPLATE") || 
    "Hi {{business_name}}!\n\nI found your business online and made this quick 20-second website preview for you.\n\nWe can build a website like this for just {{price}}.\n\nTap an option below if you'd like to know more."
  );
  const [useTemplate, setUseTemplate] = useState(() => 
    localStorage.getItem("WACRM_USE_TEMPLATE") === "true"
  );

  useEffect(() => {
    localStorage.setItem("WACRM_OUTREACH_TEMPLATE", templateText);
  }, [templateText]);

  useEffect(() => {
    localStorage.setItem("WACRM_USE_TEMPLATE", String(useTemplate));
  }, [useTemplate]);

  const formatTemplateForLead = (tpl: string, leadName: string, price: string = "$99") => {
    return tpl
      .replace(/\{\{business_name\}\}/g, leadName)
      .replace(/\{business_name\}/g, leadName)
      .replace(/\{name\}/g, leadName)
      .replace(/\(business name\)/g, leadName)
      .replace(/\{\{1\}\}/g, leadName)
      .replace(/\{\{price\}\}/g, price)
      .replace(/\{price\}/g, price);
  };

  // Dynamically format template message for the active outreach lead
  useEffect(() => {
    if (activeOutreachLead && useTemplate && templateText) {
      const formatted = formatTemplateForLead(templateText, activeOutreachLead.name);
      setOutreachMessage(formatted);
    }
  }, [activeOutreachLead, useTemplate, templateText]);

  // Function to apply template text to all leads in one click
  const handleApplyTemplateToAll = () => {
    if (!templateText) {
      alert("Please enter template text first.");
      return;
    }
    if (!confirm("Are you sure you want to overwrite outreach messages for all leads using this template?")) {
      return;
    }
    setLeads(prev => prev.map(l => ({
      ...l,
      outreachMessage: formatTemplateForLead(templateText, l.name)
    })));
    alert("✓ Template applied to all leads successfully!");
  };

  const hasMockData = leads.some(l => l.isMock);

  // Manage rate limit countdown
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const interval = window.setInterval(() => {
      setRetryCountdown((prev) => prev - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [retryCountdown]);

  // Sync leads state to local storage on change
  useEffect(() => {
    localStorage.setItem("crm_pipeline_leads", JSON.stringify(leads));
  }, [leads]);

  // Poll real-time synced leads from extension
  useEffect(() => {
    const pollSync = async () => {
      try {
        const res = await fetch("/api/leads/sync");
        const data = await res.json();
        if (data.leads && Array.isArray(data.leads) && data.leads.length > 0) {
          setLeads((prev) => {
            const existingMap = new Map(prev.map(l => [l.mapsUrl || l.name, l]));
            const merged = [...prev];
            data.leads.forEach((lead: any) => {
              if (isLeadArchived(lead)) return;
              const key = lead.mapsUrl || lead.name;
              if (existingMap.has(key)) {
                const idx = merged.findIndex(l => (l.mapsUrl && l.mapsUrl === lead.mapsUrl) || l.name === lead.name);
                if (idx !== -1) {
                  // Keep manual edits from UI if they are newer
                  merged[idx] = {
                    ...merged[idx],
                    phone: merged[idx].phone || lead.phone,
                    website: merged[idx].website || lead.website,
                    email: merged[idx].email || lead.email,
                  };
                  merged[idx].score = calculateFrontendScore(merged[idx]);
                  merged[idx].siteStatus = merged[idx].website ? 'present' : 'missing';
                }
              } else {
                merged.push({
                  ...lead,
                  score: calculateFrontendScore(lead)
                });
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.error("Sync polling error:", err);
      }
    };

    pollSync(); // run immediately
    const interval = window.setInterval(pollSync, 2000); // poll every 2 seconds
    return () => window.clearInterval(interval);
  }, []);

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all leads?")) {
      setLeads([]);
      try {
        await fetch("/api/leads/sync/clear", { method: "POST" });
      } catch (e) {}
    }
  };

  const handleArchiveLead = async (id: string | number) => {
    if (confirm("Mark this lead as Completed? It will be archived and hidden from future searches.")) {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        const archived = getArchivedLeads();
        const key = lead.mapsUrl || lead.phone || lead.name;
        if (key && !archived.includes(key)) {
          archived.push(key);
          localStorage.setItem('crm_archived_leads', JSON.stringify(archived));
        }
        setLeads((prev) => prev.filter((l) => l.id !== id));
        try {
          await fetch("/api/leads/sync/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        } catch (e) {}
      }
    }
  };

  const handleArchiveCompleted = async () => {
    const completedLeads = leads.filter(l => l.siteStatus === "preview");
    if (completedLeads.length === 0) {
      alert("No completed leads (with generated websites) found to archive.");
      return;
    }
    if (confirm(`Archive ${completedLeads.length} completed leads? They will be hidden from future searches.`)) {
      const archived = getArchivedLeads();
      completedLeads.forEach(lead => {
        const key = lead.mapsUrl || lead.phone || lead.name;
        if (key && !archived.includes(key)) {
          archived.push(key);
        }
      });
      localStorage.setItem('crm_archived_leads', JSON.stringify(archived));
      
      const completedIds = completedLeads.map(l => l.id);
      setLeads(prev => prev.filter(l => !completedIds.includes(l.id)));
      
      try {
        for (const id of completedIds) {
          await fetch("/api/leads/sync/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        }
      } catch (e) {}
    }
  };

  const handleRemoveLead = async (id: string | number) => {
    if (confirm("Are you sure you want to remove this lead?")) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      try {
        await fetch("/api/leads/sync/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch (e) {
        console.error("Failed to remove lead from sync backend", e);
      }
    }
  };

  // Normalizes rows exported from C:\Users\Prince\OneDrive\Desktop\website demos\Googlemap_scraper
  const processImportedRows = (rows: any[]) => {
    const parsed = rows.map((row: any, index: number) => {
      const name = row.Name || row.name || row["Business Name"] || "";
      const category = row.Category || row.category || "";
      
      let phone = row.Phone || row.phone || "";
      if (phone === "NO have yet" || phone === "NO") phone = "";
      
      let email = row.Email || row.email || "";
      if (email === "NO have yet" || email === "NO") email = "";
      
      let website = row.Website || row.website || "";
      if (website === "NO have yet" || website === "NO") website = "";
      
      const address = row.Address || row.address || row.location || "";
      
      const ratingVal = parseFloat(row.Rating || row.rating);
      const rating = isNaN(ratingVal) ? null : ratingVal;
      
      const reviewsVal = parseInt(row.Reviews || row.reviewsCount || row.reviews || row["Reviews Count"]);
      const reviewsCount = isNaN(reviewsVal) ? 0 : reviewsVal;
      
      const mapsUrl = row["Google Maps URL"] || row.mapsUrl || row.url || "";
      
      const leadId = row.ID || row.id || `lead-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;

      const lead: any = {
        id: leadId,
        name,
        category,
        phone,
        email,
        website,
        address,
        location: address, // dual compatibility
        rating,
        reviewsCount,
        mapsUrl,
        isMock: false
      };

      lead.score = calculateFrontendScore(lead);
      lead.siteStatus = lead.website ? "present" : "missing";
      
      return lead;
    });

    // Un-archive these leads since the user explicitly imported them
    const archived = getArchivedLeads();
    let archiveModified = false;
    
    parsed.forEach((lead: any) => {
      const key = lead.mapsUrl || lead.phone || lead.name;
      const idx = archived.indexOf(key);
      if (idx !== -1) {
        archived.splice(idx, 1);
        archiveModified = true;
      }
    });

    if (archiveModified) {
      localStorage.setItem('crm_archived_leads', JSON.stringify(archived));
    }

    return parsed;
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const parsedLeads = processImportedRows(results.data);
            if (parsedLeads.length === 0) {
              alert("No valid leads found in the CSV file.");
              return;
            }
            setLeads((prev) => {
              const existingMap = new Map(prev.map(l => [l.mapsUrl || l.name, l]));
              const merged = [...prev];
              parsedLeads.forEach(lead => {
                const key = lead.mapsUrl || lead.name;
                if (!existingMap.has(key)) {
                  merged.push(lead);
                }
              });
              return merged;
            });
          } catch (err: any) {
            alert(`Error processing CSV: ${err.message}`);
          }
        },
        error: (err) => {
          alert(`Error reading CSV: ${err.message}`);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet);
          const parsedLeads = processImportedRows(rows);
          if (parsedLeads.length === 0) {
            alert("No valid leads found in the Excel file.");
            return;
          }
          setLeads((prev) => {
            const existingMap = new Map(prev.map(l => [l.mapsUrl || l.name, l]));
            const merged = [...prev];
            parsedLeads.forEach(lead => {
              const key = lead.mapsUrl || lead.name;
              if (!existingMap.has(key)) {
                merged.push(lead);
              }
            });
            return merged;
          });
        } catch (err: any) {
          alert(`Error processing Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          if (Array.isArray(parsed)) {
            const parsedLeads = parsed.map((row: any, index: number) => {
              const leadId = row.id || row.ID || `lead-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;
              const lead: any = {
                id: leadId,
                name: row.name || row.Name || row["Business Name"] || "",
                category: row.category || row.Category || "",
                phone: row.phone || row.Phone || "",
                email: row.email || row.Email || "",
                website: row.website || row.Website || "",
                address: row.address || row.Address || row.location || "",
                location: row.address || row.Address || row.location || "",
                rating: parseFloat(row.rating || row.Rating) || null,
                reviewsCount: parseInt(row.reviewsCount || row.reviews || row.Reviews || row["Reviews Count"]) || 0,
                mapsUrl: row.mapsUrl || row["Google Maps URL"] || row.url || "",
                isMock: false,
                videoUrl: row.videoUrl || "",
                websiteUrl: row.websiteUrl || "",
                outreachMessage: row.outreachMessage || row.message || row.Message || "",
                siteStatus: row.siteStatus || ((row.videoUrl || row.websiteUrl || row.outreachMessage) ? "preview" : (row.website ? "present" : "missing")),
                whatsappStatus: row.whatsappStatus || undefined
              };
              if (lead.phone === "NO have yet" || lead.phone === "NO") lead.phone = "";
              if (lead.email === "NO have yet" || lead.email === "NO") lead.email = "";
              if (lead.website === "NO have yet" || lead.website === "NO") lead.website = "";
              lead.score = calculateFrontendScore(lead);
              return lead;
            });

            if (parsedLeads.length === 0) {
              alert("No valid leads found in the JSON file.");
              return;
            }

            setLeads((prev) => {
              const existingMap = new Map(prev.map(l => [l.mapsUrl || l.name, l]));
              const merged = [...prev];
              parsedLeads.forEach(lead => {
                const key = lead.mapsUrl || lead.name;
                if (existingMap.has(key)) {
                  const idx = merged.findIndex(l => (l.mapsUrl && l.mapsUrl === lead.mapsUrl) || l.name === lead.name);
                  if (idx !== -1) {
                    merged[idx] = {
                      ...merged[idx],
                      ...lead
                    };
                  }
                } else {
                  merged.push(lead);
                }
              });
              return merged;
            });
            alert(`Successfully imported ${parsedLeads.length} leads from JSON backup!`);
          } else {
            alert("Invalid JSON format. Expected an array of leads.");
          }
        } catch (err: any) {
          alert(`Error processing JSON file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Unsupported file format. Please upload a .csv, .xlsx, .xls, or .json file.");
    }
    
    e.target.value = ''; // Reset input
  };

  const handleFieldChange = (id: string | number, field: string, value: string) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === id) {
          const updatedLead = { ...lead, [field]: value };
          if (field === "website") {
            updatedLead.siteStatus = value.trim() ? "present" : "missing";
          }
          updatedLead.score = calculateFrontendScore(updatedLead);
          return updatedLead;
        }
        return lead;
      })
    );
  };

  const prepareFlatDataForExport = () => {
    return leads.map((lead) => ({
      ID: lead.id,
      Name: lead.name,
      Category: lead.category,
      Phone: lead.phone || "NO have yet",
      Email: lead.email || "NO have yet",
      Website: lead.website || "NO have yet",
      Address: lead.address || "NO have yet",
      Rating: lead.rating || 0,
      Reviews: lead.reviewsCount || lead.reviews || 0,
      "Google Maps URL": lead.mapsUrl || "",
      "Has Website": (lead.website && lead.website.trim() !== "") ? "YES" : "NO",
      "Lead Score": lead.score || 50,
      "Opportunity Priority": lead.score >= 80 ? "High" : lead.score >= 65 ? "Medium" : "Low",
      "Estimated Potential Outreach Value (INR)": lead.score >= 80 ? 25000 : lead.score >= 65 ? 15000 : 5000,
      "GMB Profile Claimed": "NO",
      "Created At": new Date().toLocaleDateString(),
    }));
  };

  const handleExportCsv = () => {
    if (leads.length === 0) return;
    const flatData = prepareFlatDataForExport();
    const csv = Papa.unparse(flatData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `leads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXlsx = () => {
    if (leads.length === 0) return;
    const flatData = prepareFlatDataForExport();
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    
    // Auto-adjust column widths
    const maxLengths = Object.keys(flatData[0] || {}).map(() => 15);
    flatData.forEach((row) => {
      Object.values(row).forEach((val, colIdx) => {
        const strVal = String(val);
        if (strVal.length > maxLengths[colIdx]) {
          maxLengths[colIdx] = Math.min(30, strVal.length);
        }
      });
    });
    worksheet['!cols'] = maxLengths.map((w) => ({ wch: w }));
    
    XLSX.writeFile(workbook, `leads_export_${Date.now()}.xlsx`);
  };

  const handleDownloadAllVideos = async () => {
    const eligibleLeads = leads.filter(l => l.videoUrl && l.videoUrl.trim() !== "");
    if (eligibleLeads.length === 0) {
      alert("No generated videos found. Please generate outreach websites/videos first.");
      return;
    }
    
    if (!confirm(`Do you want to download all ${eligibleLeads.length} outreach videos in a single ZIP folder?`)) {
      return;
    }

    try {
      const videos = eligibleLeads.map(l => ({
        url: l.videoUrl,
        name: l.name
      }));

      const response = await fetch("/api/leads/download-videos-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videos }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `outreach_videos_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Revoke the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err: any) {
      console.error("Failed to download ZIP file:", err);
      alert(`Failed to download ZIP: ${err.message || err}`);
    }
  };

  const handleSaveToCRM = async () => {
    setIsSaving(true);
    try {
      // 1. Fetch WhatsApp CRM configuration status
      const statusRes = await fetch("/api/crm/config-status");
      const statusData = await statusRes.json();
      const hasSupabase = statusData.configured;

      const sheetId = localStorage.getItem("crm_sheet_id");

      if (!sheetId && !hasSupabase) {
        alert("No CRM configuration found! Go to the Dashboard and create/connect a CRM Sheet, or configure Supabase in your .env file.");
        return;
      }

      let sheetsSuccessCount = 0;
      let supabaseSuccessCount = 0;

      // 2. Sync to Supabase WhatsApp CRM if configured
      if (hasSupabase) {
        try {
          const res = await fetch("/api/crm/sync-leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leads })
          });
          const resData = await res.json();
          if (res.ok && resData.success) {
            supabaseSuccessCount = resData.count;
          } else {
            console.error("Supabase CRM Sync failed:", resData.error);
          }
        } catch (supaErr) {
          console.error("Error syncing to Supabase CRM:", supaErr);
        }
      }

      // 3. Sync to Google Sheets if connected
      if (sheetId) {
        for (const lead of leads) {
          const mappedLead = {
            id: lead.id,
            name: lead.name,
            niche: lead.category,
            rating: lead.rating,
            address: lead.address,
            website: lead.website,
            phone: lead.phone,
            email: lead.email,
            outreachMessage: lead.outreachMessage || "",
            videoUrl: lead.videoUrl || ""
          };
          await saveLeadToSheet(sheetId, mappedLead);
          sheetsSuccessCount++;
        }
      }

      // Show summary feedback
      let alertMsg = "";
      if (supabaseSuccessCount > 0 && sheetsSuccessCount > 0) {
        alertMsg = `Successfully saved ${supabaseSuccessCount} leads to WhatsApp CRM and ${sheetsSuccessCount} leads to Google Sheets!`;
      } else if (supabaseSuccessCount > 0) {
        alertMsg = `Successfully saved ${supabaseSuccessCount} leads to WhatsApp CRM!`;
      } else if (sheetsSuccessCount > 0) {
        alertMsg = `Successfully saved ${sheetsSuccessCount} leads to Google Sheets!`;
      } else {
        alertMsg = "Failed to sync to any CRM. Please verify your connection status.";
      }
      alert(alertMsg);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save to CRM: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartOutreachGeneration = async (lead: any) => {
    setActiveOutreachLead(lead);
    setOutreachStep("website");
    setErrorMessage("");
    setGeneratedVideoUrl("");
    setOutreachMessage("");

    try {
      // Simulate step progress while request runs
      const stepTimer = setInterval(() => {
        setOutreachStep((curr) => {
          if (curr === "website") return "video";
          if (curr === "video") return "pitch";
          return curr;
        });
      }, 4000);

      const response = await fetch("/api/leads/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          name: lead.name,
          category: lead.category,
          rating: lead.rating,
          reviewsCount: lead.reviewsCount || lead.reviews || 0,
          phone: lead.phone || "",
          location: lead.location || lead.address || "",
          mapsUrl: lead.mapsUrl || "",
          photos: lead.photos || [],
        }),
      });

      clearInterval(stepTimer);

      if (!response.ok) {
        const errData = await response.json();
        const errMsg = errData.error || "Generation failed";
        
        // Parse rate limit delay
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate-limits") || errMsg.includes("RESOURCE_EXHAUSTED") || response.status === 429) {
          const match = errMsg.match(/Please retry in (\d+\.?\d*)s/);
          const seconds = match ? Math.ceil(parseFloat(match[1])) : 60;
          setRetryCountdown(seconds);
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      setGeneratedVideoUrl(data.videoUrl);
      setOutreachMessage(data.message);
      
      // Update local lead status
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, siteStatus: "preview", videoUrl: data.videoUrl, websiteUrl: data.websiteUrl, outreachMessage: data.message } : l))
      );
      
      setActiveOutreachLead((prev: any) => prev ? { ...prev, videoUrl: data.videoUrl, websiteUrl: data.websiteUrl, outreachMessage: data.message } : null);
      
      setOutreachStep("done");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Outreach generation failed. Please try again.");
      setOutreachStep("error");
    }
  };

  const handleGenerateAllOutreach = async () => {
    const leadsToGenerate = leads.filter(l => l.siteStatus !== "preview");
    if (leadsToGenerate.length === 0) {
      alert("All leads in the pipeline already have generated websites!");
      return;
    }

    if (!confirm(`Are you sure you want to generate websites and videos for all ${leadsToGenerate.length} remaining leads? This will process sequentially.`)) {
      return;
    }

    setIsBatchGenerating(true);
    setShowBatchGenModal(true);
    abortBatchGenRef.current = false;
    setBatchTotalCount(leadsToGenerate.length);
    setBatchCurrentIndex(0);
    setBatchLogs([]);

    for (let i = 0; i < leadsToGenerate.length; i++) {
      if (abortBatchGenRef.current) {
        setBatchLogs(prev => [...prev, "🛑 Batch generation cancelled by user."]);
        break;
      }

      const lead = leadsToGenerate[i];
      setBatchCurrentIndex(i + 1);
      setBatchCurrentLeadName(lead.name);
      const logMsg = `[${i + 1}/${leadsToGenerate.length}] Processing "${lead.name}"...`;
      setBatchLogs(prev => [...prev, logMsg]);

      try {
        const response = await fetch("/api/leads/generate-outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            name: lead.name,
            category: lead.category,
            rating: lead.rating,
            reviewsCount: lead.reviewsCount || lead.reviews || 0,
            phone: lead.phone || "",
            location: lead.location || lead.address || "",
            mapsUrl: lead.mapsUrl || "",
            photos: lead.photos || [],
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        
        // Update local lead status
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { 
            ...l, 
            siteStatus: "preview", 
            videoUrl: data.videoUrl, 
            websiteUrl: data.websiteUrl, 
            outreachMessage: data.message 
          } : l))
        );

        setBatchLogs(prev => [...prev, `  ✓ Successfully generated outreach for "${lead.name}"!`]);
      } catch (err: any) {
        console.error(err);
        const errMsg = err.message || "Unknown error";
        setBatchLogs(prev => [...prev, `  ✗ Failed for "${lead.name}": ${errMsg}`]);
        
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate-limit")) {
          setBatchLogs(prev => [...prev, `  ⚠️ Rate limit encountered. Sleeping for 15s...`]);
          let rateAborted = false;
          for (let sec = 0; sec < 15; sec++) {
            if (abortBatchGenRef.current) {
              rateAborted = true;
              break;
            }
            await new Promise(r => setTimeout(r, 1000));
          }
          if (rateAborted) {
            setBatchLogs(prev => [...prev, "🛑 Batch generation cancelled by user."]);
            break;
          }
        }
      }

      if (abortBatchGenRef.current) {
        setBatchLogs(prev => [...prev, "🛑 Batch generation cancelled by user."]);
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    setBatchLogs(prev => [...prev, "🎉 Batch processing completed!"]);
    setIsBatchGenerating(false);
  };

  const handleSendSingleWhatsApp = async () => {
    if (!activeOutreachLead) return;
    setIsSendingSingleWhatsApp(true);
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: activeOutreachLead.phone,
          message: outreachMessage,
          videoUrl: activeOutreachLead.videoUrl,
          apiKey: apiKey.trim() || undefined,
          name: activeOutreachLead.name
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      alert("✓ Message sent successfully via CRM API!");
      setLeads(prev => prev.map(l => l.id === activeOutreachLead.id ? { ...l, whatsappStatus: 'sent' } : l));
    } catch (err: any) {
      alert(`✗ Failed to send message: ${err.message || String(err)}`);
    } finally {
      setIsSendingSingleWhatsApp(false);
    }
  };

  const handleBulkSendWhatsApp = async () => {
    const eligibleLeads = leads.filter(l => {
      const cleanPhone = l.phone ? l.phone.replace(/[^0-9]/g, "") : "";
      return cleanPhone !== "" && l.outreachMessage && l.outreachMessage.trim() !== "";
    });

    if (eligibleLeads.length === 0) {
      alert("No leads found with a phone number and a generated outreach message. Please make sure phone numbers are set and outreach campaigns are generated first.");
      return;
    }

    if (!confirm(`Are you sure you want to send WhatsApp messages to all ${eligibleLeads.length} eligible leads?`)) {
      return;
    }

    setIsBatchSendingWhatsApp(true);
    setShowSendModal(true);
    abortBatchSendRef.current = false;
    setSendTotalCount(eligibleLeads.length);
    setSendCurrentIndex(0);
    setSendLogs([]);

    for (let i = 0; i < eligibleLeads.length; i++) {
      if (abortBatchSendRef.current) {
        setSendLogs(prev => [...prev, "🛑 WhatsApp bulk sending cancelled by user."]);
        break;
      }

      const lead = eligibleLeads[i];
      setSendCurrentIndex(i + 1);
      setSendCurrentLeadName(lead.name);
      const logMsg = `[${i + 1}/${eligibleLeads.length}] Sending to "${lead.name}" (${lead.phone})...`;
      setSendLogs(prev => [...prev, logMsg]);

      try {
        const response = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: lead.phone,
            message: lead.outreachMessage,
            videoUrl: lead.videoUrl,
            apiKey: apiKey.trim() || undefined,
            name: lead.name
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setSendLogs(prev => [...prev, `  ✓ Successfully sent WhatsApp message to "${lead.name}"!`]);
          setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, whatsappStatus: 'sent' } : l));
        } else if (data.skipped) {
          setSendLogs(prev => [...prev, `  ⚠️ Skipped: ${data.reason || "Duplicate check"}`]);
          setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, whatsappStatus: 'skipped' } : l));
        } else {
          throw new Error(data.reason || "Failed to send");
        }
      } catch (err: any) {
        console.error(err);
        const errMsg = err.message || "Unknown error";
        setSendLogs(prev => [...prev, `  ✗ Failed for "${lead.name}": ${errMsg}`]);
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, whatsappStatus: 'failed' } : l));
      }

      if (abortBatchSendRef.current) {
        setSendLogs(prev => [...prev, "🛑 WhatsApp bulk sending cancelled by user."]);
        break;
      }

      if (i < eligibleLeads.length - 1) {
        await new Promise(r => setTimeout(r, 500)); // 500ms short delay
      }
    }

    setSendLogs(prev => [...prev, "🎉 WhatsApp bulk sending completed!"]);
    setIsBatchSendingWhatsApp(false);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(outreachMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Hidden file input for Excel/CSV/JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".csv, .xlsx, .xls, .json"
        className="hidden"
      />

      <div className="px-10 py-6 border-b border-gray-100 bg-white flex flex-col gap-4 shrink-0 shadow-sm">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-full border border-gray-100 hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Lead Pipeline</h1>
              <p className="text-xs text-blue-600 font-medium">
                {leads.length} businesses active in "{searchLocation}"
              </p>
            </div>

            {/* View Tabs */}
            {leads.length > 0 && (
              <div className="flex bg-gray-100 p-1 rounded-xl ml-4 shrink-0">
                <button
                  onClick={() => setActiveTab("pipeline")}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "pipeline" 
                      ? "bg-white text-[#111] shadow-sm" 
                      : "text-gray-500 hover:text-[#111]"
                  }`}
                >
                  LEADS TABLE
                </button>
                <button
                  onClick={() => setActiveTab("videos")}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "videos" 
                      ? "bg-white text-[#111] shadow-sm" 
                      : "text-gray-500 hover:text-[#111]"
                  }`}
                >
                  ALL LEADS VIDEOS
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {leads.length === 0 && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border border-blue-200/50 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Upload size={14} />
                IMPORT SCRAPED FILE
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 text-xs font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                showSettings 
                  ? "bg-blue-55 text-blue-600 border-blue-200" 
                  : "bg-white text-gray-650 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Settings size={14} className={showSettings ? "rotate-45 transition-transform" : ""} />
              CRM SETTINGS
            </button>
          </div>
        </div>

        {/* Collapsible Settings Panel */}
        {showSettings && (
          <div className="p-5 bg-gray-50/70 border border-gray-200/50 rounded-2xl flex flex-col gap-4 animate-in slide-in-from-top-2 duration-150">
            {/* Top row: API Key settings */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-705 whitespace-nowrap w-32">
                <Lock size={14} className="text-blue-500" />
                CRM API KEY:
              </div>
              <div className="flex-1 w-full flex items-center gap-2">
                <input 
                  type="password"
                  placeholder="Enter custom CRM API Key (wacrm_live_...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full max-w-xl px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
                {apiKey && (
                  <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap flex items-center gap-1">
                    ✓ Configured
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400">
                Saves locally in browser
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200/60 w-full"></div>

            {/* Bottom row: Outreach template settings */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={useTemplate} 
                    onChange={(e) => setUseTemplate(e.target.checked)} 
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>USE DYNAMIC OUTREACH TEMPLATE</span>
                </label>
                
                {leads.length > 0 && (
                  <button
                    onClick={handleApplyTemplateToAll}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-750 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Overwrite outreach messages for all leads in the list with this template"
                  >
                    Apply Template to All Leads
                  </button>
                )}
              </div>

              {useTemplate && (
                <div className="flex flex-col gap-2 mt-1 animate-in fade-in duration-150">
                  <textarea 
                    placeholder="Enter template message text... Use {name} for business name placeholder." 
                    value={templateText} 
                    onChange={(e) => setTemplateText(e.target.value)}
                    className="w-full min-h-[90px] p-3 border border-gray-200 rounded-xl text-xs bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-gray-700 font-medium resize-y"
                  />
                  <div className="text-[10px] text-gray-400 flex items-center gap-2">
                    <span>💡 <strong>Tip:</strong> Use <code>{"{name}"}</code> or <code>{"(business name)"}</code> or <code>{"{{1}}"}</code> for the lead's name placeholder.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3 lines of buttons when leads are present */}
        {leads.length > 0 && (
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
            {/* Row 1: Data operations */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-405 uppercase tracking-wider w-24 shrink-0">1. Data:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border border-blue-200/50 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Upload size={14} />
                  IMPORT SCRAPED FILE
                </button>
                <button 
                  onClick={handleExportXlsx}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-770 bg-white hover:bg-gray-50 border border-gray-205 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Export Excel (.xlsx)"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  EXCEL
                </button>
                <button 
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-770 bg-white hover:bg-gray-50 border border-gray-205 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Export CSV (.csv)"
                >
                  <Download size={14} className="text-blue-600" />
                  CSV
                </button>
              </div>
            </div>

            {/* Row 2: Outreach / Automation */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-405 uppercase tracking-wider w-24 shrink-0">2. Campaign:</span>
              <div className="flex flex-wrap items-center gap-2">
                {leads.some(l => l.siteStatus !== "preview") && (
                  <button 
                    onClick={handleGenerateAllOutreach}
                    disabled={isBatchGenerating}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles size={14} className="animate-pulse" />
                    GENERATE ALL WEBSITES
                  </button>
                )}
                <button 
                  onClick={handleBulkSendWhatsApp}
                  disabled={isBatchSendingWhatsApp}
                  className="flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Send size={14} />
                  {isBatchSendingWhatsApp ? "SENDING..." : "SEND WHATSAPP"}
                </button>
                {leads.some(l => l.videoUrl && l.videoUrl.trim() !== "") && (
                  <button 
                    onClick={handleDownloadAllVideos}
                    className="flex items-center gap-1.5 text-xs font-bold text-purple-750 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Download all generated outreach videos in one click"
                  >
                    <Video size={14} className="text-purple-600" />
                    DOWNLOAD ALL VIDEOS
                  </button>
                )}
              </div>
            </div>

            {/* Row 3: CRM System / Clean */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-405 uppercase tracking-wider w-24 shrink-0">3. System:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={handleSaveToCRM}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/10"
                >
                  <Save size={14} />
                  {isSaving ? "SAVING..." : "SAVE TO CRM"}
                </button>
                <button 
                  onClick={handleArchiveCompleted}
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Archive all leads that have generated websites"
                >
                  <CheckCircle size={14} />
                  ARCHIVE COMPLETED
                </button>
                <button 
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-655 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Clear all leads"
                >
                  <Trash2 size={14} />
                  CLEAR ALL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-gray-50/40">
        {leads.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 border border-blue-100 shadow-md">
              <Database size={36} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">No Leads Loaded</h2>
            <p className="text-sm text-gray-500 max-w-sm mb-8">
              Scrape businesses using the maps tool, or import an Excel/CSV file exported from the Googlemap_scraper extension.
            </p>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 text-sm font-semibold rounded-2xl shadow-lg shadow-blue-600/15 transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Upload size={16} />
                Import Scraped Leads
              </button>
              <button 
                onClick={() => navigate("/system")}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-8 py-3.5 text-sm font-semibold rounded-2xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Search size={16} />
                Search Maps Live
              </button>
            </div>
          </div>
        ) : activeTab === "videos" ? (
          <div className="p-10 flex flex-col gap-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Outreach Campaign Videos</h2>
                <p className="text-xs text-gray-500 mt-1">
                  View and manage all generated videos for your leads
                </p>
              </div>
              <button
                onClick={handleSaveToCRM}
                disabled={isSaving}
                className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/10"
              >
                <Save size={14} />
                EXPORT ALL VIDEOS TO CRM
              </button>
            </div>

            {leads.filter(l => l.videoUrl && l.videoUrl.trim() !== "").length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-150 p-12 text-center flex flex-col items-center justify-center shadow-sm">
                <Video size={36} className="text-gray-400 mb-4" />
                <h3 className="font-bold text-gray-900 text-sm">No Videos Generated Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1 mb-6">
                  Please generate outreach campaigns in the Leads Table view first to produce recording videos.
                </p>
                <button
                  onClick={() => setActiveTab("pipeline")}
                  className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Go to Leads Table
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leads.filter(l => l.videoUrl && l.videoUrl.trim() !== "").map((lead) => (
                  <div key={lead.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                    {/* Video Player */}
                    <div className="relative aspect-video bg-black flex items-center justify-center">
                      <video 
                        src={lead.videoUrl} 
                        controls 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Lead Info */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{lead.name}</h3>
                        <p className="text-xs text-gray-505 mt-1">{lead.category || "No Category"}</p>
                        {lead.phone && (
                          <p className="text-xs text-gray-400 mt-2 font-mono">{lead.phone}</p>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Outreach Video
                        </span>
                        
                        <button
                          onClick={() => {
                            setActiveOutreachLead(lead);
                            setOutreachMessage(lead.outreachMessage || "");
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          Send WhatsApp <Send size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white sticky top-0 border-b border-gray-100 z-10 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
              <tr>
                <th className="px-10 py-4 font-bold">BUSINESS</th>
                <th className="px-6 py-4 font-bold">CATEGORY</th>
                <th className="px-6 py-4 font-bold">RATING</th>
                <th className="px-6 py-4 font-bold">PHONE</th>
                <th className="px-6 py-4 font-bold">WEBSITE</th>
                <th className="px-6 py-4 font-bold">SCORE</th>
                <th className="px-10 py-4 font-bold text-right">OUTREACH STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-10 py-5 font-bold flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200/50">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                      </div>
                      <span className="text-gray-900 group-hover:text-blue-600 transition-colors">{lead.name}</span>
                    </div>
                    {lead.mapsUrl && (
                      <div className="text-[10px] text-blue-500 ml-11 font-normal break-all">
                        <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          <MapPin size={10} /> View on Google Maps
                        </a>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-5 text-gray-600 font-medium">{lead.category || "—"}</td>
                  
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1 font-bold text-gray-800">
                      {lead.rating ? lead.rating : "—"}
                      <span className="text-[11px] text-gray-400 font-normal">
                        ({lead.reviewsCount ? `${lead.reviewsCount} reviews` : "No reviews"})
                      </span>
                    </div>
                  </td>

                  {/* Phone column (Inline-editable) */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={lead.phone || ""}
                        placeholder="Add phone..."
                        onChange={(e) => handleFieldChange(lead.id, 'phone', e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs w-36 bg-gray-50/20 hover:bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-800"
                      />
                    </div>
                  </td>
                  
                  {/* Website column (Inline-editable, soft colors dynamic validation) */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={lead.website || ""}
                        placeholder="Add website..."
                        onChange={(e) => handleFieldChange(lead.id, 'website', e.target.value)}
                        className={`px-2 py-1.5 border rounded-lg text-xs w-48 outline-none transition-all font-medium ${
                          lead.website && lead.website.trim() !== ""
                            ? 'bg-emerald-50/30 text-emerald-800 border-emerald-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                            : 'bg-red-50/30 text-red-800 border-red-200 focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        }`}
                      />
                      {lead.website && lead.website.trim() !== "" && (
                        <a 
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 transition-colors shrink-0 shadow-sm"
                          title="Open Website"
                        >
                          <Link2 size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/30">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            lead.score >= 80 
                              ? 'bg-emerald-500' 
                              : lead.score >= 65 
                                ? 'bg-amber-500' 
                                : 'bg-blue-500'
                          }`} 
                          style={{ width: `${lead.score}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-gray-700">{lead.score}</span>
                    </div>
                  </td>
                  
                  <td className="px-10 py-5 text-right flex justify-end gap-2.5 items-center">
                    {lead.whatsappStatus && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                        lead.whatsappStatus === 'sent' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : lead.whatsappStatus === 'skipped'
                            ? 'bg-amber-100 text-amber-850 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        WA: {lead.whatsappStatus.toUpperCase()}
                      </span>
                    )}
                    <button className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100" title="View details">
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleArchiveLead(lead.id)}
                      className="text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors p-1.5 rounded-lg cursor-pointer" 
                      title="Mark as Done & Archive"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button 
                      id={`btn-remove-lead-${lead.id}`}
                      onClick={() => handleRemoveLead(lead.id)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors p-1.5 rounded-lg cursor-pointer" 
                      title="Remove lead"
                    >
                      <Trash2 size={16} />
                    </button>
                    {lead.siteStatus === "preview" ? (
                      <button 
                        onClick={() => {
                          setActiveOutreachLead(lead);
                          setGeneratedVideoUrl(lead.videoUrl || "");
                          setOutreachMessage(lead.outreachMessage || "");
                          setOutreachStep("done");
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Sparkles size={12} /> 
                        CAMPAIGN
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStartOutreachGeneration(lead)}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Sparkles size={12} /> 
                        GENERATE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {activeOutreachLead && outreachStep !== "idle" && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[4px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-2xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Outreach Campaign Factory</h3>
                    <p className="text-xs text-gray-500 font-medium">Outreach for: <span className="text-blue-600 font-bold">{activeOutreachLead.name}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveOutreachLead(null);
                    setOutreachStep("idle");
                  }}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto pr-1">
                {outreachStep !== "done" && outreachStep !== "error" && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 mb-6 relative flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                      <Sparkles className="w-6 h-6 text-blue-600 animate-bounce" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      {outreachStep === "website" && "Generating Demo Website..."}
                      {outreachStep === "video" && "Recording Video Walkthrough..."}
                      {outreachStep === "pitch" && "Crafting Sales Outreach Pitch..."}
                    </h4>
                    <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                      {outreachStep === "website" && "Gemini AI is crafting a custom, responsive landing page using Tailwind CSS, featuring the business name and niche."}
                      {outreachStep === "video" && "Launching Playwright browser context, opening the demo landing page, and performing an auto-scroll walkthrough to record the video."}
                      {outreachStep === "pitch" && "Analyzing reviews to write a customized outreach message with special sales triggers (₹5,000 / 2 days live)."}
                    </p>
                  </div>
                )}

                {outreachStep === "error" && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-650 border border-red-100 mb-6 shadow-sm">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Generation Failed</h4>
                    <p className="text-sm text-red-655 max-w-md mb-8">{errorMessage}</p>
                    <button
                      onClick={() => handleStartOutreachGeneration(activeOutreachLead)}
                      disabled={retryCountdown > 0}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm text-xs"
                    >
                      {retryCountdown > 0 ? `TRY AGAIN IN ${retryCountdown}s` : "TRY AGAIN"}
                    </button>
                  </div>
                )}

                {outreachStep === "done" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                    {/* Left: Video Preview */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Walkthrough Video Preview</span>
                      <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-gray-100 shadow-md relative flex items-center justify-center">
                        <video 
                          src={generatedVideoUrl} 
                          controls 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a 
                          href={generatedVideoUrl} 
                          download={`outreach_${activeOutreachLead.id}.mp4`}
                          className="flex-1 text-[11px] font-bold text-gray-650 bg-gray-50 border border-gray-200/80 hover:bg-gray-100/80 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Download size={13} className="text-blue-500" /> DOWNLOAD VIDEO
                        </a>
                        {activeOutreachLead.websiteUrl && (
                          <a 
                            href={activeOutreachLead.websiteUrl} 
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-[11px] font-bold text-blue-600 bg-blue-50/50 border border-blue-150 hover:bg-blue-100/80 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye size={13} className="text-blue-600" /> PREVIEW WEBSITE
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right: Message & Dispatch */}
                    <div className="flex flex-col h-full">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Outreach Message</span>
                      <textarea
                        value={outreachMessage}
                        onChange={(e) => setOutreachMessage(e.target.value)}
                        className="flex-1 min-h-[150px] p-3 text-xs font-semibold leading-relaxed border border-gray-200 rounded-2xl bg-gray-50/30 hover:bg-gray-50/55 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-800 font-medium shrink-0 resize-none shadow-inner"
                      />
                      
                      {/* CRM API Dispatcher */}
                      <div className="flex flex-col gap-3 mt-4 bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          CRM WhatsApp Dispatcher
                        </span>
                        
                        <div className="flex flex-col gap-2 mt-1">
                          <button
                            type="button"
                            onClick={handleSendSingleWhatsApp}
                            disabled={isSendingSingleWhatsApp}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/10 text-xs uppercase tracking-wider w-full"
                          >
                            <Send size={14} className={isSendingSingleWhatsApp ? "animate-spin" : ""} />
                            {isSendingSingleWhatsApp ? "SENDING..." : "Send via WhatsApp API"}
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/10 text-xs uppercase tracking-wider w-full"
                          >
                            {copied ? "✓ Pitch Copied!" : "Copy Pitch Message"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBatchGenModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[5px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-lg w-full border border-gray-100 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-6 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Sparkles className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Batch Outreach Generation</h3>
                  <p className="text-xs text-gray-500 font-medium">Processing all leads sequentially</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 shrink-0">
                <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-2">
                  <span>Progress: {batchCurrentIndex} of {batchTotalCount}</span>
                  <span className="text-blue-600">{Math.round((batchCurrentIndex / (batchTotalCount || 1)) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200/30">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${(batchCurrentIndex / (batchTotalCount || 1)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs font-semibold text-gray-600 mt-3">
                  Current: <span className="text-blue-600 font-bold">{batchCurrentLeadName}</span>
                </p>
              </div>

              {/* Console Logs */}
              <div className="flex-1 min-h-[150px] bg-gray-900 text-gray-200 p-4 rounded-2xl font-mono text-[10px] overflow-y-auto shadow-inner leading-relaxed">
                {batchLogs.map((log, idx) => (
                  <div key={idx} className={log.includes("✗") ? "text-red-400" : log.includes("✓") ? "text-emerald-400" : "text-gray-300"}>
                    {log}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3 shrink-0">
                {isBatchGenerating ? (
                  <button
                    id="btn-cancel-batch-gen"
                    onClick={() => {
                      abortBatchGenRef.current = true;
                      setBatchLogs(prev => [...prev, "⏳ Requesting cancellation..."]);
                    }}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    Cancel Generation
                  </button>
                ) : (
                  <button
                    id="btn-close-batch-gen"
                    onClick={() => setShowBatchGenModal(false)}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSendModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[5px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-lg w-full border border-gray-100 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-6 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.449 5.4 0 9.794-4.391 9.797-9.793.001-2.618-1.01-5.08-2.848-6.92C16.38 2.05 13.91 1.039 12.01 1.04 6.548 1.04 2.161 5.429 2.158 10.893c-.002 1.52.41 3.004 1.196 4.329l-.99 3.613 3.693-.977zm11.722-6.84c-.302-.15-1.786-.882-2.07-.985-.285-.104-.492-.154-.7.155-.207.308-.8.985-.98 1.19-.18.207-.363.233-.665.082-2.096-1.048-3.26-1.8-4.57-4.068-.145-.25-.037-.432.079-.58.105-.133.303-.363.394-.483.09-.12.15-.224.225-.379.075-.155.038-.293-.019-.397-.057-.104-.492-1.19-.675-1.63-.178-.432-.375-.373-.518-.373-.135-.002-.29-.002-.445-.002-.156 0-.41.058-.624.285-.213.227-.816.797-.816 1.944 0 1.147.833 2.254.95 2.409.116.156 1.637 2.5 3.966 3.51.554.24 1.002.38 1.344.49.557.177 1.064.152 1.465.092.447-.067 1.48-.605 1.688-1.19.208-.585.208-1.086.146-1.19-.063-.105-.244-.156-.546-.307z"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Bulk WhatsApp Campaign</h3>
                  <p className="text-xs text-gray-500 font-medium">Sending custom outreach to active leads</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 shrink-0">
                <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-2">
                  <span>Progress: {sendCurrentIndex} of {sendTotalCount}</span>
                  <span className="text-emerald-600">{Math.round((sendCurrentIndex / (sendTotalCount || 1)) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200/30">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${(sendCurrentIndex / (sendTotalCount || 1)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs font-semibold text-gray-600 mt-3">
                  Sending to: <span className="text-emerald-600 font-bold">{sendCurrentLeadName}</span>
                </p>
              </div>

              {/* Console Logs */}
              <div className="flex-1 min-h-[150px] bg-gray-900 text-gray-200 p-4 rounded-2xl font-mono text-[10px] overflow-y-auto shadow-inner leading-relaxed">
                {sendLogs.map((log, idx) => (
                  <div key={idx} className={log.includes("✗") ? "text-red-400" : log.includes("✓") ? "text-emerald-400" : log.includes("⚠️") ? "text-amber-450" : "text-gray-300"}>
                    {log}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3 shrink-0">
                {isBatchSendingWhatsApp ? (
                  <button
                    id="btn-cancel-whatsapp-send"
                    onClick={() => {
                      abortBatchSendRef.current = true;
                      setSendLogs(prev => [...prev, "⏳ Requesting cancellation..."]);
                    }}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    Cancel Sending
                  </button>
                ) : (
                  <button
                    id="btn-close-whatsapp-send"
                    onClick={() => setShowSendModal(false)}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
