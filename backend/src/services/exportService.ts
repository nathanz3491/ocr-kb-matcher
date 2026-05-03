/**
 * Export Service
 * Handles exporting knowledge graph and progress data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getKnowledgeGraph } from './knowledgeGraphStorage';
import { userProgressService } from './userProgressService';
import { getDashboardStats } from './analyticsService';

/**
 * Generate SVG visualization of knowledge graph
 */
function generateGraphSVG(graph: Awaited<ReturnType<typeof getKnowledgeGraph>>, knownNodes: string[]): string {
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 40;
  const HORIZONTAL_GAP = 100;
  const VERTICAL_GAP = 60;
  const HEADER_HEIGHT = 60;
  
  // Simple layer-based layout
  const nodeMap: Map<string, { id: string; name: string; layer: number; index: number }> = new Map();
  const layers: Map<number, string[]> = new Map();
  
  // Assign layers based on prerequisites (simplified)
  graph.nodes.forEach((node, idx) => {
    const layer = node.prerequisites && node.prerequisites.length > 0 ? 1 : 0;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(node.id);
    nodeMap.set(node.id, { id: node.id, name: node.name || node.id, layer, index: idx });
  });
  
  // Calculate positions
  const positions: Map<string, { x: number; y: number }> = new Map();
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
  
  sortedLayers.forEach(layer => {
    const nodesInLayer = layers.get(layer)!;
    const layerHeight = nodesInLayer.length * (NODE_HEIGHT + VERTICAL_GAP);
    const startY = HEADER_HEIGHT + layer * 120 + Math.max(0, (layerHeight - NODE_HEIGHT) / 2);
    
    nodesInLayer.forEach((nodeId, idx) => {
      const x = 50 + layer * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = startY + idx * (NODE_HEIGHT + VERTICAL_GAP);
      positions.set(nodeId, { x, y });
    });
  });
  
  const svgWidth = (sortedLayers.length + 1) * (NODE_WIDTH + HORIZONTAL_GAP) + 100;
  const maxLayerSize = Math.max(...Array.from(layers.values()).map(l => l.length));
  const svgHeight = HEADER_HEIGHT + maxLayerSize * (NODE_HEIGHT + VERTICAL_GAP) + 100;
  
  // Generate edges
  const edges = graph.edges.map(edge => {
    const sourcePos = positions.get(edge.source);
    const targetPos = positions.get(edge.target);
    if (!sourcePos || !targetPos) return '';
    
    return `<line 
      x1="${sourcePos.x + NODE_WIDTH}" y1="${sourcePos.y + NODE_HEIGHT / 2}"
      x2="${targetPos.x}" y2="${targetPos.y + NODE_HEIGHT / 2}"
      stroke="#94a3b8" stroke-width="2" stroke-dasharray="4"
    />`;
  }).join('\n');
  
  // Generate nodes
  const nodes = graph.nodes.map(node => {
    const pos = positions.get(node.id);
    if (!pos) return '';
    
    const isKnown = knownNodes.includes(node.id);
    const fillColor = isKnown ? '#10b981' : '#ef4444';
    const textColor = '#ffffff';
    
    return `<g>
      <rect x="${pos.x}" y="${pos.y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" 
        rx="8" ry="8" fill="${fillColor}" stroke="${fillColor}" stroke-width="2"/>
      <text x="${pos.x + NODE_WIDTH / 2}" y="${pos.y + NODE_HEIGHT / 2 + 4}" 
        text-anchor="middle" fill="${textColor}" font-size="11" font-family="Arial">
        ${node.id.length > 15 ? node.id.substring(0, 12) + '...' : node.id}
      </text>
    </g>`;
  }).join('\n');
  
  // Legend
  const legend = `
    <g transform="translate(20, ${svgHeight - 40})">
      <rect x="0" y="0" width="16" height="16" rx="4" fill="#10b981"/>
      <text x="22" y="13" font-size="11" fill="#333">Learned (${knownNodes.length})</text>
      <rect x="100" y="0" width="16" height="16" rx="4" fill="#ef4444"/>
      <text x="122" y="13" font-size="11" fill="#333">Not Learned (${graph.nodes.length - knownNodes.length})</text>
    </g>
  `;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="${svgWidth / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">Knowledge Graph</text>
  <text x="${svgWidth / 2}" y="48" text-anchor="middle" font-size="12" fill="#64748b">${graph.nodes.length} topics · ${knownNodes.length} learned</text>
  ${edges}
  ${nodes}
  ${legend}
</svg>`;
}

/**
 * Export knowledge graph as PNG
 * Returns an SVG encoded as base64 that browsers can display as PNG
 */
export async function exportGraphAsPNG(userId?: string): Promise<Buffer> {
  const graph = await getKnowledgeGraph();
  const progress = await userProgressService.loadProgress(userId ?? '');
  const knownNodes = progress.knownNodes;
  
  // Generate SVG
  const svg = generateGraphSVG(graph, knownNodes);
  
  // Return SVG as base64-encoded data URL (browsers can handle this)
  // For true PNG, we'd need sharp or canvas - this is a practical MVP solution
  const base64 = Buffer.from(svg).toString('base64');
  
  // For now, return a proper SVG that can be viewed directly or converted
  // The frontend can handle displaying this as an image
  return Buffer.from(svg, 'utf-8');
}

/**
 * Generate progress report as HTML for PDF conversion
 */
export async function generateProgressReport(userId?: string): Promise<string> {
  const [graph, progress, stats] = await Promise.all([
    getKnowledgeGraph(),
    userProgressService.loadProgress(userId ?? ''),
    getDashboardStats(userId ?? '')
  ]);

  const learnedNodes = progress.knownNodes;
  const totalNodes = graph.nodes.length;
  const percentage = totalNodes > 0 ? Math.round((learnedNodes.length / totalNodes) * 100) : 0;

  // Get domain breakdown
  const domainStats: Record<string, { total: number; learned: number }> = {};
  graph.nodes.forEach(node => {
    const domain = node.domain || 'Uncategorized';
    if (!domainStats[domain]) {
      domainStats[domain] = { total: 0, learned: 0 };
    }
    domainStats[domain].total++;
    if (learnedNodes.includes(node.id)) {
      domainStats[domain].learned++;
    }
  });

  const domainRows = Object.entries(domainStats)
    .map(([domain, data]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${domain}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${data.learned}/${data.total}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${Math.round((data.learned / data.total) * 100)}%</td>
      </tr>
    `)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Learning Progress Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #475569; margin-top: 30px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
    .stat-value { font-size: 32px; font-weight: bold; color: #2563eb; }
    .stat-label { font-size: 14px; color: #64748b; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #2563eb; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>📚 Learning Progress Report</h1>
  <p>Generated on ${new Date().toLocaleDateString()}</p>
  
  <div class="stats">
    <div class="stat-box">
      <div class="stat-value">${stats.totalNodes}</div>
      <div class="stat-label">Total Topics</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.learnedNodes}</div>
      <div class="stat-label">Learned</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.progressPercentage}%</div>
      <div class="stat-label">Progress</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.streakDays}</div>
      <div class="stat-label">Day Streak</div>
    </div>
  </div>

  <h2>Progress by Domain</h2>
  <table>
    <thead>
      <tr>
        <th>Domain</th>
        <th style="text-align: center;">Progress</th>
        <th style="text-align: center;">Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${domainRows}
    </tbody>
  </table>

  <h2>Learned Topics</h2>
  <ul>
    ${learnedNodes.map(nodeId => {
      const node = graph.nodes.find(n => n.id === nodeId);
      return node ? `<li>${node.id}: ${node.name} (${node.domain})</li>` : '';
    }).join('')}
  </ul>

  <div class="footer">
    <p>Generated by Knowledge Intelligence Platform</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Export progress report as PDF (placeholder)
 * In production, use puppeteer with PDF generation
 */
