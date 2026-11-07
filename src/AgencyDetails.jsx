import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000' : '');

// Agency marker icon for map
const agencyDetailIcon = L.divIcon({
  html: `<div class="marker-container selected" style="background-color: #059669">
           <svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
         </div>`,
  className: 'custom-marker',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

// Fallback coordinates based on area_served
const areaCoordinates = {
  'Ontario': { lat: 43.6532, lng: -79.3832 },
  'Quebec': { lat: 45.5017, lng: -73.5673 },
  'Alberta': { lat: 51.0447, lng: -114.0719 },
  'British Columbia': { lat: 49.2827, lng: -123.1207 },
  'Manitoba': { lat: 49.8951, lng: -97.1384 },
  'Nova Scotia': { lat: 44.6488, lng: -63.5752 },
};

const AgencyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const agencyId = parseInt(id);
  const [agency, setAgency] = useState(null);
  const [agencyProviders, setAgencyProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const sectionRefs = useRef({});
  const [provinces, setProvinces] = useState([]);
  const [regions, setRegions] = useState([]);
  const [regionsServed, setRegionsServed] = useState([]);
  const [hashScrolled, setHashScrolled] = useState(false);

  // Scroll to top only when there's no hash in the URL
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      setHashScrolled(false);
    }
  }, [id, location.hash]);

  // Handle hash-based scrolling after data loads and DOM is ready
  useEffect(() => {
    if (!loading && agency && location.hash && !hashScrolled) {
      const hash = location.hash.replace('#', '');
      const attemptScroll = () => {
        const el = sectionRefs.current[hash];
        if (el) {
          const offset = 90;
          const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
          setHashScrolled(true);
        }
      };
      // Try immediately and also after a delay to ensure DOM refs are set
      attemptScroll();
      const timer = setTimeout(attemptScroll, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, agency, location.hash, hashScrolled]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/agencies`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(a => a.id === agencyId);
        setAgency(found || null);
        setAgencyProviders(found && found.providers ? found.providers : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching agency:', err);
        setLoading(false);
      });
    fetch(`${API_BASE}/provinces`)
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(err => console.error('Error fetching provinces:', err));
    fetch(`${API_BASE}/regions`)
      .then(res => res.json())
      .then(data => setRegions(data))
      .catch(err => console.error('Error fetching regions:', err));
    fetch(`${API_BASE}/regions-served-lookup`)
      .then(res => res.json())
      .then(data => setRegionsServed(data))
      .catch(err => console.error('Error fetching regions served:', err));
  }, [id, agencyId]);

  // Get coordinates for the agency (use agency's own address from LEFT OUTER JOIN, or fall back to area_served)
  const agencyAddressInfo = agency && agency.addresses && agency.addresses.length > 0
    ? agency.addresses[0].address
    : null;

  let agencyCoordinates = null;
  if (agencyAddressInfo && agencyAddressInfo.latitude && agencyAddressInfo.longitude) {
    agencyCoordinates = { lat: agencyAddressInfo.latitude, lng: agencyAddressInfo.longitude };
  } else if (agency && agency.area_served && agency.area_served.length > 0) {
    const firstArea = agency.area_served.find(a => areaCoordinates[a]);
    if (firstArea) {
      agencyCoordinates = areaCoordinates[firstArea];
    }
  }

  // Total spots across all providers
  const totalSpots = agencyProviders.reduce((sum, p) => sum + (p.spots_available || 0), 0);

  // Build table of contents
  const agencyInspectHref = (() => {
    const raw = (agency?.gov_inspect_profile_link || '').trim();
    if (!raw) return null;
    const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    return /^https?:\/\//i.test(href) ? href : null;
  })();

  const tableOfContents = React.useMemo(() => {
    const sections = [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'contact', label: 'Contact', icon: 'phone' },
    ];
    if (agency && (agency.description || agencyInspectHref)) {
      sections.push({ id: 'description', label: 'About', icon: 'info' });
    }
    if (agency && agency.area_served && agency.area_served.length > 0) {
      sections.push({ id: 'area-served', label: 'Area Served', icon: 'map' });
    }
    if (agencyCoordinates) {
      sections.push({ id: 'location', label: 'Location', icon: 'pin' });
    }
    if (agencyProviders.length > 0) {
      sections.push({ id: 'providers', label: `Providers (${agencyProviders.length})`, icon: 'users' });
    }
    return sections;
  }, [agency, agencyProviders.length, agencyCoordinates]);

  // Intersection Observer for active section detection
  useEffect(() => {
    const handleIntersect = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0.1,
    });

    tableOfContents.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [tableOfContents]);

  const scrollToSection = (sectionId) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const offset = 90;
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'phone':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'map':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'pin':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'users':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="p-20 text-center">Loading...</div>;
  if (!agency) return <div className="p-20 text-center">Agency not found</div>;

  // Get region name
  const agencyRegion = agency.region_id ? regions.find(r => r.id === agency.region_id) : null;
  const agencyRegionServed = agency.region_served_id ? regionsServed.find(r => r.id === agency.region_served_id) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-green-600 font-bold hover:underline cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Agencies
      </button>

      {/* Hero Section */}
      <div className="bg-white rounded-[5px] shadow-xl overflow-hidden border border-gray-100 mb-8">
        <div className="h-56 sm:h-80 w-full relative flex items-center justify-center bg-green-700">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-400 rounded-full blur-3xl"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <h1 className="text-3xl sm:text-5xl font-bold text-white bg-black/40 backdrop-blur-md px-8 py-4 rounded-[5px] shadow-2xl text-center border border-white/10 uppercase tracking-tight">
              {agency.name}
            </h1>
          </div>
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-green-600 uppercase tracking-widest shadow-sm">
              Agency
            </span>
            {agency.area_served && agency.area_served.length > 0 && (
              <span className="bg-blue-600/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-tight shadow-sm">
                {agency.area_served.join(', ')}
              </span>
            )}
          </div>
          <div className="absolute top-4 right-4">
            <span className="bg-green-600/90 backdrop-blur px-4 py-2 rounded-full text-sm font-bold text-white uppercase tracking-tight shadow-sm">
              {agencyProviders.length} Provider{agencyProviders.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Table of Contents */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-[5px] p-5 border border-gray-300 shadow-md sticky top-20">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Table of Contents</h3>
            <nav className="space-y-1">
              {tableOfContents.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium transition-all duration-200 cursor-pointer ${
                    activeSection === id
                      ? 'bg-green-50 text-green-700 border-l-[3px] border-green-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent'
                  }`}
                >
                  <span className={activeSection === id ? 'text-green-600' : 'text-gray-400'}>
                    {getIcon(icon)}
                  </span>
                  {label}
                </button>
              ))}
            </nav>

            {/* Back to Agencies */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button 
                onClick={() => navigate('/agencies')}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-gray-500 hover:text-green-600 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Agencies
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Overview Section */}
          <div 
            id="overview"
            ref={(el) => { sectionRefs.current['overview'] = el; }}
            className="bg-white rounded-[5px] p-2 sm:p-8 border border-gray-300 shadow-md"
          >
            <h2 className="text-2xl font-bold text-white mb-3 -mx-2 -mt-2 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
              <span className="bg-white/20 p-2 rounded-[5px] text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Providers</label>
                <p className="text-base font-bold text-green-600">{agencyProviders.length} Provider{agencyProviders.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Total Spots Available</label>
                <p className={`text-base font-bold ${totalSpots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalSpots > 0 ? `${totalSpots} Spots` : 'Waitlist Only'}
                </p>
              </div>
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Area Served</label>
                <p className="text-base font-bold text-gray-900">
                  {agency.area_served && agency.area_served.length > 0 ? agency.area_served.join(', ') : 'N/A'}
                </p>
              </div>
              {agencyRegionServed && (
                <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Region Served</label>
                  <p className="text-base font-bold text-gray-900">{agencyRegionServed.name}</p>
                </div>
              )}
              {agencyRegion && (
                <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Region</label>
                  <p className="text-base font-bold text-gray-900">{agencyRegion.name}</p>
                </div>
              )}
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Phone</label>
                <a href={`tel:${agency.phone}`} className="text-base font-bold text-gray-900 hover:text-green-600 transition">{agency.phone}</a>
              </div>
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Email</label>
                <a href={`mailto:${agency.email}`} className="text-base font-bold text-gray-900 hover:text-green-600 transition break-all">{agency.email}</a>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div 
            id="contact"
            ref={(el) => { sectionRefs.current['contact'] = el; }}
            className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
          >
            <h2 className="text-2xl font-bold text-white mb-3 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
              <span className="bg-white/20 p-2 rounded-[5px] text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </span>
              Contact
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                <div className="bg-green-100 p-2 rounded-[5px] text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Phone</label>
                  <a href={`tel:${agency.phone}`} className="text-gray-900 font-bold hover:text-green-600 transition">{agency.phone}</a>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                <div className="bg-blue-100 p-2 rounded-[5px] text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 012-2V7a2 2 0 012-2H5a2 2 0 012 2v10a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Email</label>
                  <a href={`mailto:${agency.email}`} className="text-gray-900 font-bold hover:text-green-600 transition break-all">{agency.email}</a>
                </div>
              </div>
              {agency.website && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                  <div className="bg-purple-100 p-2 rounded-[5px] text-purple-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Website</label>
                    <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-bold hover:text-green-600 transition break-all">
                      {agency.website}
                    </a>
                  </div>
                </div>
              )}
              {agency.addresses && agency.addresses.length > 0 && agency.addresses.map((addr, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                  <div className="bg-orange-100 p-2 rounded-[5px] text-orange-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Address{agency.addresses.length > 1 ? ` ${index + 1}` : ''}</label>
                    <span className="text-gray-900 font-bold">{addr.address.full_address || 'N/A'}</span>
                    {addr.address.city && (
                      <p className="text-sm text-gray-500 mt-0.5">{addr.address.city}{addr.address.province ? `, ${addr.address.province}` : ''}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description Section */}
          {(agency.description || agencyInspectHref) && (
            <div
              id="description"
              ref={(el) => { sectionRefs.current['description'] = el; }}
              className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
            >
              <h2 className="text-2xl font-bold text-white mb-2 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
                <span className="bg-white/20 p-2 rounded-[5px] text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                About this Agency
              </h2>
              {agency.description && (
                <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">{agency.description}</p>
              )}
              {agencyInspectHref && (
                <p className="mt-6 text-base break-all">
                  <span className="font-semibold text-gray-700">Government Inspection Profile: </span>
                  <a
                    href={agencyInspectHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 underline hover:text-green-800"
                  >
                    {agencyInspectHref}
                  </a>
                </p>
              )}
            </div>
          )}

          {/* Area Served Section */}
          {agency.area_served && agency.area_served.length > 0 && (
            <div 
              id="area-served"
              ref={(el) => { sectionRefs.current['area-served'] = el; }}
              className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
            >
              <h2 className="text-2xl font-bold text-white mb-2 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
                <span className="bg-white/20 p-2 rounded-[5px] text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                Area Served
              </h2>
              {agencyRegionServed && (
                <p className="mb-4 text-sm text-gray-500">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Region Served</span>
                  <span className="font-bold text-gray-900">{agencyRegionServed.name}</span>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agency.area_served.map((area, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                    <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-bold text-sm">{area}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Section */}
          {agencyCoordinates && (
            <div 
              id="location"
              ref={(el) => { sectionRefs.current['location'] = el; }}
              className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
            >
              <h2 className="text-2xl font-bold text-white mb-3 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
                <span className="bg-white/20 p-2 rounded-[5px] text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                Location
              </h2>
              <div className="h-80 w-full rounded-[5px] overflow-hidden border border-gray-100 shadow-inner z-0">
                <MapContainer 
                  center={[agencyCoordinates.lat, agencyCoordinates.lng]} 
                  zoom={agencyCoordinates ? 15 : 5} 
                  scrollWheelZoom={false}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker 
                    position={[agencyCoordinates.lat, agencyCoordinates.lng]}
                    icon={agencyDetailIcon}
                  />
                </MapContainer>
              </div>
                  {agencyAddressInfo && agencyAddressInfo.full_address && (
                <div className="mt-4 flex items-center gap-2 text-gray-600 font-medium">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {agencyAddressInfo.full_address}
                </div>
              )}
            </div>
          )}

          {/* Providers Section */}
          {agencyProviders.length > 0 && (
            <div 
              id="providers"
              ref={(el) => { sectionRefs.current['providers'] = el; }}
              className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
            >
              <h2 className="text-2xl font-bold text-white mb-3 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
                <span className="bg-white/20 p-2 rounded-[5px] text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                Providers ({agencyProviders.length})
              </h2>
              <div className="space-y-4">
                {agencyProviders.map(provider => {
                  const providerLocation = provider.location || '';
                  const providerSpots = provider.spots_available || 0;
                  const providerImage = provider.image || '';
                  return (
                    <div key={provider.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-[5px] border border-gray-100 hover:bg-gray-100/50 transition">
                      <div 
                        onClick={() => navigate(`/provider/${provider.id}`)} 
                        className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 p-1.5 flex items-center justify-center cursor-pointer"
                      >
                        {providerImage ? (
                          <img src={providerImage} alt={provider.name} className="w-full h-full object-contain" />
                        ) : (
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/provider/${provider.id}`}
                          className="text-lg font-bold text-gray-900 hover:text-green-600 transition hover:underline"
                        >
                          {provider.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{provider.type}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-sm text-gray-500 flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {providerLocation}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {providerSpots > 0 ? (
                            <Link 
                              to={`/provider/${provider.id}#availability`}
                              className="text-green-700 text-xs font-bold uppercase tracking-tight hover:text-green-600 hover:underline transition"
                            >
                              {providerSpots} spots available
                            </Link>
                          ) : (
                            <Link 
                              to={`/waitlist/${provider.id}`}
                              className="text-red-600 text-xs font-bold uppercase tracking-tight hover:text-red-500 hover:underline transition"
                            >
                              Waitlist
                            </Link>
                          )}
                          <Link 
                            to={`/provider/${provider.id}`}
                            className="text-green-600 text-xs font-bold hover:underline transition"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyDetails;