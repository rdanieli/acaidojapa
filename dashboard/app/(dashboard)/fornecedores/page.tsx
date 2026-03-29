'use client';

import React, { useState } from 'react';
import { useSuppliers, useAddSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/use-dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';

export default function FornecedoresPage() {
  const { data, isLoading } = useSuppliers();
  const addSupplier = useAddSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', notes: '' });

  const suppliersList = data?.suppliers ?? [];

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addSupplier.mutateAsync({
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewNotes('');
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      phone: s.phone || '',
      email: s.email || '',
      notes: s.notes || '',
    });
  };

  const saveEdit = () => {
    if (!editingId || !editForm.name.trim()) return;
    updateSupplier.mutate({
      id: editingId,
      name: editForm.name,
      phone: editForm.phone || undefined,
      email: editForm.email || undefined,
      notes: editForm.notes || undefined,
    });
    setEditingId(null);
  };

  const toggleActive = (s: any) => {
    updateSupplier.mutate({ id: s.id, active: !s.active });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      deleteSupplier.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-acai shadow-lg shadow-acai/20">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-xs text-muted-foreground/60">Gerencie seus fornecedores</p>
        </div>
      </div>

      {/* Add supplier form */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="h-4 w-4 text-acai" />
          <span className="text-sm font-semibold">Adicionar Fornecedor</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Nome *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 flex-1 min-w-[140px] bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <Input
            placeholder="Telefone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="h-8 w-36 bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <Input
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="h-8 flex-1 min-w-[180px] bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <Input
            placeholder="Observações"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="h-8 flex-1 min-w-[140px] bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || addSupplier.isPending}
            size="sm"
            className="h-8 bg-acai hover:bg-acai/80 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Suppliers table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
          ))}
        </div>
      ) : suppliersList.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <Truck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum fornecedor cadastrado.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Nome</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Telefone</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Email</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Observações</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersList.map((s: any) => {
                const isEditing = editingId === s.id;
                return (
                  <TableRow key={s.id} className="border-border/60 hover:bg-muted/50">
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-7 text-sm bg-muted/70 border-acai/30"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium">{s.name}</span>
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
                        <span className="text-sm text-muted-foreground">{s.phone || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="h-7 text-sm bg-muted/70 border-acai/30 w-44"
                          placeholder="Email"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{s.email || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="h-7 text-sm bg-muted/70 border-acai/30 w-40"
                          placeholder="Observações"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{s.notes || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(s)} disabled={updateSupplier.isPending}>
                        {s.active ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/25 cursor-pointer">Ativo</Badge>
                        ) : (
                          <Badge className="bg-red-500/15 text-red-600 border-red-500/20 hover:bg-red-500/25 cursor-pointer">Inativo</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveEdit}
                              disabled={updateSupplier.isPending}
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
                              onClick={() => startEdit(s)}
                              className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-acai hover:bg-acai/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(s.id)}
                              disabled={deleteSupplier.isPending}
                              className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
