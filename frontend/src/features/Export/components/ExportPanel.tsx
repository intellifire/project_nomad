/**
 * ExportPanel Component
 *
 * Full model data export organized by category:
 * - Inputs (ignition, weather, terrain)
 * - Aggregated (probability, intensity, sizes)
 * - Final Outputs (arrival, intensity, raz, ros, source)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useExportGeneration } from '../hooks/useExportGeneration';
import type { DeliveryMethod } from '../types';

interface ExportFile {
  filename: string;
  category: 'inputs' | 'aggregated' | 'final';
  label: string;
  format: string;
  path: string;
}

interface ExportManifest {
  modelId: string;
  categories: {
    inputs: ExportFile[];
    aggregated: ExportFile[];
    final: ExportFile[];
  };
  totalFiles: number;
}

export interface ExportPanelProps {
  modelId: string;
  modelName: string;
  /** Legacy: displayed outputs (kept for backwards compat) */
  outputs: Array<{
    resultId: string;
    name: string;
    format: string;
    type: string;
  }>;
  preSelectedIds?: string[];
  onClose: () => void;
}

const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
  inputs: { label: 'Inputs', icon: 'fa-arrow-right-to-bracket', color: '#1565c0' },
  aggregated: { label: 'Aggregated Results', icon: 'fa-chart-simple', color: '#e65100' },
  final: { label: 'Final Day Outputs', icon: 'fa-bullseye', color: '#2e7d32' },
};

// Styles
const panelStyle: React.CSSProperties = {
  padding: '20px',
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  maxWidth: '500px',
  width: 'calc(100% - 32px)',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
  paddingBottom: '12px',
  borderBottom: '1px solid #eee',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#333',
  margin: 0,
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#666',
  padding: '0',
  lineHeight: 1,
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  marginBottom: '16px',
};

const categoryHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid #eee',
  marginBottom: '4px',
  marginTop: '12px',
};

const checkboxItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 8px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  fontSize: '16px',
  fontWeight: 'bold',
  backgroundColor: '#ff6b35',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  flexShrink: 0,
};

const disabledButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: '#ccc',
  cursor: 'not-allowed',
};

const deliveryToggleStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '12px',
  flexShrink: 0,
};

const toggleButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  backgroundColor: 'white',
  cursor: 'pointer',
  fontSize: '14px',
};

const toggleButtonActiveStyle: React.CSSProperties = {
  ...toggleButtonStyle,
  border: '2px solid #ff6b35',
  backgroundColor: 'rgba(255, 107, 53, 0.1)',
};

