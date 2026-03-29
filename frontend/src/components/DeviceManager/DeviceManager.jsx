import { useState, useEffect } from 'react';
import api from '../../api/axios';

// ── Constants ─────────────────────────────────────────
const NODE_TYPES   = ['server','workstation','router','database','iot'];
const OS_OPTIONS   = ['Ubuntu 22.04','Ubuntu 20.04','CentOS 8','CentOS 7',
                      'Debian 12','Windows 11','Windows 10','macOS 14',
                      'macOS 13','Cisco IOS','RTOS 2.1','Embedded','Unknown'];
const TYPE_COLORS  = {
  server:'#00d4ff', workstation:'#52b788',
  router:'#f4a261', database:'#aa44ff', iot:'#ffcc00',
};
const STATUS_COLOR = {
  secure:'#52b788', warning:'#f4a261', compromised:'#ff2244',
};

const EMPTY_FORM = {
  name:'', type:'server', ip:'', os:'Ubuntu 22.04',
  hasFirewall: false, status:'secure',
};

// ── IP Validator ──────────────────────────────────────
function isValidIP(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = parseInt(p);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

// ── Duplicate IP check ────────────────────────────────
function isDuplicateIP(ip, nodes, excludeId = null) {
  return nodes.some(n => n.ip === ip && n._id !== excludeId);
}

// ── Duplicate Name check ──────────────────────────────
function isDuplicateName(name, nodes, excludeId = null) {
  return nodes.some(
    n => n.name.toLowerCase() === name.toLowerCase() && n._id !== excludeId
  );
}

// ── Validate form ─────────────────────────────────────
function validateForm(form, nodes, excludeId = null) {
  const errors = {};

  if (!form.name.trim())
    errors.name = 'Name is required';
  else if (form.name.trim().length < 3)
    errors.name = 'Name must be at least 3 characters';
  else if (isDuplicateName(form.name.trim(), nodes, excludeId))
    errors.name = 'Device name already exists';

  if (!form.ip.trim())
    errors.ip = 'IP address is required';
  else if (!isValidIP(form.ip.trim()))
    errors.ip = 'Invalid IP format (e.g. 192.168.1.10)';
  else if (isDuplicateIP(form.ip.trim(), nodes, excludeId))
    errors.ip = 'IP address already in use';

  return errors;
}

// ── Device Form ───────────────────────────────────────
function DeviceForm({ initial = EMPTY_FORM, nodes, onSubmit, onCancel,
  submitLabel = 'ADD DEVICE', excludeId = null }) {
  const [form,   setForm  ] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading,setLoading] = useState(false);

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    // Clear error on change
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateForm(form, nodes, excludeId);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ ...form, name: form.name.trim(), ip: form.ip.trim() });
    } catch (err) {
      setErrors({ general: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {errors.general && (
        <div style={errBannerStyle}>{errors.general}</div>
      )}

      {/* Name */}
      <div>
        <label style={labelStyle}>DEVICE NAME *</label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. WEB-SERVER-02"
          style={{ ...inputStyle, borderColor: errors.name ? '#ff2244' : '#0d2444' }}
          maxLength={40}
        />
        {errors.name && <div style={errStyle}>{errors.name}</div>}
      </div>

      {/* Type + IP row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <label style={labelStyle}>TYPE *</label>
          <select
            value={form.type}
            onChange={e => set('type', e.target.value)}
            style={inputStyle}
          >
            {NODE_TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>IP ADDRESS *</label>
          <input
            value={form.ip}
            onChange={e => set('ip', e.target.value)}
            placeholder="192.168.1.x"
            style={{ ...inputStyle, borderColor: errors.ip ? '#ff2244' : '#0d2444' }}
            maxLength={15}
          />
          {errors.ip && <div style={errStyle}>{errors.ip}</div>}
        </div>
      </div>

      {/* OS */}
      <div>
        <label style={labelStyle}>OPERATING SYSTEM</label>
        <select
          value={form.os}
          onChange={e => set('os', e.target.value)}
          style={inputStyle}
        >
          {OS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Status + Firewall row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <label style={labelStyle}>STATUS</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            style={inputStyle}
          >
            <option value="secure">Secure</option>
            <option value="warning">Warning</option>
            <option value="compromised">Compromised</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>FIREWALL</label>
          <div
            onClick={() => set('hasFirewall', !form.hasFirewall)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 12px', background:'#030810',
              border:`1px solid ${form.hasFirewall ? '#52b788' : '#ff2244'}`,
              cursor:'pointer', transition:'all 0.2s',
            }}
          >
            <div style={{
              width:36, height:18, borderRadius:9,
              background: form.hasFirewall ? '#52b78822' : '#ff224422',
              border:`1px solid ${form.hasFirewall ? '#52b788' : '#ff2244'}`,
              position:'relative',
            }}>
              <div style={{
                position:'absolute', width:12, height:12,
                borderRadius:'50%', top:2,
                left: form.hasFirewall ? 20 : 2,
                background: form.hasFirewall ? '#52b788' : '#ff2244',
                transition:'left 0.2s',
              }} />
            </div>
            <span style={{
              fontSize:10, fontFamily:'Share Tech Mono',
              color: form.hasFirewall ? '#52b788' : '#ff2244',
            }}>
              {form.hasFirewall ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <button type="submit" disabled={loading} style={{
          flex:1, padding:'8px',
          fontFamily:'Rajdhani', fontWeight:700,
          letterSpacing:2, fontSize:11,
          border:'1px solid #00d4ff', background:'#00d4ff22',
          color:'#00d4ff', cursor: loading ? 'wait' : 'pointer',
          textTransform:'uppercase', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'SAVING...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} style={{
          padding:'8px 16px',
          fontFamily:'Rajdhani', fontWeight:700,
          letterSpacing:2, fontSize:11,
          border:'1px solid #0d2444', background:'transparent',
          color:'#4a5568', cursor:'pointer', textTransform:'uppercase',
        }}>
          CANCEL
        </button>
      </div>
    </form>
  );
}

// ── Confirm Delete Dialog ─────────────────────────────
function ConfirmDialog({ node, onConfirm, onCancel, hasEdges, isEdge }) {
  const isEdgeDelete = isEdge || false;

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'#000000bb', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        background:'#060f1e', border:'1px solid #ff2244',
        padding:24, width:360, boxShadow:'0 0 40px #ff224433',
      }}>
        <div style={{ fontFamily:'Orbitron', fontSize:14,
          color:'#ff2244', marginBottom:12, letterSpacing:2 }}>
          ⚠ CONFIRM DELETE
        </div>
        <div style={{ fontSize:11, fontFamily:'Share Tech Mono',
          color:'#8ab4d4', marginBottom:16, lineHeight:1.6 }}>
          {isEdgeDelete ? (
            <>Delete connection between <span style={{ color:'#c8e4f8' }}>
              {node.source?.name || 'Unknown'} ↔ {node.target?.name || 'Unknown'}
            </span>?</>
          ) : (
            <>Delete <span style={{ color:'#c8e4f8' }}>{node.name}</span> ({node.ip})?</>
          )}
          {hasEdges > 0 && !isEdgeDelete && (
            <div style={{ marginTop:8, color:'#f4a261' }}>
              ⚠ This node has <strong>{hasEdges}</strong> connection(s).
              All edges will also be removed.
            </div>
          )}
          <div style={{ marginTop:8, color:'#ff2244' }}>
            This action cannot be undone.
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onConfirm} style={{
            flex:1, padding:'8px',
            fontFamily:'Rajdhani', fontWeight:700, letterSpacing:2, fontSize:11,
            border:'1px solid #ff2244', background:'#ff224422',
            color:'#ff2244', cursor:'pointer', textTransform:'uppercase',
          }}>DELETE</button>
          <button onClick={onCancel} style={{
            flex:1, padding:'8px',
            fontFamily:'Rajdhani', fontWeight:700, letterSpacing:2, fontSize:11,
            border:'1px solid #0d2444', background:'transparent',
            color:'#8ab4d4', cursor:'pointer', textTransform:'uppercase',
          }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Delete Confirm ───────────────────────────────
function BulkConfirmDialog({ count, onConfirm, onCancel }) {
  return (
    <div style={{
      position:'fixed', inset:0,
      background:'#000000bb', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        background:'#060f1e', border:'1px solid #ff2244',
        padding:24, width:360,
      }}>
        <div style={{ fontFamily:'Orbitron', fontSize:14,
          color:'#ff2244', marginBottom:12 }}>
          ⚠ BULK DELETE
        </div>
        <div style={{ fontSize:11, fontFamily:'Share Tech Mono',
          color:'#8ab4d4', marginBottom:16, lineHeight:1.6 }}>
          Delete <span style={{ color:'#ff2244' }}>{count} devices</span> and
          all their connections?<br/>
          <span style={{ color:'#ff2244' }}>This cannot be undone.</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onConfirm} style={{
            flex:1, padding:'8px',
            fontFamily:'Rajdhani', fontWeight:700, letterSpacing:2, fontSize:11,
            border:'1px solid #ff2244', background:'#ff224422',
            color:'#ff2244', cursor:'pointer', textTransform:'uppercase',
          }}>DELETE {count} DEVICES</button>
          <button onClick={onCancel} style={{
            flex:1, padding:'8px',
            fontFamily:'Rajdhani', fontWeight:700, letterSpacing:2, fontSize:11,
            border:'1px solid #0d2444', background:'transparent',
            color:'#8ab4d4', cursor:'pointer', textTransform:'uppercase',
          }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Main DeviceManager Component
// ══════════════════════════════════════════════════════
export default function DeviceManager({ isOpen, onClose, onNodesChanged }) {
  const [nodes,        setNodes       ] = useState([]);
  const [edges,        setEdges       ] = useState([]);
  const [loading,      setLoading     ] = useState(true);
  const [search,       setSearch      ] = useState('');
  const [filterType,   setFilterType  ] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected,     setSelected    ] = useState(new Set());
  const [mode,         setMode        ] = useState('list'); // list | add | edit | edges
  const [editingNode,  setEditingNode  ] = useState(null);
  const [deleteTarget, setDeleteTarget ] = useState(null);
  const [bulkDeleting, setBulkDeleting ] = useState(false);
  const [toast,        setToast        ] = useState(null);
  const [sortBy,       setSortBy       ] = useState('name'); // name | type | status
  const [edgeForm,     setEdgeForm     ] = useState({ source: '', target: '', encrypted: true });
  const [deleteEdgeTarget, setDeleteEdgeTarget] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setMode('list');
      setSelected(new Set());
      setSearch('');
    }
  }, [isOpen]);

  async function fetchData() {
    setLoading(true);
    try {
      const [nRes, eRes] = await Promise.all([
        api.get('/api/nodes'),
        api.get('/api/edges'),
      ]);
      setNodes(nRes.data.data.filter(n => n && n._id));
      setEdges(eRes.data.data.filter(e => e && e.source && e.target));
    } catch (err) {
      showToast('Failed to load devices: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Edge count per node ────────────────────────────
  function edgeCount(nodeId) {
    return edges.filter(e =>
      (e.source && typeof e.source === 'object' ? e.source._id : e.source) === nodeId ||
      (e.target && typeof e.target === 'object' ? e.target._id : e.target) === nodeId
    ).length;
  }

  // ── Filtered + sorted nodes ────────────────────────
  const filtered = nodes
    .filter(n => {
      const matchSearch = n.name.toLowerCase().includes(search.toLowerCase()) ||
                          n.ip.includes(search);
      const matchType   = filterType   === 'all' || n.type   === filterType;
      const matchStatus = filterStatus === 'all' || n.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'type')   return a.type.localeCompare(b.type);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  // ── Selection helpers ──────────────────────────────
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map(n => n._id)));
  }

  function clearSelect() {
    setSelected(new Set());
  }

  // ── Add device ─────────────────────────────────────
  async function handleAdd(form) {
    const res  = await api.post('/api/nodes', form);
    const node = res.data.data;
    setNodes(prev => [...prev, node]);
    showToast(`${node.name} added successfully`);
    setMode('list');
    onNodesChanged?.();
  }

  // ── Edit device ────────────────────────────────────
  async function handleEdit(form) {
    const res  = await api.put(`/api/nodes/${editingNode._id}`, form);
    const node = res.data.data;
    setNodes(prev => prev.map(n => n._id === node._id ? node : n));
    showToast(`${node.name} updated`);
    setMode('list');
    setEditingNode(null);
    onNodesChanged?.();
  }

  // ── Delete single ──────────────────────────────────
  async function handleDelete() {
    const node = deleteTarget;
    try {
      await api.delete(`/api/nodes/${node._id}`);
      // Also delete connected edges from local state
      setEdges(prev => prev.filter(e => {
        const src = typeof e.source==='object' ? e.source._id : e.source;
        const tgt = typeof e.target==='object' ? e.target._id : e.target;
        return src !== node._id && tgt !== node._id;
      }));
      setNodes(prev => prev.filter(n => n._id !== node._id));
      setSelected(prev => { const next = new Set(prev); next.delete(node._id); return next; });
      setDeleteTarget(null);
      showToast(`${node.name} deleted`);
      onNodesChanged?.();
    } catch (err) {
      showToast('Delete failed: ' + (err.response?.data?.error || err.message), 'error');
      setDeleteTarget(null);
    }
  }

  // ── Bulk delete ────────────────────────────────────
  async function handleBulkDelete() {
    setBulkDeleting(false);
    const ids      = [...selected];
    let   deleted  = 0;
    let   failed   = 0;

    for (const id of ids) {
      try {
        await api.delete(`/api/nodes/${id}`);
        deleted++;
      } catch {
        failed++;
      }
    }

    // Refresh after bulk
    await fetchData();
    setSelected(new Set());
    onNodesChanged?.();

    if (failed === 0) showToast(`${deleted} device(s) deleted`);
    else showToast(`${deleted} deleted, ${failed} failed`, 'warn');
  }

  // ── Create edge ────────────────────────────────────
  async function handleCreateEdge() {
    if (!edgeForm.source || !edgeForm.target || edgeForm.source === edgeForm.target) {
      showToast('Please select two different nodes', 'error');
      return;
    }

    // Check if edge already exists
    const existingEdge = edges.find(e => {
      const src = typeof e.source === 'object' ? e.source._id : e.source;
      const tgt = typeof e.target === 'object' ? e.target._id : e.target;
      return (src === edgeForm.source && tgt === edgeForm.target) ||
             (src === edgeForm.target && tgt === edgeForm.source);
    });

    if (existingEdge) {
      showToast('Connection already exists between these nodes', 'warn');
      return;
    }

    try {
      const res = await api.post('/api/edges', edgeForm);
      const newEdge = res.data.data;
      setEdges(prev => [...prev, newEdge]);
      setEdgeForm({ source: '', target: '', encrypted: true });
      showToast('Connection created successfully');
      onNodesChanged?.();
    } catch (err) {
      showToast('Failed to create connection: ' + (err.response?.data?.error || err.message), 'error');
    }
  }

  // ── Delete edge ────────────────────────────────────
  async function handleDeleteEdge() {
    const edge = deleteEdgeTarget;
    try {
      await api.delete(`/api/edges/${edge._id}`);
      setEdges(prev => prev.filter(e => e._id !== edge._id));
      setDeleteEdgeTarget(null);
      showToast('Connection deleted successfully');
      onNodesChanged?.();
    } catch (err) {
      showToast('Failed to delete connection: ' + (err.response?.data?.error || err.message), 'error');
      setDeleteEdgeTarget(null);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0,
          background:'#000000aa', zIndex:1000,
        }}
      />

      {/* Panel */}
      <div style={{
        position:'fixed', top:56, right:0,
        width: mode === 'list' ? 640 : 480,
        height:'calc(100vh - 56px)',
        background:'#060f1e',
        borderLeft:'1px solid #0d2444',
        zIndex:1001,
        display:'flex', flexDirection:'column',
        transition:'width 0.2s',
        boxShadow:'-8px 0 40px #00000088',
      }}>

        {/* ── Header ─────────────────────────────────── */}
        <div style={{
          padding:'14px 16px',
          borderBottom:'1px solid #0d2444',
          display:'flex', alignItems:'center',
          justifyContent:'space-between',
          flexShrink:0,
        }}>
          <div>
            <div style={{
              fontFamily:'Orbitron', fontSize:14,
              color:'#00d4ff', letterSpacing:3,
            }}>
              DEVICE MANAGER
            </div>
            <div style={{ fontSize:9, color:'#4a5568',
              fontFamily:'Share Tech Mono', marginTop:2 }}>
              {nodes.length} total · {filtered.length} shown
              {selected.size > 0 && ` · ${selected.size} selected`}
            </div>
          </div>

          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {mode === 'list' && (
              <>
                <button
                  onClick={() => { setMode('add'); setSelected(new Set()); }}
                  style={actionBtn('#00d4ff')}
                >+ ADD</button>
                <button
                  onClick={() => { setMode('edges'); setSelected(new Set()); }}
                  style={actionBtn('#52b788')}
                >🔗 EDGES</button>
              </>
            )}
            {mode !== 'list' && (
              <button
                onClick={() => { setMode('list'); setEditingNode(null); }}
                style={actionBtn('#8ab4d4')}
              >← BACK</button>
            )}
            <button onClick={onClose} style={{
              background:'transparent', border:'1px solid #0d2444',
              color:'#4a5568', width:28, height:28,
              cursor:'pointer', fontSize:14, fontFamily:'monospace',
            }}>✕</button>
          </div>
        </div>

        {/* ── Add / Edit Form ─────────────────────────── */}
        {(mode === 'add' || mode === 'edit') && (
          <div style={{ padding:16, overflowY:'auto', flex:1 }}>
            <div style={{ fontSize:10, letterSpacing:3, color:'#00d4ff',
              fontFamily:'Rajdhani', fontWeight:700,
              marginBottom:14, textTransform:'uppercase' }}>
              {mode === 'add' ? 'ADD NEW DEVICE' : `EDIT — ${editingNode?.name}`}
            </div>
            <DeviceForm
              initial={mode === 'edit' ? {
                name:       editingNode.name,
                type:       editingNode.type,
                ip:         editingNode.ip,
                os:         editingNode.os,
                hasFirewall:editingNode.hasFirewall,
                status:     editingNode.status,
              } : EMPTY_FORM}
              nodes={nodes}
              excludeId={mode === 'edit' ? editingNode._id : null}
              onSubmit={mode === 'add' ? handleAdd : handleEdit}
              onCancel={() => { setMode('list'); setEditingNode(null); }}
              submitLabel={mode === 'add' ? 'ADD DEVICE' : 'SAVE CHANGES'}
            />
          </div>
        )}

        {/* ── List Mode ───────────────────────────────── */}
        {mode === 'list' && (
          <>
            {/* Search + Filters */}
            <div style={{
              padding:'10px 16px', borderBottom:'1px solid #0d2444',
              display:'flex', flexDirection:'column', gap:8, flexShrink:0,
            }}>
              {/* Search */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or IP..."
                style={{
                  ...inputStyle,
                  width:'100%', boxSizing:'border-box',
                }}
              />

              {/* Filter row */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {/* Type filter */}
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{ ...inputStyle, flex:1 }}
                >
                  <option value="all">All Types</option>
                  {NODE_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                    </option>
                  ))}
                </select>

                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ ...inputStyle, flex:1 }}
                >
                  <option value="all">All Status</option>
                  <option value="secure">Secure</option>
                  <option value="warning">Warning</option>
                  <option value="compromised">Compromised</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{ ...inputStyle, flex:1 }}
                >
                  <option value="name">Sort: Name</option>
                  <option value="type">Sort: Type</option>
                  <option value="status">Sort: Status</option>
                </select>
              </div>

              {/* Bulk actions */}
              {filtered.length > 0 && (
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <button
                    onClick={selected.size === filtered.length ? clearSelect : selectAll}
                    style={{ ...actionBtn('#0d2444'), color:'#8ab4d4', fontSize:9 }}
                  >
                    {selected.size === filtered.length ? 'DESELECT ALL' : 'SELECT ALL'}
                  </button>

                  {selected.size > 0 && (
                    <>
                      <span style={{ fontSize:9, color:'#4a5568',
                        fontFamily:'Share Tech Mono' }}>
                        {selected.size} selected
                      </span>
                      <button
                        onClick={() => setBulkDeleting(true)}
                        style={{ ...actionBtn('#ff2244'), fontSize:9 }}
                      >
                        🗑 DELETE {selected.size}
                      </button>
                      <button
                        onClick={clearSelect}
                        style={{ ...actionBtn('#0d2444'), color:'#8ab4d4', fontSize:9 }}
                      >
                        CLEAR
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Device List */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {loading ? (
                <div style={{ padding:24, textAlign:'center',
                  color:'#4a5568', fontFamily:'Share Tech Mono', fontSize:11 }}>
                  Loading devices...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:24, textAlign:'center',
                  color:'#4a5568', fontFamily:'Share Tech Mono', fontSize:11 }}>
                  {search || filterType !== 'all' || filterStatus !== 'all'
                    ? 'No devices match your filters'
                    : 'No devices found'}
                </div>
              ) : (
                filtered.map(node => {
                  const isSelected = selected.has(node._id);
                  const connections = edgeCount(node._id);

                  return (
                    <div
                      key={node._id}
                      style={{
                        padding:'10px 16px',
                        borderBottom:'1px solid #0d244466',
                        background: isSelected ? '#00d4ff08' : 'transparent',
                        display:'flex', alignItems:'center', gap:10,
                        transition:'background 0.15s',
                        cursor:'pointer',
                      }}
                      onClick={() => toggleSelect(node._id)}
                      onMouseEnter={e => {
                        if (!isSelected)
                          e.currentTarget.style.background = '#ffffff05';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected)
                          e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width:14, height:14,
                        border:`1px solid ${isSelected ? '#00d4ff' : '#0d2444'}`,
                        background: isSelected ? '#00d4ff22' : 'transparent',
                        display:'flex', alignItems:'center',
                        justifyContent:'center', flexShrink:0,
                        transition:'all 0.15s',
                      }}>
                        {isSelected && (
                          <span style={{ color:'#00d4ff', fontSize:9 }}>✓</span>
                        )}
                      </div>

                      {/* Type dot */}
                      <div style={{
                        width:10, height:10, borderRadius:'50%',
                        background: TYPE_COLORS[node.type] || '#8ab4d4',
                        flexShrink:0,
                      }} />

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{
                            fontFamily:'Share Tech Mono', fontSize:12,
                            color:'#c8e4f8', overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>{node.name}</span>
                          {!node.hasFirewall && (
                            <span style={{ fontSize:9, color:'#f4a261',
                              flexShrink:0 }}>⚠ NO FW</span>
                          )}
                        </div>
                        <div style={{
                          fontSize:9, color:'#4a5568',
                          fontFamily:'Share Tech Mono', marginTop:2,
                          display:'flex', gap:10,
                        }}>
                          <span>{node.ip}</span>
                          <span>{node.os}</span>
                          <span>{connections} conn.</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{
                        fontSize:8, padding:'2px 6px', letterSpacing:1,
                        border:`1px solid ${STATUS_COLOR[node.status]}44`,
                        background: STATUS_COLOR[node.status]+'11',
                        color: STATUS_COLOR[node.status],
                        flexShrink:0,
                      }}>
                        {node.status.toUpperCase()}
                      </div>

                      {/* Action buttons */}
                      <div
                        style={{ display:'flex', gap:4, flexShrink:0 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingNode(node);
                            setMode('edit');
                          }}
                          style={{
                            width:26, height:26,
                            background:'transparent',
                            border:'1px solid #0d2444',
                            color:'#00d4ff', cursor:'pointer',
                            fontSize:12, display:'flex',
                            alignItems:'center', justifyContent:'center',
                          }}
                          title="Edit device"
                        >✎</button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(node)}
                          style={{
                            width:26, height:26,
                            background:'transparent',
                            border:'1px solid #0d2444',
                            color:'#ff2244', cursor:'pointer',
                            fontSize:12, display:'flex',
                            alignItems:'center', justifyContent:'center',
                          }}
                          title="Delete device"
                        >🗑</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer stats */}
            <div style={{
              padding:'8px 16px', borderTop:'1px solid #0d2444',
              display:'flex', gap:16, flexShrink:0,
              fontSize:9, fontFamily:'Share Tech Mono',
            }}>
              {['secure','warning','compromised'].map(s => (
                <span key={s} style={{ color: STATUS_COLOR[s] }}>
                  {nodes.filter(n => n.status===s).length} {s}
                </span>
              ))}
              <span style={{ color:'#4a5568', marginLeft:'auto' }}>
                {nodes.filter(n => n.hasFirewall).length}/{nodes.length} firewalled
              </span>
            </div>
          </>
        )}

        {/* ── Edges Mode ───────────────────────────────── */}
        {mode === 'edges' && (
          <>
            {/* Header */}
            <div style={{
              padding:'14px 16px',
              borderBottom:'1px solid #0d2444',
              display:'flex', alignItems:'center',
              justifyContent:'space-between',
              flexShrink:0,
            }}>
              <div>
                <div style={{
                  fontFamily:'Orbitron', fontSize:14,
                  color:'#00d4ff', letterSpacing:3,
                }}>
                  EDGE MANAGER
                </div>
                <div style={{ fontSize:9, color:'#4a5568',
                  fontFamily:'Share Tech Mono', marginTop:2 }}>
                  {edges.length} connections · {nodes.length} devices
                </div>
              </div>
            </div>

            {/* Create Edge Form */}
            <div style={{
              padding:'16px', borderBottom:'1px solid #0d2444',
              flexShrink:0,
            }}>
              <div style={{
                fontSize:10, letterSpacing:3, color:'#00d4ff',
                fontFamily:'Rajdhani', fontWeight:700,
                marginBottom:12, textTransform:'uppercase'
              }}>
                Create New Connection
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <select
                  value={edgeForm.source}
                  onChange={e => setEdgeForm(prev => ({ ...prev, source: e.target.value }))}
                  style={{ ...inputStyle, flex:1 }}
                >
                  <option value="">Select Source Node</option>
                  {nodes.map(n => (
                    <option key={n._id} value={n._id}>{n.name}</option>
                  ))}
                </select>
                <span style={{ color:'#52b788', fontSize:12 }}>→</span>
                <select
                  value={edgeForm.target}
                  onChange={e => setEdgeForm(prev => ({ ...prev, target: e.target.value }))}
                  style={{ ...inputStyle, flex:1 }}
                >
                  <option value="">Select Target Node</option>
                  {nodes.map(n => (
                    <option key={n._id} value={n._id}>{n.name}</option>
                  ))}
                </select>
                <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:9 }}>
                  <input
                    type="checkbox"
                    checked={edgeForm.encrypted}
                    onChange={e => setEdgeForm(prev => ({ ...prev, encrypted: e.target.checked }))}
                  />
                  Encrypted
                </label>
                <button
                  onClick={handleCreateEdge}
                  disabled={!edgeForm.source || !edgeForm.target || edgeForm.source === edgeForm.target}
                  style={{
                    ...actionBtn('#52b788'),
                    opacity: (!edgeForm.source || !edgeForm.target || edgeForm.source === edgeForm.target) ? 0.5 : 1,
                  }}
                >+ CONNECT</button>
              </div>
            </div>

            {/* Edges List */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {edges.length === 0 ? (
                <div style={{
                  padding:'40px', textAlign:'center',
                  color:'#4a5568', fontFamily:'Share Tech Mono', fontSize:12
                }}>
                  No connections found. Create your first edge above.
                </div>
              ) : (
                <div style={{ padding:'8px 16px' }}>
                  {edges.map(edge => {
                    const sourceNode = nodes.find(n => n._id === (typeof edge.source === 'object' ? edge.source._id : edge.source));
                    const targetNode = nodes.find(n => n._id === (typeof edge.target === 'object' ? edge.target._id : edge.target));

                    return (
                      <div key={edge._id} style={{
                        display:'flex', alignItems:'center',
                        padding:'12px', marginBottom:8,
                        background:'#030810', border:'1px solid #0d2444',
                        borderRadius:4,
                      }}>
                        {/* Connection info */}
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <span style={{
                              fontFamily:'Share Tech Mono', fontSize:12,
                              color:'#c8e4f8'
                            }}>
                              {sourceNode?.name || 'Unknown'}
                            </span>
                            <div style={{
                              width:20, height:2,
                              background: edge.encrypted ? '#52b788' : '#0d2444',
                              borderRadius:1,
                              opacity: edge.encrypted ? 0.9 : 0.6,
                              borderStyle: edge.encrypted ? 'solid' : 'dashed',
                              borderWidth: edge.encrypted ? '0' : '1px 0',
                              borderColor: '#0d2444',
                            }}></div>
                            <span style={{
                              fontFamily:'Share Tech Mono', fontSize:12,
                              color:'#c8e4f8'
                            }}>
                              {targetNode?.name || 'Unknown'}
                            </span>
                            {edge.encrypted && (
                              <span style={{
                                fontSize:8, padding:'2px 6px',
                                background:'#52b78822', color:'#52b788',
                                border:'1px solid #52b78844', borderRadius:2
                              }}>ENCRYPTED</span>
                            )}
                          </div>
                          <div style={{
                            fontSize:9, color:'#4a5568',
                            fontFamily:'Share Tech Mono'
                          }}>
                            {sourceNode?.ip} ↔ {targetNode?.ip}
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => setDeleteEdgeTarget(edge)}
                          style={{
                            width:28, height:28,
                            background:'transparent',
                            border:'1px solid #0d2444',
                            color:'#ff2244', cursor:'pointer',
                            fontSize:14, display:'flex',
                            alignItems:'center', justifyContent:'center',
                          }}
                          title="Delete connection"
                        >🗑</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position:'absolute', bottom:16, left:'50%',
            transform:'translateX(-50%)',
            background:'#060f1e',
            border:`1px solid ${toast.type==='error'?'#ff2244':toast.type==='warn'?'#f4a261':'#52b788'}`,
            color: toast.type==='error'?'#ff2244':toast.type==='warn'?'#f4a261':'#52b788',
            padding:'8px 16px', fontFamily:'Share Tech Mono', fontSize:10,
            whiteSpace:'nowrap', zIndex:10,
            boxShadow:`0 0 16px ${toast.type==='error'?'#ff224433':'#52b78833'}`,
          }}>
            {toast.type==='error'?'❌':toast.type==='warn'?'⚠️':'✅'} {toast.msg}
          </div>
        )}
      </div>

      {/* Confirm dialogs */}
      {deleteTarget && (
        <ConfirmDialog
          node={deleteTarget}
          hasEdges={edgeCount(deleteTarget._id)}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {bulkDeleting && (
        <BulkConfirmDialog
          count={selected.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleting(false)}
        />
      )}

      {deleteEdgeTarget && (
        <ConfirmDialog
          node={deleteEdgeTarget}
          isEdge={true}
          onConfirm={handleDeleteEdge}
          onCancel={() => setDeleteEdgeTarget(null)}
        />
      )}
    </>
  );
}

// ── Style helpers ─────────────────────────────────────
const inputStyle = {
  background:  '#030810',
  border:      '1px solid #0d2444',
  color:       '#c8e4f8',
  padding:     '7px 10px',
  fontFamily:  'Share Tech Mono, monospace',
  fontSize:    11,
  outline:     'none',
  width:       '100%',
  boxSizing:   'border-box',
  transition:  'border-color 0.2s',
};

const labelStyle = {
  display:       'block',
  fontSize:      9,
  letterSpacing: 2,
  color:         '#4a5568',
  marginBottom:  4,
  fontFamily:    'Rajdhani, sans-serif',
  fontWeight:    700,
  textTransform: 'uppercase',
};

const errStyle = {
  fontSize:   9,
  color:      '#ff2244',
  marginTop:  3,
  fontFamily: 'Share Tech Mono',
};

const errBannerStyle = {
  padding:     '8px 10px',
  background:  '#ff224411',
  border:      '1px solid #ff224444',
  color:       '#ff2244',
  fontSize:    10,
  fontFamily:  'Share Tech Mono',
};

function actionBtn(color) {
  return {
    fontFamily:    'Rajdhani',
    fontWeight:    700,
    letterSpacing: 2,
    fontSize:      10,
    padding:       '4px 12px',
    border:        `1px solid ${color}`,
    background:    color + '22',
    color:         color === '#0d2444' ? '#8ab4d4' : color,
    cursor:        'pointer',
    textTransform: 'uppercase',
    whiteSpace:    'nowrap',
  };
}