import React from 'react';
import AdminLayout from '@/components/layout/admin-layout';
import UsersList from './components/users-list';

export default function UsersPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Usuários</h1>
        <UsersList />
      </div>
    </AdminLayout>
  );
}