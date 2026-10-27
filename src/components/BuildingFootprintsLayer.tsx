import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { BuildingFootprint } from '../types/croqui';

interface BuildingFootprintsLayerProps {
  buildings: BuildingFootprint[];
  preview: BuildingFootprint | null;
}

/** Desenha edifícios sem alterar os vértices do lote cadastral. */
export const BuildingFootprintsLayer: React.FC<BuildingFootprintsLayerProps> = ({ buildings, preview }) => {
  const map = useMap('main-editor-map');
  const polygonsRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    if (!map) return;
    polygonsRef.current.forEach((polygon) => polygon.setMap(null));
    polygonsRef.current = [];

    const items = [...buildings, ...(preview ? [preview] : [])];
    polygonsRef.current = items
      .filter((building) => Array.isArray(building.coordinates) && building.coordinates.length >= 3)
      .map((building) => new google.maps.Polygon({
        map,
        paths: building.coordinates,
        strokeColor: building.id === preview?.id ? '#e879f9' : '#38bdf8',
        strokeOpacity: 1,
        strokeWeight: building.id === preview?.id ? 3 : 2,
        fillColor: building.id === preview?.id ? '#d946ef' : '#0ea5e9',
        fillOpacity: building.id === preview?.id ? 0.32 : 0.18,
        clickable: false,
        zIndex: building.id === preview?.id ? 80 : 40,
      }));

    return () => {
      polygonsRef.current.forEach((polygon) => polygon.setMap(null));
      polygonsRef.current = [];
    };
  }, [map, buildings, preview]);

  return null;
};
