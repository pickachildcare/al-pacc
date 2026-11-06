import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import leafBg from './assets/educators-group.jpg';
import { PaginatedList } from './Pagination';
import SearchAutocomplete from './SearchAutocomplete';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000' : '';

// Fix for default marker icons in Leaflet with Webpack/Vite
const agencyIcon = L.divIcon({
  html: `<div class="marker-container" style="background-color: #059669">
           <svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
         </div>`,
  className: 'custom-marker',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

// Fallback coordinates based on area_served for agencies without provider addresses
const areaCoordinates = {
  'Ontario': { lat: 43.6532, lng: -79.3832 },
  'Quebec': { lat: 45.5017, lng: -73.5673 },
  'Alberta': { lat: 51.0447, lng: -114.0719 },
  'British Columbia': { lat: 49.2827, lng: -123.1207 },
  'Manitoba': { lat: 49.8951, lng: -97.1384 },
  'Nova Scotia': { lat: 44.6488, lng: -63.5752 },
};

// ***********************************
//          AgencyCard Component
// ***********************************
const AgencyCard = ({ agency, onAgencyProvidersClick }) => {
  const navigate = useNavigate();
  const providerCount = agency.providers ? agency.providers.length : 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-blue-400 group flex flex-col">
      {/* Top Row: Area served and Provider count */}
      <div className="flex justify-between items-start pt-3 sm:pt-4 px-3 sm:px-4 mb-2 ml-[80px] sm:ml-[104px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Agency</span>
        </div>
        <div>
          {providerCount > 0 ? (
            <Link
              to={`/?agencyId=${agency.id}`}
              onClick={onAgencyProvidersClick}
              className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-full border-2 border-green-600 uppercase tracking-tight hover:bg-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              {providerCount} Provider{providerCount !== 1 ? 's' : ''}
            </Link>
          ) : (
            <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-full border-2 border-green-600 uppercase tracking-tight">
              {providerCount} Provider{providerCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Horizontal line right below the type along the width of the card */}
      <div className="border-b border-blue-600 w-full mb-3"></div>

      <div className="flex items-start pb-3 sm:pb-4 px-3 sm:px-4 gap-4 sm:gap-6">
        {/* Icon */}
        <div 
          onClick={() => navigate(`/agency/${agency.id}`)} 
          className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden rounded-xl bg-green-50 border border-gray-100 p-2 flex items-center justify-center cursor-pointer"
        >
          <svg className="w-10 h-10 text-green-600 group-hover:scale-110 transition duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <button 
            onClick={() => navigate(`/agency/${agency.id}`)}
            className="text-xl font-bold text-gray-900 mb-0.5 group-hover:text-green-600 transition text-left cursor-pointer hover:underline"
          >
            {agency.name}
          </button>
          {agency.addresses && agency.addresses.length > 0 && (
            <p className="text-sm text-gray-500 mb-2 flex items-center flex-wrap">
              <svg className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hover:text-green-600 transition">{agency.addresses[0].address.full_address}</span>
            </p>
          )}

          <div className="border-b border-blue-300 w-full mb-3"></div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {agency.website && (
                <a href={agency.website} target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[11px] font-bold uppercase rounded-md hover:bg-purple-100 transition">
                  Website
                </a>
              )}
              {agency.area_served && agency.area_served.length > 0 && (
                <Link to={`/agency/${agency.id}#area-served`} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-bold uppercase rounded-md hover:bg-blue-100 transition">
                  Area Served
                </Link>
              )}
            </div>

            <button 
              onClick={() => navigate(`/agency/${agency.id}`)}
              className="text-green-600 text-sm font-bold hover:underline cursor-pointer"
            >
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ***********************************
//      Agency Sidebar Filter
// ***********************************
const AgencyAccordionItem = ({ title, children, defaultOpen = true, autoOpen }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [prevAutoOpen, setPrevAutoOpen] = useState(autoOpen);

  // Follows the controlling item (e.g. selected regions): opens when it becomes active, collapses when it clears
  if (autoOpen !== prevAutoOpen) {
    setPrevAutoOpen(autoOpen);
    if (autoOpen !== undefined) setIsOpen(autoOpen);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full group focus:outline-none"
      >
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider group-hover:text-green-600 transition">
          {title}
        </h3>
        <svg
          className={`w-4 h-4 text-gray-400 group-hover:text-green-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div 
        className={`mt-1 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {children}
      </div>
    </div>
  );
};

const AgencySidebarFilters = ({ filters, setFilters, areaOptions, regionsServed }) => {
  const toggleRegionServed = (regionId) => {
    const next = filters.regionsServed.includes(regionId)
      ? filters.regionsServed.filter(id => id !== regionId)
      : [...filters.regionsServed, regionId];
    const allowed = new Set(areaOptions
      .filter(area => next.includes(area.region_served_id))
      .map(area => area.name));
    setFilters({
      ...filters,
      regionsServed: next,
      areas: filters.areas.filter(a => allowed.has(a)),
    });
  };

  const visibleAreas = areaOptions.filter(area => filters.regionsServed.includes(area.region_served_id));
  const toggleArea = (area) => {
    const newAreas = filters.areas.includes(area)
      ? filters.areas.filter(a => a !== area)
      : [...filters.areas, area];
    setFilters({ ...filters, areas: newAreas });
  };

  return (
    <div className="space-y-2">
      <div style={{backgroundColor: "lightblue"}} className="flex items-center gap-2 p-3 rounded-xl">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">Filter Agencies</h2>
      </div>

      <div className="space-y-1.5">
        <AgencyAccordionItem title="Region Served" defaultOpen={false}>
          {regionsServed.length > 0 ? (
            <div className="space-y-2">
              {regionsServed.map(region => (
                <label key={region.id} className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                    checked={filters.regionsServed.includes(region.id)}
                    onChange={() => toggleRegionServed(region.id)}
                  />
                  <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">{region.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No regions available</p>
          )}
        </AgencyAccordionItem>
        <AgencyAccordionItem title="Area Served" defaultOpen={false} autoOpen={filters.regionsServed.length > 0}>
          {visibleAreas.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {visibleAreas.map(area => (
                <label key={area.id} className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                    checked={filters.areas.includes(area.name)}
                    onChange={() => toggleArea(area.name)}
                  />
                  <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">{area.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Select a region to see its areas</p>
          )}
        </AgencyAccordionItem>
      </div>

      <div className="pt-2">
        <button
          onClick={() => setFilters({ areas: [], regionsServed: [] })}
          className="w-full py-3 text-sm font-bold text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-600 rounded-xl transition"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

// ***********************************
//      Agency Map View Component
// ***********************************
const AgencyMapView = ({ filteredAgencies }) => {
  const navigate = useNavigate();
  const defaultCenter = [53.5461, -113.4938]; // Alberta default

  // Get coordinates for each agency: use agency address (LEFT OUTER JOIN), or fall back to area_served coordinates
  const agencyMarkers = filteredAgencies.map(agency => {
    const agencyProviders = agency.providers || [];

    // Use agency's own address from the LEFT OUTER JOIN with addresses
    let coordinates = null;
    if (agency.addresses && agency.addresses.length > 0) {
      const addr = agency.addresses[0].address;
      if (addr && addr.latitude && addr.longitude) {
        coordinates = { lat: addr.latitude, lng: addr.longitude };
      }
    }

    // Fall back to area_served coordinates if no agency address
    if (!coordinates && agency.area_served && agency.area_served.length > 0) {
      const firstArea = agency.area_served.find(a => areaCoordinates[a]);
      if (firstArea) {
        coordinates = areaCoordinates[firstArea];
      }
    }

    if (!coordinates) return null;

    return {
      agency,
      coordinates,
      providerCount: agencyProviders.length
    };
  }).filter(Boolean);

  // Center map on the middle of all markers
  const center = agencyMarkers.length > 0
    ? [agencyMarkers.reduce((sum, m) => sum + m.coordinates.lat, 0) / agencyMarkers.length,
       agencyMarkers.reduce((sum, m) => sum + m.coordinates.lng, 0) / agencyMarkers.length]
    : defaultCenter;

  return (
    <div className="w-full h-[600px] bg-green-50 rounded-3xl border border-gray-200 relative overflow-hidden shadow-inner">
      <MapContainer 
        center={center} 
        zoom={5} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {agencyMarkers.map(({ agency, coordinates, providerCount }) => (
          <Marker 
            key={agency.id} 
            position={[coordinates.lat, coordinates.lng]}
            icon={agencyIcon}
            riseOnHover={true}
          >
            <Popup className="provider-popup" maxWidth={300}>
              <div className="flex flex-col bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-green-100 p-1.5 rounded-lg text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Agency</span>
                  {agency.area_served && agency.area_served.length > 0 && (
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-blue-600 uppercase tracking-tight">
                      {agency.area_served.join(', ')}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => navigate(`/agency/${agency.id}`)}
                  className="text-base font-bold text-gray-900 leading-tight mb-2 text-left cursor-pointer hover:text-green-600 hover:underline"
                >
                  {agency.name}
                </button>
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${agency.phone}`} className="hover:text-green-600 transition font-medium">{agency.phone}</a>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 01-2-2V7a2 2 0 012-2H5a2 2 0 012 2v10a2 2 0 01-2 2z" />
                  </svg>
                  <a href={`mailto:${agency.email}`} className="hover:text-green-600 transition font-medium">{agency.email}</a>
                </div>
                {agency.addresses && agency.addresses.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hover:text-green-600 transition">{agency.addresses[0].address.full_address}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-600 uppercase tracking-tight">
                    {providerCount} Provider{providerCount !== 1 ? 's' : ''}
                  </span>
                  <button 
                    onClick={() => navigate(`/agency/${agency.id}`)}
                    className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700 transition shadow-sm cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// ***********************************
//          AgenciesPage Component
// ***********************************
const AgenciesPage = ({ onAgencyProvidersClick }) => {
  const [agencies, setAgencies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ areas: [], regionsServed: [] });
  const [viewMode, setViewMode] = useState('list');
  const [regionsServedOptions, setRegionsServedOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/agencies`)
      .then(res => res.json())
      .then(data => setAgencies(data))
      .catch(err => console.error('Error fetching agencies:', err));
    fetch(`${API_BASE}/regions-served-lookup`)
      .then(res => res.json())
      .then(data => setRegionsServedOptions(data))
      .catch(err => console.error('Error fetching regions served:', err));
    fetch(`${API_BASE}/areas-served-lookup`)
      .then(res => res.json())
      .then(data => setAreaOptions(data))
      .catch(err => console.error('Error fetching areas served:', err));
  }, []);

  const allAreas = areaOptions.map(area => area.name);
  const searchSuggestions = [
    ...agencies.map(agency => ({
      label: agency.name,
      value: agency.name,
      sublabel: 'Agency',
    })),
    ...allAreas.map(area => ({
      label: area,
      value: area,
      sublabel: 'Area served',
    })),
  ];

  // Filter agencies by region, area served and search
  const filteredAgencies = agencies.filter(agency => {
    const matchesRegionServed = filters.regionsServed.length === 0 || filters.regionsServed.includes(agency.region_served_id);
    const agencyAreas = agency.area_served || [];
    const matchesArea = filters.areas.length === 0 || agencyAreas.some(area => filters.areas.includes(area));
    const matchesSearch = !searchQuery || 
      agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agencyAreas.some(area => area.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesRegionServed && matchesArea && matchesSearch;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

  return (
    <>
    {/* Hero Section */}
    <section
      className="pt-12 pb-20 md:pt-20 md:pb-24 text-center text-white relative bg-green-800"
      style={{
        backgroundImage: `url(${leafBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-green-900/60 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-400 rounded-full blur-3xl"></div>
      </div>
      <div className="w-full max-w-7xl mx-auto relative z-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight mb-3 uppercase">
            Our Agencies
          </h1>
          <p className="text-base text-green-50 max-w-2xl mx-auto">
            Browse licensed childcare agencies that coordinate home-based providers in your area.
          </p>
        </div>

      {/* Search Bar */}
      <div className="bg-white shadow-xl p-4 sm:p-6 border border-gray-100 rounded-2xl text-left">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <SearchAutocomplete
              suggestions={searchSuggestions}
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={(item) => setSearchQuery(item.value)}
              placeholder="Search agencies by name or area..."
              inputClassName="pl-10 font-medium"
            />
          </div>

          {/* Clear Button */}
          {(searchQuery || filters.areas.length > 0 || filters.regionsServed.length > 0) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({ areas: [], regionsServed: [] });
              }}
              className="text-green-600 font-bold hover:underline px-4 py-2 cursor-pointer whitespace-nowrap"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
      </div>
    </section>

    <div className="max-w-7xl mx-auto px-4 pt-10 pb-16 sm:px-6 lg:px-8">
      {/* Results Count and View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="text-xl sm:text-2xl text-gray-500 font-medium">
          Showing <span className="font-bold text-gray-900">{filteredAgencies.length}</span> {filteredAgencies.length === 1 ? 'agency' : 'agencies'}
        </p>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition duration-200 ${viewMode === 'list' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition duration-200 ${viewMode === 'map' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A2 2 0 013 15.485V5.111a2 2 0 011.106-1.789l5.447-2.724a2 2 0 011.894 0l5.447 2.724a2 2 0 011.106 1.789v10.374a2 2 0 01-1.106 1.789L10.894 20a2 2 0 01-1.894 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 4v16m6-12v12" />
              </svg>
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            <AgencySidebarFilters 
              filters={filters}
              setFilters={setFilters}
              areaOptions={areaOptions}
              regionsServed={regionsServedOptions}
            />
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          {filteredAgencies.length > 0 ? (
            viewMode === 'list' ? (
              <PaginatedList
                key={filteredAgencies.map(a => a.id).join(',')}
                items={filteredAgencies}
                renderPage={(pageAgencies) => (
                  <div className="grid grid-cols-1 gap-6 max-w-3xl">
                    {pageAgencies.map(agency => (
                      <AgencyCard key={agency.id} agency={agency} onAgencyProvidersClick={onAgencyProvidersClick} />
                    ))}
                  </div>
                )}
              />
            ) : (
              <AgencyMapView filteredAgencies={filteredAgencies} />
            )
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <div className="text-5xl mb-4 text-gray-300">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No agencies found</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-20 bg-green-600 rounded-3xl p-12 text-center text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-6 uppercase">Looking for a specific provider?</h2>
          <p className="text-xl mb-8 opacity-90">Search our full directory of childcare providers by location, name, or agency.</p>
          <a href="/" className="inline-block bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg uppercase">
            Search Providers
          </a>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-green-400/20 rounded-full blur-3xl"></div>
      </div>
    </div>
    </>
  );
};

export default AgenciesPage;