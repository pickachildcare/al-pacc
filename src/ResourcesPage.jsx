import React, { useState, useEffect } from 'react';
import leafBg from './assets/educators-group.jpg';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000' : '';

const safeHref = (raw) => {
  const value = (raw || '').trim();
  if (!value) return null;
  const href = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  return /^https?:\/\//i.test(href) ? href : null;
};

// ***********************************
//      Resource Card
// ***********************************
const ResourceCard = ({ resource }) => {
  const href = safeHref(resource.link);
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-4 pt-3 pb-2">
        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-bold uppercase rounded-md">
          {resource.resource_type}
        </span>
        {resource.status && resource.status !== 'Available' && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold uppercase rounded-md">
            {resource.status}
          </span>
        )}
      </div>
      <div className="border-b border-blue-600 w-full mb-3"></div>
      <div className="flex items-start pb-3 sm:pb-4 px-3 sm:px-4 gap-4 sm:gap-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden rounded-xl bg-green-50 border border-gray-100 flex items-center justify-center">
          {resource.image ? (
            <img src={resource.image} alt={resource.resource_name} className="w-full h-full object-contain p-2" />
          ) : (
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 hover:underline transition">
                {resource.resource_name}
              </a>
            ) : resource.resource_name}
          </h3>
          {resource.description && (
            <p className="text-sm text-gray-600 mb-3 whitespace-pre-line">{resource.description}</p>
          )}
          {href && (
            <div className="border-t border-blue-300 pt-3 text-right">
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-600 text-sm font-bold hover:underline">
                Learn More →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ***********************************
//      Resource Sidebar Filter
// ***********************************
const ResourceAccordionItem = ({ title, children, defaultOpen = true }) => {
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
      <div className={`mt-1 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

const ResourceSidebarFilters = ({ filters, setFilters, types }) => {
  const toggleType = (type) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: newTypes });
  };

  return (
    <div className="space-y-2">
      <div style={{ backgroundColor: 'lightblue' }} className="flex items-center gap-2 p-3 rounded-xl">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">Filter Resources</h2>
      </div>

      <div className="space-y-1.5">
        <ResourceAccordionItem title="Resource Type">
          {types.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {types.map(type => (
                <label key={type} className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500 transition cursor-pointer"
                    checked={filters.types.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span className="ml-3 text-sm text-gray-600 group-hover:text-green-600 transition">{type}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No resource types available</p>
          )}
        </ResourceAccordionItem>
      </div>

      <div className="pt-2">
        <button
          onClick={() => setFilters({ types: [] })}
          className="w-full py-3 text-sm font-bold text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-600 rounded-xl transition"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

// ***********************************
//      ResourcesPage Component
// ***********************************
const ResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ types: [] });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/resources`)
      .then(res => res.json())
      .then(data => setResources(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching resources:', err))
      .finally(() => setLoading(false));
  }, []);

  const allTypes = [...new Set(resources.map(r => r.resource_type).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const q = searchQuery.trim().toLowerCase();
  const filteredResources = resources.filter(r => {
    const matchesType = filters.types.length === 0 || filters.types.includes(r.resource_type);
    const matchesSearch = !q || [r.resource_name, r.resource_type, r.description].some(v => (v || '').toLowerCase().includes(q));
    return matchesType && matchesSearch;
  }).sort((a, b) =>
    (a.resource_type || '').localeCompare(b.resource_type || '', undefined, { sensitivity: 'base' }) ||
    (a.resource_name || '').localeCompare(b.resource_name || '', undefined, { sensitivity: 'base' })
  );

  return (
    <>
    <section
      className="pt-12 pb-20 md:pt-20 md:pb-24 text-center text-white relative bg-green-800"
      style={{ backgroundImage: `url(${leafBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-green-900/60 pointer-events-none"></div>
      <div className="w-full max-w-7xl mx-auto relative z-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight mb-3 uppercase">
            Resources
          </h1>
          <p className="text-base text-green-50 max-w-2xl mx-auto">
            Helpful information and guides for both parents and childcare providers.
          </p>
        </div>

        <div className="bg-white shadow-xl p-4 sm:p-6 border border-gray-100 rounded-2xl text-left">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search resources by name, type or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition font-medium"
              />
            </div>
            {(searchQuery || filters.types.length > 0) && (
              <button
                onClick={() => { setSearchQuery(''); setFilters({ types: [] }); }}
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
      <p className="text-xl sm:text-2xl text-gray-500 font-medium mb-6">
        Showing <span className="font-bold text-gray-900">{filteredResources.length}</span> {filteredResources.length === 1 ? 'resource' : 'resources'}
        {filters.types.length > 0 && <span className="text-green-600"> in {filters.types.join(', ')}</span>}
      </p>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            <ResourceSidebarFilters filters={filters} setFilters={setFilters} types={allTypes} />
          </div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 max-w-3xl">
              {filteredResources.map(resource => (
                <ResourceCard key={resource.resource_id} resource={resource} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ResourcesPage;
