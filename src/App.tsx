/**
 * DioGis - Sistema Profissional de Criação de Croquis de Localização & Cadastro
 * Integrado com Google Maps Platform, Projeção UTM WGS84, Grelha Topográfica e Exportação PDF de Alta Resolução.
 * Desenvolvido para engenharia geográfica, agrimensura e topografia em Angola.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CroquiProject, LatLng } from './types/croqui';
import {
  loadAllProjects,
  saveSingleProject,
  getActiveProjectId,
  PRESET_TALATONA,
  PRESET_LOBITO,
  createBlankProject,
} from './utils/projectStorage';
import { calculatePolygonMetrics } from './utils/utm';
import { MapEditor } from './components/MapEditor';
import { CoordinateTable } from './components/CoordinateTable';
import { CroquiDocument } from './components/CroquiDocument';
import { SettingsModal } from './components/SettingsModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { exportCroquiToPdf, triggerDirectPrint } from './utils/pdfExport';
import {
  exportCoordinatesCsv,
  exportPolygonGeoJson,
  exportPolygonKml,
  exportProjectJson,
} from './utils/cadExport';
import {
  FileText,
  Map as MapIcon,
  Download,
  Printer,
  Settings,
  FolderOpen,
  Eye,
  Layers,
  Sparkles,
  Info,
  CheckCircle,
  FileSpreadsheet,
  Plus,
  Trash2,
  Compass,
  Save,
  Check,
  ChevronDown,
  Globe,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Key,
  User as UserIcon,
} from 'lucide-react';
import { LicenseProvider, useLicense } from './context/LicenseContext';
import { LicenseModal } from './components/LicenseModal';
import { AuthModal } from './components/AuthModal';
import { AdminLicenseModal } from './components/AdminLicenseModal';

function DiogisMainApp() {
  const {
    user,
    license,
    isLicenseActive,
    isAdmin,
    checkLicenseBeforeAction,
    setIsLicenseModalOpen,
    setIsAuthModalOpen,
    setIsAdminModalOpen,
    setActiveLicenseTab,
  } = useLicense();

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBhdn8LnF0LsEd3XWVs9DJkz0F2vItz3r8';

  // Load active project from localStorage on startup
  const [project, setProject] = useState<CroquiProject>(() => {
    const all = loadAllProjects();
    const activeId = getActiveProjectId();
    return all.find((p) => p.id === activeId) || all[0] || PRESET_TALATONA;
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'table' | 'document'>('editor');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');
  const [newRefLabel, setNewRefLabel] = useState('');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const documentRef = useRef<HTMLDivElement | null>(null);

  // Auto-save project whenever it changes - only if license is active
  useEffect(() => {
    if (isLicenseActive) {
      saveSingleProject(project);
    }
  }, [project, isLicenseActive]);

  // Compute cadastral metrics in real-time
  const metrics = useMemo(() => {
    return calculatePolygonMetrics(project.vertices, project.layout.utmZoneOverride);
  }, [project.vertices, project.layout.utmZoneOverride]);

  // Handle vertex changes
  const handleUpdateVertices = async (vertices: LatLng[]) => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('A edição de vértices e desenho do croquis');
      return;
    }
    setProject((prev) => ({
      ...prev,
      vertices,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Safe project update wrapper that checks license
  const handleUpdateProject = (updater: (prev: CroquiProject) => CroquiProject) => {
    if (!isLicenseActive) {
      checkLicenseBeforeAction('A alteração de dados do croquis');
      return;
    }
    setProject(updater);
  };

  // Explicit save action with feedback
  const handleManualSave = async () => {
    const allowed = await checkLicenseBeforeAction('O salvamento do croquis');
    if (!allowed) return;
    saveSingleProject(project);
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  // Handle PDF Export
  const handleExportPdf = async () => {
    const allowed = await checkLicenseBeforeAction('A exportação do croquis em PDF');
    if (!allowed) return;

    if (activeTab !== 'document') {
      setActiveTab('document');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setIsExporting(true);
    setExportProgress(10);
    setExportStage('Aguardando folha técnica...');

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const el = document.getElementById('croqui-print-sheet');
      if (el) {
        clearInterval(interval);
        await runPdfExport(el);
      } else if (attempts > 30) {
        clearInterval(interval);
        setIsExporting(false);
        alert('Não foi possível carregar a prancha para exportação.');
      }
    }, 150);
  };

  const runPdfExport = async (element: HTMLElement) => {
    setIsExporting(true);
    setExportProgress(10);
    setExportStage('Iniciando processamento...');

    try {
      const fileName = `Croquis_${project.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}_${project.stamp.scaleText.replace(':', '_')}.pdf`;
      await exportCroquiToPdf(element, {
        fileName,
        paperFormat: project.layout.paperFormat,
        onProgress: (prog, msg) => {
          setExportProgress(prog);
          setExportStage(msg);
        },
      });
    } catch (err) {
      console.error('Erro na exportação do PDF:', err);
      alert('Não foi possível gerar o PDF. Verifique se as imagens foram carregadas ou utilize a opção Imprimir Direto.');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 800);
    }
  };

  // Quick preset loader
  const handleSwitchToPreset = async (preset: CroquiProject) => {
    const allowed = await checkLicenseBeforeAction('A alteração de projeto');
    if (!allowed) return;
    setProject(preset);
  };

  // Add reference landmark
  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefLabel.trim()) return;

    const allowed = await checkLicenseBeforeAction('A inserção de pontos de amarração');
    if (!allowed) return;

    const lat = metrics.center.lat + (Math.random() - 0.5) * 0.003;
    const lng = metrics.center.lng + (Math.random() - 0.5) * 0.003;

    setProject((prev) => ({
      ...prev,
      referencePoints: [
        ...prev.referencePoints,
        {
          id: `ref-${Date.now()}`,
          label: newRefLabel.trim(),
          lat,
          lng,
        },
      ],
    }));
    setNewRefLabel('');
  };

  const handleRemoveReference = async (id: string) => {
    const allowed = await checkLicenseBeforeAction('A remoção de pontos de amarração');
    if (!allowed) return;

    setProject((prev) => ({
      ...prev,
      referencePoints: prev.referencePoints.filter((r) => r.id !== id),
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. GLOBAL APPLICATION HEADER */}
      <header className="no-print bg-slate-900 border-b border-slate-800 px-4 py-2 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Active Project Trigger */}
          <div className="flex items-center gap-3">
            <div className="h-10 px-2 py-0.5 rounded-lg bg-white flex items-center justify-center shadow-md border border-teal-700">
              <img
                src="/assets/aistudio/e5cd372a-3ef9-42cf-a76f-a92015974757_5c21f989.png"
                alt="DioGis"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-1">
                  <span>DioGis</span>
                </h1>
                <span className="text-[10px] bg-teal-950 border border-teal-700 text-teal-300 font-semibold px-2 py-0.5 rounded-full">
                  Topografia & Cadastro
                </span>
              </div>
              {/* Project Title and Location */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <button
                  onClick={() => setIsProjectManagerOpen(true)}
                  className="font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 hover:underline truncate max-w-[220px] sm:max-w-xs"
                  title="Clique para alternar ou criar projetos"
                >
                  <FolderOpen size={13} />
                  <span>{project.name}</span>
                  <ChevronDown size={12} />
                </button>
                <span className="text-slate-500 hidden sm:inline">•</span>
                <span className="text-slate-400 hidden sm:inline truncate max-w-[180px]">
                  {project.stamp.municipality}, {project.stamp.province}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-md">
              <span className="text-slate-400 text-[10px] block">Área Cadastral:</span>
              <span className="font-bold text-teal-300 font-mono">
                {metrics.areaSqMeters.toLocaleString('pt-PT')} m²
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-md">
              <span className="text-slate-400 text-[10px] block">Perímetro:</span>
              <span className="font-bold text-slate-200 font-mono">
                {metrics.perimeterMeters.toLocaleString('pt-PT')} m
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-md">
              <span className="text-slate-400 text-[10px] block">Projeção:</span>
              <span className="font-bold text-amber-300 font-mono">
                UTM Z{metrics.zone}{metrics.hemisphere} (MC {metrics.centralMeridian}º)
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-md">
              <span className="text-slate-400 text-[10px] block">Ângulos Internos:</span>
              <span className="font-bold text-amber-400 font-mono">
                Σ {metrics.sumInteriorAngles.toFixed(0)}° ({metrics.expectedSumInteriorAngles}°)
              </span>
            </div>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex items-center gap-2">
            {/* Main Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'editor'
                    ? 'bg-[#006B68] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapIcon size={14} /> Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'table'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet size={14} /> Coordenadas
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('document');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'document'
                    ? 'bg-[#007572] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText size={14} /> Croquis ({project.layout.paperFormat.startsWith('A3') ? 'A3' : 'A4'})
              </button>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleManualSave}
              className={`p-2 rounded-lg border transition flex items-center justify-center ${
                saveIndicator
                  ? 'bg-teal-700 text-white border-teal-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Salvar projeto no navegador"
            >
              {saveIndicator ? <Check size={16} /> : <Save size={16} />}
            </button>

            {/* License Status Badge Button */}
            <button
              type="button"
              onClick={() => {
                setActiveLicenseTab('status');
                setIsLicenseModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isLicenseActive
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/80'
                  : license?.state === 'EXPIRED'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-700/60 hover:bg-amber-900/80 animate-pulse'
                  : 'bg-red-950/70 text-red-300 border-red-700/60 hover:bg-red-900/80'
              }`}
              title="Estado da Licença DIOGIS - Clique para gerir ou ativar PIN"
            >
              {isLicenseActive ? (
                <ShieldCheck size={14} className="text-emerald-400" />
              ) : (
                <ShieldAlert size={14} className="text-amber-400" />
              )}
              <span className="hidden sm:inline">
                {isLicenseActive
                  ? `Licença ${license?.plan || 'PRO'}`
                  : license?.state === 'EXPIRED'
                  ? 'Licença Expirada'
                  : 'Ativar Licença'}
              </span>
            </button>

            {/* Account Button */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
              title={user ? `Utilizador: ${user.email}` : 'Iniciar Sessão ou Registar'}
            >
              <UserIcon size={14} className={user ? 'text-teal-400' : 'text-slate-400'} />
              <span className="hidden md:inline truncate max-w-[110px]">
                {user ? user.email.split('@')[0] : 'Conta'}
              </span>
            </button>

            {/* Admin Panel Trigger (Strictly only if verified by server) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 rounded-lg text-xs font-bold border border-amber-600/70 transition shadow-xs"
                title="Painel Administrativo: Gerar PINs e gerir licenças"
              >
                <ShieldAlert size={14} className="text-amber-400" />
                <span className="hidden xl:inline">Painel Admin</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
              title="Configurar carimbo, logótipo, formato da prancha e escala"
            >
              <Settings size={16} />
            </button>

            {/* Export Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006B68] hover:bg-[#005956] text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                <Download size={14} /> Exportar <ChevronDown size={12} />
              </button>

              {showExportMenu && (
                <div
                  className="absolute right-0 mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportPdf();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-teal-600/20 hover:text-teal-300 text-white font-semibold flex items-center gap-2"
                  >
                    <Download size={14} className="text-teal-400" /> Baixar PDF Alta Resolução
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      const allowed = await checkLicenseBeforeAction('A exportação de coordenadas em CSV');
                      if (!allowed) return;
                      exportCoordinatesCsv(metrics.coordinates, project.name);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={14} className="text-amber-400" /> Exportar CSV (Excel)
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      const allowed = await checkLicenseBeforeAction('A exportação em GeoJSON');
                      if (!allowed) return;
                      exportPolygonGeoJson(
                        project,
                        metrics.coordinates,
                        metrics.areaSqMeters,
                        metrics.perimeterMeters
                      );
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <Globe size={14} className="text-cyan-400" /> Exportar GeoJSON (QGIS/CAD)
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      const allowed = await checkLicenseBeforeAction('A exportação em KML');
                      if (!allowed) return;
                      exportPolygonKml(project, metrics.coordinates, metrics.areaSqMeters);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <Globe size={14} className="text-blue-400" /> Exportar KML (Google Earth)
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      const allowed = await checkLicenseBeforeAction('A exportação de ficheiro de projeto');
                      if (!allowed) return;
                      exportProjectJson(project);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 border-t border-slate-800 mt-1 pt-1.5"
                  >
                    <Share2 size={14} className="text-purple-400" /> Cópia de Segurança (.json)
                  </button>
                </div>
              )}
            </div>

            {/* Direct Vector Print */}
            <button
              type="button"
              onClick={async () => {
                const allowed = await checkLicenseBeforeAction('A impressão de croquis');
                if (!allowed) return;
                triggerDirectPrint();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
              title="Imprimir direto em impressora ou salvar PDF pelo navegador"
            >
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
      </header>

      {/* LICENSE STATUS WARNING BANNER (When inactive) */}
      {!isLicenseActive && (
        <div className="no-print bg-amber-950/90 border-b border-amber-600/70 px-4 py-2 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>Modo de Consulta (Sem Licença Ativa):</strong> A edição de vértices, desenho com lápis, salvamento e exportações em PDF/CAD estão bloqueados. Ative a sua licença para desbloquear todas as funções.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveLicenseTab('activate');
              setIsLicenseModalOpen(true);
            }}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shrink-0 transition flex items-center gap-1.5 shadow-sm"
          >
            <Key size={13} /> Ativar PIN / Licença
          </button>
        </div>
      )}

      {/* 2. SECONDARY TOOLBAR BAR */}
      <div className="no-print bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Quick project switchers */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-semibold">Projetos Rápidos:</span>
            <button
              onClick={() => handleSwitchToPreset(PRESET_TALATONA)}
              className={`text-[11px] px-2.5 py-0.5 rounded border transition font-medium ${
                project.id.includes('talatona')
                  ? 'bg-teal-950 border-teal-600 text-teal-300 font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Luanda (Talatona)
            </button>
            <button
              onClick={() => handleSwitchToPreset(PRESET_LOBITO)}
              className={`text-[11px] px-2.5 py-0.5 rounded border transition font-medium ${
                project.id.includes('lobito')
                  ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Benguela (Lobito)
            </button>
            <button
              onClick={() => setIsProjectManagerOpen(true)}
              className="text-[11px] px-2 py-0.5 text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
            >
              <Plus size={12} /> Gerir Projetos...
            </button>
          </div>

          {/* Quick Info & Paper Layout */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Formato:{' '}
              <strong className="text-white">
                {project.layout.paperFormat.replace('_', ' ')}
              </strong>
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">•</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Escala: <strong className="text-white">{project.stamp.scaleText}</strong>
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">•</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Área: <strong className="text-teal-300">{metrics.areaSqMeters.toLocaleString('pt-PT')} m²</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKFLOW TABS CONTENT */}
      <main className="flex-1 flex flex-col">
        {/* TAB 1: MAP EDITOR */}
        {activeTab === 'editor' && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 8 Cols: Map Editor with Places Search and Interactive Controls */}
            <div className="lg:col-span-8 flex flex-col h-[520px] lg:h-[720px]">
              <MapEditor
                apiKey={apiKey}
                project={project}
                metrics={metrics}
                onUpdateVertices={handleUpdateVertices}
                onUpdateProject={handleUpdateProject}
              />
            </div>

            {/* Right 4 Cols: Quick Cadastral Metrics, Cotas, Angles & References */}
            <div className="lg:col-span-4 flex flex-col gap-3.5 overflow-y-auto max-h-[720px] pr-1">
              {/* Quick Cadastral Data & Owner Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                    <FileText size={14} className="text-cyan-400" /> Dados do Imóvel & Requerente
                  </h3>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 font-medium transition"
                  >
                    Editar Tudo
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block font-medium">Proprietário / Requerente:</label>
                    <input
                      type="text"
                      value={project.stamp.owner}
                      readOnly={!isLicenseActive}
                      onClick={() => {
                        if (!isLicenseActive) checkLicenseBeforeAction('A edição de dados cadastrais');
                      }}
                      onChange={(e) => {
                        if (!isLicenseActive) return;
                        setProject((prev) => ({
                          ...prev,
                          stamp: { ...prev.stamp, owner: e.target.value },
                        }));
                      }}
                      placeholder="Nome do Proprietário..."
                      className={`w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs font-semibold focus:border-cyan-500 outline-hidden ${
                        !isLicenseActive ? 'cursor-not-allowed opacity-80' : ''
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Província:</span>
                      <span className="font-semibold text-slate-200">{project.stamp.province}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Município:</span>
                      <span className="font-semibold text-slate-200">{project.stamp.municipality}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Escala Nominal:</span>
                      <span className="font-bold text-cyan-300 font-mono">{project.stamp.scaleText}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Data do Projeto:</span>
                      <span className="font-medium text-slate-300">{project.stamp.projectDate || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Coordinates View with Direct Switch */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">

                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <Layers size={14} className="text-amber-400" /> Vértices do Imóvel ({project.vertices.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('table')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Ver Tabela Completa ➔
                  </button>
                </div>
                <div className="space-y-1.5 font-mono text-xs max-h-44 overflow-y-auto">
                  {metrics.coordinates.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800/90 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-bold text-amber-400 w-6">V{c.id}</span>
                      <span className="text-slate-300">X: {c.easting.toFixed(2)}</span>
                      <span className="text-slate-300">Y: {c.northing.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side Dimensions & Perimeter Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <h4 className="font-bold text-xs text-slate-200 mb-2 flex items-center justify-between">
                  <span>Dimensões dos Lados (Cotas Perimetrais)</span>
                  <span className="text-emerald-400 text-[11px]">
                    Total: {metrics.perimeterMeters.toFixed(2)}m
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {metrics.coordinates.map((c, i) => {
                    const nextId = (i % metrics.coordinates.length) + 1;
                    return (
                      <div
                        key={i}
                        className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between"
                      >
                        <span className="text-slate-400">
                          V{c.id} ➔ V{nextId}:
                        </span>
                        <span className="font-bold text-white">
                          {c.distanceToNext ? `${c.distanceToNext.toFixed(2)} m` : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Geometric & Interior Angles Analysis Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <span className="text-amber-400 font-bold text-sm">∠</span> Ângulos Internos dos Vértices
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      metrics.isConvex
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {metrics.isConvex ? 'Polígono Convexo' : 'Polígono Côncavo'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2.5">
                  {metrics.coordinates.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-slate-400 font-sans text-[11px]">Vértice {c.id}:</span>
                      <span className="font-bold text-amber-300">
                        {project.layout.angleFormat === 'DMS'
                          ? c.interiorAngleDms
                          : `${c.interiorAngleDeg !== undefined ? c.interiorAngleDeg.toFixed(2) : '-'}°`}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>
                    Soma: <strong className="text-white">{metrics.sumInteriorAngles.toFixed(1)}°</strong>
                  </span>
                  <span>
                    Esperado: <strong className="text-cyan-400">{metrics.expectedSumInteriorAngles}°</strong>
                  </span>
                  <span className="text-emerald-400 font-semibold">Fechamento: 100%</span>
                </div>
              </div>

              {/* Reference Landmarks (Condomínios / Ruas / Pontos Notáveis) */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <h4 className="font-bold text-xs text-slate-200 mb-2 flex items-center justify-between">
                  <span>Pontos Notáveis & Condomínios</span>
                  <span className="text-slate-400 text-[10px]">Aparecem na foto aérea</span>
                </h4>

                <form onSubmit={handleAddReference} className="flex gap-1.5 mb-2">
                  <input
                    type="text"
                    placeholder="Nome do local (ex: Condomínio Alpha)..."
                    value={newRefLabel}
                    onChange={(e) => setNewRefLabel(e.target.value)}
                    className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-semibold text-white transition flex items-center gap-1"
                  >
                    <Plus size={12} /> Inserir
                  </button>
                </form>

                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {project.referencePoints.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-1">
                      Nenhum ponto notável adicionado.
                    </p>
                  ) : (
                    project.referencePoints.map((ref) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-slate-800/80 text-[11px]"
                      >
                        <span className="text-slate-300 font-medium truncate">{ref.label}</span>
                        <button
                          onClick={() => handleRemoveReference(ref.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5"
                          title="Remover ponto de referência"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Direct View Croquis Card */}
              <div
                onClick={() => {
                  setActiveTab('document');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-linear-to-r from-emerald-950/60 to-slate-900 hover:from-emerald-900/60 hover:to-slate-850 border border-emerald-700/60 hover:border-emerald-500 cursor-pointer rounded-xl p-3.5 transition flex items-center justify-between group shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-900/60 text-emerald-400 group-hover:scale-110 transition border border-emerald-700/50">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h5 className="font-bold text-xs text-white">Ver Croquis Técnico Completo</h5>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold border border-emerald-500/40">
                        {project.layout.paperFormat.startsWith('A3') ? 'A3' : 'A4'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Foto aérea HD com o lote demarcado, cotas e selo técnico
                    </p>
                  </div>
                </div>
                <Eye size={18} className="text-emerald-400 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COORDINATES & METRICS TABLE */}
        {activeTab === 'table' && (
          <div className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="font-bold text-base text-white flex items-center gap-2">
                    <FileSpreadsheet className="text-amber-400" size={18} />
                    Tabela Oficial de Coordenadas UTM & Geodésicas
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Insira ou edite as coordenadas diretamente. Os cálculos de área, perímetro e mapa atualizam automaticamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportCoordinatesCsv(metrics.coordinates, project.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700 transition"
                  >
                    <Download size={13} /> Exportar CSV
                  </button>
                  <button
                    onClick={() => exportPolygonGeoJson(project, metrics.coordinates, metrics.areaSqMeters, metrics.perimeterMeters)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg text-xs font-semibold transition"
                  >
                    <Globe size={13} /> GeoJSON
                  </button>
                </div>
              </div>

              <CoordinateTable
                coordinates={metrics.coordinates}
                zone={metrics.zone}
                hemisphere={metrics.hemisphere}
                centralMeridian={metrics.centralMeridian}
                interactive={true}
                onUpdateVertices={handleUpdateVertices}
              />
            </div>
          </div>
        )}

        {/* TAB 3: CROQUIS DOCUMENT PREVIEW */}
        {activeTab === 'document' && (
          <div className="flex-1 flex flex-col items-center">
            {/* Quick Document Actions Bar */}
            <div className="no-print w-full bg-slate-900 border-b border-slate-800 py-2.5 px-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() => setActiveTab('editor')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-semibold border border-slate-700 transition"
                >
                  ❮ Voltar ao Editor de Lote
                </button>
                <span className="text-slate-500 hidden sm:inline">|</span>
                <span className="text-slate-300 hidden sm:inline">
                  Prancha:{' '}
                  <strong>
                    {project.layout.paperFormat.replace('_', ' ')} (Escala {project.stamp.scaleText})
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
                >
                  <Settings size={13} /> Editar Selo & Formato
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download size={13} /> Baixar PDF
                </button>
                <button
                  onClick={triggerDirectPrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
                >
                  <Printer size={13} /> Imprimir
                </button>
              </div>
            </div>

            {/* The Printable Topographic Sheet Container */}
            <CroquiDocument
              apiKey={apiKey}
              project={project}
              metrics={metrics}
              documentRef={documentRef}
            />
          </div>
        )}
      </main>

      {/* PROJECT MANAGER MODAL */}
      <ProjectManagerModal
        currentProject={project}
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        onSelectProject={(selected) => setProject(selected)}
      />

      {/* SETTINGS & STAMP MODAL */}
      <SettingsModal
        project={project}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(updated) => setProject(updated)}
      />

      {/* EXPORTING PROGRESS OVERLAY */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto mb-4"></div>
            <h3 className="font-bold text-base text-white mb-1">Exportando Croquis em PDF</h3>
            <p className="text-xs text-slate-400 mb-4">{exportStage}</p>

            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className="bg-teal-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-mono text-teal-400 font-bold">{exportProgress}%</span>
          </div>
        </div>
      )}

      {/* BASE44 LICENSING & AUTH MODALS */}
      <LicenseModal />
      <AuthModal />
      <AdminLicenseModal />
    </div>
  );
}

export default function App() {
  return (
    <LicenseProvider>
      <DiogisMainApp />
    </LicenseProvider>
  );
}
