import React, { useState, useRef } from 'react';
import { CroquiProject, StampData, TechnicalTeamMember, PaperFormat } from '../types/croqui';
import { saveDefaultCompanyLogo, getDefaultCompanyLogo } from '../utils/projectStorage';
import {
  X,
  Building2,
  Users,
  Compass,
  Sliders,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileText,
  Lock,
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';

interface SettingsModalProps {
  project: CroquiProject;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: CroquiProject) => void;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const [stamp, setStamp] = useState<StampData>({ ...project.stamp });
  const [layout, setLayout] = useState({ ...project.layout });
  const [activeTab, setActiveTab] = useState<'stamp' | 'team' | 'layout' | 'brand'>('stamp');
  const [isDefaultLogoChecked, setIsDefaultLogoChecked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleTeamMemberChange = (index: number, field: 'name' | 'date', val: string) => {
    const updatedTeam = [...stamp.team];
    updatedTeam[index] = { ...updatedTeam[index], [field]: val };
    setStamp({ ...stamp, team: updatedTeam });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem do logótipo deve ter menos de 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setStamp((prev) => ({ ...prev, logoUrl: result }));
      if (isDefaultLogoChecked) {
        saveDefaultCompanyLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setStamp((prev) => ({ ...prev, logoUrl: undefined }));
  };

  const { isLicenseActive, checkLicenseBeforeAction } = useLicense();

  const handleSave = async () => {
    if (!isLicenseActive) {
      const allowed = await checkLicenseBeforeAction('A alteração de carimbo e configurações');
      if (!allowed) return;
    }
    if (isDefaultLogoChecked && stamp.logoUrl) {
      saveDefaultCompanyLogo(stamp.logoUrl);
    }
    onSave({
      ...project,
      stamp,
      layout,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="text-cyan-400" size={18} />
            <h2 className="font-bold text-base text-white">Configurações da Prancha & Carimbo Técnico</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 bg-slate-900 px-4 pt-2 gap-1 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('stamp')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'stamp'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 size={13} /> Dados do Imóvel & Selo
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'brand'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon size={13} /> Empresa & Logótipo
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'team'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={13} /> Equipa Técnica
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'layout'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={13} /> Formato, Escala & Malha
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: STAMP & OWNER */}
          {activeTab === 'stamp' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Título da Prancha:</label>
                  <input
                    type="text"
                    value={stamp.title}
                    onChange={(e) => setStamp({ ...stamp, title: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Proprietário / Requerente:</label>
                  <input
                    type="text"
                    value={stamp.owner}
                    onChange={(e) => setStamp({ ...stamp, owner: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Província (Angola):</label>
                  <select
                    value={stamp.province}
                    onChange={(e) => setStamp({ ...stamp, province: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  >
                    {ANGOLA_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Município:</label>
                  <input
                    type="text"
                    value={stamp.municipality}
                    onChange={(e) => setStamp({ ...stamp, municipality: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Distrito Urbano / Comuna:</label>
                  <input
                    type="text"
                    value={stamp.district}
                    onChange={(e) => setStamp({ ...stamp, district: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Endereço / Localização Detalhada:</label>
                <input
                  type="text"
                  value={stamp.addressDetails}
                  onChange={(e) => setStamp({ ...stamp, addressDetails: e.target.value })}
                  placeholder="Ex: Bairro Cambamba II, Rua das Acácias, Lote 14..."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Fins / Finalidade (Contém):</label>
                  <input
                    type="text"
                    value={stamp.purpose}
                    onChange={(e) => setStamp({ ...stamp, purpose: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Especialidade Técnica:</label>
                  <input
                    type="text"
                    value={stamp.specialty}
                    onChange={(e) => setStamp({ ...stamp, specialty: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Desenho Nº:</label>
                  <input
                    type="text"
                    value={stamp.drawingNumber}
                    onChange={(e) => setStamp({ ...stamp, drawingNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Folha Nº:</label>
                  <input
                    type="text"
                    value={stamp.sheetNumber}
                    onChange={(e) => setStamp({ ...stamp, sheetNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Data do Projecto / Levantamento:</label>
                  <input
                    type="text"
                    value={stamp.projectDate || ''}
                    onChange={(e) => setStamp({ ...stamp, projectDate: e.target.value })}
                    placeholder="Ex: 14.02.2025"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tipo de Imagem Cartográfica:</label>
                  <input
                    type="text"
                    value={stamp.imageryType}
                    onChange={(e) => setStamp({ ...stamp, imageryType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Observações Cadastrais & Delimitação de Confrontações:
                </label>
                <textarea
                  rows={3}
                  value={stamp.observations || ''}
                  onChange={(e) => setStamp({ ...stamp, observations: e.target.value })}
                  placeholder="Ex: Terreno demarcado com marcos de betão cravados nos quatro vértices. Confrontações: Norte - Rua Principal; Sul - Parcela B-15; Este - Lote Residencial 15; Oeste - Acesso Secundário..."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100 resize-none text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY & LOGO */}
          {activeTab === 'brand' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nome da Empresa / Gabinete:</label>
                  <input
                    type="text"
                    value={stamp.companyName}
                    onChange={(e) => setStamp({ ...stamp, companyName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Subtítulo / Especialidades:</label>
                  <input
                    type="text"
                    value={stamp.companySubtitle}
                    onChange={(e) => setStamp({ ...stamp, companySubtitle: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              {/* Company Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Telefone da Empresa:</label>
                  <input
                    type="text"
                    value={stamp.companyPhone || ''}
                    onChange={(e) => setStamp({ ...stamp, companyPhone: e.target.value })}
                    placeholder="+244 923 000 000"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">E-mail de Contacto:</label>
                  <input
                    type="email"
                    value={stamp.companyEmail || ''}
                    onChange={(e) => setStamp({ ...stamp, companyEmail: e.target.value })}
                    placeholder="contacto@empresa.ao"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Morada / Sede da Empresa:</label>
                  <input
                    type="text"
                    value={stamp.companyAddress || ''}
                    onChange={(e) => setStamp({ ...stamp, companyAddress: e.target.value })}
                    placeholder="Luanda, Angola"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="border border-slate-800 bg-slate-950 p-4 rounded-xl">
                <label className="block text-slate-300 font-semibold mb-2">Logótipo Oficial da Empresa:</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                    {stamp.logoUrl ? (
                      <img
                        src={stamp.logoUrl}
                        alt="Logótipo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-600 text-[10px]">
                        <ImageIcon size={28} className="mb-1" />
                        <span>Sem logótipo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <p className="text-slate-400">
                      Carregue o logótipo oficial em formato PNG, JPG ou SVG. Ele aparecerá com nitidez no carimbo técnico da folha A4/A3.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-semibold transition"
                      >
                        <Upload size={13} /> Selecionar Logótipo
                      </button>
                      {stamp.logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 rounded border border-slate-700 transition"
                        >
                          <Trash2 size={13} /> Remover
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={isDefaultLogoChecked}
                        onChange={(e) => setIsDefaultLogoChecked(e.target.checked)}
                        className="rounded border-slate-600 accent-cyan-500"
                      />
                      <span>Guardar como logótipo padrão para novos projetos</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Engenheiro / Técnico Responsável:</label>
                  <input
                    type="text"
                    value={stamp.responsibleSurveyor}
                    onChange={(e) => setStamp({ ...stamp, responsibleSurveyor: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Inscrição Profissional (O.E.A.):</label>
                  <input
                    type="text"
                    value={stamp.responsibleLicense}
                    onChange={(e) => setStamp({ ...stamp, responsibleLicense: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEAM MEMBERS */}
          {activeTab === 'team' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs">
                Preencha os responsáveis técnicos e datas de execução que constarão no carimbo oficial:
              </p>
              <div className="divide-y divide-slate-800">
                {stamp.team.map((member, idx) => (
                  <div key={idx} className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <span className="sm:col-span-2 font-bold text-cyan-400">{member.label}</span>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Data (dd.mm.aaaa)"
                        value={member.date}
                        onChange={(e) => handleTeamMemberChange(idx, 'date', e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        placeholder="Nome do Técnico / Engenheiro"
                        value={member.name}
                        onChange={(e) => handleTeamMemberChange(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LAYOUT, SCALE & COORDINATE SYSTEM */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Formato da Folha de Desenho:</label>
                  <select
                    value={layout.paperFormat}
                    onChange={(e) => setLayout({ ...layout, paperFormat: e.target.value as PaperFormat })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  >
                    <option value="A4_PORTRAIT">A4 Retrato (210 × 297 mm) — Padrão Cadastral</option>
                    <option value="A4_LANDSCAPE">A4 Paisagem (297 × 210 mm)</option>
                    <option value="A3_PORTRAIT">A3 Retrato (297 × 420 mm)</option>
                    <option value="A3_LANDSCAPE">A3 Paisagem (420 × 297 mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Escala Nominal do Croqui:</label>
                  <select
                    value={stamp.scaleText}
                    onChange={(e) => setStamp({ ...stamp, scaleText: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  >
                    <option value="1:500">1:500 (Muito Detalhado / Lotes Urbanos Pequenos)</option>
                    <option value="1:1.000">1:1.000 (Padrão Cadastral Municipal)</option>
                    <option value="1:2.000">1:2.000 (Lotes Médios / Loteamentos)</option>
                    <option value="1:2.500">1:2.500 (Parcelas Industriais / Agrícolas)</option>
                    <option value="1:5.000">1:5.000 (Quarteirões / Fazendas Médias)</option>
                    <option value="1:10.000">1:10.000 (Grandes Concessões Rurais)</option>
                  </select>
                </div>
              </div>

              {/* UTM Coordinate System & Zone Override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Sistema de Coordenadas & Zona UTM:</label>
                  <select
                    value={layout.utmZoneOverride || 0}
                    onChange={(e) => setLayout({ ...layout, utmZoneOverride: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  >
                    <option value={0}>Automático (Detectado pelas coordenadas do terreno)</option>
                    <option value={32}>Forçar Zona 32S — Meridiano Central 9º E (Faixa Oeste)</option>
                    <option value={33}>Forçar Zona 33S — Meridiano Central 15º E (Luanda, Benguela, Huambo)</option>
                    <option value={34}>Forçar Zona 34S — Meridiano Central 21º E (Leste / Moxico, Lundas)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Angola abrange as Zonas UTM 32S, 33S e 34S com Datum WGS84.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Espaçamento da Malha UTM (metros):</label>
                  <select
                    value={layout.gridSpacingMeters}
                    onChange={(e) => setLayout({ ...layout, gridSpacingMeters: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  >
                    <option value={50}>50 metros</option>
                    <option value={100}>100 metros (Recomendado)</option>
                    <option value={200}>200 metros</option>
                    <option value={250}>250 metros</option>
                    <option value={500}>500 metros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Formato dos Ângulos Internos:</label>
                  <select
                    value={layout.angleFormat}
                    onChange={(e) => setLayout({ ...layout, angleFormat: e.target.value as 'DEG' | 'DMS' })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  >
                    <option value="DEG">Graus Decimais (ex: 90.00°)</option>
                    <option value="DMS">Graus, Minutos e Segundos (ex: 90°00'00")</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <span className="text-slate-400 font-semibold block mb-1">Elementos Visíveis na Prancha:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={layout.showUtmGrid}
                      onChange={(e) => setLayout({ ...layout, showUtmGrid: e.target.checked })}
                      className="rounded border-slate-600 accent-cyan-500"
                    />
                    <span>Grelha e marcas de coordenadas UTM</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={layout.showCoordinateTable}
                      onChange={(e) => setLayout({ ...layout, showCoordinateTable: e.target.checked })}
                      className="rounded border-slate-600 accent-cyan-500"
                    />
                    <span>Tabela Oficial de Coordenadas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={layout.showGeometryStamp}
                      onChange={(e) => setLayout({ ...layout, showGeometryStamp: e.target.checked })}
                      className="rounded border-slate-600 accent-cyan-500"
                    />
                    <span>Miniatura geométrica no carimbo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={layout.showInteriorAngles}
                      onChange={(e) => setLayout({ ...layout, showInteriorAngles: e.target.checked })}
                      className="rounded border-slate-600 accent-cyan-500"
                    />
                    <span>Cálculo de ângulos internos (∠)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-800 border-t border-slate-700 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-semibold transition flex items-center gap-1.5 shadow-md"
          >
            <Check size={16} /> Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
