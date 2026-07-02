import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Users, Calendar } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8000/api";

export const AdminPanel = () => {
  const { session } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold font-mono tracking-tight" data-testid="admin-title">ADMIN PANEL</h1>
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">SYSTEM ADMINISTRATION</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle className="font-mono text-sm uppercase tracking-wide flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono" data-testid="total-users">{users.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="font-mono">Usuários Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-mono">Carregando...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="users-table">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-mono text-sm uppercase tracking-wide">Email</th>
                      <th className="text-left py-3 px-4 font-mono text-sm uppercase tracking-wide">Data de Criação</th>
                      <th className="text-left py-3 px-4 font-mono text-sm uppercase tracking-wide">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} data-testid={`user-row-${user.id}`} className="border-b border-border hover:bg-accent/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-sm">{user.email}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{user.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};