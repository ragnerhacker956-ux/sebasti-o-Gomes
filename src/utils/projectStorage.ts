import { CroquiProject, LatLng } from '../types/croqui';
import { utmToLatLng } from './utm';

// Storage keys
const STORAGE_PROJECTS_KEY = 'diogis_saved_projects_v3';
const STORAGE_ACTIVE_PROJECT_ID_KEY = 'diogis_active_project_id_v3';
const STORAGE_DEFAULT_LOGO_KEY = 'diogis_company_logo_v3';

export const DIOGIS_OFFICIAL_LOGO = '/assets/aistudio/e5cd372a-3ef9-42cf-a76f-a92015974757_5c21f989.png';

// Preset 1: Luanda / Talatona (Zone 33S, MC 15°E) - Exact Cadastral Parcel from Reference
const luandaP1 = utmToLatLng(301760.00, 9013525.00, 33, 'S');
const luandaP2 = utmToLatLng(301750.00, 9013490.00, 33, 'S');
const luandaP3 = utmToLatLng(301660.00, 9013495.00, 33, 'S');
const luandaP4 = utmToLatLng(301715.00, 9013540.00, 33, 'S');
const refPalmeiras = utmToLatLng(301880.00, 9013630.00, 33, 'S');

export const PRESET_TALATONA: CroquiProject = {
  id: 'proj-luanda-talatona',
  name: 'Lote Residencial - Talatona, Luanda',
  updatedAt: new Date().toISOString(),
  vertices: [luandaP1, luandaP2, luandaP3, luandaP4],
  referencePoints: [
    { id: 'ref-t1', label: 'Condomínio Palmeiras', lat: refPalmeiras.lat, lng: refPalmeiras.lng },
  ],
  stamp: {
    title: 'CROQUIS DE LOCALIZAÇÃO',
    owner: 'Dr. António Manuel de Sousa',
    district: 'Distrito Urbano de Belas',
    municipality: 'Talatona',
    province: 'Luanda',
    addressDetails: 'Rua das Acácias, Lote 14 - Zona Residencial',
    scaleText: '1:1.000',
    imageryType: 'Fotografia aérea',
    purpose: 'Fins: Concessão de Direito de Superfície e Registo Predial',
    specialty: 'TOPOGRAFIA & CADASTRO',
    drawingNumber: '01/2025',
    sheetNumber: '01/01',
    projectDate: '14.02.2025',
    observations:
      'Terreno demarcado com marcos de betão cravados nos quatro vértices. Confrontações: Norte - Rua das Acácias; Sul - Parcela B-15; Este - Lote Residencial 15; Oeste - Acesso Secundário.',
    companyName: 'DIOGIS - TOPOGRAFIA & CADASTRO',
    companySubtitle: 'Sistemas de Informação Geográfica & Agrimensura',
    companyPhone: '+244 923 456 789',
    companyEmail: 'contacto@diogis.ao',
    companyAddress: 'Talatona, Luanda - Angola',
    logoUrl: DIOGIS_OFFICIAL_LOGO,
    responsibleSurveyor: 'Eng. Domingos Afonso',
    responsibleLicense: 'O.E.A. Nº 4812/2018',
    team: [
      { role: 'Campo', label: 'Campo', date: '10.02.2025', name: 'Agostinho Pereira' },
      { role: 'Proj.', label: 'Proj.', date: '11.02.2025', name: 'Fernando Dias' },
      { role: 'Des.', label: 'Des.', date: '12.02.2025', name: 'João Silva' },
      { role: 'Verif.', label: 'Verif.', date: '14.02.2025', name: 'Eng. Carlos Viegas' },
    ],
  },
  layout: {
    paperFormat: 'A4_PORTRAIT',
    viewMode: 'DUAL',
    showUtmGrid: true,
    gridSpacingMeters: 100,
    showCoordinateTable: true,
    showGeometryStamp: true,
    showNorthArrow: true,
    showInteriorAngles: true,
    angleFormat: 'DEG',
    utmZoneOverride: 0,
    satelliteZoom: 19.5,
    mapZoom: 14.0,
    satellitePitch: 0,
    satelliteHeading: 0,
    mapTypeSatellite: 'satellite',
    mapTypeContext: 'roadmap',
  },
};

