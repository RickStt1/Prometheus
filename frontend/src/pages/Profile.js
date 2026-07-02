import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Camera, Mail, Shield, Star, Trophy } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api';
const BADGE_SLOTS = 6;

export const Profile = () => {
    const { session, isAdmin, updateLocalProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFileName, setAvatarFileName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const badgeSlots = useMemo(() => {
        return Array.from({ length: BADGE_SLOTS }, (_, index) => ({
            id: `badge-slot-${index + 1}`,
            label: `Insignia ${index + 1}`
        }));
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!session?.access_token) {
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${API}/profile`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });

                setProfile(response.data);
                setDisplayName(response.data.display_name || '');
                setBio(response.data.bio || '');
                setAvatarUrl(response.data.avatar_url || '');
                setAvatarFileName('');
            } catch (error) {
                toast.error('Erro ao carregar perfil');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [session?.access_token]);

    const handleAvatarUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Selecione um arquivo de imagem válido');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setAvatarUrl(reader.result);
                setAvatarFileName(file.name);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        if (!session?.access_token) return;

        setSaving(true);

        try {
            const payload = {
                display_name: displayName,
                bio,
                avatar_url: avatarUrl
            };

            const response = await axios.put(`${API}/profile`, payload, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            setProfile(response.data);
            setDisplayName(response.data.display_name || '');
            setBio(response.data.bio || '');
            setAvatarUrl(response.data.avatar_url || '');
            updateLocalProfile({
                display_name: response.data.display_name,
                bio: response.data.bio,
                avatar_url: response.data.avatar_url
            });

            toast.success('Perfil atualizado com sucesso');
        } catch (error) {
            const detail = error?.response?.data?.detail;
            toast.error(detail || 'Erro ao salvar perfil');
        } finally {
            setSaving(false);
        }
    };

    const profileName = profile?.display_name?.trim() || profile?.email || 'Usuário';
    const profileBio = profile?.bio || 'Sem biografia definida.';
    const stats = profile?.stats || {
        level: 1,
        total_xp: 0,
        current_level_xp: 0,
        next_level_xp: 100,
        progress_percent: 0,
        roadmaps_count: 0,
        total_hours: 0
    };

    return (
        <Layout>
            <div className="max-w-6xl space-y-8">
                <div>
                    <h1 className="text-4xl font-bold font-mono tracking-tight" data-testid="profile-title">MEU PERFIL</h1>
                    <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">PROMETHEUS PROFILE</p>
                </div>

                {loading ? (
                    <Card className="rounded-sm">
                        <CardContent className="py-8">
                            <p className="text-muted-foreground font-mono">Carregando perfil...</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="rounded-sm overflow-hidden">
                            <div className="h-24 bg-gradient-to-r from-primary/50 via-primary/30 to-transparent border-b border-border" />
                            <CardContent className="pt-0 pb-6">
                                <div className="flex flex-col md:flex-row gap-6 -mt-12">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-sm border-4 border-card bg-muted overflow-hidden">
                                            {profile?.avatar_url ? (
                                                <img
                                                    src={profile.avatar_url}
                                                    alt="Avatar do perfil"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-xs px-2 text-center">
                                                    Sem foto
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3 pt-2">
                                        <h2 className="text-3xl font-bold font-mono tracking-tight" data-testid="profile-display-name">
                                            {profileName}
                                        </h2>
                                        <p className="text-muted-foreground max-w-3xl" data-testid="profile-bio">
                                            {profileBio}
                                        </p>
                                        <div className="flex flex-wrap gap-2 text-xs font-mono uppercase tracking-wide">
                                            <span className="px-2 py-1 border border-border rounded-sm text-primary">Nível {stats.level}</span>
                                            <span className="px-2 py-1 border border-border rounded-sm text-muted-foreground">{stats.total_xp} XP total</span>
                                            <span className="px-2 py-1 border border-border rounded-sm text-muted-foreground">{stats.roadmaps_count} roadmaps</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2 space-y-6">
                                <Card className="rounded-sm">
                                    <CardHeader>
                                        <CardTitle className="font-mono">Editar Perfil</CardTitle>
                                        <CardDescription>Defina seu nome, foto e biografia pública no Prometheus</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="displayName" className="font-mono text-xs uppercase tracking-wide">Nome de Exibição</Label>
                                            <Input
                                                id="displayName"
                                                data-testid="profile-display-name-input"
                                                value={displayName}
                                                onChange={(event) => setDisplayName(event.target.value)}
                                                maxLength={40}
                                                placeholder="Como você quer aparecer no sistema"
                                                className="rounded-sm font-mono"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bio" className="font-mono text-xs uppercase tracking-wide">Biografia</Label>
                                            <Textarea
                                                id="bio"
                                                data-testid="profile-bio-input"
                                                value={bio}
                                                onChange={(event) => setBio(event.target.value)}
                                                maxLength={280}
                                                placeholder="Conte um pouco sobre sua jornada de estudos..."
                                                className="rounded-sm min-h-[110px]"
                                            />
                                            <p className="text-xs text-muted-foreground font-mono text-right">{bio.length}/280</p>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="font-mono text-xs uppercase tracking-wide">Foto de Perfil</Label>
                                            <div className="flex flex-col md:flex-row gap-3">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleAvatarUpload}
                                                    data-testid="profile-avatar-file-input"
                                                    className="rounded-sm"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="rounded-sm font-mono uppercase tracking-wide"
                                                >
                                                    <Camera className="h-4 w-4 mr-2" />
                                                    Escolher Foto
                                                </Button>
                                            </div>
                                            {avatarFileName ? (
                                                <p className="text-xs text-muted-foreground font-mono">Arquivo selecionado: {avatarFileName}</p>
                                            ) : null}
                                            {avatarUrl ? (
                                                <div className="w-24 h-24 rounded-sm border border-border overflow-hidden">
                                                    <img src={avatarUrl} alt="Prévia do avatar" className="w-full h-full object-cover" />
                                                </div>
                                            ) : null}
                                        </div>

                                        <Button
                                            data-testid="profile-save-button"
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="rounded-sm font-mono uppercase tracking-wide"
                                        >
                                            {saving ? 'Salvando...' : 'Salvar Perfil'}
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-sm" data-testid="profile-badges-card">
                                    <CardHeader>
                                        <CardTitle className="font-mono flex items-center gap-2">
                                            <Trophy className="h-5 w-5" />
                                            Insígnias
                                        </CardTitle>
                                        <CardDescription>Espaço reservado para insígnias de eventos especiais do Prometheus</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {badgeSlots.map((badge) => (
                                                <div
                                                    key={badge.id}
                                                    className="h-24 border border-dashed border-border rounded-sm flex flex-col items-center justify-center text-center px-2"
                                                >
                                                    <Star className="h-4 w-4 text-muted-foreground mb-2" />
                                                    <p className="text-xs text-muted-foreground font-mono">{badge.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">Em breve</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card className="rounded-sm" data-testid="profile-level-card">
                                    <CardHeader>
                                        <CardTitle className="font-mono">Nível da Conta</CardTitle>
                                        <CardDescription>XP calculado com base no total de horas estimadas dos seus roadmaps</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-end justify-between">
                                            <span className="text-sm text-muted-foreground font-mono uppercase tracking-wide">Level</span>
                                            <span className="text-4xl font-bold font-mono text-primary">{stats.level}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                                <span>XP no nível atual</span>
                                                <span>{stats.current_level_xp}/{stats.next_level_xp}</span>
                                            </div>
                                            <Progress value={stats.progress_percent} className="h-2" />
                                            <p className="text-xs text-right text-muted-foreground font-mono">{stats.progress_percent}%</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            <div className="p-3 border border-border rounded-sm">
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">XP Total</p>
                                                <p className="font-mono" data-testid="profile-total-xp">{stats.total_xp}</p>
                                            </div>
                                            <div className="p-3 border border-border rounded-sm">
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Horas acumuladas</p>
                                                <p className="font-mono">{stats.total_hours}h</p>
                                            </div>
                                            <div className="p-3 border border-border rounded-sm">
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Roadmaps criados</p>
                                                <p className="font-mono">{stats.roadmaps_count}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-sm" data-testid="profile-account-data-card">
                                    <CardHeader>
                                        <CardTitle className="font-mono">Dados da Conta</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 border border-border rounded-sm" data-testid="profile-email-row">
                                            <Mail className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Email</p>
                                                <p className="font-mono break-all" data-testid="profile-email-value">{profile?.email || 'Não disponível'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-3 border border-border rounded-sm" data-testid="profile-role-row">
                                            <Shield className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Permissão</p>
                                                <p className="font-mono">{isAdmin ? 'Administrador' : 'Usuário'}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};
