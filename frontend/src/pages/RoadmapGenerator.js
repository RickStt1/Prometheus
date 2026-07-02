import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8000/api";

export const RoadmapGenerator = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [goal, setGoal] = useState('');
  const [timeAvailable, setTimeAvailable] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const response = await axios.post(
        `${API}/roadmaps/generate`,
        { goal, time_available: timeAvailable, current_level: currentLevel },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setPreview(response.data);
      toast.success('Roadmap gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar roadmap. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const totalItems = preview.modules.reduce(
        (total, module) => total + module.topics.length,
        0
      );

      const response = await axios.post(
        `${API}/roadmaps`,
        {
          title: preview.title,
          description: preview.description,
          goal,
          time_available: timeAvailable,
          current_level: currentLevel,
          structure: preview,
          total_items: totalItems
        },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      toast.success('Roadmap salvo com sucesso!');
      navigate(`/roadmap/${response.data.id}`);
    } catch (error) {
      toast.error('Erro ao salvar roadmap');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    setPreview(null);
  };

  const countTotalItems = () => {
    if (!preview) return 0;
    return preview.modules.reduce((total, module) => total + module.topics.length, 0);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-mono tracking-tight" data-testid="generator-title">GERADOR DE ROADMAP</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">AI-POWERED LEARNING PATH</p>
        </div>

        {!preview ? (
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle className="font-mono">Configuração do Roadmap</CardTitle>
              <CardDescription>Preencha as informações para gerar seu roadmap personalizado</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="goal" className="font-mono text-sm uppercase tracking-wide">Objetivo Principal</Label>
                  <Textarea
                    id="goal"
                    data-testid="goal-input"
                    placeholder="Ex: Obter a certificação CEH (Certified Ethical Hacker)"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required
                    className="rounded-sm font-mono min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="font-mono text-sm uppercase tracking-wide">Disponibilidade de Tempo</Label>
                  <Select value={timeAvailable} onValueChange={setTimeAvailable} required>
                    <SelectTrigger data-testid="time-select" className="rounded-sm font-mono">
                      <SelectValue placeholder="Selecione sua disponibilidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2 horas/dia">1-2 horas/dia</SelectItem>
                      <SelectItem value="3-4 horas/dia">3-4 horas/dia</SelectItem>
                      <SelectItem value="5+ horas/dia">5+ horas/dia</SelectItem>
                      <SelectItem value="Fins de semana">Fins de semana</SelectItem>
                      <SelectItem value="Período integral">Período integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level" className="font-mono text-sm uppercase tracking-wide">Nível Atual</Label>
                  <Select value={currentLevel} onValueChange={setCurrentLevel} required>
                    <SelectTrigger data-testid="level-select" className="rounded-sm font-mono">
                      <SelectValue placeholder="Selecione seu nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Iniciante">Iniciante</SelectItem>
                      <SelectItem value="Básico">Básico</SelectItem>
                      <SelectItem value="Intermediário">Intermediário</SelectItem>
                      <SelectItem value="Avançado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  data-testid="generate-button"
                  type="submit"
                  className="w-full rounded-sm font-mono uppercase tracking-wide"
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando Roadmap...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Roadmap
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="rounded-sm border-primary">
              <CardHeader>
                <CardTitle className="font-mono text-2xl" data-testid="preview-title">{preview.title}</CardTitle>
                <CardDescription>{preview.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-mono">Total de Itens:</span>
                    <span className="font-mono font-semibold" data-testid="total-items">{countTotalItems()}</span>
                  </div>

                  <div className="space-y-4">
                    {preview.modules.map((module, idx) => (
                      <div key={module.id} className="border border-border rounded-sm p-4">
                        <h3 className="font-mono font-semibold mb-2" data-testid={`module-title-${idx}`}>
                          {idx + 1}. {module.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                        <ul className="space-y-2 pl-4">
                          {module.topics.map((topic) => (
                            <li key={topic.id} className="text-sm flex items-start" data-testid={`topic-${topic.id}`}>
                              <span className="text-primary mr-2">→</span>
                              <div className="flex-1">
                                <span className="font-medium">{topic.title}</span>
                                <span className="text-muted-foreground ml-2">({topic.estimatedHours}h)</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                data-testid="save-roadmap-button"
                onClick={handleSave}
                className="flex-1 rounded-sm font-mono uppercase tracking-wide"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Confirmar e Salvar'}
              </Button>
              <Button
                data-testid="regenerate-button"
                onClick={handleRegenerate}
                variant="outline"
                className="rounded-sm font-mono uppercase tracking-wide"
              >
                Regerar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};