import { getAccessToken } from "./firebase";

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // The user will need to create a spreadsheet and replace this

// Helper to create or get the spreadsheet
export async function createCRMSpreadsheet(title: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token available. Please sign in.");

  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: {
        title: title
      },
      sheets: [
        { properties: { title: "Leads" } }
      ]
    })
  });
  
  if (!response.ok) {
     throw new Error("Failed to create spreadsheet");
  }

  const data = await response.json();
  
  // Set headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}/values/Leads!A1:K1?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      range: "Leads!A1:K1",
      majorDimension: "ROWS",
      values: [
        ["ID", "Business Name", "Niche", "Rating", "Address", "Website", "Phone", "Email", "Status", "Outreach Message", "Video URL"]
      ]
    })
  });

  return data.spreadsheetId;
}

export async function saveLeadToSheet(spreadsheetId: string, lead: any) {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token available.");

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:K:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [
        [
          lead.id || Date.now(),
          lead.name,
          lead.niche || "",
          lead.rating || "",
          lead.address || "",
          lead.website || "",
          lead.phone || "",
          lead.email || "",
          "New Lead",
          lead.outreachMessage || "",
          lead.videoUrl || ""
        ]
      ]
    })
  });

  if (!response.ok) throw new Error("Failed to save lead");
  return response.json();
}

export async function getLeadsFromSheet(spreadsheetId: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token available.");

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A2:K`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    }
  });

  if (!response.ok) throw new Error("Failed to fetch leads");
  const data = await response.json();
  
  return (data.values || []).map((row: any[]) => ({
    id: row[0],
    name: row[1],
    niche: row[2],
    rating: row[3],
    address: row[4],
    website: row[5],
    phone: row[6],
    email: row[7],
    status: row[8],
    outreachMessage: row[9] || "",
    videoUrl: row[10] || ""
  }));
}
