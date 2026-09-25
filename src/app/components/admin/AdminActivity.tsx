

import { useState, useEffect } from 'react';
import { User, ActivityLog } from '../../types';

import {
  ActivityService,
  AdminAuditService,
  AdminAuditLog,
  SecurityAuditService,
  SecurityAuditLog,
} from '../../services/dataService'; 
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Activity, ClipboardList, Search, RefreshCw, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props { currentUser: User | null; isSuper: boolean; showAudit?: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

export default function AdminActivity({ currentUser, isSuper, showAudit = false }: Props) {
 const [tab, setTab] = useState<'activity' | 'audit' | 'security'>(showAudit ? 'audit' : 'activity');
 
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
const [securityAuditLogs, setSecurityAuditLogs] = useState<SecurityAuditLog[]>([]);
const [search, setSearch] = useState('');



  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSecurityClear, setConfirmSecurityClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const canViewActivity = isSuper;
  const canViewAudit = isSuper;
  const canExportAudit = isSuper;

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    setLoading(true);
    if (tab === 'activity' && canViewActivity) {
      const logs = await ActivityService.getAll();
      setActivityLogs([...logs].reverse().slice(0, 300));
    }
    if (tab === 'audit' && canViewAudit) {
      const audit = await AdminAuditService.getAll();
      setAuditLogs(audit.slice(0, 300));
    }
 if (
  tab === 'security' &&
  canViewAudit &&
  currentUser?.email === 'danquahbertram26@gmail.com'
) {
  const securityAudit = await SecurityAuditService.getAll();
  setSecurityAuditLogs(securityAudit.slice(0, 300));
}
    setLoading(false);
  };

  const activityFiltered = activityLogs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.description?.toLowerCase().includes(s) || l.userName?.toLowerCase().includes(s) || l.type?.toLowerCase().includes(s);
  });

  const auditFiltered = auditLogs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.action?.toLowerCase().includes(s) || l.adminName?.toLowerCase().includes(s) || l.detail?.toLowerCase().includes(s) || l.adminEmail?.toLowerCase().includes(s);
  });
  const clearActivity = async () => {
    setClearing(true);

    try {
      await ActivityService.clear();
      await AdminAuditService.clear();

      setActivityLogs([]);
      setAuditLogs([]);

      toast.success('All logs cleared (Customer Activity + Admin Audit)');
      setConfirmClear(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to clear logs');
    } finally {
      setClearing(false);
    }
  };

  const clearSecurityAudit = async () => {
    setClearing(true);

    try {
      await SecurityAuditService.clear();

      setSecurityAuditLogs([]);

      toast.success('Security Audit log cleared');
      setConfirmSecurityClear(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to clear Security Audit log');
    } finally {
      setClearing(false);
    }
  }; 
    const exportAuditCSV = () => {
    const header = 'Timestamp,Admin,Email,Action,Detail';

    const lines = auditLogs.map((log) => {
      return [
        log.createdAt,
        log.adminName,
        log.adminEmail,
        log.action,
        log.detail ?? '',
      ]
        .map((value) => String(value).replace(/,/g, ' '))
        .join(',');
    });

    const csv = [header, ...lines].join('\n');

    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download =
      'admin_audit_' +
      new Date().toISOString().split('T')[0] +
      '.csv';
    a.click();
  };

  const activityTypeColor: Record<string, string> = {
    login: 'bg-blue-100 text-blue-800',
    order: 'bg-green-100 text-green-800',
    payment: 'bg-purple-100 text-purple-800',
    user: 'bg-yellow-100 text-yellow-800',
    product: 'bg-orange-100 text-orange-800',
    message: 'bg-pink-100 text-pink-800',
  };

  if (!isSuper) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-blue-950">{tab === 'audit' ? 'Admin Audit Log' : 'Customer Activity'}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-gray-600" onClick={load}><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>
          {tab === 'audit' && canExportAudit && <Button variant="outline" size="sm" className="gap-1.5 border-blue-900 text-blue-900 hover:bg-blue-50" onClick={exportAuditCSV}><Download className="w-3.5 h-3.5" />Export</Button>}
     {tab === 'activity' && isSuper && (
  <Button
    variant="outline"
    size="sm"
    className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
    onClick={() => setConfirmClear(true)}
  >
    <Trash2 className="w-3.5 h-3.5" />
    Clear Logs
  </Button>
)}

{tab === 'security' &&
  currentUser?.email === 'danquahbertram26@gmail.com' && (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
   onClick={() => setConfirmSecurityClear(true)}
    >
      <Trash2 className="w-3.5 h-3.5" />
      Clear Security Audit
    </Button>
  )} 
        </div>
      </div>

      {/* Tab switcher */}  
            <div className="flex gap-1">{canViewActivity && (
  <button
    onClick={() => {
      setTab('activity');
      setSearch('');
    }}
    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-900 text-white"
  >
    <Activity className="w-4 h-4" />
    Customer Activity
  </button>
)}
{canViewAudit && (
  <button
    onClick={() => {
      setTab('audit');
      setSearch('');
    }}
    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-900 text-white"
  >
    <ClipboardList className="w-4 h-4" />
    Admin Audit
  </button>
)}
        </div>
   {canViewAudit &&
  currentUser?.email === 'danquahbertram26@gmail.com' && (
    <button
      onClick={() => {
        setTab('security');
        setSearch('');
      }}
      className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-red-900 text-white"
    >
      <ClipboardList className="w-4 h-4" />
      Security Audit
    </button>
  )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : tab === 'activity' ? (
        activityFiltered.length === 0
          ? <Card><CardContent className="p-12 text-center text-gray-400"><Activity className="w-10 h-10 mx-auto mb-3 text-gray-200" />No activity logs found</CardContent></Card>
          : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {activityFiltered.map((l, i) => (
                    <div key={l.id ?? i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold shrink-0">{(l.userName ?? '?').charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{l.userName ?? 'System'}</span>
                        <Badge className="text-xs bg-gray-100 text-gray-700">{l.type}</Badge> </div>
                        {l.description && <p className="text-xs text-gray-500 mt-0.5">{l.description}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
      ) : (
        auditFiltered.length === 0
          ? <Card><CardContent className="p-12 text-center text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />No audit logs found</CardContent></Card>
          : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {auditFiltered.map((l, i) => (
                    <div key={l.id ?? i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-xs font-bold shrink-0">{(l.adminName ?? 'A').charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{l.adminName ?? 'Admin'}</span>
                          <Badge className="bg-blue-900 text-white text-xs">{l.action}</Badge>
                          {l.adminEmail && <span className="text-xs text-gray-400">{l.adminEmail}</span>}
                        </div>
                        {l.detail && <p className="text-xs text-gray-500 mt-0.5">{l.detail}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
      )}
      {tab === 'security' && (
        securityAuditLogs.filter(l => {
          if (!search) return true;
          const s = search.toLowerCase();

          return (
            l.action?.toLowerCase().includes(s) ||
            l.description?.toLowerCase().includes(s) ||
            l.actorName?.toLowerCase().includes(s) ||
            l.actorEmail?.toLowerCase().includes(s) ||
            l.targetName?.toLowerCase().includes(s)
          );
        }).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              No security audit logs found
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {securityAuditLogs
                  .filter(l => {
                    if (!search) return true;
                    const s = search.toLowerCase();

                    return (
                      l.action?.toLowerCase().includes(s) ||
                      l.description?.toLowerCase().includes(s) ||
                      l.actorName?.toLowerCase().includes(s) ||
                      l.actorEmail?.toLowerCase().includes(s) ||
                      l.targetName?.toLowerCase().includes(s)
                    );
                  })
                  .map((l, i) => (
                    <div
                      key={l.id ?? i}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {(l.actorName ?? 'R').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">
                            {l.actorName ?? 'Unknown'}
                          </span>

                          <Badge className="bg-red-900 text-white text-xs">
                            {l.action}
                          </Badge>

                          {l.actorEmail && (
                            <span className="text-xs text-gray-400">
                              {l.actorEmail}
                            </span>
                          )}
                        </div>

                        {l.description && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {l.description}
                          </p>
                        )}

                        {l.targetName && (
                          <p className="text-xs text-gray-400 mt-1">
                            Target: {l.targetName}
                          </p>
                        )}
                      </div>

                      <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )
      )}

      {confirmClear && (
        <Dialog open onOpenChange={() => setConfirmClear(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear Activity Logs</DialogTitle>
              <DialogDescription>
                Are you sure you want to clear all activity logs? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setConfirmClear(false)} disabled={clearing}>Cancel</Button>
              <Button className="bg-red-700 hover:bg-red-800 text-white" onClick={clearActivity} disabled={clearing}>
                <Trash2 className="w-4 h-4 mr-1" />{clearing ? 'Clearing…' : 'Clear Logs'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
      )}

      {confirmSecurityClear && (
  <Dialog
    open
    onOpenChange={() => setConfirmSecurityClear(false)}
  >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Clear Security Audit</DialogTitle>
        <DialogDescription>
          Are you sure you want to permanently clear the Security Audit log?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-2 justify-end pt-2">
        <Button
          variant="outline"
          onClick={() => setConfirmSecurityClear(false)}
          disabled={clearing}
        >
          Cancel
        </Button>

        <Button
          className="bg-red-700 hover:bg-red-800 text-white"
          onClick={clearSecurityAudit}
          disabled={clearing}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {clearing ? 'Clearing…' : 'Clear Security Audit'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}
    </div>
  );
}
