import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Bell, BellOff, CheckCircle2, Trash2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8000/api";

export const RoadmapView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedItems, setCompletedItems] = useState(new Set());
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('19:00');
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchRoadmap();
    setNotificationPermission(Notification.permission);
  }, [id]);

  const fetchRoadmap = async () => {
    try {
      const response = await axios.get(`${API}/roadmaps/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setRoadmap(response.data);
      setCompletedItems(new Set(response.data.completed_items));
      setNotificationEnabled(response.data.notification_enabled || false);
      setNotificationTime(response.data.notification_time || '19:00');
    } catch (error) {
      toast.error('Erro ao carregar roadmap');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId, checked) => {
    try {
      // Atualizar estado local primeiro (otimismo)
      const newCompleted = new Set(completedItems);
      if (checked) {
        newCompleted.add(itemId);
      } else {
        newCompleted.delete(itemId);
      }
      setCompletedItems(newCompleted);

      // Enviar para o servidor
      const response = await axios.post(
        `${API}/roadmaps/${id}/toggle-item`,
        { item_id: itemId, completed: checked },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      // Atualizar roadmap com o progresso correto do servidor
      if (response.data && typeof response.data.progress === 'number') {
        setRoadmap(prev => ({
          ...prev,
          progress: response.data.progress,
          total_items: response.data.total_items || prev.total_items
        }));
      }
    } catch (error) {
      // Reverter estado local se falhar
      const revertedCompleted = new Set(completedItems);
      if (checked) {
        revertedCompleted.delete(itemId);
      } else {
        revertedCompleted.add(itemId);
      }
      setCompletedItems(revertedCompleted);
      toast.error('Erro ao atualizar progresso');
    }
  };

  const handleEnableNotifications = async (enabled) => {
    if (enabled && notificationPermission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        toast.error('Permissão de notificação negada');
        return;
      }
    }

    if (enabled && notificationPermission === 'denied') {
      toast.error('Permissão de notificação bloqueada. Habilite nas configurações do navegador.');
      return;
    }

    try {
      await axios.put(
        `${API}/roadmaps/${id}/notifications`,
        { notification_enabled: enabled, notification_time: notificationTime },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setNotificationEnabled(enabled);
      toast.success(enabled ? 'Notificações ativadas' : 'Notificações desativadas');

      if (enabled && notificationPermission === 'granted') {
        scheduleNotification();
      }
    } catch (error) {
      toast.error('Erro ao configurar notificações');
    }
  };

  const scheduleNotification = () => {
    const [hours, minutes] = notificationTime.split(':');
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime - now - (10 * 60 * 1000);

    setTimeout(() => {
      new Notification('Hora de Estudar!', {
        body: `Lembrete: Seu horário de estudo começa em 10 minutos (${roadmap.title})`,
        icon: '/favicon.ico',
        tag: 'study-reminder'
      });
    }, timeUntilNotification);
  };

  const getProgressPercentage = () => {
    if (!roadmap || roadmap.total_items === 0) return 0;
    return Math.round((roadmap.progress / roadmap.total_items) * 100);
  };

  const handleDeleteRoadmap = async () => {
    try {
      await axios.delete(`${API}/roadmaps/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      toast.success('Roadmap deletado com sucesso');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao deletar roadmap');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground font-mono">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!roadmap) return null;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Button
            data-testid="back-button"
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="rounded-sm font-mono"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="rounded-sm font-mono uppercase tracking-wide text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar Roadmap
          </Button>
        </div>

        <div>
          <h1 className="text-4xl font-bold font-mono tracking-tight" data-testid="roadmap-title">{roadmap.title}</h1>
          <p className="text-muted-foreground mt-2">{roadmap.description}</p>
          <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
            <span className="font-mono">Objetivo: {roadmap.goal}</span>
            <span className="font-mono">Nível: {roadmap.current_level}</span>
            <span className="font-mono">Tempo: {roadmap.time_available}</span>
          </div>
        </div>

        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="font-mono">Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold font-mono" data-testid="progress-count">
                  {roadmap.progress} / {roadmap.total_items}
                </span>
                <span className="text-2xl font-bold font-mono text-primary">
                  {getProgressPercentage()}%
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configure lembretes para seus horários de estudo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications" className="font-mono">Ativar Notificações</Label>
                <p className="text-sm text-muted-foreground">
                  Receba lembretes 10 minutos antes do horário de estudo
                </p>
              </div>
              <Switch
                id="notifications"
                data-testid="notification-toggle"
                checked={notificationEnabled}
                onCheckedChange={handleEnableNotifications}
              />
            </div>

            {notificationEnabled && (
              <div className="space-y-2">
                <Label htmlFor="time" className="font-mono">Horário de Estudo</Label>
                <Input
                  id="time"
                  data-testid="notification-time-input"
                  type="time"
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="rounded-sm font-mono w-40"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {roadmap?.structure?.modules && Array.isArray(roadmap.structure.modules) ?
            roadmap.structure.modules.map((module, moduleIdx) => (
              <Card key={module.id} className="rounded-sm">
                <CardHeader>
                  <CardTitle className="font-mono" data-testid={`module-title-${moduleIdx}`}>
                    {moduleIdx + 1}. {module.title}
                  </CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {module.topics && Array.isArray(module.topics) ? module.topics.map((topic) => {
                      const isCompleted = completedItems.has(topic.id);
                      return (
                        <div
                          key={topic.id}
                          data-testid={`topic-item-${topic.id}`}
                          className="flex items-start space-x-3 p-3 rounded-sm border border-border hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            data-testid={`checkbox-${topic.id}`}
                            checked={isCompleted}
                            onCheckedChange={(checked) => handleToggleItem(topic.id, checked)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {topic.title}
                              </span>
                              {isCompleted && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              Estimativa: {topic.estimatedHours}h
                            </p>
                          </div>
                        </div>
                      );
                    }) : null}
                  </div>
                </CardContent>
              </Card>
            ))
            : (
              <Card className="rounded-sm">
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">Estrutura do roadmap não disponível</p>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Roadmap?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{roadmap?.title}"? Todos os seus dados serão perdidos e esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoadmap}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};