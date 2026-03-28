'use client';

import React, { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Settings, Plus, Pencil, Check, X, UserPlus, Users, Power, PowerOff } from 'lucide-react';

const ROLES = [
  { value: 'owner', label: 'Dono' },
  { value: 'manager', label: 'Gerente' },
  { value: 'employee', label: 'Funcionário' },
];

function roleBadge(role: string) {
  switch (role) {
    case 'owner':
      return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/20 hover:bg-purple-500/15">Dono</Badge>;
    case 'manager':
      return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 hover:bg-blue-500/15">Gerente</Badge>;
    default:
      return <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/20 hover:bg-gray-500/15">Funcionário</Badge>;
  }
}

function roleLabel(value: string) {
  return ROLES.find((r) => r.value === value)?.label ?? value;
}

export default function ConfiguracoesPage() {
  const { data, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newPhone, setNewPhone] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '' });

  const usersList = data?.users ?? [];

  const handleAdd = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    setError('');
    try {
      await createUser.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        phone: newPhone.trim() || undefined,
      });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('employee');
      setNewPhone('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (u: any) => {
    setEditingId(u.id);
    setEditForm({
      name: u.name,
      role: u.role,
      phone: u.phone || '',
    });
  };

  const saveEdit = () => {
    if (!editingId || !editForm.name.trim()) return;
    updateUser.mutate({
      id: editingId,
      name: editForm.name,
      role: editForm.role,
      phone: editForm.phone || undefined,
    });
    setEditingId(null);
  };

  const toggleActive = (u: any) => {
    updateUser.mutate({ id: u.id, active: !u.active });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-acai shadow-lg shadow-acai/20">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
          <p className="text-xs text-muted-foreground/60">Gerenciamento de usuários e permissões</p>
        </div>
      </div>

      {/* Add user form */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-4 w-4 text-acai" />
          <span className="text-sm font-semibold">Adicionar Usuário</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Nome"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 flex-1 min-w-[140px] bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <Input
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="h-8 flex-1 min-w-[180px] bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <Input
            placeholder="Senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-8 w-36 bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="h-8 rounded-md bg-muted/50 border border-border px-2 text-xs text-muted-foreground"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <Input
            placeholder="Telefone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="h-8 w-36 bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || !newEmail.trim() || !newPassword.trim() || createUser.isPending}
            size="sm"
            className="h-8 bg-acai hover:bg-acai/80 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* Users table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
          ))}
        </div>
      ) : usersList.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum usuário cadastrado.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Nome</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Email</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Cargo</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Telefone</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Último login</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.map((u: any) => {
                const isEditing = editingId === u.id;
                return (
                  <TableRow key={u.id} className="border-border/60 hover:bg-muted/50">
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-7 text-sm bg-muted/70 border-acai/30"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium">{u.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{u.email}</span>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="h-7 rounded-md bg-muted/70 border border-acai/30 px-2 text-xs"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        roleBadge(u.role)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="h-7 text-sm bg-muted/70 border-acai/30 w-32"
                          placeholder="Telefone"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{u.phone || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">Ativo</Badge>
                      ) : (
                        <Badge className="bg-red-500/15 text-red-600 border-red-500/20 hover:bg-red-500/15">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground/60">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveEdit}
                              disabled={updateUser.isPending}
                              className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-muted-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(u)}
                              className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-acai hover:bg-acai/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(u)}
                              disabled={updateUser.isPending}
                              className={cn(
                                'h-7 w-7 p-0',
                                u.active
                                  ? 'text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10'
                                  : 'text-muted-foreground/50 hover:text-emerald-500 hover:bg-emerald-500/10',
                              )}
                              title={u.active ? 'Desativar' : 'Ativar'}
                            >
                              {u.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
