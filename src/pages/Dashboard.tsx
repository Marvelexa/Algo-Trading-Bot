import { useState, useEffect } from "react";
import { Filter, Play, CheckCircle, Clock, XCircle, Globe, Video, MessageSquare, Plus, RefreshCw, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLeadsFromSheet, createCRMSpreadsheet } from "../lib/sheets";
import { googleSignIn, getAccessToken } from "../lib/firebase";

const STATUS_COLORS: Record<string, string> = {
  "New Lead": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Website Generated": "bg-primary/10 text-primary border-primary/20",
  "Video Generated": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Message Sent": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Replied": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Interested": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Call Booked": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "Won": "bg-green-500/10 text-green-500 border-green-500/20",
  "Lost": "bg-red-500/10 text-red-500 border-red-500/20",
};

export function Dashboard() {
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(localStorage.getItem('crm_sheet_id'));

  const handleCreateSheet = async () => {
    setLoading(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        await googleSignIn();
      }
      const id = await createCRMSpreadsheet("Freelance Goldmine CRM");
      setSheetId(id);
      localStorage.setItem('crm_sheet_id', id);
    } catch (err) {
      console.error("Failed to create sheet:", err);
      alert("Failed to create spreadsheet. Are you signed in with appropriate permissions?");
    }
    setLoading(false);
  };

  const loadLeads = async () => {
    if (!sheetId) return;
    setLoading(true);
    try {
      const data = await getLeadsFromSheet(sheetId);
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (sheetId) {
      loadLeads();
    }
  }, [sheetId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="p-8 border-b border-border bg-card/30 backdrop-blur-sm z-10 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">CRM Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage leads, automate outreach, and track conversions.</p>
        </div>
        <div className="flex items-center gap-3">
          {sheetId ? (
            <Badge variant="outline" className="px-3 py-1 text-sm bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Google Sheets Sync Active
            </Badge>
          ) : (
            <Button onClick={handleCreateSheet} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Create CRM Google Sheet
            </Button>
          )}
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
          <Button variant="secondary" onClick={loadLeads} disabled={!sheetId || loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>
      
      <div className="p-8 pb-0 shrink-0">
         <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Leads", value: leads.length || "0", trend: "+0%" },
              { label: "Websites Generated", value: leads.filter(l => l.status === "Website Generated").length || "0", trend: "+0%" },
              { label: "Videos Sent", value: leads.filter(l => l.status === "Video Generated").length || "0", trend: "+0%" },
              { label: "Interested", value: leads.filter(l => l.status === "Interested").length || "0", trend: "+0%" }
            ].map(stat => (
              <Card key={stat.label} className="bg-card/40 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                  <div className="flex items-end justify-between mt-2">
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm text-green-500 bg-green-500/10 px-2 py-0.5 rounded">{stat.trend}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
         </div>
      </div>

      <ScrollArea className="flex-1 p-8 pt-4">
        {!sheetId ? (
           <div className="text-center py-20 bg-card rounded-xl border border-border">
             <Globe className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
             <h3 className="text-xl font-semibold mb-2">Connect Google Sheets</h3>
             <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Click "Create CRM Google Sheet" above to provision a database for your leads in your Google account.</p>
           </div>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Business Name</TableHead>
                  <TableHead>Niche</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Phone / Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 && (
                  <TableRow>
                     <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No leads found. Go to Lead Discovery to add some.</TableCell>
                  </TableRow>
                )}
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="border-border hover:bg-sidebar-accent/50 group">
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.niche}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${STATUS_COLORS[lead.status] || "bg-secondary text-secondary-foreground"}`}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.website ? (
                        <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{lead.website}</a>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-normal">None</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm flex flex-col gap-1">
                       <span>{lead.phone}</span>
                       <span className="text-xs opacity-70">{lead.email}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"><Globe className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"><Video className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"><MessageSquare className="w-4 h-4" /></Button>
                        <Button variant="default" size="sm" className="h-8 ml-2">Automate</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </ScrollArea>
    </div>
  );
}
