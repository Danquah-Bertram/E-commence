import { useState, useEffect } from 'react';
import { User, ContactMessage } from '../../types';
import { MessageService, AdminAuditService, can, PERM } from '../../services/dataService';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { MessageSquare, Mail, Phone, Trash, Eye, Search, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Props { currentUser: User | null; isSuper: boolean; onNavigate: (s: any) => void; onMessageCountChange?: (n: number) => void; }

type Filter = 'all' | 'unread' | 'awaiting' | 'replied' | 'closed';

export default function AdminMessages({ currentUser, isSuper, onMessageCountChange }: Props) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const canReply = isSuper || can(currentUser, PERM.REPLY_MESSAGES);
  const canDelete = isSuper || can(currentUser, PERM.DELETE_MESSAGES);
  const canClose = isSuper || can(currentUser, PERM.CLOSE_CONVERSATIONS);

  useEffect(() => { if (isSuper || can(currentUser, PERM.VIEW_MESSAGES)) load(); }, []);

  const load = async () => {
    setLoading(true);
    const msgs = await MessageService.getAll();
    const sorted = [...msgs].reverse();
    setMessages(sorted);
    onMessageCountChange?.(sorted.filter(m => !m.read).length);
    setLoading(false);
  };

  const filtered = messages.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase()) && !m.subject.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'unread') return !m.read;
    if (filter === 'awaiting') return m.read && !m.adminReply && !m.closed;
    if (filter === 'replied') return !!m.adminReply && !m.closed;
    if (filter === 'closed') return !!m.closed;
    return true;
  });

  const counts = {
    all: messages.length,
    unread: messages.filter(m => !m.read).length,
    awaiting: messages.filter(m => m.read && !m.adminReply && !m.closed).length,
    replied: messages.filter(m => !!m.adminReply && !m.closed).length,
    closed: messages.filter(m => !!m.closed).length,
  };

  const open = async (msg: ContactMessage) => {
    setExpanded(msg.id); setReplyText(msg.adminReply ?? '');
    if (!msg.read) { await MessageService.markRead(msg.id); setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m)); }
  };

  const sendReply = async (msg: ContactMessage) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await MessageService.reply(msg.id, replyText.trim());
      AdminAuditService.log('Message Replied', `Subject: "${msg.subject}" from ${msg.name}`);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, adminReply: replyText.trim(), repliedAt: new Date().toISOString(), read: true } : m));
      toast.success('Reply saved');
    } catch { toast.error('Failed'); } finally { setSending(false); }
  };

  const closeConversation = async (id: string, name: string) => {
    await MessageService.markRead(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, closed: true } : m));
    AdminAuditService.log('Conversation Closed', `From: ${name}`);
    toast.success('Conversation closed');
  };

  const deleteMsg = async (id: string, subject: string, name: string) => {
    await MessageService.delete(id);
    AdminAuditService.log('Message Deleted', `Subject: "${subject}" from ${name}`);
    setMessages(prev => prev.filter(m => m.id !== id));
    if (expanded === id) setExpanded(null);
    toast.success('Deleted');
  };

  if (!isSuper && !can(currentUser, PERM.VIEW_MESSAGES)) return <div className="text-center py-20 text-gray-400">You do not have permission to view messages.</div>;
  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-blue-950">Customer Messages</h2>
        <Badge variant="outline">{messages.length} total · {counts.unread} unread</Badge>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['all', 'unread', 'awaiting', 'replied', 'closed'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${filter === f ? 'bg-blue-900 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            {f} {counts[f] > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${filter === f ? 'bg-white/20' : 'bg-gray-300'}`}>{counts[f]}</span>}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search messages…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0
        ? <Card><CardContent className="p-12 text-center text-gray-400"><MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />No messages</CardContent></Card>
        : (
          <div className="space-y-3">
            {filtered.map(msg => {
              const isOpen = expanded === msg.id;
              return (
                <Card key={msg.id} className={`transition-all ${!msg.read ? 'border-blue-900 shadow-sm' : msg.closed ? 'border-gray-200 opacity-70' : msg.adminReply ? 'border-green-200' : ''}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!msg.read && <Badge className="bg-blue-900 text-white text-xs">New</Badge>}
                          {msg.adminReply && !msg.closed && <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">Replied</Badge>}
                          {msg.closed && <Badge className="bg-gray-200 text-gray-600 text-xs">Closed</Badge>}
                          <span className="font-semibold text-gray-900">{msg.name}</span>
                          <span className="text-gray-400 text-sm truncate">· {msg.subject}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{msg.email}</span>
                          {msg.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{msg.phone}</span>}
                        </div>
                        <p className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="border-blue-900 text-blue-900 hover:bg-blue-50" onClick={() => isOpen ? setExpanded(null) : open(msg)}><Eye className="w-4 h-4 mr-1" />{isOpen ? 'Close' : 'Open'}</Button>
                        {canDelete && <Button size="sm" variant="outline" className="border-red-200 hover:bg-red-50" onClick={() => deleteMsg(msg.id, msg.subject, msg.name)}><Trash className="w-4 h-4 text-red-700" /></Button>}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="space-y-3 border-t pt-3">
                        <div><p className="text-xs text-gray-400 mb-1">Message:</p><p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{msg.message}</p></div>
                        {msg.adminReply && <div><p className="text-xs text-gray-400 mb-1">Reply sent {msg.repliedAt ? new Date(msg.repliedAt).toLocaleString() : ''}:</p><p className="text-sm text-green-800 bg-green-50 rounded-lg p-3 whitespace-pre-wrap">{msg.adminReply}</p></div>}
                        {canReply && !msg.closed && (
                          <div className="space-y-2">
                            <Label className="text-sm">{msg.adminReply ? 'Update reply:' : 'Write a reply:'}</Label>
                            <Textarea rows={3} placeholder={`Reply to ${msg.name}…`} value={replyText} onChange={e => setReplyText(e.target.value)} />
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-blue-900 hover:bg-blue-800 text-white" disabled={!replyText.trim() || sending} onClick={() => sendReply(msg)}>{sending ? 'Saving…' : msg.adminReply ? 'Update Reply' : 'Send Reply'}</Button>
                              {canClose && <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50" onClick={() => closeConversation(msg.id, msg.name)}><CheckCheck className="w-3.5 h-3.5 mr-1" />Close</Button>}
                              <p className="text-xs text-gray-400 self-center">Direct: <a href={`mailto:${msg.email}`} className="text-blue-900 hover:underline">{msg.email}</a></p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
