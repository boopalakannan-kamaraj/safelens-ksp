import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CrimeIncident, NetworkEdge, NetworkNode, RiskPrediction } from '../types/crime'
import { riskLevel } from './helpers'

export function exportIncidentsCSV(incidents: CrimeIncident[], filename = 'safelens-incidents.csv') {
  const headers = [
    'ID', 'District', 'Category', 'Severity', 'Status', 'Date',
    'Location', 'Description', 'Officer', 'Lat', 'Lng',
  ]
  const rows = incidents.map((inc) => [
    inc.id,
    inc.districtName,
    inc.category,
    inc.severity,
    inc.status,
    inc.date,
    inc.location,
    `"${inc.description.replace(/"/g, '""')}"`,
    inc.officer,
    inc.lat,
    inc.lng,
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  downloadBlob(csv, filename, 'text/csv;charset=utf-8;')
}

export function exportRiskPDF(predictions: RiskPrediction[], filename = 'safelens-risk-report.pdf') {
  const doc = new jsPDF()
  const generated = new Date().toLocaleString('en-IN')

  doc.setFillColor(15, 31, 61)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text('SafeLens — District Risk Summary Report', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(180, 190, 210)
  doc.text(`Karnataka State Police · Generated ${generated}`, 14, 28)
  doc.text(`Districts analyzed: ${predictions.length}`, 14, 34)

  doc.setTextColor(30, 30, 30)

  const top5 = predictions.slice(0, 5)
  doc.setFontSize(12)
  doc.text('Executive Summary', 14, 50)
  doc.setFontSize(9)
  doc.text(
    `Highest risk district: ${top5[0]?.districtName ?? 'N/A'} (Score: ${top5[0]?.riskScore ?? '—'}). ` +
      `${predictions.filter((p) => riskLevel(p.riskScore).label === 'Critical' || riskLevel(p.riskScore).label === 'High').length} districts flagged High/Critical.`,
    14,
    58,
    { maxWidth: 180 },
  )

  autoTable(doc, {
    startY: 68,
    head: [['Rank', 'District', 'Score', 'Level', 'Trend', 'Threat', 'Confidence', 'Predicted (30d)']],
    body: predictions.map((p, i) => [
      i + 1,
      p.districtName,
      p.riskScore,
      riskLevel(p.riskScore).label,
      p.trend.charAt(0).toUpperCase() + p.trend.slice(1),
      p.primaryThreat,
      `${(p.confidence * 100).toFixed(0)}%`,
      p.predictedIncidents,
    ]),
    headStyles: { fillColor: [15, 31, 61], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    styles: { fontSize: 8, cellPadding: 2 },
  })

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120

  if (top5[0]) {
    doc.setFontSize(11)
    doc.text('Top District Risk Factors', 14, finalY + 12)
    doc.setFontSize(9)
    top5.forEach((p, i) => {
      const y = finalY + 20 + i * 14
      doc.text(`${i + 1}. ${p.districtName} (${p.riskScore}/100)`, 14, y)
      doc.text(`   ${p.factors[0] ?? ''}`, 14, y + 5, { maxWidth: 180 })
    })
  }

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Confidential — Karnataka State Police Intelligence Division', 14, 285)

  doc.save(filename)
}

export function exportNetworkProfilePDF(
  node: NetworkNode,
  incidents: CrimeIncident[],
  connected: { node: NetworkNode | undefined; edge: NetworkEdge }[],
  filename?: string,
) {
  const safeName = node.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const doc = new jsPDF()
  const generated = new Date().toLocaleString('en-IN')

  doc.setFillColor(26, 47, 86)
  doc.rect(0, 0, 210, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('SafeLens — Network Entity Profile', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(200, 223, 245)
  doc.text(`Generated ${generated}`, 14, 26)

  doc.setTextColor(30, 30, 30)
  doc.setFontSize(14)
  doc.text(node.label, 14, 48)
  doc.setFontSize(10)
  doc.text(`Type: ${node.type.charAt(0).toUpperCase() + node.type.slice(1)}`, 14, 56)

  if (node.riskScore != null) {
    doc.setFontSize(11)
    doc.text(`Risk Score: ${node.riskScore}/100`, 14, 66)
  }

  let y = node.riskScore != null ? 76 : 66

  if (node.mo) {
    doc.setFontSize(11)
    doc.text('Modus Operandi', 14, y)
    doc.setFontSize(9)
    const moLines = doc.splitTextToSize(node.mo, 180)
    doc.text(moLines, 14, y + 6)
    y += 6 + moLines.length * 5 + 8
  }

  if (incidents.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['ID', 'Category', 'District', 'Severity', 'Date', 'Status']],
      body: incidents.map((inc) => [
        inc.id,
        inc.category,
        inc.districtName,
        inc.severity,
        inc.date,
        inc.status,
      ]),
      headStyles: { fillColor: [26, 47, 86], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 2 },
    })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  }

  if (connected.length > 0) {
    doc.setFontSize(11)
    doc.text('Linked Entities', 14, y + 10)
    autoTable(doc, {
      startY: y + 14,
      head: [['Name', 'Type', 'Relationship']],
      body: connected.map(({ node: n, edge }) => [n?.label ?? '—', n?.type ?? '—', edge.label]),
      headStyles: { fillColor: [26, 47, 86], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 2 },
    })
  }

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Confidential — Karnataka State Police Intelligence Division', 14, 285)

  doc.save(filename ?? `safelens-profile-${safeName}.pdf`)
}

export function exportIncidentPDF(incident: CrimeIncident, filename?: string) {
  const doc = new jsPDF()
  const generated = new Date().toLocaleString('en-IN')
  const safeId = incident.id.replace(/[^a-z0-9]/gi, '-').toLowerCase()

  doc.setFillColor(26, 47, 86)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('SafeLens — Incident Report', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(200, 223, 245)
  doc.text(`Karnataka State Police · Generated ${generated}`, 14, 28)
  doc.text(`Incident ID: ${incident.id}`, 14, 34)

  doc.setTextColor(30, 30, 30)
  doc.setFontSize(14)
  doc.text(incident.category, 14, 52)
  doc.setFontSize(10)
  doc.text(incident.districtName, 14, 60)

  autoTable(doc, {
    startY: 68,
    head: [['Field', 'Value']],
    body: [
      ['Status', incident.status],
      ['Severity', incident.severity],
      ['Date', incident.date],
      ['Location', incident.location],
      ['Assigned Officer', incident.officer],
      ['Coordinates', `${incident.lat}, ${incident.lng}`],
      ...(incident.suspectId ? [['Suspect ID', incident.suspectId]] : []),
      ...(incident.victimId ? [['Victim ID', incident.victimId]] : []),
    ],
    headStyles: { fillColor: [26, 47, 86], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  })

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120

  doc.setFontSize(11)
  doc.text('Description', 14, finalY + 12)
  doc.setFontSize(9)
  const descLines = doc.splitTextToSize(incident.description, 180)
  doc.text(descLines, 14, finalY + 20)

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Confidential — Karnataka State Police Intelligence Division', 14, 285)

  doc.save(filename ?? `safelens-incident-${safeId}.pdf`)
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
