import React, { useState } from 'react';
import { UTMCoordinate, LatLng } from '../types/croqui';
import { utmToLatLng, latLngToUtm } from '../utils/utm';
import { Plus, Trash2, Edit3, Check, X, MapPin, Lock } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';

interface CoordinateTableProps {
  coordinates: UTMCoordinate[];
  zone: number;
  hemisphere: 'N' | 'S';
  centralMeridian: number;
  interactive?: boolean;
  onUpdateVertices?: (vertices: LatLng[]) => void;
  className?: string;
  compact?: boolean;
}

export const CoordinateTable: React.FC<CoordinateTableProps> = ({
  coordinates,
  zone,
  hemisphere,
  centralMeridian,
  interactive = false,
  onUpdateVertices,
  className = '',
  compact = false,
}) => {
  const { isLicenseActive, checkLicenseBeforeAction } = useLicense();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEasting, setEditEasting] = useState('');
  const [editNorthing, setEditNorthing] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEasting, setNewEasting] = useState('');
  const [newNorthing, setNewNorthing] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [inputMode, setInputMode] = useState<'utm' | 'latlng'>('utm');

  const startEdit = async (c: UTMCoordinate) => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('A edição de coordenadas');
      return;
    }
    setEditingId(c.id);
    setEditEasting(c.easting.toFixed(2));
    setEditNorthing(c.northing.toFixed(2));
  };

  const saveEdit = async (c: UTMCoordinate) => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('O salvamento de coordenadas');
      setEditingId(null);
      return;
    }
    const e = parseFloat(editEasting);
    const n = parseFloat(editNorthing);
    if (!isNaN(e) && !isNaN(n) && onUpdateVertices) {
      const newLatLng = utmToLatLng(e, n, zone, hemisphere);
      const updated = coordinates.map((coord) =>
        coord.id === c.id ? newLatLng : { lat: coord.latitude, lng: coord.longitude }
      );
      onUpdateVertices(updated);
    }
    setEditingId(null);
  };

  const deleteVertex = async (id: number) => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('A eliminação de vértices');
      return;
    }
    if (coordinates.length <= 3) {
      alert('Um croqui de localização necessita de no mínimo 3 vértices.');
      return;
    }
    if (onUpdateVertices) {
      const updated = coordinates
        .filter((c) => c.id !== id)
        .map((c) => ({ lat: c.latitude, lng: c.longitude }));
      onUpdateVertices(updated);
    }
  };

  const reverseOrder = async () => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('A inversão de ordem dos vértices');
      return;
    }
    if (onUpdateVertices && coordinates.length >= 3) {
      const reversed = [...coordinates].reverse().map((c) => ({ lat: c.latitude, lng: c.longitude }));
      onUpdateVertices(reversed);
    }
  };

  const handleAddVertex = async () => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('A inserção de novas coordenadas');
      setShowAddModal(false);
      return;
    }
    if (!onUpdateVertices) return;

    if (inputMode === 'utm') {
      const e = parseFloat(newEasting);
      const n = parseFloat(newNorthing);
      if (!isNaN(e) && !isNaN(n)) {
        const newCoord = utmToLatLng(e, n, zone, hemisphere);
        onUpdateVertices([...coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })), newCoord]);
        setShowAddModal(false);
        setNewEasting('');
        setNewNorthing('');
      }
    } else {
      const lat = parseFloat(newLat);
      const lng = parseFloat(newLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        onUpdateVertices([...coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })), { lat, lng }]);
        setShowAddModal(false);
        setNewLat('');
        setNewLng('');
      }
    }
  };

  return (
    <div className={`overflow-hidden rounded border border-amber-300 bg-white shadow-sm ${className}`}>
      {/* Header Banner - Matches typical Cadastral yellow/gold banner from sample */}
      <div className="bg-amber-100/90 border-b border-amber-300 px-3 py-1.5 flex items-center justify-between text-amber-950">
        <div className="font-bold text-xs tracking-tight">
          Projecção UTM baseado em WGS 84 - Zona {zone}
          {hemisphere} Meridiano central {centralMeridian}º {centralMeridian >= 0 ? 'E' : 'W'}
        </div>
        {interactive && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={reverseOrder}
              className="flex items-center gap-1 text-[11px] font-semibold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded transition shadow-2xs"
              title="Inverter ordem dos vértices (Horário ⇄ Anti-horário)"
            >
              Inverter Sentido ⇄
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded transition shadow-xs"
              title="Adicionar novo vértice por coordenadas"
            >
              <Plus size={12} /> Vértice
            </button>
          </div>
        )}

      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-amber-50 text-amber-900 border-b border-amber-200 font-semibold">
              <th className="py-1 px-2 border-r border-amber-200 text-center w-8">Id</th>
              <th className="py-1 px-2 border-r border-amber-200">Este (X)</th>
              <th className="py-1 px-2 border-r border-amber-200">Norte (Y)</th>
              <th className="py-1 px-2 border-r border-amber-200">Longitude</th>
              <th className="py-1 px-2 border-r border-amber-200">Latitude</th>
              <th className="py-1 px-2 border-r border-amber-200 text-center text-amber-950 font-bold">Ângulo (∠)</th>
              {interactive && <th className="py-1 px-1.5 text-center w-14">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 font-mono text-[11px]">
            {coordinates.map((c) => {
              const isEditing = editingId === c.id;

              return (
                <tr
                  key={c.id}
                  className={`hover:bg-amber-50/50 transition ${
                    isEditing ? 'bg-amber-100/60' : ''
                  }`}
                >
                  <td className="py-1 px-2 border-r border-amber-200 text-center font-bold text-slate-800">
                    {c.id}
                  </td>
                  <td className="py-1 px-2 border-r border-amber-200 text-slate-900">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editEasting}
                        onChange={(e) => setEditEasting(e.target.value)}
                        className="w-24 px-1 py-0.5 border border-amber-400 bg-white rounded text-xs"
                      />
                    ) : (
                      c.easting.toFixed(2)
                    )}
                  </td>
                  <td className="py-1 px-2 border-r border-amber-200 text-slate-900">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editNorthing}
                        onChange={(e) => setEditNorthing(e.target.value)}
                        className="w-24 px-1 py-0.5 border border-amber-400 bg-white rounded text-xs"
                      />
                    ) : (
                      c.northing.toFixed(2)
                    )}
                  </td>
                  <td className="py-1 px-2 border-r border-amber-200 text-slate-700">
                    {c.lngDms}
                  </td>
                  <td className="py-1 px-2 border-r border-amber-200 text-slate-700">
                    {c.latDms}
                  </td>
                  <td className="py-1 px-2 border-r border-amber-200 text-center font-bold text-amber-950 bg-amber-50/40">
                    {c.interiorAngleDeg !== undefined ? `${c.interiorAngleDeg.toFixed(2)}°` : '-'}
                  </td>
                  {interactive && (
                    <td className="py-1 px-1 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(c)}
                            className="p-1 text-emerald-600 hover:text-emerald-800"
                            title="Salvar"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Cancelar"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(c)}
                            className="p-1 text-slate-500 hover:text-blue-600"
                            title="Editar coordenadas"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => deleteVertex(c.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Remover vértice"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal to add vertex manually */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                <MapPin size={16} className="text-amber-600" /> Inserir Novo Vértice
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded text-xs">
              <button
                type="button"
                onClick={() => setInputMode('utm')}
                className={`flex-1 py-1 rounded font-medium ${
                  inputMode === 'utm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Coordenadas UTM (m)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('latlng')}
                className={`flex-1 py-1 rounded font-medium ${
                  inputMode === 'latlng' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Graus Decimais (Lat/Lng)
              </button>
            </div>

            {inputMode === 'utm' ? (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Este (X) [metros]:</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 301860.25"
                    value={newEasting}
                    onChange={(e) => setNewEasting(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Norte (Y) [metros]:</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 9013469.08"
                    value={newNorthing}
                    onChange={(e) => setNewNorthing(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div className="text-[11px] text-slate-500 bg-amber-50 p-2 rounded border border-amber-200">
                  Calculado na Zona {zone}{hemisphere} (MC {centralMeridian}º E).
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Latitude:</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Ex: -8.920362"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Longitude:</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Ex: 13.197997"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddVertex}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold"
              >
                Adicionar Vértice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
