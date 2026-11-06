import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProviderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [agesOptions, setAgesOptions] = useState([]);
  const [scheduleOptions, setScheduleOptions] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Daycare Center',
    location: '',
    spots_available: 0,
    max_capacity: 0,
    ages_served: [],
    schedule_options: [],
    meals_provided: false,
    snack_provided: false,
    image: '',
    description: '',
    phone: '',
    website: '',
    agency_id: null
  });

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch agencies for the dropdown
      try {
        const agenciesRes = await fetch('http://localhost:8000/agencies');
        if (agenciesRes.ok) {
          const agenciesData = await agenciesRes.json();
          setAgencies(agenciesData);
        }
      } catch (err) {
        console.error("Error fetching agencies:", err);
      }

      // Fetch ages served lookup values for the dropdown
      try {
        const agesRes = await fetch('http://localhost:8000/ages-served');
        if (agesRes.ok) {
          setAgesOptions(await agesRes.json());
        }
      } catch (err) {
        console.error("Error fetching ages served:", err);
      }

      try {
        const schedRes = await fetch('http://localhost:8000/schedule-options');
        if (schedRes.ok) {
          setScheduleOptions(await schedRes.json());
        }
      } catch (err) {
        console.error("Error fetching schedule options:", err);
      }

      // 2. Fetch existing provider profile if logged in and user type is "provider"
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Check user type first
          const userRes = await fetch('http://localhost:8000/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (userRes.ok) {
            const userData = await userRes.json();
            
            if (userData.type === 'provider') {
              const providerRes = await fetch('http://localhost:8000/my-provider', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (providerRes.ok) {
                const providerData = await providerRes.json();
                setFormData({
                  name: providerData.name || '',
                  type: providerData.type || 'Daycare Center',
                  location: providerData.location || '',
                  spots_available: providerData.spots_available || 0,
                  max_capacity: providerData.max_capacity || 0,
                  ages_served: providerData.ages_served || [],
                  schedule_options: providerData.schedule_options || [],
                  meals_provided: providerData.meals_provided || false,
                  snack_provided: providerData.snack_provided || false,
                  image: providerData.image || '',
                  description: providerData.description || '',
                  phone: providerData.phone || '',
                  website: providerData.website || '',
                  agency_id: providerData.agency_id || null
                });
              }
            }
          }
        } catch (err) {
          console.error("Error fetching provider profile:", err);
        }
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const toggleAgeServed = (name) => {
    const current = formData.ages_served;
    setFormData({
      ...formData,
      ages_served: current.includes(name) ? current.filter(a => a !== name) : [...current, name]
    });
  };

  const toggleScheduleOption = (name) => {
    const current = formData.schedule_options;
    setFormData({
      ...formData,
      schedule_options: current.includes(name) ? current.filter(s => s !== name) : [...current, name]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("You must be logged in to create a provider profile.");

      const response = await fetch('http://localhost:8000/providers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to save provider profile');
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile Saved!</h2>
        <p className="text-gray-600">Your provider profile has been successfully saved. Redirecting you home...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-12 px-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-green-600 p-8 text-white">
          <h1 className="text-3xl font-bold uppercase tracking-tight">Provider Profile</h1>
          <p className="text-green-100 mt-2 font-medium">Complete your business details to start receiving waitlist entries.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-12 space-y-8">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Basic Information</h2>
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Business Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Little Stars Daycare"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  maxLength="50"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 555-123-4567"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Childcare Type</label>
                <select
                  name="type"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition appearance-none"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="Daycare Center">Daycare Center</option>
                  <option value="Licensed Home-based">Licensed Home-based</option>
                  <option value="Preschool">Preschool</option>
                  <option value="Out-Of-School-Care">Out-Of-School-Care</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">City / Location</label>
                <input
                  type="text"
                  name="location"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Toronto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Max Capacity</label>
                  <input
                    type="number"
                    name="max_capacity"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                    value={formData.max_capacity}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Spots Available</label>
                  <input
                    type="number"
                    name="spots_available"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                    value={formData.spots_available}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Details & Features */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Features & Details</h2>
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Image URL</label>
                <input
                  type="url"
                  name="image"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                  value={formData.image || ''}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    name="meals_provided"
                    className="w-5 h-5 rounded text-green-600 border-gray-300 focus:ring-green-500 transition"
                    checked={formData.meals_provided}
                    onChange={handleChange}
                  />
                  <span className="ml-3 text-sm font-bold text-gray-700">Meals Provided</span>
                </label>
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    name="snack_provided"
                    className="w-5 h-5 rounded text-green-600 border-gray-300 focus:ring-green-500 transition"
                    checked={formData.snack_provided}
                    onChange={handleChange}
                  />
                  <span className="ml-3 text-sm font-bold text-gray-700">Snacks Provided</span>
                </label>
              </div>

              {formData.type === 'Licensed Home-based' && (
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Associated Agency</label>
                  <select
                    name="agency_id"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition appearance-none"
                    value={formData.agency_id || ''}
                    onChange={(e) => setFormData({...formData, agency_id: e.target.value ? parseInt(e.target.value) : null})}
                  >
                    <option value="">None / Independent</option>
                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
             <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Ages & Schedule</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Ages Served</label>
                  <details className="relative">
                    <summary className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer select-none list-none">
                      {formData.ages_served.length > 0
                        ? formData.ages_served.join(', ')
                        : <span className="text-gray-400">Select ages served...</span>}
                    </summary>
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2">
                      {agesOptions.map(option => (
                        <label key={option.id} className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                          <input
                            type="checkbox"
                            className="mr-3 h-4 w-4 text-green-600 rounded"
                            checked={formData.ages_served.includes(option.name)}
                            onChange={() => toggleAgeServed(option.name)}
                          />
                          {option.name}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Schedule Options</label>
                  <details className="relative">
                    <summary className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer select-none list-none">
                      {formData.schedule_options.length > 0
                        ? formData.schedule_options.join(', ')
                        : <span className="text-gray-400">Select schedule options...</span>}
                    </summary>
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2">
                      {scheduleOptions.map(option => (
                        <label key={option.id} className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                          <input
                            type="checkbox"
                            className="mr-3 h-4 w-4 text-green-600 rounded"
                            checked={formData.schedule_options.includes(option.name)}
                            onChange={() => toggleScheduleOption(option.name)}
                          />
                          {option.name}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
             </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">Description</h2>
            <textarea
              name="description"
              required
              rows="4"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell parents about your childcare philosophy, environment, and program..."
            ></textarea>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Website</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Website URL</label>
                <input
                  type="url"
                  name="website"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition"
                  value={formData.website || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition shadow-xl disabled:opacity-50 text-xl uppercase tracking-wider"
            >
              {loading ? 'Saving Profile...' : 'Save Provider Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProviderForm;