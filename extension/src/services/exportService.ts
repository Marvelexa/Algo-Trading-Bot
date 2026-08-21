import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Lead } from '../types/lead';

export class ExportService {
  /**
   * Transforms raw lead structures into flat, consumer-friendly rows for CSV/XLSX.
   */
  private prepareFlatData(leads: Lead[]) {
    return leads.map((lead) => ({
      ID: lead.id,
      Name: lead.name,
      Category: lead.category,
      Phone: lead.phone || 'NO have yet',
      Email: lead.email || 'NO have yet',
      Website: lead.website || 'NO have yet',
      Address: lead.address || 'NO have yet',
      Rating: lead.rating,
      Reviews: lead.reviews,
      'Google Maps URL': lead.mapsUrl,
      'Has Website': lead.hasWebsite ? 'YES' : 'NO',
      'Lead Score': lead.leadScore,
      'Opportunity Priority': lead.opportunityLevel,
      'Estimated Potential Outreach Value (INR)': lead.estimatedRevenue,
      'GMB Profile Claimed': lead.hasGmbClaimed ? 'YES' : 'NO',
      'SEO Load Speed': lead.seoAudit?.loadSpeedMs ? `${lead.seoAudit.loadSpeedMs}ms` : 'NO have yet',
      'SEO SSL Secure': lead.seoAudit?.sslActive ? 'YES' : 'NO',
      'SEO Mobile Friendly': lead.seoAudit?.mobileFriendly ? 'YES' : 'NO',
      'Created At': new Date(lead.createdAt).toLocaleDateString(),
    }));
  }

  /**
   * Helper to trigger a browser-level file download from a Blob.
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates a fully compliant CSV file and triggers a browser download.
   */
  public exportToCsv(leads: Lead[], queryType: string = 'leads'): void {
    const flatData = this.prepareFlatData(leads);
    const csvContent = Papa.unparse(flatData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `nexvora_${queryType.toLowerCase()}_${Date.now()}.csv`;
    this.downloadFile(blob, filename);
  }

  /**
   * Generates a genuine multi-column Microsoft Excel (.xlsx) workbook and triggers a browser download.
   */
  public exportToXlsx(leads: Lead[], queryType: string = 'leads'): void {
    const flatData = this.prepareFlatData(leads);
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nexvora Leads');
    
    // Auto-adjust column widths for premium visual experience
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
    
    const filename = `nexvora_${queryType.toLowerCase()}_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Generates a indented JSON file and triggers a browser download.
   */
  public exportToJson(leads: Lead[], queryType: string = 'leads'): void {
    const jsonContent = JSON.stringify(leads, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const filename = `nexvora_${queryType.toLowerCase()}_${Date.now()}.json`;
    this.downloadFile(blob, filename);
  }
}

export const exportService = new ExportService();
