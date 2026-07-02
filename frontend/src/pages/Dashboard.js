import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Plus, BookOpen, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8000/api";

export const Dashboard = () => {
  const { session } = useAuth();
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, roadmapId: null, roadmapTitle: '' });

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const response = await axios.get(`${API}/roadmaps`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setRoadmaps(response.data);
    } catch (error) {
      toast.error('Erro ao carregar roadmaps');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e, roadmapId, roadmapTitle) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteDialog({ open: true, roadmapId, roadmapTitle });
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${API}/roadmaps/${deleteDialog.roadmapId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      toast.success('Roadmap deletado com sucesso');
      setDeleteDialog({ open: false, roadmapId: null, roadmapTitle: '' });
      fetchRoadmaps();
    } catch (error) {
      toast.error('Erro ao deletar roadmap');
    }
  };

  const getProgressPercentage = (progress, total) => {
    if (total === 0) return 0;
    return Math.round((progress / total) * 100);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold font-mono tracking-tight" data-testid="dashboard-title">DASHBOARD</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">MISSION CONTROL</p>
          </div>
          <Link to="/generate">
            <Button data-testid="create-roadmap-button" className="rounded-sm font-mono uppercase tracking-wide">
              <Plus className="h-4 w-4 mr-2" />
              Novo Roadmap
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-mono">Carregando...</p>
          </div>
        ) : roadmaps.length === 0 ? (
          <Card className="rounded-sm border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-mono mb-4">Nenhum roadmap criado ainda</p>
              <Link to="/generate">
                <Button data-testid="empty-state-create-button" className="rounded-sm font-mono uppercase tracking-wide">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Roadmap
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roadmaps.map((roadmap) => {
                const percentage = getProgressPercentage(roadmap.progress, roadmap.total_items);
                return (
                  <div key={roadmap.id}>
                    <Link to={`/roadmap/${roadmap.id}`}>
                      <Card data-testid={`roadmap-card-${roadmap.id}`} className="rounded-sm hover:border-primary/50 transition-colors h-full">
                        <CardHeader>
                          <CardTitle className="font-mono text-lg">{roadmap.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{roadmap.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground font-mono">Progresso</span>
                              <span className="font-mono font-semibold" data-testid={`roadmap-progress-${roadmap.id}`}>
                                {roadmap.progress}/{roadmap.total_items}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <p className="text-xs text-right text-muted-foreground font-mono">{percentage}%</p>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className="font-mono">
                              {new Date(roadmap.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-sm font-mono uppercase tracking-wide text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, roadmap.id, roadmap.title)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar Roadmap?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja deletar "{deleteDialog.roadmapTitle}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-3">
                  <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                  >
                    Deletar
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </Layout>
  );
};