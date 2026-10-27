import React, { useState, useRef } from 'react';
import { CroquiProject } from '../types/croqui';
import {
  loadAllProjects,
  saveSingleProject,
  deleteProject,
  duplicateProject,
  createBlankProject,
  PRESET_TALATONA,
  PRESET_LOBITO,
  setActiveProjectId,
} from '../utils/projectStorage';
import { exportProjectJson } from '../utils/cadExport';
import { useLicense } from '../context/LicenseContext';
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Check,
  X,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface ProjectManagerModalProps {
  currentProject: CroquiProject;
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: CroquiProject) => void;
}

const ANGOLA_PROVINCES = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire',
];

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  currentProject,
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const { checkLicenseBeforeAction } = useLicense();
  const [projects, setProjects] = useState<CroquiProject[]>(() => loadAllProjects());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjProvince, setNewProjProvince] = useState('Luanda');
  const [newProjMunicipality, setNewProjMunicipality] = useState('Talatona');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const refreshList = () => {
    setProjects(loadAllProjects());
  };

  const handleSelect = (proj: CroquiProject) => {
    setActiveProjectId(proj.id);
    onSelectProject(proj);
    onClose();
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const allowed = await checkLicenseBeforeAction('A criação de um novo croquis');
    if (!allowed) {
      onClose();
      return;
    }
    const name = newProjName.trim() || 'Novo Levantamento Cadastral';
    const blank = createBlankProject(name, newProjProvince, newProjMunicipality);
    saveSingleProject(blank);
    refreshList();
    onSelectProject(blank);
    setShowCreateForm(false);
    setNewProjName('');
    onClose();
  };

  const handleLoadPreset = async (preset: CroquiProject) => {
    const allowed = await checkLicenseBeforeAction('A criação a partir de modelo');
    if (!allowed) {
      onClose();
      return;
    }
    // Generate fresh instance to avoid overwriting original preset
    const instance: CroquiProject = {
      ...preset,
      id: `proj-${preset.id}-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    saveSingleProject(instance);
    refreshList();
    onSelectProject(instance);
    onClose();
  };

  const handleDuplicate = async (p: CroquiProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const allowed = await checkLicenseBeforeAction('A duplicação de croquis');
    if (!allowed) {
      onClose();
      return;
    }
    const copy = duplicateProject(p);
    refreshList();
    onSelectProject(copy);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem a certeza que deseja eliminar o projeto "${name}"? Esta ação não pode ser desfeita.`)) {
      const remaining = deleteProject(id);
      setProjects(remaining);
      if (currentProject.id === id && remaining.length > 0) {
        onSelectProject(remaining[0]);
      }
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = await checkLicenseBeforeAction('A importação de novos croquis');
    if (!allowed) {
      onClose();
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.vertices && parsed.stamp) {
          const imported: CroquiProject = {
            ...parsed,
            id: `proj-import-${Date.now()}`,
            name: `${parsed.name || 'Projeto Importado'} (Importado)`,
            updatedAt: new Date().toISOString(),
          };
          saveSingleProject(imported);
          refreshList();
          onSelectProject(imported);
          alert('Projeto importado com sucesso!');
        } else {
          alert('Arquivo JSON inválido. Certifique-se de que é um projeto exportado pelo DioGis.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo JSON: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-lg">
              <FolderOpen size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Gestão de Projetos & Cadastros</h2>
              <p className="text-xs text-slate-400">
                Alterne entre trabalhos salvos ou crie novos levantamentos independentes
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar Bar */}
        <div className="bg-slate-850 border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-xs transition"
            >
              <Plus size={14} /> Novo Projeto em Branco
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition"
              title="Importar projeto salvo em arquivo JSON"
            >
              <Upload size={13} /> Importar JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Exemplos oficiais:</span>
            <button
              onClick={() => handleLoadPreset(PRESET_TALATONA)}
              className="text-[11px] px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded font-semibold transition"
            >
              Luanda (Talatona)
            </button>
            <button
              onClick={() => handleLoadPreset(PRESET_LOBITO)}
              className="text-[11px] px-2.5 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded font-semibold transition"
            >
              Benguela (Lobito)
            </button>
          </div>
        </div>

        {/* Create Form Dropdown */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateNew}
            className="bg-slate-950 border-b border-emerald-900/60 p-4 animate-in fade-in slide-in-from-top-2 duration-200 text-xs"
          >
            <h4 className="font-bold text-white mb-2 flex items-center gap-1.5 text-emerald-400">
              <Sparkles size={14} /> Criar Novo Levantamento Cadastral em Branco
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-slate-400 mb-1">Nome do Projeto:</label>
                <input
                  type="text"
                  placeholder="Ex: Loteamento Morro Bento Lote 5..."
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Província (Angola):</label>
                <select
                  value={newProjProvince}
                  onChange={(e) => setNewProjProvince(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                >
                  {ANGOLA_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Município:</label>
                <input
                  type="text"
                  placeholder="Ex: Talatona, Lobito, Belas..."
                  value={newProjMunicipality}
                  onChange={(e) => setNewProjMunicipality(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 border border-slate-700 rounded text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-bold"
              >
                Criar e Abrir Projeto
              </button>
            </div>
          </form>
        )}

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {projects.map((proj) => {
            const isCurrent = proj.id === currentProject.id;
            return (
              <div
                key={proj.id}
                onClick={() => handleSelect(proj)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-600 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-850 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Project Info */}
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                      isCurrent
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{proj.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold px-2 py-0.2 rounded-full">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      <strong>Requerente:</strong> {proj.stamp.owner || 'Não informado'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-cyan-400" />
                        {proj.stamp.municipality}, {proj.stamp.province}
                      </span>
                      <span>•</span>
                      <span>
                        Vértices: <strong className="text-white">{proj.vertices.length}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Escala: <strong className="text-white">{proj.stamp.scaleText}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar size={11} />
                        {new Date(proj.updatedAt).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    onClick={(e) => handleDuplicate(proj, e)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                    title="Duplicar projeto"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportProjectJson(proj);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                    title="Baixar cópia de segurança em JSON"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(proj.id, proj.name, e)}
                    className="p-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 rounded border border-slate-700 transition"
                    title="Eliminar projeto"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleSelect(proj)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isCurrent
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white border border-slate-700'
                    }`}
                  >
                    <Check size={13} /> {isCurrent ? 'Abrir' : 'Carregar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-800 border-t border-slate-700 px-5 py-3 flex justify-between items-center text-xs text-slate-400">
          <span>{projects.length} projetos armazenados localmente</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
