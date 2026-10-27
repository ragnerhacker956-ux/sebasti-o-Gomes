import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search, MapPin, X, Loader2, Navigation, Compass } from 'lucide-react';
import { LatLng, CroquiProject } from '../types/croqui';

interface PlacesSearchBarProps {
  onLocationSelected: (
    location: LatLng,
    addressName: string,
    addressComponents?: google.maps.places.AddressComponent[]
  ) => void;
  className?: string;
}

export const PlacesSearchBar: React.FC<PlacesSearchBarProps> = ({
  onLocationSelected,
  className = '',
}) => {
  const map = useMap('main-editor-map');
  const placesLib = useMapsLibrary('places');

  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Autocomplete Suggestions using modern Places API (New)
  useEffect(() => {
    if (!placesLib || !inputValue.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const request: google.maps.places.AutocompleteRequest = {
      input: inputValue,
      sessionToken: sessionTokenRef.current,
    };

    setIsLoading(true);

    const timer = setTimeout(() => {
      AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        .then((res) => {
          setSuggestions(res.suggestions || []);
          setIsLoading(false);
          setIsOpen(true);
        })
        .catch((err) => {
          console.error('Erro ao buscar sugestões no Places API:', err);
          setIsLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [placesLib, inputValue]);

  // Handle Place Selection
  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;

      setIsLoading(true);
      setIsOpen(false);

      try {
        const place = suggestion.placePrediction.toPlace();

        // Modern promise-based fetchFields
        await place.fetchFields({
          fields: ['location', 'displayName', 'formattedAddress', 'viewport', 'addressComponents'],
        });

        // Reset session token after selection
        sessionTokenRef.current = null;

        if (place.location && map) {
          const lat = place.location.lat();
          const lng = place.location.lng();
          const targetCoords = { lat, lng };

          // Smoothly pan and center map on the selected place
          if (place.viewport) {
            map.fitBounds(place.viewport);
          } else {
            map.panTo(targetCoords);
            map.setZoom(17);
          }

          const label = place.displayName || place.formattedAddress || inputValue;
          setInputValue(label);

          // Notify parent to reposition lot or update project location
          onLocationSelected(
            targetCoords,
            label,
            place.addressComponents
          );
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes do local:', err);
      } finally {
        setIsLoading(false);
        setSuggestions([]);
      }
    },
    [placesLib, map, onLocationSelected, inputValue]
  );

  // Key navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    sessionTokenRef.current = null;
  };

  return (
    <div ref={containerRef} className={`relative flex-1 min-w-[240px] max-w-md ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar local ou endereço (Google Places)..."
          className="w-full pl-8 pr-8 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-cyan-500 rounded-md text-slate-100 placeholder-slate-400 text-xs focus:outline-hidden transition shadow-inner"
        />

        {/* Leading Search Icon / Loading Spinner */}
        <div className="absolute left-2.5 top-2 text-slate-400 pointer-events-none">
          {isLoading ? (
            <Loader2 size={13} className="animate-spin text-cyan-400" />
          ) : (
            <Search size={13} />
          )}
        </div>

        {/* Clear Button */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 text-slate-400 hover:text-slate-200 transition"
            title="Limpar pesquisa"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Places API Autocomplete Results Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-72 overflow-y-auto z-50 divide-y divide-slate-800 text-xs animate-in fade-in duration-150">
          <li className="px-3 py-1 bg-slate-950/80 text-[10px] text-cyan-400 font-semibold flex items-center justify-between border-b border-slate-800">
            <span>Resultados do Google Places</span>
            <span className="text-slate-500 font-normal">Use ↑↓ e Enter</span>
          </li>

          {suggestions.map((suggestion, index) => {
            const isSelected = index === selectedIndex;
            const primaryText = suggestion.placePrediction?.mainText?.text || suggestion.placePrediction?.text.text;
            const secondaryText = suggestion.placePrediction?.secondaryText?.text;

            return (
              <li
                key={index}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-3 py-2 cursor-pointer flex items-start gap-2.5 transition ${
                  isSelected ? 'bg-cyan-950/80 text-white' : 'hover:bg-slate-800/80 text-slate-200'
                }`}
              >
                <MapPin size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-slate-100 truncate">
                    {primaryText}
                  </div>
                  {secondaryText && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {secondaryText}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
