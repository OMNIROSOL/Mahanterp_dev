import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Escapes CSV field
 */
function escapeCsvField(field: any): string {
    if (field === null || field === undefined) {
        return '""';
    }
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Generates and downloads a CSV file
 * @param filename Name of the file to download (without .csv extension)
 * @param headers Array of header strings
 * @param rows Array of arrays representing rows of data
 */
export function exportToCSV(filename: string, headers: string[], rows: any[][]) {
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.map(escapeCsvField).join(','));
    
    // Add rows
    for (const row of rows) {
        csvRows.push(row.map(escapeCsvField).join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // @ts-ignore
    if (navigator.msSaveBlob) { // IE 10+
        // @ts-ignore
        navigator.msSaveBlob(blob, `${filename}.csv`);
    } else {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Generates and downloads a PDF table
 * @param title Title of the report
 * @param filename Name of the file to download (without .pdf extension)
 * @param headers Array of header strings
 * @param rows Array of arrays representing rows of data
 */
export function exportToPDF(title: string, filename: string, headers: any[] | any[][], rows: any[][], options?: any) {
    // Determine orientation based on column count (A4 is ~210x297mm)
    const isMultiLevel = headers.length > 0 && Array.isArray(headers[0]);
    const columnCount = isMultiLevel ? headers[0].length : headers.length;
    const orientation = columnCount > 6 ? 'landscape' : 'portrait';
    const doc = new jsPDF(orientation);
    
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    
    autoTable(doc, {
        startY: 35,
        head: isMultiLevel ? headers : [headers],
        body: rows,
        theme: 'striped',
        headStyles: {
            fillColor: [79, 70, 229], // Indigo 600
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate 50
        },
        ...options
    });
    
    doc.save(`${filename}.pdf`);
}