// Preset 2: Benguela / Lobito (Restinga / Praia, Zone 33S, MC 15°E)
const lobitoP1 = utmToLatLng(341850.12, 8635480.35, 33, 'S');
const lobitoP2 = utmToLatLng(341895.60, 8635445.18, 33, 'S');
const lobitoP3 = utmToLatLng(341870.40, 8635390.80, 33, 'S');
const lobitoP4 = utmToLatLng(341815.10, 8635415.50, 33, 'S');
const lobitoP5 = utmToLatLng(341825.80, 8635460.20, 33, 'S');

export const PRESET_LOBITO: CroquiProject = {
  id: 'proj-benguela-lobito',
  name: 'Parcela Comercial Marítima - Restinga, Lobito',
  updatedAt: new Date().toISOString(),
  vertices: [lobitoP1, lobitoP2, lobitoP3, lobitoP4, lobitoP5],
  referencePoints: [
    { id: 'ref-l1', label: 'Avenida da Restinga', lat: -12.3375, lng: 13.5445 },
    { id: 'ref-l2', label: 'Porto Comercial do Lobito', lat: -12.3412, lng: 13.5480 },
    { id: 'ref-l3', label: 'Farol da Restinga', lat: -12.3350, lng: 13.5420 },
  ],
  stamp: {
    title: 'CROQUIS DE LOCALIZAÇÃO',
    owner: 'Empresa Marítima do Lobito, S.A.',
    district: 'Restinga - Bairro Comercial',
    municipality: 'Lobito',
    province: 'Benguela',
    addressDetails: 'Avenida Marginal da Restinga, Parcela B-04',
    scaleText: '1:2.000',
    imageryType: 'Fotografia aérea',
    purpose: 'Fins: Regularização Cadastral e Concessão Marítima',
    specialty: 'TOPOGRAFIA & HIDROGRAFIA',
    drawingNumber: '02/LOB/2025',
    sheetNumber: '01/01',
    projectDate: '08.01.2025',
    observations:
      'Levantamento executado com recurso a GNSS RTK de dupla frequência georreferenciado à rede geodésica. Confrontações: Norte - Avenida Marginal; Sul - Baía do Lobito; Este - Armazém nº 3; Oeste - Terreno Municipal.',
    companyName: 'DIOGIS - TOPOGRAFIA & CADASTRO',
    companySubtitle: 'Sistemas de Informação Geográfica & Agrimensura',
    companyPhone: '+244 945 123 456',
    companyEmail: 'contacto@diogis.ao',
    companyAddress: 'Avenida Marginal da Restinga, Edifício Farol, Lobito',
    logoUrl: DIOGIS_OFFICIAL_LOGO,
    responsibleSurveyor: 'Eng. Manuel Tavares',
    responsibleLicense: 'O.E.A. Nº 3180/2015',
    team: [
      { role: 'Campo', label: 'Campo', date: '05.01.2025', name: 'Manuel Tavares' },
      { role: 'Proj.', label: 'Proj.', date: '06.01.2025', name: 'Adilson Santos' },
      { role: 'Des.', label: 'Des.', date: '07.01.2025', name: 'Manuel Tavares' },
      { role: 'Verif.', label: 'Verif.', date: '08.01.2025', name: 'Eng. Maria da Graça' },
    ],
  },
  layout: {
    paperFormat: 'A4_PORTRAIT',
    viewMode: 'DUAL',
    showUtmGrid: true,
    gridSpacingMeters: 100,
    showCoordinateTable: true,
    showGeometryStamp: true,
    showNorthArrow: true,
    showInteriorAngles: true,
    angleFormat: 'DEG',
    utmZoneOverride: 0,
    satelliteZoom: 19.5,
    mapZoom: 14.0,
    satellitePitch: 0,
    satelliteHeading: 0,
    mapTypeSatellite: 'satellite',
    mapTypeContext: 'roadmap',
  },
};

/**
 * Creates a brand new blank project for a custom location
 */
