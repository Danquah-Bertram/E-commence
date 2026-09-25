import { useState, useEffect } from 'react';
import { User } from '../../types';
import {
  UserService,
  AdminAuditService,
  PermissionService,
  AdminSecuritySettingsService,
  PERMISSION_GROUPS,
  PERMISSION_PRESETS
} from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Shield, Plus, Ban, CheckCircle, Trash2, KeyRound, Settings2, Search, ChevronDown, ChevronUp, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

const SEEDED_EMAILS = ['danquahbertram26@gmail.com'];

export default function AdminManagement({ currentUser, isSuper }: Props) {
 const [admins, setAdmins] = useState<User[]>([]);
const [search, setSearch] = useState('');
const [loading, setLoading] = useState(true);

const [approvalRequired, setApprovalRequired] = useState(false);
const [savingApproval, setSavingApproval] = useState(false);

const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
const [loadingApprovalRequests, setLoadingApprovalRequests] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<User | null>(null);
const [transferTarget, setTransferTarget] = useState<User | null>(null);
const [transferring, setTransferring] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [savingPerms, setSavingPerms] = useState(false);
 

  useEffect(() => { load(); }, []);
  

// Load pending Super Admin approval requests
const loadApprovalRequests = async () => {
  setLoadingApprovalRequests(true);

  try {
    const requests =
      await UserService.getSuperAdminApprovalRequests();

    setApprovalRequests(
      Array.isArray(requests) ? requests : []
    );
  } catch (e: any) {
    console.error(
      'Failed to load approval requests:',
      e
    );

    setApprovalRequests([]);
  } finally {
    setLoadingApprovalRequests(false);
  }
};



const load = async () => {
  setLoading(true);

  try {
    const [all, securitySettings] = await Promise.all([
      UserService.getAdmins(),
      AdminSecuritySettingsService.get(),
    ]);

    setAdmins(all);

    const required =
      securitySettings.superAdminApprovalRequired;

    setApprovalRequired(required);

    if (required && isSuper) {
      await loadApprovalRequests();
    } else {
      setApprovalRequests([]);
    }

  } catch (e: any) {
    toast.error(
      e.message || 'Failed to load admin settings'
    );
  } finally {
    setLoading(false);
  }
};


const toggleApprovalRequired = async () => {
  const next = !approvalRequired;

  setSavingApproval(true);

  try {
    const updated =
      await AdminSecuritySettingsService.update({
        superAdminApprovalRequired: next,
      });

    setApprovalRequired(
      updated.superAdminApprovalRequired
    );

    AdminAuditService.log(
      next
        ? 'Super Admin Approval Enabled'
        : 'Super Admin Approval Disabled',
      next
        ? 'Super Admin approval is now required for admin actions.'
        : 'Super Admin approval is no longer required for admin actions.'
    );

    toast.success(
      next
        ? 'Super Admin approval is now required'
        : 'Super Admin approval requirement disabled'
    );
  } catch (e: any) {
    toast.error(
      e.message || 'Failed to update approval setting'
    );
  } finally {
    setSavingApproval(false);
  }
};

const approveApprovalRequest = async (requestId: string) => {
  try {
    await UserService.approveSuperAdminApprovalRequest(requestId);

    toast.success('Super Admin approval granted');

    await load();
  } catch (e: any) {
    toast.error(
      e.message || 'Failed to approve request'
    );
  }
};

const rejectApprovalRequest = async (requestId: string) => {
  try {
    await UserService.rejectSuperAdminApprovalRequest(requestId);

    toast.success('Approval request rejected');

    await loadApprovalRequests();
  } catch (e: any) {
    toast.error(
      e.message || 'Failed to reject request'
    );
  }
};

  const filtered = admins.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()));

  const isSeeded = (u: User) => SEEDED_EMAILS.some(e => e.toLowerCase() === u.email.toLowerCase());
  const isSelf = (u: User) => u.id === currentUser?.id;

  const openPermEditor = (admin: User) => {
    const perms = PermissionService.getPermissions(admin.id) ?? admin.permissions ?? {};
    setPermissions({ ...perms });
    setExpandedGroups({});
    setPermTarget(admin);
  };

  const applyPreset = (presetName: string) => {
    const preset = PERMISSION_PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    const next: Record<string, boolean> = {};
    preset.perms.forEach(k => { next[k] = true; });
    setPermissions(next);
  };

  const toggleGroup = (groupLabel: string) => setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));

  const togglePerm = (key: string) => setPermissions(prev => ({ ...prev, [key]: !prev[key] }));

  const selectAllInGroup = (keys: string[], val: boolean) => {
    setPermissions(prev => { const next = { ...prev }; keys.forEach(k => { next[k] = val; }); return next; });
  };

  const savePermissions = async () => {
    if (!permTarget) return;
    setSavingPerms(true);
    try {
      await PermissionService.setPermissions(permTarget.id, permissions);
      AdminAuditService.log('Permissions Updated', `Admin: ${permTarget.name} (${permTarget.email})`);
      setAdmins(prev => prev.map(a => a.id === permTarget.id ? { ...a, permissions } : a));
      toast.success(`Permissions saved for ${permTarget.name}`);
      setPermTarget(null);
    } catch (e: any) { toast.error(e.message || 'Failed to save permissions'); } finally { setSavingPerms(false); }
  };

  const createAdmin = async () => {
    if (!createForm.name.trim()) { toast.error('Name required'); return; }
    if (!createForm.email.trim()) { toast.error('Email required'); return; }
    if (!createForm.password || createForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setCreating(true);
    try {
      await UserService.createAdmin({ name: createForm.name, email: createForm.email, password: createForm.password, permissions: {} });
      AdminAuditService.log('Admin Created', `${createForm.name} (${createForm.email})`);
      toast.success(`Admin account created for ${createForm.name}`);
      setCreateForm({ name: '', email: '', password: '' }); setCreateOpen(false);
      await load();
    } catch (e: any) { toast.error(e.message || 'Failed to create admin'); } finally { setCreating(false); }
  };

  const toggleSuspend = async (admin: User) => {
    const next = !admin.suspended;
    try {
      await UserService.setSuspendedAdmin(admin.id, next);
      AdminAuditService.log(next ? 'Admin Suspended' : 'Admin Reinstated', `${admin.name} (${admin.email})`);
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, suspended: next } : a));
      toast.success(`${admin.name} ${next ? 'suspended' : 'reinstated'}`);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const deleteAdmin = () => {
    if (!deleteTarget) return;
    UserService.delete(deleteTarget.id).then(() => {
      AdminAuditService.log('Admin Deleted', `${deleteTarget.name} (${deleteTarget.email})`);
      setAdmins(prev => prev.filter(a => a.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    }).catch((e: any) => toast.error(e.message));
  };

  const resetAdminPassword = async () => {
    if (!resetTarget || newPassword.length < 6) { toast.error('Min 6 characters'); return; }
    try {
      await UserService.resetAdminPassword(resetTarget.id, newPassword);
      AdminAuditService.log('Admin Password Reset', `${resetTarget.name} (${resetTarget.email})`);
      toast.success(`Password reset for ${resetTarget.name}`);
      setResetTarget(null); setNewPassword('');
    } catch (e: any) { toast.error(e.message || 'Failed to reset password'); }
  };

  if (!isSuper) return null;
  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>;



return (
  <div className="space-y-4 min-w-0 w-full overflow-hidden">

    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-slate-900 truncate">
          Admin Management
        </h2>

        <p className="text-xs text-slate-500 mt-0.5">
          Manage administrator accounts and access
        </p>
      </div>

      {isSuper && (
        <Button
          className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white gap-1.5 shrink-0"
          onClick={() => {
            setCreateForm({
              name: '',
              email: '',
              password: '',
            });
            setCreateOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </Button>
      )}
    </div>

        {/* Search */}
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

      <Input
        placeholder="Search admins…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="pl-9 w-full border-slate-200 focus:border-blue-900"
      />
    </div>

    {/* Super Admin Approval Setting */}
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div>
            <h3 className="font-semibold text-slate-900">
              Super Admin Approval
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Require Super Admin approval for protected admin actions.
            </p>
          </div>

       {currentUser?.email?.toLowerCase() ===
  'danquahbertram26@gmail.com' && (
  <Button
    type="button"
    variant={approvalRequired ? "default" : "outline"}
    disabled={savingApproval}
    onClick={toggleApprovalRequired}
    className={
      approvalRequired
        ? "bg-blue-900 hover:bg-blue-800 text-white"
        : "border-slate-300 text-slate-700"
    }
  >
    {savingApproval
      ? "Saving…"
      : approvalRequired
        ? "ON — Approval Required"
        : "OFF — Approval Not Required"}
  </Button>
)}

        </div>
      </CardContent>
    </Card>

{/* Super Admin Approval Requests */}
{currentUser?.email?.toLowerCase() ===
  'danquahbertram26@gmail.com' &&
  approvalRequired && (
  <Card className="border-amber-200 bg-amber-50/30">
    <CardContent className="p-4">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            Super Admin Approval Requests
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            Review requests from Super Admins who need approval.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadApprovalRequests}
          disabled={loadingApprovalRequests}
        >
          {loadingApprovalRequests
            ? "Loading…"
            : "Refresh Requests"}
        </Button>
      </div>

      {loadingApprovalRequests ? (
        <div className="py-6 text-center text-sm text-slate-400">
          Loading approval requests…
        </div>
      ) : approvalRequests.filter(
          request => request.status === "pending"
        ).length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">
          No pending approval requests.
        </div>
      ) : (
        <div className="space-y-3">

          {approvalRequests
            .filter(request => request.status === "pending")
            .map(request => (
              <div
                key={request.id}
                className="border border-amber-200 bg-white rounded-lg p-4"
              >
                <div className="flex flex-col gap-3">

                  <div>
                    <p className="font-medium text-slate-900">
                      {request.requestedBy?.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {request.requestedBy?.email}
                    </p>

                    <p className="text-sm text-slate-700 mt-2">
                      Requested Super Admin access for:
                    </p>

                    <p className="font-medium text-slate-900">
                      {request.requestedAdmin?.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {request.requestedAdmin?.email}
                    </p>

                    <p className="text-xs text-slate-400 mt-2">
                      Requested{" "}
                      {request.createdAt
                        ? new Date(
                            request.createdAt
                          ).toLocaleString()
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() =>
                        rejectApprovalRequest(request.id)
                      }
                    >
                      Reject
                    </Button>

                    <Button
                      size="sm"
                      className="bg-green-700 hover:bg-green-800 text-white"
                      onClick={() =>
                        approveApprovalRequest(request.id)
                      }
                    >
                      Approve
                    </Button>

                  </div>

                </div>
              </div>
            ))}

        </div>
      )}

    </CardContent>
  </Card>
)}

    {/* Admin list */}
    {filtered.length === 0 ? (
      <Card className="border-slate-200">
        <CardContent className="p-10 sm:p-12 text-center text-slate-400">
          <Shield className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p>No admins found</p>
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-3 min-w-0">

        {filtered.map(admin => {
          const self = isSelf(admin);
          const seeded = isSeeded(admin);
          const isAdminSuper = admin.accessLevel === 'super';

          const permCount = Object.values(
            admin.permissions ?? {}
          ).filter(Boolean).length;

          return (
            <Card
              key={admin.id}
              className={`
                w-full min-w-0 overflow-hidden
                border-slate-200
                transition-all
                hover:shadow-sm
                ${
                  admin.suspended
                    ? 'border-red-200 bg-red-50'
                    : isAdminSuper
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'bg-white'
                }
              `}
            >
              <CardContent className="p-4">

                {/* Admin information */}
                <div className="flex flex-col gap-4">

                  {/* Identity */}
                  <div className="flex items-start gap-3 min-w-0">

                    {/* Avatar */}
                    <div
                      className={`
                        w-11 h-11 rounded-full
                        flex items-center justify-center
                        font-bold text-sm shrink-0
                        ${
                          isAdminSuper
                            ? 'bg-blue-900 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }
                      `}
                    >
                      {admin.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">

                      <div className="flex items-center gap-2 flex-wrap">

                        <span className="font-semibold text-slate-900 break-words">
                          {admin.name}
                        </span>

                        {self && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                            You
                          </Badge>
                        )}

                        {isAdminSuper && (
                          <Badge className="bg-blue-900 text-white text-xs">
                            Super Admin
                          </Badge>
                        )}

                        {!isAdminSuper &&
                          admin.accessLevel === 'full' && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Full Access
                            </Badge>
                          )}

                        {admin.accessLevel === 'restricted' && (
                          <Badge className="bg-slate-100 text-slate-700 text-xs">
                            Restricted
                          </Badge>
                        )}

                        {admin.suspended && (
                          <Badge className="bg-red-700 text-white text-xs">
                            Suspended
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-slate-500 truncate mt-0.5">
                        {admin.email}
                      </p>

                      {!isAdminSuper && (
                        <p className="text-xs text-slate-400 mt-1">
                          {permCount} permission
                          {permCount !== 1 ? 's' : ''} granted
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-0.5">
                        Added{' '}
                        {new Date(
                          admin.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2">

                      {/* Transfer Super Admin */}
                      {isSuper &&
                        !self &&
                        !seeded &&
                        !isAdminSuper && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto h-9 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                            onClick={() =>
                              setTransferTarget(admin)
                            }
                          >
                            <Shield className="w-3.5 h-3.5 mr-1" />
                            Transfer Super Admin
                          </Button>
                        )}

                      {/* Demote Super Admin */}
                      {isSuper &&
                        !self &&
                        !seeded &&
                        isAdminSuper && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto h-9 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() =>
                              setDemoteTarget(admin)
                            }
                          >
                            <UserMinus className="w-3.5 h-3.5 mr-1" />
                            Demote
                          </Button>
                        )}

                      {/* Permissions */}
                      {isSuper &&
                        !isAdminSuper &&
                        !self && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto h-9 text-xs border-blue-200 text-blue-900 hover:bg-blue-50"
                            onClick={() =>
                              openPermEditor(admin)
                            }
                          >
                            <Settings2 className="w-3.5 h-3.5 mr-1" />
                            Permissions
                          </Button>
                        )}

                      {/* Reset Password */}
                      {isSuper && !self && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setResetTarget(admin);
                            setNewPassword('');
                          }}
                        >
                          <KeyRound className="w-3.5 h-3.5 mr-1" />
                          Reset PW
                        </Button>
                      )}

                      {/* Suspend / Reinstate */}
                      {isSuper &&
                        !self &&
                        !seeded && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={`
                              w-full sm:w-auto h-9 text-xs
                              ${
                                admin.suspended
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                  : 'border-orange-300 text-orange-700 hover:bg-orange-50'
                              }
                            `}
                            onClick={() =>
                              toggleSuspend(admin)
                            }
                          >
                            {admin.suspended ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                Reinstate
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Suspend
                              </>
                            )}
                          </Button>
                        )}

                      {/* Delete */}
                      {isSuper &&
                        !self &&
                        !seeded && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto h-9 text-xs border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setDeleteTarget(admin)
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Delete
                          </Button>
                        )}

                      {/* Protected */}
                      {seeded && !self && (
                        <div className="col-span-2 sm:col-span-1 flex items-center justify-center sm:justify-start">
                          <span className="text-xs text-slate-400 italic">
                            Protected account
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

              </CardContent>
            </Card>
          );
        })}

      </div>
    )}

    {/* ====================================================== */}
    {/* TRANSFER SUPER ADMIN DIALOG */}
    {/* ====================================================== */}

    {transferTarget && (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !transferring) {
            setTransferTarget(null);
          }
        }}
      >
        <DialogContent>

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-700" />
              Transfer Super Admin
            </DialogTitle>

            <DialogDescription>
              Transfer Super Admin access to{' '}
              <strong>{transferTarget.name}</strong>{' '}
              ({transferTarget.email})?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Important:</strong> Your current Super Admin
            access will be removed after the transfer.
          </div>

          <div className="flex gap-2 justify-end pt-2">

            <Button
              variant="outline"
              disabled={transferring}
              onClick={() => setTransferTarget(null)}
            >
              Cancel
            </Button>

            <Button
              className="bg-purple-700 hover:bg-purple-800 text-white"
              disabled={transferring}
              onClick={async () => {
                if (!transferTarget) return;

                setTransferring(true);

                try {
                  await UserService.transferSuperAdmin(
                    transferTarget.id
                  );

                  AdminAuditService.log(
                    'Super Admin Transferred',
                    `Super Admin transferred to ${transferTarget.name} (${transferTarget.email})`
                  );

                  toast.success(
                    `Super Admin access transferred to ${transferTarget.name}`
                  );

                  setTransferTarget(null);
                  await load();
                } catch (e: any) {
                  toast.error(
                    e.message ||
                      'Failed to transfer Super Admin'
                  );
                } finally {
                  setTransferring(false);
                }
              }}
            >
              <Shield className="w-4 h-4 mr-1" />
              {transferring
                ? 'Transferring…'
                : 'Confirm Transfer'}
            </Button>

          </div>

        </DialogContent>
      </Dialog>
    )}

    {/* ====================================================== */}
    {/* DEMOTE DIALOG */}
    {/* ====================================================== */}

    {demoteTarget && (
      <Dialog
        open
        onOpenChange={() => setDemoteTarget(null)}
      >
        <DialogContent>

          <DialogHeader>
            <DialogTitle>
              Demote to Customer
            </DialogTitle>

            <DialogDescription>
              Demote{' '}
              <strong>{demoteTarget.name}</strong>{' '}
              back to a customer account? Their account and
              order history will be preserved but admin access
              will be removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 justify-end pt-2">

            <Button
              variant="outline"
              onClick={() => setDemoteTarget(null)}
            >
              Cancel
            </Button>

            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={async () => {
                try {
                  await UserService.demote(demoteTarget.id);

                  AdminAuditService.log(
                    'Admin Demoted to Customer',
                    `${demoteTarget.name} (${demoteTarget.email})`
                  );

                  setAdmins(prev =>
                    prev.filter(
                      a => a.id !== demoteTarget.id
                    )
                  );

                  toast.success(
                    `${demoteTarget.name} has been demoted to customer`
                  );

                  setDemoteTarget(null);
                } catch (e: any) {
                  toast.error(
                    e.message || 'Failed to demote'
                  );
                }
              }}
            >
              <UserMinus className="w-4 h-4 mr-1" />
              Demote to Customer
            </Button>

          </div>

        </DialogContent>
      </Dialog>
    )}

    {/* ====================================================== */}
    {/* CREATE ADMIN DIALOG */}
    {/* ====================================================== */}

    <Dialog
      open={createOpen}
      onOpenChange={o => {
        setCreateOpen(o);

        if (!o) {
          setCreateForm({
            name: '',
            email: '',
            password: '',
          });
        }
      }}
    >
      <DialogContent className="max-w-md">

        <DialogHeader>
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogDescription>
            Create an admin account. Permissions can be
            configured afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">

          <div className="space-y-1">
            <Label>Full Name</Label>
            <Input
              value={createForm.name}
              onChange={e =>
                setCreateForm(f => ({
                  ...f,
                  name: e.target.value,
                }))
              }
              placeholder="Admin Name"
            />
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={createForm.email}
              onChange={e =>
                setCreateForm(f => ({
                  ...f,
                  email: e.target.value,
                }))
              }
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1">
            <Label>Password</Label>
            <Input
              type="text"
              value={createForm.password}
              onChange={e =>
                setCreateForm(f => ({
                  ...f,
                  password: e.target.value,
                }))
              }
              placeholder="Min 6 characters"
            />
          </div>

          <p className="text-xs text-gray-400">
            New admin will start with no permissions. Use the
            Permissions editor to grant access.
          </p>

          <div className="flex gap-2 justify-end">

            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>

            <Button
              className="bg-blue-900 hover:bg-blue-800 text-white"
              onClick={createAdmin}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create Admin'}
            </Button>

          </div>

        </div>

      </DialogContent>
    </Dialog>

    {/* ====================================================== */}
    {/* PERMISSION EDITOR */}
    {/* ====================================================== */}

    {permTarget && (
      <Dialog
        open
        onOpenChange={o => {
          if (!o) setPermTarget(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-900" />
              Permissions — {permTarget.name}
            </DialogTitle>

            <DialogDescription>
              Configure what this admin can access and do.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-3 border-b flex-wrap">

            <Label className="text-sm shrink-0">
              Apply preset:
            </Label>

            <Select onValueChange={applyPreset}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Choose a preset…" />
              </SelectTrigger>

              <SelectContent>
                {PERMISSION_PRESETS.map(p => (
                  <SelectItem
                    key={p.name}
                    value={p.name}
                  >
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">

              <Button
                variant="outline"
                size="sm"
                className="text-xs text-gray-500"
                onClick={() => setPermissions({})}
              >
                Clear All
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs text-green-700 border-green-300"
                onClick={() => {
                  const allPerms: Record<string, boolean> = {};

                  PERMISSION_GROUPS.forEach(g =>
                    g.perms.forEach(p => {
                      allPerms[p.key] = true;
                    })
                  );

                  setPermissions(allPerms);
                }}
              >
                Grant All
              </Button>

            </div>
          </div>

          <div className="space-y-2 py-2">

            {PERMISSION_GROUPS.map(group => {

              const keys = group.perms.map(
                p => p.key
              );

              const allGranted = keys.every(
                k => permissions[k]
              );

              const someGranted = keys.some(
                k => permissions[k]
              );

              const isExpanded =
                expandedGroups[group.label] !== false;

              return (
                <div
                  key={group.label}
                  className="border rounded-xl overflow-hidden"
                >

                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() =>
                      toggleGroup(group.label)
                    }
                  >
                    <div className="flex items-center gap-3">

                      <div
                        className={`
                          w-2 h-2 rounded-full
                          ${
                            allGranted
                              ? 'bg-green-500'
                              : someGranted
                              ? 'bg-yellow-400'
                              : 'bg-gray-300'
                          }
                        `}
                      />

                      <span className="font-medium text-gray-800 text-sm">
                        {group.label}
                      </span>

                      <span className="text-xs text-gray-400">
                        {
                          keys.filter(
                            k => permissions[k]
                          ).length
                        }
                        /{keys.length}
                      </span>

                    </div>

                    <div className="flex items-center gap-2">

                      <span
                        className="text-xs text-blue-900 hover:underline px-1"
                        onClick={e => {
                          e.stopPropagation();
                          selectAllInGroup(
                            keys,
                            !allGranted
                          );
                        }}
                      >
                        {allGranted
                          ? 'Deselect all'
                          : 'Select all'}
                      </span>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}

                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">

                      {group.perms.map(perm => (
                        <label
                          key={perm.key}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={!!permissions[perm.key]}
                            onChange={() =>
                              togglePerm(perm.key)
                            }
                            className="w-4 h-4 rounded accent-blue-900"
                          />

                          <span className="text-sm text-gray-800 group-hover:text-blue-900 transition-colors">
                            {perm.label}
                          </span>
                        </label>
                      ))}

                    </div>
                  )}

                </div>
              );
            })}

          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">

            <Button
              variant="outline"
              onClick={() => setPermTarget(null)}
            >
              Cancel
            </Button>

            <Button
              className="bg-blue-900 hover:bg-blue-800 text-white"
              onClick={savePermissions}
              disabled={savingPerms}
            >
              {savingPerms
                ? 'Saving…'
                : 'Save Permissions'}
            </Button>

          </div>

        </DialogContent>
      </Dialog>
    )}

    {/* ====================================================== */}
    {/* RESET PASSWORD */}
    {/* ====================================================== */}

    {resetTarget && (
      <Dialog
        open
        onOpenChange={() => {
          setResetTarget(null);
          setNewPassword('');
        }}
      >
        <DialogContent>

          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>

            <DialogDescription>
              Set a new password for{' '}
              <strong>{resetTarget.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">

            <div className="space-y-1">
              <Label>New Password</Label>

              <Input
                type="text"
                value={newPassword}
                onChange={e =>
                  setNewPassword(e.target.value)
                }
                placeholder="Min 6 characters"
              />
            </div>

            <div className="flex gap-2 justify-end">

              <Button
                variant="outline"
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-900 hover:bg-blue-800 text-white"
                onClick={resetAdminPassword}
              >
                <KeyRound className="w-4 h-4 mr-1" />
                Reset
              </Button>

            </div>

          </div>

        </DialogContent>
      </Dialog>
    )}

    {/* ====================================================== */}
    {/* DELETE CONFIRMATION */}
    {/* ====================================================== */}

    {deleteTarget && (
      <Dialog
        open
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>

          <DialogHeader>
            <DialogTitle>
              Delete Admin Account
            </DialogTitle>

            <DialogDescription>
              Permanently delete{' '}
              <strong>{deleteTarget.name}</strong>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 justify-end pt-2">

            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>

            <Button
              className="bg-red-700 hover:bg-red-800 text-white"
              onClick={deleteAdmin}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Account
            </Button>

          </div>

        </DialogContent>
      </Dialog>
    )}
  </div>
);
}