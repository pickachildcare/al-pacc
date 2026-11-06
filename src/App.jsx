import React, { useState, useEffect, useRef, useContext } from 'react';
import { Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import leafBg from './assets/bg.jpg';
import parentsHero from './assets/parents-hero.jpg';
import logo from './assets/logo.png';
import './App.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import SearchAutocomplete from './SearchAutocomplete';
import WaitlistForm from './WaitlistForm';
import BookTourForm from './BookTourForm';
import AgenciesPage from './AgenciesPage';
import ResourcesPage from './ResourcesPage';
import { PaginatedList } from './Pagination';
import AgencyDetails from './AgencyDetails';
import AdminDashboard from './AdminDashboard';
import { AuthModal } from './AuthForms';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000' : '');
const DataContext = React.createContext(null);
const provinceNamesByCode = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};
const normalizeProvince = (province) => {
  const value = (province || '').trim();
  return provinceNamesByCode[value.toUpperCase()] || value;
};

const fetchApi = async (path) => {
  const response = await fetch(`${API_BASE}/${path}`);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json();
};

const formatHoursTime = (value) => {
  const [h, m] = String(value || '').split(':').map(Number);
  if (Number.isNaN(h)) return '';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const normalizeProvider = (provider) => ({
  ...provider,
  agencyId: provider.agency_id,
  spotsAvailable: provider.spots_available ?? 0,
  maxCapacity: provider.max_capacity ?? 0,
  AgesServed: provider.ages_served || [],
  scheduleOptions: provider.schedule_options || [],
  mealsProvided: provider.meals_provided ?? false,
  snackProvided: provider.snack_provided ?? false,
});

const normalizeAddress = (address) => ({
  ...address,
  fullAddress: address.full_address,
  coordinates: { lat: address.latitude, lng: address.longitude },
});

const normalizeSpot = (spot) => ({
  ...spot,
  providerId: spot.provider_id,
  AgeAvailable: spot.age_available,
  partTime: spot.part_time,
  fullTime: spot.full_time,
  startDate: spot.start_date,
});

const AgencyModal = ({ agency, onClose }) => {
  if (!agency) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 cursor-default"
      >
        <div className="bg-green-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold uppercase tracking-tight">Information</h2>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Name</label>
            <p className="text-xl font-bold text-gray-900">{agency.name}</p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Phone</label>
              <a href={`tel:${agency.phone}`} className="text-gray-900 font-bold hover:text-green-600 transition">{agency.phone}</a>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 012-2V7a2 2 0 01-2-2H5a2 2 0 01-2 2v10a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Email</label>
              <a href={`mailto:${agency.email}`} className="text-gray-900 font-bold hover:text-green-600 transition">{agency.email}</a>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

const AgesServedModal = ({ provider, onClose }) => {
  if (!provider) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 cursor-default"
      >
        <div className="bg-green-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold uppercase tracking-tight">Ages Served</h2>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-gray-600 font-medium mb-4">This provider offers care for the following age groups:</p>
          <div className="space-y-2">
            {provider.AgesServed && provider.AgesServed.map((age, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-900 font-bold">{age}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={onClose}
            className="w-full mt-6 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SpotsAvailableModal = ({ provider, onClose }) => {
  const { spotsAvailable } = useContext(DataContext);
  if (!provider) return null;
  const providerSpots = spotsAvailable.filter(s => s.providerId === provider.id);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 cursor-default"
      >
        <div className="bg-green-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold uppercase tracking-tight">Availability Details</h2>
          <p className="text-green-100 text-sm mt-1">{provider.name}</p>
        </div>
        <div className="p-8">
          {providerSpots.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Age Group</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Part Time</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Full Time</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Start Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {providerSpots.map((spot) => (
                    <tr key={spot.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">{spot.AgeAvailable}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-lg font-bold text-xs ${spot.partTime > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {spot.partTime} spots
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-lg font-bold text-xs ${spot.fullTime > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {spot.fullTime} spots
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm font-medium">
                        {new Date(spot.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No detailed availability information provided.
            </div>
          )}
          <button 
            onClick={onClose}
            className="w-full mt-8 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Fix for default marker icons in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper for distance calculation (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

const Navbar = ({ onLoginClick, onRegisterClick, loggedInUser, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const isProvidersActive = pathname === '/' || pathname.startsWith('/provider/') || pathname.startsWith('/waitlist/') || pathname.startsWith('/book-tour/');
  const isAgenciesActive = pathname === '/agencies' || pathname.startsWith('/agency/');
  const isResourcesActive = pathname === '/resources';
  const isParentsActive = pathname === '/parents';
  const navLinkClass = (isActive) => `rounded-lg px-3 py-2 font-medium transition ${
    isActive
      ? 'bg-green-700 text-white shadow-sm'
      : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
  }`;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center" aria-label="Pick A Childcare home">
            <img src={logo} alt="Pick A Childcare" className="h-12 sm:h-14 w-auto" />
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" aria-current={isProvidersActive ? 'page' : undefined} className={navLinkClass(isProvidersActive)}>Providers</Link>
            <Link to="/agencies" aria-current={isAgenciesActive ? 'page' : undefined} className={navLinkClass(isAgenciesActive)}>Agencies</Link>
            <Link to="/parents" aria-current={isParentsActive ? 'page' : undefined} className={navLinkClass(isParentsActive)}>Parents</Link>
            <Link to="/resources" aria-current={isResourcesActive ? 'page' : undefined} className={navLinkClass(isResourcesActive)}>Resources</Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {loggedInUser ? (
              <div className="flex items-center gap-3">
                {loggedInUser.userType === 'admin' && (
                  <Link to="/admin" className="text-sm font-semibold text-green-700 hover:underline">Admin</Link>
                )}
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-bold text-green-700">{loggedInUser.username}</span>
                  {loggedInUser.userType && (
                    <span className="text-[10px] font-bold text-green-500 uppercase bg-green-100 px-1.5 py-0.5 rounded">{loggedInUser.userType}</span>
                  )}
                </div>
                <button 
                  onClick={onLogout}
                  className="text-gray-500 text-sm font-medium hover:text-red-600 transition cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button onClick={onLoginClick} className="text-gray-600 font-medium hover:text-green-600 cursor-pointer">Login</button>
                <button onClick={onRegisterClick} className="bg-green-600 text-white px-5 py-2 rounded-full font-medium hover:bg-green-700 transition shadow-md hover:shadow-lg cursor-pointer">Register</button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-green-600 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-4 shadow-lg">
          <div className="flex flex-col space-y-3">
            <Link to="/" aria-current={isProvidersActive ? 'page' : undefined} className={navLinkClass(isProvidersActive)} onClick={() => setIsOpen(false)}>Providers</Link>
            <Link to="/agencies" aria-current={isAgenciesActive ? 'page' : undefined} className={navLinkClass(isAgenciesActive)} onClick={() => setIsOpen(false)}>Agencies</Link>
            <Link to="/parents" aria-current={isParentsActive ? 'page' : undefined} className={navLinkClass(isParentsActive)} onClick={() => setIsOpen(false)}>Parents</Link>
            <Link to="/resources" aria-current={isResourcesActive ? 'page' : undefined} className={navLinkClass(isResourcesActive)} onClick={() => setIsOpen(false)}>Resources</Link>
          </div>
          <div className="pt-4 border-t border-gray-100 flex flex-col space-y-3">
            {loggedInUser ? (
              <>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl border border-green-200">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-bold text-green-700">{loggedInUser.username}</span>
                  {loggedInUser.userType && (
                    <span className="text-[10px] font-bold text-green-500 uppercase bg-green-100 px-1.5 py-0.5 rounded">{loggedInUser.userType}</span>
                  )}
                </div>
                <button 
                  onClick={() => { onLogout(); setIsOpen(false); }}
                  className="text-gray-500 font-medium py-2 text-left hover:text-red-600 transition cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { onLoginClick(); setIsOpen(false); }} className="text-gray-600 font-medium py-2 text-left cursor-pointer">Login</button>
                <button onClick={() => { onRegisterClick(); setIsOpen(false); }} className="bg-green-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-green-700 transition w-full shadow-md cursor-pointer">Register</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const SearchBar = ({ onSearch, onClear, searchType, setSearchType, initialAgencyName = '' }) => {
  const { providers, agencies, provinces, cities, communities } = useContext(DataContext);
  const [location, setLocation] = useState('');
  const [nearbyLocation, setNearbyLocation] = useState(null);
  const [distance, setDistance] = useState('');
  const [providerName, setProviderName] = useState('');
  const [agencyName, setAgencyName] = useState(initialAgencyName);

  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [community, setCommunity] = useState('');

  // Reset states when search type changes
  useEffect(() => {
    setLocation('');
    setNearbyLocation(null);
    setDistance('');
    setProviderName('');
    setAgencyName(searchType === 'Agency' ? initialAgencyName : '');
    setProvince('');
    setCity('');
    setCommunity('');
  }, [searchType]);

  const selectedProvince = provinces.find(item => item.name === province);
  const selectedCity = cities.find(item => item.province_id === selectedProvince?.id && item.name === city);
  const citiesForProvince = cities.filter(item => item.province_id === selectedProvince?.id);
  const communitiesForCity = communities.filter(item => item.city_id === selectedCity?.id);

  const searchTypes = ['Nearby', 'Province/City', 'Agency', 'Name'];

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchType === 'Province/City') {
      onSearch({ province, city, community }, true);
    } else if (searchType === 'Name') {
      onSearch({ location: providerName.trim(), distance: '' }, true);
    } else if (searchType === 'Agency') {
      onSearch({ location: agencyName.trim(), distance: '' }, true);
    } else if (searchType === 'Nearby') {
      onSearch({ 
        location: nearbyLocation ? nearbyLocation.label : location.trim(), 
        coordinates: nearbyLocation ? { lat: nearbyLocation.lat, lng: nearbyLocation.lon } : null,
        distance 
      }, true);
    } else {
      onSearch({ location: location.trim(), distance }, true);
    }
  };

  const hasSearchValue = searchType === 'Name'
    ? Boolean(providerName)
    : searchType === 'Agency'
      ? Boolean(agencyName)
      : searchType === 'Province/City'
        ? Boolean(province || city || community)
        : Boolean(location || nearbyLocation || distance);

  const handleClear = () => {
    setLocation('');
    setNearbyLocation(null);
    setDistance('');
    setProviderName('');
    setAgencyName('');
    setProvince('');
    setCity('');
    setCommunity('');
    onClear();
  };

  const providerSuggestions = providers.map((p) => ({
    label: p.name,
    value: p.name,
    sublabel: `${p.type} • ${p.location}`,
  }));
  const agencySuggestions = agencies.map((a) => ({
    label: a.name,
    value: a.name,
  }));

  return (
    <div className="w-[90%] mx-auto bg-white shadow-xl p-4 sm:p-6 border border-gray-100 rounded-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row md:items-end gap-4 max-w-7xl mx-auto">
        <div className="flex-none w-full md:w-60">
          <label htmlFor="provider-search-type" className="block text-sm font-medium text-gray-600 mb-1">
            Search by
          </label>
          <div className="relative">
            <select
              id="provider-search-type"
              className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition appearance-none font-medium"
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                onSearch({}); // Reset criteria when switching types
              }}
            >
              {searchTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'Name' ? 'Provider name' :
                   type === 'Agency' ? 'Agency' :
                   type === 'Nearby' ? 'Nearby location' :
                   type}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        {searchType === 'Name' ? (
          <div className="flex-1">
            <SearchAutocomplete
              suggestions={providerSuggestions}
              value={providerName}
              onChange={setProviderName}
              onSelect={(item) => {
                setProviderName(item.value);
                onSearch({ location: item.value, distance: "" });
              }}
              placeholder="Enter a business or provider name..."
            />
          </div>
        ) : searchType === 'Agency' ? (
          <div className="flex-1">
            <SearchAutocomplete
              suggestions={agencySuggestions}
              value={agencyName}
              onChange={setAgencyName}
              onSelect={(item) => {
                setAgencyName(item.value);
                onSearch({ location: item.value, distance: "" });
              }}
              placeholder="Enter an agency name..."
            />
          </div>
        ) : searchType === 'Province/City' ? (
          <>
            <div className="flex-1 relative">
              <select
                className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition appearance-none"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity('');
                  setCommunity('');
                }}
              >
                <option value="">Select Province</option>
                {provinces.map(item => (
                  <option key={item.id} value={item.name}>{item.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="flex-1 relative">
              <select
                className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition appearance-none"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setCommunity('');
                }}
                disabled={!province}
              >
                <option value="">Select City</option>
                {citiesForProvince.map(item => (
                  <option key={item.id} value={item.name}>{item.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="flex-1 relative">
              <select
                className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition appearance-none"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                disabled={!city}
              >
                <option value="">Select Community</option>
                {communitiesForCity.map(item => (
                  <option key={item.id} value={item.name}>{item.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 relative">
              <SearchAutocomplete
                isAsync={true}
                onSelect={setNearbyLocation}
                onChange={setLocation}
                value={location}
                placeholder="Your location"
              />
            </div>
            <div className="flex-none w-full md:w-40 relative">
              <div className="relative">
                <select
                  className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition appearance-none"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                >
                  <option value="">Within distance</option>
                  <option value="2">2 km</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="15">15 km</option>
                  <option value="20">20 km</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="md:w-32 flex items-end">
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition shadow-md hover:shadow-lg h-[50px] md:h-auto cursor-pointer relative z-50"
          >
            Search
          </button>
        </div>
        {hasSearchValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-green-600 font-bold hover:underline px-4 py-2 cursor-pointer whitespace-nowrap"
          >
            Clear All
          </button>
        )}
      </form>
    </div>
  );
};

/* provider card */

const ProviderCard = ({ provider, onAgencyClick, onAgesClick, onSpotsClick }) => {
  const { agencies, addresses, providerAddresses } = useContext(DataContext);
  const providerAddressLink = providerAddresses.find((pa) => pa.providerId === provider.id);
  const addressEntry = providerAddressLink ? addresses.find((a) => a.id === providerAddressLink.addressId) : null;
  const agency = agencies.find((a) => a.id === provider.agencyId);
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-blue-400 group flex flex-col">
      {/* Top Row: Type and Spots */}
      <div className="flex justify-between items-start pt-3 sm:pt-4 px-3 sm:px-4 mb-2 ml-[80px] sm:ml-[104px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{provider.type}</span>
          {provider.type === "Licensed Home-based" && agency && (
            <Link 
              to={`/provider/${provider.id}#contact`}
              className="text-blue-600 text-xs font-bold uppercase tracking-tight hover:text-blue-500 hover:underline transition"
            >
              with {agency.name}
            </Link>
          )}
        </div>
        <div>
          {provider.spotsAvailable > 0 ? (
            <Link 
              to={`/provider/${provider.id}#availability`}
              className="text-green-700 text-xs font-bold uppercase tracking-tight hover:text-green-600 hover:underline transition"
            >
              {provider.spotsAvailable} spots available
            </Link>
          ) : (
            <Link 
              to={`/waitlist/${provider.id}`}
              className="text-red-600 text-xs font-bold uppercase tracking-tight hover:text-red-500 hover:underline transition"
            >
              Waitlist
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal line right below the type along the width of the card */}
      <div className="border-b border-blue-600 w-full mb-3"></div>

      <div className="flex items-start pb-3 sm:pb-4 px-3 sm:px-4 gap-4 sm:gap-6">
        <div 
          onClick={() => navigate(`/provider/${provider.id}`)} 
          className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 p-2 flex items-center justify-center cursor-pointer"
        >
          <img src={provider.image} alt={provider.name} className="w-full h-full object-contain group-hover:scale-110 transition duration-500" />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <button 
            onClick={() => navigate(`/provider/${provider.id}`)}
            className="text-xl font-bold text-gray-900 mb-0.5 group-hover:text-green-600 transition text-left cursor-pointer hover:underline"
          >
            {provider.name}
          </button>
          <p className="text-sm text-gray-500 mb-2 flex items-center flex-wrap">
            <svg className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {addressEntry ? (
              <span>
                {addressEntry.fullAddress.split(addressEntry.city)[0]}
                <span className="font-bold text-green-700 bg-green-50 px-1 rounded mx-0.5">{addressEntry.city}</span>
                {addressEntry.fullAddress.split(addressEntry.city).slice(1).join(addressEntry.city)}
              </span>
            ) : (
              <span className="font-bold text-green-700 bg-green-50 px-1 rounded">{provider.location}</span>
            )}
          </p>

          <div className="border-b border-blue-300 w-full mb-3"></div>
          
            <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Link 
                to={`/provider/${provider.id}#ages-served`}
                className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[11px] font-bold uppercase rounded-md hover:bg-purple-100 hover:text-purple-700 transition"
              >
                Ages Served
              </Link>
            </div>

            <button 
              onClick={() => navigate(`/provider/${provider.id}`)}
              className="text-green-600 text-sm font-bold hover:underline cursor-pointer"
            >
              More info →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ***********************************
//          Footer
// ***********************************
const Footer = () => (
  <footer className="bg-gray-900 text-gray-300 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center space-x-2 mb-4">
            <div className="bg-green-600 p-1 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">PickAChildcare</span>
          </div>
          <p className="max-w-sm text-gray-400">Making it easier for parents to find the perfect care for their children.</p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-widest">Explore</h4>
          <ul className="space-y-2">
            <li><Link to="/" className="hover:text-white transition">Providers</Link></li>
            <li><Link to="/agencies" className="hover:text-white transition">Agencies</Link></li>
            <li><Link to="/parents" className="hover:text-white transition">Parents</Link></li>
            <li><Link to="/resources" className="hover:text-white transition">Resources</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-gray-500">© 2025 PickAChildcare Inc. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

// ***********************************
//          Side Bar Filter
// ***********************************
const AccordionItem = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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

const SidebarFilters = ({ filters, setFilters, childcareTypes, agesServed, scheduleOptions }) => {
  const orderedChildcareTypes = [...childcareTypes];
  const privateDayhomeIndex = orderedChildcareTypes.indexOf('Private Dayhome');
  if (privateDayhomeIndex !== -1) {
    orderedChildcareTypes.splice(privateDayhomeIndex, 1);
    const licensedHomeBasedIndex = orderedChildcareTypes.indexOf('Licensed Home-based');
    if (licensedHomeBasedIndex !== -1) {
      orderedChildcareTypes.splice(licensedHomeBasedIndex + 1, 0, 'Private Dayhome');
    } else {
      orderedChildcareTypes.splice(privateDayhomeIndex, 0, 'Private Dayhome');
    }
  }

  const mealOptions = [
    "Meals Provided",
    "Snack Provided"
  ];

  const toggleSpots = () => {
    setFilters({ ...filters, spotsOnly: !filters.spotsOnly });
  };

  const toggleType = (type) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: newTypes });
  };

  const toggleAgesServed = (age) => {
    const newAges = filters.agesServed.includes(age)
      ? filters.agesServed.filter(a => a !== age)
      : [...filters.agesServed, age];
    setFilters({ ...filters, agesServed: newAges });
  };

  const toggleMealOption = (option) => {
    const newMeals = filters.mealOptions.includes(option)
      ? filters.mealOptions.filter(o => o !== option)
      : [...filters.mealOptions, option];
    setFilters({ ...filters, mealOptions: newMeals });
  };

  const toggleScheduleOption = (option) => {
    const newSchedules = filters.scheduleOptions.includes(option)
      ? filters.scheduleOptions.filter(o => o !== option)
      : [...filters.scheduleOptions, option];
    setFilters({ ...filters, scheduleOptions: newSchedules });
  };

  return (
    <div className="space-y-2">
      <div  style={{backgroundColor: "lightblue"}} className="flex items-center gap-2 p-3 rounded-xl">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">Filter Childcare</h2>
      </div>

      <div className="space-y-1.5">
        <AccordionItem title="Availability">
          <div className="space-y-2">
            <label className="flex items-center group cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                checked={filters.spotsOnly}
                onChange={toggleSpots}
              />
              <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">Spots available</span>
            </label>
          </div>
        </AccordionItem>

        <AccordionItem title="Childcare Type">
          <div className="space-y-2">
            {orderedChildcareTypes.map(type => (
              <React.Fragment key={type}>
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                    checked={filters.types.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">{type}</span>
                </label>
              </React.Fragment>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem title="Ages Served">
          <div className="space-y-2">
            {agesServed.map(age => (
              <label key={age} className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                  checked={filters.agesServed.includes(age)}
                  onChange={() => toggleAgesServed(age)}
                />
                <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">{age}</span>
              </label>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem title="Meal Options">
          <div className="space-y-2">
            {mealOptions.map(option => (
              <label key={option} className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                  checked={filters.mealOptions.includes(option)}
                  onChange={() => toggleMealOption(option)}
                />
                <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">{option}</span>
              </label>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem title="Schedule Options">
          <div className="space-y-2">
            {scheduleOptions.map(option => (
              <label key={option} className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                  checked={filters.scheduleOptions.includes(option)}
                  onChange={() => toggleScheduleOption(option)}
                />
                <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">{option}</span>
              </label>
            ))}
          </div>
        </AccordionItem>
      </div>

      <div className="pt-2">
        <button
          onClick={() => setFilters({ types: [], agesServed: [], mealOptions: [], scheduleOptions: [], rating: 0, spotsOnly: false })}
          className="w-full py-3 text-sm font-bold text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-600 rounded-xl transition"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

const ListView = ({ providers, onAgencyClick, onAgesClick, onSpotsClick, firstProviderRef }) => (
  <PaginatedList
    key={providers.map(p => p.id).join(',')}
    items={providers}
    renderPage={(pageProviders) => (
      <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
        {pageProviders.map((provider, index) => (
          <div key={provider.id} ref={index === 0 ? firstProviderRef : undefined}>
            <ProviderCard 
              provider={provider} 
              onAgencyClick={onAgencyClick} 
              onAgesClick={onAgesClick}
              onSpotsClick={onSpotsClick}
            />
          </div>
        ))}
      </div>
    )}
  />
);

const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });
  return null;
};


const iconMapping = {
  'Daycare Center': { color: '#16a34a', html: '<svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>' },
  'Licensed Home-based': { color: '#059669', html: '<svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>' },
  'Preschool': { color: '#7c3aed', html: '<svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>' },
  'Nursery': { color: '#db2777', html: '<svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 12h-2m-2 0H5a2 2 0 00-2 2v2a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2z" /></svg>' },
  'Out of School Care': { color: '#ea580c', html: '<svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' },
  'Montessori': { color: '#4f46e5', html: '<svg class="marker-icon" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>' }
};

const createCustomIcon = (type, isSelected) => {
  const config = iconMapping[type] || iconMapping['Daycare Center'];
  return L.divIcon({
    html: `<div class="marker-container ${isSelected ? 'selected' : ''}" style="background-color: ${config.color}">
             ${config.html}
           </div>`,
    className: 'custom-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
  });
};

const MapView = ({ providers, selectedProvider, setSelectedProvider, onAgencyClick, onSpotsClick }) => {
  const data = useContext(DataContext);
  const { agencies, addresses, providerAddresses } = data;
  const defaultCenter = [40.7128, -74.0060]; // NYC default
  const navigate = useNavigate();

  const getProviderAddress = (providerId) => {
    const providerAddressLink = providerAddresses.find(pa => pa.providerId === providerId);
    return providerAddressLink ? addresses.find(a => a.id === providerAddressLink.addressId) : null;
  };

  const firstProviderAddress = providers
    .map(provider => getProviderAddress(provider.id))
    .find(address => Number.isFinite(address?.coordinates?.lat) && Number.isFinite(address?.coordinates?.lng));
  const center = firstProviderAddress 
    ? [firstProviderAddress.coordinates.lat, firstProviderAddress.coordinates.lng]
    : defaultCenter;

  return (
    <div className="w-full h-[600px] bg-green-50 rounded-3xl border border-gray-200 relative overflow-hidden shadow-inner">
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center} />
        {providers.map((provider) => {
          const addressEntry = getProviderAddress(provider.id);
          if (!addressEntry || !Number.isFinite(addressEntry.coordinates?.lat) || !Number.isFinite(addressEntry.coordinates?.lng)) return null;
          
          return (
            <Marker 
              key={provider.id} 
              position={[addressEntry.coordinates.lat, addressEntry.coordinates.lng]}
              icon={createCustomIcon(provider.type, selectedProvider?.id === provider.id)}
            riseOnHover={true}
            zIndexOffset={selectedProvider?.id === provider.id ? 1000 : 0}
              eventHandlers={{
                click: (e) => {
                  setSelectedProvider(provider);
                }
              }}
            >
              <Popup className="provider-popup" maxWidth={300}>
                <div className="flex flex-col overflow-hidden bg-white rounded-xl">
                <div className="h-32 w-full overflow-hidden">
                  <img src={provider.image} alt={provider.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">{provider.type}</span>
                      {provider.type === "Licensed Home-based" && (
                        <Link 
                          to={`/provider/${provider.id}#contact`}
                          className="text-blue-600 text-[10px] font-bold uppercase tracking-tight hover:text-blue-500 hover:underline transition"
                        >
                          with {agencies.find(a => a.id === provider.agencyId)?.name}
                        </Link>
                      )}
                    </div>
                    <div>
                      {provider.spotsAvailable > 0 ? (
                        <Link 
                          to={`/provider/${provider.id}#availability`}
                          className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border-2 border-green-600 uppercase tracking-tight hover:bg-green-600 hover:text-white transition"
                        >
                          {provider.spotsAvailable} spots
                        </Link>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/waitlist/${provider.id}`);
                          }}
                          className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full border-2 border-red-600 uppercase tracking-tight hover:bg-red-600 hover:text-white transition cursor-pointer"
                        >
                          Waitlist
                        </button>
                      )}
                    </div>
                  </div>
                    <button 
                      onClick={() => navigate(`/provider/${provider.id}`)}
                      className="text-base font-bold text-gray-900 leading-tight mb-2 text-left cursor-pointer hover:text-green-600 hover:underline"
                    >
                      {provider.name}
                    </button>
                    <p className="text-xs text-gray-700 font-medium mb-1">{addressEntry.fullAddress}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{provider.description}</p>
                    <button 
                      onClick={() => navigate(`/provider/${provider.id}`)}
                      className="w-full py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition shadow-sm cursor-pointer"
                    >
                      View More Details
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const parentSteps = [
  {
    id: 'search',
    title: 'Step 1. Search',
    iconBg: 'bg-green-100 text-green-600',
    iconPaths: ['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'],
    description: 'Select the way you would like to find a provider, for example, by nearby location, by Province/City/Community, by Agency or By Provider name. Then, filter by childcare type, age group, and availability to find exactly what you need.',
  },
  {
    id: 'review',
    title: 'Step 2. Review',
    iconBg: 'bg-blue-100 text-blue-600',
    iconPaths: [
      'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    ],
    description: "Explore detailed profiles, check real-time spot availability, and view photos. Learn about the provider's philosophy and features.",
  },
  {
    id: 'connect',
    title: 'Step 3. Connect',
    iconBg: 'bg-purple-100 text-purple-600',
    iconPaths: ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
    description: 'Contact providers directly or join waitlists. Get all the information you need to make the best choice for your child.',
  },
];

const ParentsPage = () => {
  const [openStep, setOpenStep] = useState(parentSteps[0].id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <section
        className="relative bg-green-800 pt-12 pb-16 text-center text-white sm:pb-20 md:pt-20"
        style={{
          backgroundImage: `url(${parentsHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-green-900/60 pointer-events-none"></div>
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-white blur-3xl"></div>
          <div className="absolute right-10 bottom-10 h-96 w-96 rounded-full bg-green-400 blur-3xl"></div>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
            How it Works for Parents
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-green-50 sm:text-xl">
            Finding the right childcare for your family shouldn't be a struggle. We've simplified the process into three easy steps.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-3xl space-y-4">
        {parentSteps.map((step) => {
          const isOpen = openStep === step.id;
          return (
            <div key={step.id} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
              <h3>
                <button
                  type="button"
                  id={`step-header-${step.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`step-panel-${step.id}`}
                  onClick={() => setOpenStep(isOpen ? null : step.id)}
                  className="flex w-full cursor-pointer items-center gap-4 p-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-600"
                >
                  <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${step.iconBg}`}>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      {step.iconPaths.map((d) => (
                        <path key={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
                      ))}
                    </svg>
                  </span>
                  <span className="flex-1 text-xl font-bold uppercase text-gray-900">{step.title}</span>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </h3>
              <div
                id={`step-panel-${step.id}`}
                role="region"
                aria-labelledby={`step-header-${step.id}`}
                hidden={!isOpen}
                className="px-6 pb-6 pl-[88px] text-lg leading-relaxed text-gray-600 sm:text-xl"
              >
                <p>{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-20 bg-green-600 rounded-3xl p-12 text-center text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-6 uppercase">Ready to find the perfect care?</h2>
          <Link to="/" className="inline-block bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg uppercase">
            Start Your Search
          </Link>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-green-400/20 rounded-full blur-3xl"></div>
      </div>
      </div>
    </>
  );
};

const ProviderDetails = ({ onAgencyClick }) => {
  const { providers, agencies, addresses, providerAddresses, spotsAvailable, loading, error } = useContext(DataContext);
  const { id } = useParams();
  const location = useLocation();
  const providerId = parseInt(id);
  const provider = providers.find(p => p.id === providerId);
  const providerAddressLink = provider ? providerAddresses.find(pa => pa.providerId === provider.id) : null;
  const address = providerAddressLink ? addresses.find(a => a.id === providerAddressLink.addressId) : null;
  const agency = agencies.find(a => a.id === provider?.agencyId);
  const providerSpots = spotsAvailable.filter(s => s.providerId === providerId);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const sectionRefs = useRef({});

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Scroll to hash section (e.g., #availability) after rendering
  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = sectionRefs.current[sectionId];
        if (el) {
          const offset = 90;
          const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
          setActiveSection(sectionId);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.hash, id]);

  // Build table of contents based on available sections
  const tableOfContents = React.useMemo(() => {
    const sections = [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'about', label: 'About', icon: 'info' },
      { id: 'ages-served', label: 'Ages Served', icon: 'users' },
    ];
    if (provider?.scheduleOptions?.length > 0) {
      sections.push({ id: 'schedule-options', label: 'Schedule Options', icon: 'clock' });
    }
    if (providerSpots.length > 0 || provider?.spotsAvailable > 0) {
      sections.push({ id: 'availability', label: `Availability (${provider.spotsAvailable} Spots)`, icon: 'calendar' });
    }
    if (address) {
      sections.push({ id: 'location', label: 'Location', icon: 'map' });
    }
    if (provider?.operating_hours?.length > 0) {
      sections.push({ id: 'operating-hours', label: 'Operating Hours', icon: 'clock' });
    }
    if (provider?.phone || (provider?.type === "Licensed Home-based" && agency)) {
      sections.push({ id: 'contact', label: 'Contact', icon: 'phone' });
    }
    return sections;
  }, [provider?.operating_hours?.length, providerSpots.length, address, provider?.type, provider?.phone, agency, provider?.scheduleOptions?.length, provider?.spotsAvailable]);

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'users':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'clock':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'map':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'tag':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'phone':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="p-20 text-center">Loading providers...</div>;
  if (error) return <div className="p-20 text-center text-red-600">{error}</div>;
  if (!provider) return <div className="p-20 text-center">Provider not found</div>;

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
        Back to Search
      </button>

      {/* Hero Section */}
      <div className="bg-white rounded-[5px] shadow-xl overflow-hidden border border-gray-100 mb-8">
        <div className="h-56 sm:h-80 w-full relative flex items-center justify-center">
          <img src={provider.image} alt={provider.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <h1 className="text-3xl sm:text-5xl font-bold text-white bg-black/40 backdrop-blur-md px-8 py-4 rounded-[5px] shadow-2xl text-center border border-white/10 uppercase tracking-tight">
              {provider.name}
            </h1>
          </div>
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-green-600 uppercase tracking-widest shadow-sm">
              {provider.type}
            </span>
            {provider.type === "Licensed Home-based" && agency && (
              <button 
                onClick={() => onAgencyClick(agency)}
                className="bg-blue-600/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-tight shadow-sm hover:bg-blue-700 transition cursor-pointer"
              >
                Agency: {agency.name}
              </button>
            )}
          </div>
          <div className="absolute top-4 right-4">
            {provider.spotsAvailable > 0 ? (
              <span className="bg-green-600/90 backdrop-blur px-4 py-2 rounded-full text-sm font-bold text-white uppercase tracking-tight shadow-sm">
                {provider.spotsAvailable} Spots Available
              </span>
            ) : (
              <button 
                onClick={() => navigate(`/waitlist/${provider.id}`)}
                className="bg-red-600/90 backdrop-blur px-4 py-2 rounded-full text-sm font-bold text-white uppercase tracking-tight shadow-sm hover:bg-red-700 transition cursor-pointer"
              >
                Waitlist Only — Join Now
              </button>
            )}
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

            {/* Quick CTA in sidebar */}
            {/*
            <div className="mt-6 pt-4 border-t border-gray-100">
              {provider.spotsAvailable > 0 ? (
                <div className="bg-green-50 rounded-[5px] p-4 text-center">
                  <p className="text-green-700 font-bold text-sm mb-2">{provider.spotsAvailable} Spots Available</p>
                  <p className="text-green-600 text-xs">Contact provider to enroll</p>
                </div>
              ) : (
                <button 
                  onClick={() => navigate(`/waitlist/${provider.id}`)}
                  className="w-full py-3 bg-red-600 text-white text-sm font-bold rounded-[5px] hover:bg-red-700 transition shadow-sm cursor-pointer"
                >
                  Join Waitlist
                </button>
              )}
            </div>
            */}
            <button
              onClick={() => navigate(`/book-tour/${provider.id}`)}
              className="w-full mt-4 py-3 bg-green-600 text-white text-sm font-bold rounded-[5px] hover:bg-green-700 transition shadow-sm cursor-pointer"
            >
              Book a Tour
            </button>
            {/* Back to Search */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button 
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-gray-500 hover:text-green-600 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Search
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
            className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
          >
                        <h2 className="text-2xl font-bold text-white mb-3 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
              <span className="bg-white/20 p-2 rounded-[5px] text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Availability</label>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-base font-bold ${provider.spotsAvailable > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {provider.spotsAvailable > 0 ? `${provider.spotsAvailable} Spots` : 'Waitlist Only'}
                  </p>
                  {provider.spotsAvailable === 0 && (
                    <button 
                      onClick={() => navigate(`/waitlist/${provider.id}`)}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-[5px] hover:bg-red-700 transition shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      Join Waitlist
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">City</label>
                <p className="text-base font-bold text-gray-900">{provider.location}</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Max Capacity</label>
                <p className="text-base font-bold text-gray-900">{provider.maxCapacity} children</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Meals</label>
                <p className="text-base font-bold text-gray-900">
                  {provider.mealsProvided && provider.snackProvided ? 'Meals & Snacks provided' : provider.mealsProvided ? 'Meals Provided' : provider.snackProvided ? 'Snacks Provided' : 'Not Provided'}
                </p>
              </div>
              <div className="bg-gray-50 p-5 rounded-[5px] border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Type</label>
                <p className="text-base font-bold text-gray-900">{provider.type}</p>
              </div>
            </div>
            {address && (
              <div className="mt-4 bg-gray-50 p-4 rounded-[5px] border border-gray-100 flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-600 font-medium text-sm">{address.fullAddress}</p>
              </div>
            )}
          </div>

          {/* About Section */}
          <div 
            id="about"
            ref={(el) => { sectionRefs.current['about'] = el; }}
            className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
          >
                        <h2 className="text-2xl font-bold text-white mb-2 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
              <span className="bg-white/20 p-2 rounded-[5px] text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              About this Provider
            </h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              {provider.description}
            </p>
            {(() => {
              const rawWebsite = typeof provider.website === 'string' ? provider.website.trim() : '';
              const website = rawWebsite
                ? (/^[a-z][a-z0-9+.-]*:/i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`)
                : '';
              if (!/^https?:\/\//i.test(website)) return null;
              return (
                <p className="mt-6 text-base break-all">
                  <span className="font-semibold text-gray-700">Website: </span>
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 underline hover:text-green-800"
                  >
                    {website}
                  </a>
                </p>
              );
            })()}
          </div>

          {/* Ages Served Section */}
          <div 
            id="ages-served"
            ref={(el) => { sectionRefs.current['ages-served'] = el; }}
            className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
          >
                        <h2 className="text-2xl font-bold text-white mb-2 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
              <span className="bg-white/20 p-2 rounded-[5px] text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              Ages Served
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {provider.AgesServed && provider.AgesServed.map((age, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                  <div className="bg-green-100 p-1.5 rounded-full text-green-600 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-900 font-bold text-sm">{age}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Options Section */}
          {provider.scheduleOptions && provider.scheduleOptions.length > 0 && (
            <div
              id="schedule-options"
              ref={(el) => { sectionRefs.current['schedule-options'] = el; }}
              className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
            >
              <h2 className="text-2xl font-bold text-white mb-2 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
                <span className="bg-white/20 p-2 rounded-[5px] text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Schedule Options
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {provider.scheduleOptions.map((option) => (
                  <div key={option} className="flex items-center gap-3 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                    <div className="bg-green-100 p-1.5 rounded-full text-green-600 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-bold text-sm">{option}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Availability Section */}
          {(providerSpots.length > 0 || provider.spotsAvailable > 0) && (
            <div 
              id="availability"
              ref={(el) => { sectionRefs.current['availability'] = el; }}
              className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
            >
                            <h2 className="text-2xl font-bold text-white mb-3 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
                <span className="bg-white/20 p-2 rounded-[5px] text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              Current Availability ({provider.spotsAvailable} Spots)
            </h2>
              {providerSpots.length === 0 ? (
                <p className="text-gray-500 py-2">No detailed availability information provided.</p>
              ) : (
              <div className="overflow-x-auto rounded-[5px] border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Age Group</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Part Time</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Full Time</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Start Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {providerSpots.map((spot) => (
                      <tr key={spot.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">{spot.AgeAvailable}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-[5px] font-bold text-sm ${spot.partTime > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {spot.partTime} spots
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-[5px] font-bold text-sm ${spot.fullTime > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {spot.fullTime} spots
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {new Date(spot.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {/* Location Section */}
          {address && (
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
              {Number.isFinite(address.coordinates?.lat) && Number.isFinite(address.coordinates?.lng) ? (
              <div className="h-80 w-full rounded-[5px] overflow-hidden border border-gray-100 shadow-inner z-0">
                <MapContainer 
                  center={[address.coordinates.lat, address.coordinates.lng]} 
                  zoom={15} 
                  scrollWheelZoom={false}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker 
                    position={[address.coordinates.lat, address.coordinates.lng]}
                    icon={createCustomIcon(provider.type, true)}
                  />
                </MapContainer>
              </div>
              ) : (
                <p className="text-gray-500">Map coordinates are not available for this address.</p>
              )}
              <div className="mt-4 flex items-center gap-2 text-gray-600 font-medium">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address.fullAddress}
              </div>
            </div>
          )}

          {/* Operating Hours Section */}
          {provider.operating_hours?.length > 0 && (
            <div
              id="operating-hours"
              ref={(el) => { sectionRefs.current['operating-hours'] = el; }}
              className="bg-white rounded-[5px] p-6 sm:p-8 border border-gray-300 shadow-md"
            >
              <h2 className="text-2xl font-bold text-white mb-3 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-[5px] flex items-center gap-3 bg-green-600 px-6 py-3 relative">
                <span className="bg-white/20 p-2 rounded-[5px] text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Operating Hours
              </h2>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-[5px]">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => {
                  const ranges = provider.operating_hours.filter(h => h.day_of_week === i);
                  return (
                    <div key={day} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="font-bold text-gray-900">{day}</span>
                      <span className={ranges.length ? 'text-gray-700 text-right' : 'text-gray-400'}>
                        {ranges.length
                          ? ranges.map((h, idx) => (
                              <span key={idx} className="block">{formatHoursTime(h.open_time)} – {formatHoursTime(h.close_time)}</span>
                            ))
                          : 'Closed'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact Section */}
          {(provider.phone || (provider.type === "Licensed Home-based" && agency)) && (
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
                Contact Information
              </h2>
              <div className="space-y-4">
                {provider.phone && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                    <div className="bg-green-100 p-2 rounded-[5px] text-green-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Provider Phone</label>
                      <a href={`tel:${provider.phone}`} className="text-gray-900 font-bold hover:text-green-600 transition">{provider.phone}</a>
                    </div>
                  </div>
                )}
                {provider.type === "Licensed Home-based" && agency && (
                  <>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[5px] border border-gray-100">
                  <div className="bg-green-100 p-2 rounded-[5px] text-green-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Agency</label>
                    <button 
                      onClick={() => onAgencyClick(agency)}
                      className="text-gray-900 font-bold hover:text-green-600 transition cursor-pointer"
                    >
                      {agency.name}
                    </button>
                  </div>
                </div>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 01-2-2V7a2 2 0 012-2H5a2 2 0 012 2v10a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Email</label>
                    <a href={`mailto:${agency.email}`} className="text-gray-900 font-bold hover:text-green-600 transition">{agency.email}</a>
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
                      <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-bold hover:text-green-600 transition">
                        {agency.website}
                      </a>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [providerAddresses, setProviderAddresses] = useState([]);
  const [spotsAvailable, setSpotsAvailable] = useState([]);
  const [agesServed, setAgesServed] = useState([]);
  const [childcareTypes, setChildcareTypes] = useState([]);
  const [scheduleOptions, setScheduleOptions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchApi('providers'),
      fetchApi('agencies'),
      fetchApi('addresses'),
      fetchApi('provinces'),
      fetchApi('cities'),
      fetchApi('communities'),
      fetchApi('provider-addresses'),
      fetchApi('spots-available'),
      fetchApi('ages-served'),
      fetchApi('childcare-types'),
      fetchApi('schedule-options'),
    ])
      .then(([providerData, agencyData, addressData, provinceData, cityData, communityData, providerAddressData, spotData, ageData, childcareTypeData, scheduleOptionData]) => {
        if (cancelled) return;
        setProviders(providerData.map(normalizeProvider));
        setAgencies(agencyData.map(agency => ({
          ...agency,
          providers: (agency.providers || []).map(normalizeProvider),
        })));
        setAddresses(addressData.map(normalizeAddress));
        setProvinces(provinceData);
        setCities(cityData);
        setCommunities(communityData);
        setProviderAddresses(providerAddressData.map(link => ({
          ...link,
          providerId: link.provider_id,
          addressId: link.address_id,
        })));
        setSpotsAvailable(spotData.map(normalizeSpot));
        const ageNames = ageData.map(age => age.name);
        setAgesServed([
          ...ageNames.filter(name => name === 'Baby (0 to 12 months)'),
          ...ageNames.filter(name => name !== 'Baby (0 to 12 months)'),
        ]);
        setChildcareTypes(childcareTypeData.map(type => type.name));
        setScheduleOptions(scheduleOptionData.map(option => option.name));
        setDataError('');
      })
      .catch(err => {
        if (!cancelled) setDataError(`Unable to load childcare data. ${err.message}`);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const [hasSearched, setHasSearched] = useState(true);
  const [shouldScroll, setShouldScroll] = useState(false);
  const resultsRef = useRef(null);
  const firstProviderRef = useRef(null);
  const shouldScrollToAgencyProvider = useRef(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [showAgesProvider, setShowAgesProvider] = useState(null);
  const [showSpotsProvider, setShowSpotsProvider] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [searchType, setSearchType] = useState('Nearby');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const username = localStorage.getItem('username');
    const userType = localStorage.getItem('user_type');
    return username ? { username, userType } : null;
  });

  const handleLoginSuccess = (username, userType, agencyId) => {
    setLoggedInUser({ username, userType });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_type');
    localStorage.removeItem('agency_id');
    setLoggedInUser(null);
  };

  const openLoginModal = () => {
    setAuthModalView('login');
    setShowAuthModal(true);
  };

  const openRegisterModal = () => {
    setAuthModalView('signup');
    setShowAuthModal(true);
  };
  const [searchCriteria, setSearchCriteria] = useState({ 
    location: '', 
    coordinates: null,
    distance: '',
    province: '',
    city: '',
    community: '',
  });
  const [filters, setFilters] = useState({
    types: [],
    agesServed: [],
    mealOptions: [],
    scheduleOptions: [],
    spotsOnly: false
  });

  const removeFilterValue = (key, value) => setFilters(f => ({ ...f, [key]: f[key].filter(v => v !== value) }));
  const requestedAgencyId = Number(new URLSearchParams(location.search).get('agencyId'));
  const agencyFilter = Number.isInteger(requestedAgencyId)
    ? agencies.find(agency => agency.id === requestedAgencyId)
    : null;
  const activeSearchType = agencyFilter ? 'Agency' : searchType;

  const selectedFilterChips = [
    ...(filters.spotsOnly ? [{ key: 'spots', label: 'Spots available', remove: () => setFilters(f => ({ ...f, spotsOnly: false })) }] : []),
    ...filters.types.map(v => ({ key: `types-${v}`, label: v, remove: () => removeFilterValue('types', v) })),
    ...filters.agesServed.map(v => ({ key: `ages-${v}`, label: v, remove: () => removeFilterValue('agesServed', v) })),
    ...filters.mealOptions.map(v => ({ key: `meals-${v}`, label: v, remove: () => removeFilterValue('mealOptions', v) })),
    ...filters.scheduleOptions.map(v => ({ key: `schedule-${v}`, label: v, remove: () => removeFilterValue('scheduleOptions', v) })),
  ];

  const filteredProviders = providers.filter(p => {
    const paLink = providerAddresses.find(pa => pa.providerId === p.id);
    const address = paLink ? addresses.find(a => a.id === paLink.addressId) : null;
    const searchTerm = (searchCriteria.location || '').trim().toLowerCase();
    
    let matchLocation = false;
    if (activeSearchType === 'Agency') {
      if (agencyFilter) {
        matchLocation = p.agencyId === agencyFilter.id;
      } else {
        const agency = agencies.find(a => a.name.toLowerCase().includes(searchTerm));
        matchLocation = searchTerm === '' || (agency ? p.agencyId === agency.id : false);
      }
    } else if (activeSearchType === 'Name') {
      matchLocation = p.name.toLowerCase().includes(searchTerm);
    } else if (activeSearchType === 'Province/City') {
      const matchP = !searchCriteria.province || (address && normalizeProvince(address.province) === searchCriteria.province);
      const matchC = !searchCriteria.city || (address && (address.city || '').trim() === searchCriteria.city);
      const matchComm = !searchCriteria.community || (address && (address.community || '').trim() === searchCriteria.community);
      const hasSelection = searchCriteria.province || searchCriteria.city || searchCriteria.community;
      matchLocation = !hasSelection || (matchP && matchC && matchComm);
    } else {
      // Nearby search logic
        if (searchCriteria.coordinates && searchCriteria.distance && address &&
          Number.isFinite(address.coordinates?.lat) && Number.isFinite(address.coordinates?.lng)) {
        const dist = calculateDistance(
          parseFloat(searchCriteria.coordinates.lat),
          parseFloat(searchCriteria.coordinates.lng),
          address.coordinates.lat,
          address.coordinates.lng
        );
        matchLocation = dist <= parseFloat(searchCriteria.distance);
      } else {
        matchLocation = (searchTerm === '') || 
                        p.location.toLowerCase().includes(searchTerm) || 
                        p.name.toLowerCase().includes(searchTerm) ||
                        (address && address.fullAddress.toLowerCase().includes(searchTerm));
      }
    }

    const matchType = filters.types.length === 0 || filters.types.includes(p.type);
    const matchSpots = !filters.spotsOnly || p.spotsAvailable > 0;

    const matchAge = filters.agesServed.length === 0 || filters.agesServed.some(age => (p.AgesServed || []).includes(age));

    // Logic for meal options - matches if all selected meal options are provided by the provider
    const matchMeals = filters.mealOptions.every(option => {
      if (option === "Meals Provided") return p.mealsProvided;
      if (option === "Snack Provided") return p.snackProvided;
      return true;
    });

    // Schedule options - provider must offer all selected options
    const matchSchedule = filters.scheduleOptions.every(option => (p.scheduleOptions || []).includes(option));

    return matchLocation && matchType && matchAge && matchMeals && matchSchedule && matchSpots;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

  const handleSearch = (criteria, triggerScroll = false) => {
    if (agencyFilter && criteria.location !== agencyFilter.name) {
      navigate('/', { replace: true });
      setSearchType('Agency');
    }
    setHasSearched(true);
    setSearchCriteria({ 
      location: '', 
      distance: '', 
      province: '', 
      city: '', 
      community: '', 
      ...criteria 
    });
    if (triggerScroll) setShouldScroll(true);
  };

  const handleClearSearch = () => {
    if (location.search) navigate('/', { replace: true });
    if (agencyFilter) setSearchType('Agency');
    setSearchCriteria({ location: '', coordinates: null, distance: '', province: '', city: '', community: '' });
    setHasSearched(true);
    setFilters({ types: [], agesServed: [], mealOptions: [], scheduleOptions: [], spotsOnly: false });
  };

  const handleSearchTypeChange = (type) => {
    if (agencyFilter) navigate('/', { replace: true });
    setSearchType(type);
    setSearchCriteria({ location: '', coordinates: null, distance: '', province: '', city: '', community: '' });
    setHasSearched(true);
  };

  const handleAgencyProvidersClick = () => {
    shouldScrollToAgencyProvider.current = true;
    setSearchType('Agency');
    setSearchCriteria({ location: '', coordinates: null, distance: '', province: '', city: '', community: '' });
    setFilters({ types: [], agesServed: [], mealOptions: [], scheduleOptions: [], spotsOnly: false });
    setViewMode('list');
    setHasSearched(true);
  };

  const firstFilteredProviderId = filteredProviders[0]?.id;

  useEffect(() => {
    if (!shouldScrollToAgencyProvider.current || !agencyFilter || dataLoading || !firstProviderRef.current) return;

    const offset = 80;
    const elementPosition = firstProviderRef.current.getBoundingClientRect().top;
    window.scrollTo({
      top: elementPosition + window.pageYOffset - offset,
      behavior: 'smooth'
    });
    shouldScrollToAgencyProvider.current = false;
  }, [agencyFilter, dataLoading, firstFilteredProviderId, viewMode]);

  useEffect(() => {
    if (shouldScroll && resultsRef.current) {
      const offset = 80; // Offset for sticky navbar
      const elementPosition = resultsRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setShouldScroll(false);
    }
  }, [shouldScroll]);

  return (
    <DataContext.Provider value={{ providers, agencies, addresses, provinces, cities, communities, providerAddresses, spotsAvailable, loading: dataLoading, error: dataError }}>
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar 
        onLoginClick={openLoginModal}
        onRegisterClick={openRegisterModal}
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
      />
      <AgencyModal agency={selectedAgency} onClose={() => setSelectedAgency(null)} />
      <AgesServedModal provider={showAgesProvider} onClose={() => setShowAgesProvider(null)} />
      <SpotsAvailableModal provider={showSpotsProvider} onClose={() => setShowSpotsProvider(null)} />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        initialView={authModalView}
        onLoginSuccess={handleLoginSuccess}
      />

      <Routes>
        <Route path="/" element={
          <main>
            {/* Hero Section */}
            <section 
              className="pt-12 pb-20 md:pt-20 md:pb-24 text-center text-white relative bg-green-800"
              style={{
                backgroundImage: `url(${leafBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-green-900/60 pointer-events-none"></div>

              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
                <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-400 rounded-full blur-3xl"></div>
              </div>
              <div className="w-full max-w-7xl mx-auto relative z-20 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                  <h1 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight mb-3 uppercase">
                    Our Providers
                  </h1>
                  <p className="text-base text-green-50 max-w-2xl mx-auto">
                    Browse licensed home-based childcare providers in your area.
                  </p>
                </div>
                <SearchBar
                  key={agencyFilter?.id ?? 'general-search'}
                  onSearch={handleSearch}
                  onClear={handleClearSearch}
                  searchType={activeSearchType}
                  setSearchType={handleSearchTypeChange}
                  initialAgencyName={agencyFilter?.name || ''}
                />
              </div>
            </section>

            {/* Results Section */}
            {dataLoading ? (
              <section className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-600">Loading childcare providers...</section>
            ) : dataError ? (
              <section className="max-w-7xl mx-auto px-4 py-20 text-center text-red-600">{dataError}</section>
            ) : hasSearched && (
              <section ref={resultsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 mt-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <p className="text-xl sm:text-2xl text-gray-700">
                      <span className="font-bold">Showing {filteredProviders.length} {filteredProviders.length === 1 ? 'provider' : 'providers'}</span>
                    </p>
                    {selectedFilterChips.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedFilterChips.map(chip => (
                          <button
                            key={chip.key}
                            onClick={chip.remove}
                            aria-label={`Remove filter ${chip.label}`}
                            className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200 hover:bg-green-100 transition"
                          >
                            {chip.label}
                            <span aria-hidden="true">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto">
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

                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Sidebar Filters */}
                  <aside className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                      <SidebarFilters 
                        filters={filters} 
                        setFilters={setFilters} 
                        childcareTypes={childcareTypes}
                        agesServed={agesServed}
                        scheduleOptions={scheduleOptions}
                      />
                    </div>
                  </aside>

                  {/* Content Area */}
                  <div className="flex-1">
                    {filteredProviders.length > 0 ? (
                      viewMode === 'list' ? (
                        <ListView 
                          providers={filteredProviders} 
                          onAgencyClick={setSelectedAgency} 
                          onAgesClick={setShowAgesProvider}
                          onSpotsClick={setShowSpotsProvider}
                          firstProviderRef={firstProviderRef}
                        />
                      ) : (
                        <MapView 
                          providers={filteredProviders} 
                          selectedProvider={selectedProvider}
                          setSelectedProvider={setSelectedProvider}
                          onAgencyClick={setSelectedAgency}
                          onSpotsClick={setShowSpotsProvider}
                        />
                      )
                    ) : (
                      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="text-5xl mb-4 text-gray-300">🔍</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No providers found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">We couldn't find any childcare providers matching your search. Try broadening your criteria!</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </main>
        } />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/agencies" element={<AgenciesPage onAgencyProvidersClick={handleAgencyProvidersClick} />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/agency/:id" element={<AgencyDetails />} />
        <Route path="/parents" element={<ParentsPage />} />
        <Route path="/provider/:id" element={<ProviderDetails onAgencyClick={setSelectedAgency} />} />
        <Route path="/waitlist/:id" element={<WaitlistForm />} />
        <Route path="/book-tour/:id" element={<BookTourForm />} />
      </Routes>

      <Footer />
    </div>
    </DataContext.Provider>
  );
}