export function createBlankProject(
  name = 'Novo Projeto Cadastral',
  province = 'Luanda',
  municipality = 'Luanda'
): CroquiProject {
  // Default coordinates centered on Luanda (Ingombota)
  const p1 = utmToLatLng(303100, 9024200, 33, 'S');
  const p2 = utmToLatLng(303140, 9024200, 33, 'S');
  const p3 = utmToLatLng(303140, 9024160, 33, 'S');
  const p4 = utmToLatLng(303100, 9024160, 33, 'S');

  const defaultLogo = getDefaultCompanyLogo();
  const currentDate = new Date().toLocaleDateString('pt-PT');

  return {
    id: `proj-${Date.now()}`,
    name,
    updatedAt: new Date().toISOString(),
    vertices: [p1, p2, p3, p4],
    referencePoints: [],
    stamp: {
      title: 'CROQUIS DE LOCALIZAÇÃO',
      owner: 'Novo Proprietário / Requerente',
      district: 'Bairro Central',
      municipality,
      province,
      addressDetails: 'Rua Principal, Lote 01',
      scaleText: '1:1.000',
      imageryType: 'Fotografia aérea',
      purpose: 'Fins: Levantamento Cadastral e Legalização',
      specialty: 'TOPOGRAFIA',
      drawingNumber: '01/' + new Date().getFullYear(),
      sheetNumber: '01/01',
      projectDate: currentDate,
      observations: '',
      companyName: 'DIOGIS - TOPOGRAFIA & CADASTRO',
      companySubtitle: 'Sistemas de Informação Geográfica & Agrimensura',
      companyPhone: '+244 923 000 000',
      companyEmail: 'contacto@diogis.ao',
      companyAddress: 'Angola',
      logoUrl: defaultLogo || DIOGIS_OFFICIAL_LOGO,
      responsibleSurveyor: 'Eng. Topógrafo Responsável',
      responsibleLicense: 'Ordem dos Engenheiros de Angola',
      team: [
        { role: 'Campo', label: 'Campo', date: currentDate, name: 'Técnico de Campo' },
        { role: 'Proj.', label: 'Proj.', date: currentDate, name: 'Projetista' },
        { role: 'Des.', label: 'Des.', date: currentDate, name: 'Desenhador' },
        { role: 'Verif.', label: 'Verif.', date: currentDate, name: 'Verificador' },
      ],
    },
    layout: {
      paperFormat: 'A4_PORTRAIT',
      viewMode: 'DUAL',
      showUtmGrid: true,
      gridSpacingMeters: 100,
      showCoordinateTable: true,
      showGeometryStamp: true,
      showNorthArrow: true,
      showInteriorAngles: true,
      angleFormat: 'DEG',
      utmZoneOverride: 0,
      satelliteZoom: 19.5,
      mapZoom: 14.0,
      satellitePitch: 0,
      satelliteHeading: 0,
      mapTypeSatellite: 'satellite',
      mapTypeContext: 'roadmap',
    },
  };
}

/**
 * Sanitizes project data to ensure all fields are dynamically populated and compatible
 */
export function sanitizeProjectSchema(p: any): CroquiProject {
  const currentDate = new Date().toLocaleDateString('pt-PT');
  return {
    id: p.id || `proj-${Date.now()}`,
    name: p.name || 'Projeto Sem Nome',
    updatedAt: p.updatedAt || new Date().toISOString(),
    vertices: Array.isArray(p.vertices) && p.vertices.length >= 3 ? p.vertices : PRESET_TALATONA.vertices,
    referencePoints: Array.isArray(p.referencePoints) ? p.referencePoints : [],
    stamp: {
      title: p.stamp?.title || 'CROQUIS DE LOCALIZAÇÃO',
      owner: p.stamp?.owner || '',
      district: p.stamp?.district || '',
      municipality: p.stamp?.municipality || 'Luanda',
      province: p.stamp?.province || 'Luanda',
      addressDetails: p.stamp?.addressDetails || '',
      scaleText: p.stamp?.scaleText || '1:1.000',
      imageryType: p.stamp?.imageryType || 'Fotografia aérea',
      purpose: p.stamp?.purpose || 'Fins: Serviços administrativos legais',
      specialty: p.stamp?.specialty || 'TOPOGRAFIA',
      drawingNumber: p.stamp?.drawingNumber || '01/' + new Date().getFullYear(),
      sheetNumber: p.stamp?.sheetNumber || '01/01',
      projectDate: p.stamp?.projectDate || currentDate,
      observations: p.stamp?.observations || '',
      companyName: p.stamp?.companyName || 'EMPRESA DE TOPOGRAFIA',
      companySubtitle: p.stamp?.companySubtitle || 'Topografia & Engenharia Geográfica',
      companyPhone: p.stamp?.companyPhone || '',
      companyEmail: p.stamp?.companyEmail || '',
      companyAddress: p.stamp?.companyAddress || '',
      logoUrl: p.stamp?.logoUrl,
      responsibleSurveyor: p.stamp?.responsibleSurveyor || 'Técnico Responsável',
      responsibleLicense: p.stamp?.responsibleLicense || 'Ordem dos Engenheiros',
      team: Array.isArray(p.stamp?.team) && p.stamp.team.length === 4 ? p.stamp.team : [
        { role: 'Campo', label: 'Campo', date: currentDate, name: 'Técnico de Campo' },
        { role: 'Proj.', label: 'Proj.', date: currentDate, name: 'Projetista' },
        { role: 'Des.', label: 'Des.', date: currentDate, name: 'Desenhador' },
        { role: 'Verif.', label: 'Verif.', date: currentDate, name: 'Verificador' },
      ],
    },
    layout: {
      paperFormat: p.layout?.paperFormat || 'A4_PORTRAIT',
      viewMode: p.layout?.viewMode || 'DUAL',
      showUtmGrid: p.layout?.showUtmGrid ?? true,
      gridSpacingMeters: p.layout?.gridSpacingMeters || 100,
      showCoordinateTable: p.layout?.showCoordinateTable ?? true,
      showGeometryStamp: p.layout?.showGeometryStamp ?? true,
      showNorthArrow: p.layout?.showNorthArrow ?? true,
      showInteriorAngles: p.layout?.showInteriorAngles ?? true,
      angleFormat: p.layout?.angleFormat || 'DEG',
      utmZoneOverride: p.layout?.utmZoneOverride || 0,
      satelliteZoom: p.layout?.satelliteZoom || 16.5,
      mapZoom: p.layout?.mapZoom || 14.5,
      satellitePitch: p.layout?.satellitePitch || 0,
      satelliteHeading: p.layout?.satelliteHeading || 0,
      mapTypeSatellite: p.layout?.mapTypeSatellite || 'satellite',
      mapTypeContext: p.layout?.mapTypeContext || 'roadmap',
    },
  };
}

/**
 * Load all saved projects from localStorage, initializing presets if empty
 */
export function loadAllProjects(): CroquiProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => sanitizeProjectSchema(p));
      }
    }
  } catch (err) {
    console.error('Erro ao ler projetos salvos:', err);
  }

  // Initial seed with two distinct projects
  const initial = [PRESET_TALATONA, PRESET_LOBITO];
  saveAllProjects(initial);
  return initial;
}


/**
 * Save array of projects to localStorage
 */
export function saveAllProjects(projects: CroquiProject[]): void {
  try {
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Erro ao salvar projetos:', err);
  }
}

/**
 * Save or update a single project
 */
export function saveSingleProject(project: CroquiProject): CroquiProject[] {
  const current = loadAllProjects();
  const existingIdx = current.findIndex((p) => p.id === project.id);
  const updatedProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  let updatedList: CroquiProject[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedProject;
  } else {
    updatedList = [updatedProject, ...current];
  }

  saveAllProjects(updatedList);
  setActiveProjectId(project.id);
  return updatedList;
}

/**
 * Delete a project by ID
 */
export function deleteProject(id: string): CroquiProject[] {
  const current = loadAllProjects();
  const updated = current.filter((p) => p.id !== id);
  // Ensure at least one project exists
  if (updated.length === 0) {
    updated.push(PRESET_TALATONA);
  }
  saveAllProjects(updated);
  return updated;
}

/**
 * Duplicate a project
 */
export function duplicateProject(source: CroquiProject): CroquiProject {
  const newProject: CroquiProject = {
    ...source,
    id: `proj-${Date.now()}`,
    name: `${source.name} (Cópia)`,
    updatedAt: new Date().toISOString(),
    stamp: {
      ...source.stamp,
      drawingNumber: `${source.stamp.drawingNumber}-CÓPIA`,
    },
  };
  saveSingleProject(newProject);
  return newProject;
}

/**
 * Get active project ID
 */
export function getActiveProjectId(): string {
  return localStorage.getItem(STORAGE_ACTIVE_PROJECT_ID_KEY) || PRESET_TALATONA.id;
}

/**
 * Set active project ID
 */
export function setActiveProjectId(id: string): void {
  localStorage.setItem(STORAGE_ACTIVE_PROJECT_ID_KEY, id);
}

/**
 * Save company default logo
 */
export function saveDefaultCompanyLogo(logoDataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_DEFAULT_LOGO_KEY, logoDataUrl);
  } catch (e) {
    console.error('Erro ao salvar logotipo padrão:', e);
  }
}

/**
 * Get company default logo
 */
export function getDefaultCompanyLogo(): string {
  try {
    return localStorage.getItem(STORAGE_DEFAULT_LOGO_KEY) || DIOGIS_OFFICIAL_LOGO;
  } catch {
    return DIOGIS_OFFICIAL_LOGO;
  }
}