export function ExportPanel({
  modelId,
  modelName,
  onClose,
}: ExportPanelProps) {
  const [manifest, setManifest] = useState<ExportManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [delivery, setDelivery] = useState<DeliveryMethod>('download');
  const { state, shareUrl, error, generate, download, reset } = useExportGeneration();

  // Fetch manifest on mount
  useEffect(() => {
    fetch(`${window.location.origin}/api/v1/models/${modelId}/export-manifest`, { credentials: 'include' })
      .then(res => res.json())
      .then((data: ExportManifest) => {
        setManifest(data);
        // Select all by default
        const allFiles = new Set<string>();
        for (const cat of Object.values(data.categories)) {
          for (const file of cat) {
            allFiles.add(file.filename);
          }
        }
        setSelectedFiles(allFiles);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [modelId]);

  const toggleFile = useCallback((filename: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: 'inputs' | 'aggregated' | 'final') => {
    if (!manifest) return;
    const catFiles = manifest.categories[category].map(f => f.filename);
    setSelectedFiles(prev => {
      const next = new Set(prev);
      const allSelected = catFiles.every(f => next.has(f));
      if (allSelected) {
        catFiles.forEach(f => next.delete(f));
      } else {
        catFiles.forEach(f => next.add(f));
      }
      return next;
    });
  }, [manifest]);

  const handleExport = useCallback(async () => {
    // Pass selected filenames as items
    const items = Array.from(selectedFiles).map(filename => ({ resultId: filename }));
    const exportId = await generate({ modelId, modelName, items }, delivery);
    if (delivery === 'download' && exportId) {
      download(exportId);
    }
  }, [selectedFiles, modelId, modelName, delivery, generate, download]);

  const canExport = selectedFiles.size > 0 && state === 'idle';
  const isGenerating = state === 'generating';
  const isComplete = state === 'complete';
  const hasError = state === 'error';

  const renderCategory = (key: 'inputs' | 'aggregated' | 'final', files: ExportFile[]) => {
    if (files.length === 0) return null;
    const info = CATEGORY_INFO[key];
    const allSelected = files.every(f => selectedFiles.has(f.filename));
    const someSelected = files.some(f => selectedFiles.has(f.filename));

    return (
      <div key={key}>
        <div style={categoryHeaderStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: info.color }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={() => toggleCategory(key)}
            />
            <i className={`fa-solid ${info.icon}`} />
            {info.label} ({files.length})
          </label>
        </div>
        {files.map(file => (
          <label
            key={file.filename}
            style={{
              ...checkboxItemStyle,
              backgroundColor: selectedFiles.has(file.filename) ? '#fafafa' : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={selectedFiles.has(file.filename)}
              onChange={() => toggleFile(file.filename)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ flex: 1, color: '#333' }}>{file.label}</span>
            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{file.format}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Export Model Data</h2>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading available files...</div>
      )}

      {!loading && (state === 'idle' || state === 'generating') && manifest && (
        <>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', flexShrink: 0 }}>
            {selectedFiles.size} of {manifest.totalFiles} files selected
          </div>

          <div style={scrollAreaStyle}>
            {renderCategory('inputs', manifest.categories.inputs)}
            {renderCategory('aggregated', manifest.categories.aggregated)}
            {renderCategory('final', manifest.categories.final)}
          </div>

          <div style={deliveryToggleStyle}>
            <button
              style={delivery === 'download' ? toggleButtonActiveStyle : toggleButtonStyle}
              onClick={() => setDelivery('download')}
            >
              <i className="fa-solid fa-download" style={{ marginRight: '8px' }} />ZIP
            </button>
            <button
              style={delivery === 'share' ? toggleButtonActiveStyle : toggleButtonStyle}
              onClick={() => setDelivery('share')}
            >
              <i className="fa-solid fa-link" style={{ marginRight: '8px' }} />Link (24hr)
            </button>
          </div>

          <button
            style={canExport ? primaryButtonStyle : disabledButtonStyle}
            onClick={handleExport}
            disabled={!canExport || isGenerating}
          >
            {isGenerating ? 'Generating...' : `Export ${selectedFiles.size} Files`}
          </button>
        </>
      )}

      {isComplete && (
        <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}><i className="fa-solid fa-check" style={{ color: '#4caf50' }} /></div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>Export Ready!</div>
          {delivery === 'download' && (
            <p style={{ fontSize: '14px', color: '#666' }}>Your download should start automatically.</p>
          )}
          {delivery === 'share' && shareUrl && (
            <>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Share link (expires in 24 hours):</p>
              <div style={{ padding: '8px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', wordBreak: 'break-all', fontSize: '12px', fontFamily: 'monospace' }}>{shareUrl}</div>
              <button style={{ ...primaryButtonStyle, marginTop: '12px' }} onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy Link</button>
            </>
          )}
          <button
            style={{ ...primaryButtonStyle, marginTop: '12px', backgroundColor: 'transparent', color: '#ff6b35', border: '2px solid #ff6b35' }}
            onClick={reset}
          >
            Export More
          </button>
        </div>
      )}

      {hasError && (
        <>
          <div style={{ padding: '12px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#c62828', fontSize: '14px' }}>{error || 'Export failed'}</div>
          <button style={{ ...primaryButtonStyle, marginTop: '12px' }} onClick={reset}>Try Again</button>
        </>
      )}
    </div>
  );
}