export async function exportProgressAsPDF(): Promise<Buffer> {
  const html = await generateProgressReport();
  
  // For MVP, convert HTML to buffer
  // In production, use puppeteer to convert HTML to PDF
  return Buffer.from(html, 'utf-8');
}

/**
 * Export knowledge graph as AI-friendly text format
 * Can be used in other AI conversations
 */
export async function exportKnowledgeGraphAsText(userId?: string): Promise<string> {
  const graph = await getKnowledgeGraph();
  const knownNodes = await userProgressService.getKnownNodeIds(userId ?? '');
  const knownSet = new Set(knownNodes);
  
  let output = `# Knowledge Graph - AI-Friendly Export
# Generated: ${new Date().toISOString()}
# Total Topics: ${graph.nodes.length}
# Connections: ${graph.edges.length}
# Topics Learned: ${knownNodes.length}

`;
  
  // Overview section
  output += `## Overview
- Total Nodes: ${graph.nodes.length}
- Total Edges: ${graph.edges.length}
- Topics Learned: ${knownNodes.length}
- Topics Remaining: ${graph.nodes.length - knownNodes.length}

`;
  
  // Nodes list with hierarchy
  output += `## Topics (Nodes)

`;
  graph.nodes.forEach(node => {
    const status = knownSet.has(node.id) ? '[LEARNED]' : '[NOT LEARNED]';
    const prerequisites = node.prerequisites?.length ? ` Prerequisites: ${node.prerequisites.join(', ')}` : '';
    const domain = node.domain ? ` Domain: ${node.domain}` : '';
    output += `### ${node.name || node.id} ${status}
- ID: ${node.id}${prerequisites}${domain}
`;
    output += `\n`;
  });
  
  output += `
## Connections (Edges)

`;
  graph.edges.forEach(edge => {
    output += `- ${edge.source} → ${edge.target}`;
    if (edge.label) {
      output += ` (${edge.label})`;
    }
    output += `\n`;
  });
  
  // Learning status
  output += `
## Learning Status

`;
  knownNodes.forEach(nodeId => {
    output += `- ${nodeId}: COMPLETED\n`;
  });
  
  // Add unknown nodes
  const unknownNodes = graph.nodes.filter(n => !knownSet.has(n.id)).map(n => n.id);
  unknownNodes.forEach(nodeId => {
    output += `- ${nodeId}: NOT STARTED\n`;
  });
  
  return output;
}
