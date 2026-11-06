import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { PaginatedList } from './Pagination';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000' : '');


const emptyProvider = {
  name: '', type: 'Licensed Home-based', location: '', spots_available: 0, max_capacity: 0,
  ages_served: [], schedule_options: [], meals_provided: false, snack_provided: false,
  image: '', description: '', agency_id: '',
  phone: '', website: '',
  full_address: '', city: '', province: '', community: '', postal_code: '', latitude: '', longitude: '',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyAgency = {
  name: '', phone: '', email: '', website: '', description: '', gov_inspect_profile_link: '', area_served: [], region_id: '', region_served_id: '',
  full_address: '', city: '', province: '', community: '', postal_code: '', latitude: '', longitude: '',
};

const RESOURCE_STATUSES = ['Available', 'Unavailable', 'In Use', 'Maintenance'];

const emptyResource = { resource_name: '', resource_type: '', status: 'Available', description: '', link: '', image: '' };

const hasAddress = (f) => [f.full_address, f.city, f.province, f.community, f.postal_code, f.latitude, f.longitude].some(v => String(v).trim() !== '');

const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === 'string') detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map(d => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join('; ');
    } catch { /* no body */ }
    throw new Error(res.status === 401 ? 'Session expired. Please log in again.' : detail);
  }
  return res.status === 204 ? null : res.json();
};

const Field = ({ label, children }) => (
  <label className="block text-sm font-medium text-gray-700">
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
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
const normalizeProvinceName = (name = '') => {
  const value = name.trim();
  return provinceNamesByCode[value.toUpperCase()] || value;
};

const AddressLocationFields = ({ form, setForm, provinces, cities, communities }) => {
  const normalizedProvince = normalizeProvinceName(form.province).toLowerCase();
  const selectedProvince = provinces.find(province => province.name.trim().toLowerCase() === normalizedProvince);
  const citiesForProvince = cities.filter(city => city.province_id === selectedProvince?.id);
  const selectedCity = citiesForProvince.find(city => city.name.trim().toLowerCase() === form.city.trim().toLowerCase());
  const communitiesForCity = communities.filter(community => community.city_id === selectedCity?.id);

  const setLocationValue = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  return (
    <>
      <Field label="Province">
        <select
          className={inputCls}
          value={selectedProvince?.id ?? (form.province ? 'legacy-province' : '')}
          onChange={event => {
            const province = provinces.find(item => String(item.id) === event.target.value);
            setForm(current => ({
              ...current,
              province: province?.name || '',
              city: '',
              community: '',
            }));
          }}
        >
          <option value="">Select Province</option>
          {form.province && !selectedProvince && <option value="legacy-province">{form.province}</option>}
          {provinces.map(province => <option key={province.id} value={province.id}>{province.name}</option>)}
        </select>
      </Field>
      <Field label="City">
        <select
          className={inputCls}
          value={selectedCity?.id ?? (selectedProvince && form.city ? 'legacy-city' : '')}
          onChange={event => {
            const city = citiesForProvince.find(item => String(item.id) === event.target.value);
            setForm(current => ({
              ...current,
              city: city?.name || '',
              community: '',
            }));
          }}
          disabled={!selectedProvince}
        >
          <option value="">Select City</option>
          {selectedProvince && form.city && !selectedCity && <option value="legacy-city">{form.city}</option>}
          {citiesForProvince.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
        </select>
      </Field>
      <Field label="Community">
        <select
          className={inputCls}
          value={communitiesForCity.find(item => item.name.trim().toLowerCase() === form.community.trim().toLowerCase())?.id
            ?? (selectedCity && form.community ? 'legacy-community' : '')}
          onChange={event => {
            const community = communitiesForCity.find(item => String(item.id) === event.target.value);
            setLocationValue('community', community?.name || '');
          }}
          disabled={!selectedCity}
        >
          <option value="">Select Community</option>
          {selectedCity && form.community && !communitiesForCity.some(item => item.name.trim().toLowerCase() === form.community.trim().toLowerCase()) && (
            <option value="legacy-community">{form.community}</option>
          )}
          {communitiesForCity.map(community => <option key={community.id} value={community.id}>{community.name}</option>)}
        </select>
      </Field>
    </>
  );
};

const Modal = ({ title, onClose, onSubmit, saving, error, children }) => (
  <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
    <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
      </div>
      <div className="px-6 py-4 overflow-y-auto space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        {children}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  </div>
);

const ServedAreaLookupForm = ({ regions, onSaved }) => {
  const [regionServedId, setRegionServedId] = useState('');
  const [regionName, setRegionName] = useState('');
  const [areaNames, setAreaNames] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const createdRegion = await apiRequest('/admin/regions-served-lookup', {
        method: 'POST',
        body: JSON.stringify({
          region_served_id: regionServedId ? Number(regionServedId) : null,
          region_name: regionServedId ? null : regionName.trim(),
          areas: areaNames.split(/\r?\n/),
        }),
      });
      setRegionServedId(String(createdRegion.id));
      setRegionName('');
      setAreaNames('');
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-gray-900">Served regions and areas</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create a region and add its served areas, or select an existing region to add more areas.
          Enter one area per line.
        </p>
        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Existing region">
            <select className={inputCls} value={regionServedId} onChange={event => setRegionServedId(event.target.value)}>
              <option value="">Create a new region</option>
              {regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
          </Field>
          {!regionServedId && (
            <Field label="New region name">
              <input
                required
                maxLength={255}
                className={inputCls}
                value={regionName}
                onChange={event => setRegionName(event.target.value)}
              />
            </Field>
          )}
          <Field label="Areas served">
            <textarea
              rows={5}
              className={inputCls}
              placeholder={'Downtown\nNorthside'}
              value={areaNames}
              onChange={event => setAreaNames(event.target.value)}
            />
          </Field>
          <button
            type="submit"
            disabled={saving || (!regionServedId && !regionName.trim())}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : regionServedId ? 'Add to region' : 'Create region and areas'}
          </button>
        </form>

        <div className="mt-8 border-t pt-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Current lookup values</h3>
          {regions.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No served regions have been added.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {regions.map(region => (
                <li key={region.id} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-semibold text-gray-900">{region.name}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {region.area_served?.length ? region.area_served.join(', ') : 'No areas added'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const ProviderModal = ({ provider, spotRecords, agencies, typeOptions, agesOptions, scheduleOptions, provinces, cities, communities, onClose, onSaved }) => {
  const [form, setForm] = useState(() => {
    if (!provider) return emptyProvider;
    const addr = provider.provider_addresses?.[0]?.address;
    return {
      name: provider.name || '',
      type: provider.type || 'Dayhome',
      location: provider.location || '',
      spots_available: provider.spots_available ?? 0,
      max_capacity: provider.max_capacity ?? 0,
      ages_served: provider.ages_served || [],
      schedule_options: provider.schedule_options || [],
      meals_provided: !!provider.meals_provided,
      snack_provided: !!provider.snack_provided,
      image: provider.image || '',
      description: provider.description || '',
      agency_id: provider.agency_id ?? '',
      phone: provider.phone || '',
      website: provider.website || '',
      full_address: addr?.full_address || '',
      city: addr?.city || '',
      province: normalizeProvinceName(addr?.province || ''),
      community: addr?.community || '',
      postal_code: addr?.postal_code || '',
      latitude: addr?.latitude ?? '',
      longitude: addr?.longitude ?? '',
    };
  });
  const [detailedSpots, setDetailedSpots] = useState(() => spotRecords.map(spot => ({
    age_available: spot.age_available || '',
    part_time: spot.part_time ?? 0,
    full_time: spot.full_time ?? 0,
    start_date: spot.start_date || '',
  })));
  const [hours, setHours] = useState(() => (provider?.operating_hours || []).map(h => ({
    day_of_week: h.day_of_week,
    open_time: (h.open_time || '').slice(0, 5),
    close_time: (h.close_time || '').slice(0, 5),
  })));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const addHours = () => setHours(hs => [...hs, { day_of_week: 1, open_time: '09:00', close_time: '17:00' }]);
  const updateHours = (index, key, value) => setHours(hs => hs.map((h, i) => (i === index ? { ...h, [key]: value } : h)));

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const toggleAge = (name) => setForm(f => ({
    ...f,
    ages_served: f.ages_served.includes(name) ? f.ages_served.filter(a => a !== name) : [...f.ages_served, name],
  }));

  const toggleSchedule = (name) => setForm(f => ({
    ...f,
    schedule_options: f.schedule_options.includes(name) ? f.schedule_options.filter(s => s !== name) : [...f.schedule_options, name],
  }));

  const addDetailedSpot = () => setDetailedSpots(spots => [
    ...spots,
    { age_available: '', part_time: 0, full_time: 0, start_date: '' },
  ]);

  const updateDetailedSpot = (index, key, value) => setDetailedSpots(spots => spots.map((spot, spotIndex) => (
    spotIndex === index ? { ...spot, [key]: value } : spot
  )));

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); return; }
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      const { url } = await apiRequest('/admin/upload-image', { method: 'POST', body: data });
      setForm(f => ({ ...f, image: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      type: form.type,
      location: form.location.trim(),
      spots_available: detailedSpots.length > 0
        ? detailedSpots.reduce((sum, s) => sum + (Number(s.part_time) || 0) + (Number(s.full_time) || 0), 0)
        : Number(form.spots_available) || 0,
      max_capacity: Number(form.max_capacity) || 0,
      ages_served: form.ages_served,
      schedule_options: form.schedule_options,
      meals_provided: form.meals_provided,
      snack_provided: form.snack_provided,
      image: form.image.trim() || null,
      description: form.description,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      agency_id: form.agency_id === '' ? null : Number(form.agency_id),
      rating: provider?.rating ?? 0,
      reviews: provider?.reviews ?? 0,
      user_ids: provider?.user_ids ?? [],
      detailed_spots: detailedSpots.map(spot => ({
        ...spot,
        part_time: Number(spot.part_time),
        full_time: Number(spot.full_time),
      })),
      operating_hours: hours.map(h => ({ ...h, day_of_week: Number(h.day_of_week) })),
      address: {
        full_address: form.full_address.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        community: form.community.trim() || null,
        postal_code: form.postal_code.trim() || null,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
      },
    };
    try {
      await apiRequest(provider ? `/admin/providers/${provider.id}` : '/admin/providers', {
        method: provider ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const typeNames = typeOptions.map(t => t.name);
  const types = !form.type || typeNames.includes(form.type) ? typeNames : [...typeNames, form.type];

  return (
    <Modal title={provider ? 'Edit Provider' : 'Add Provider'} onClose={onClose} onSubmit={submit} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={set('type')}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Location (city/community)"><input required className={inputCls} value={form.location} onChange={set('location')} /></Field>
        <Field label="Agency">
          <select className={inputCls} value={form.agency_id} onChange={set('agency_id')}>
            <option value="">None</option>
            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Spots available">
          <input
            type="number" min="0" className={inputCls}
            readOnly={detailedSpots.length > 0}
            title={detailedSpots.length > 0 ? 'Calculated from the detailed spot records below' : undefined}
            value={detailedSpots.length > 0 ? detailedSpots.reduce((sum, s) => sum + (Number(s.part_time) || 0) + (Number(s.full_time) || 0), 0) : form.spots_available}
            onChange={set('spots_available')}
          />
        </Field>
        <Field label="Max capacity"><input type="number" min="0" className={inputCls} value={form.max_capacity} onChange={set('max_capacity')} /></Field>
        <Field label="Ages served">
          <details className="relative">
            <summary className={`${inputCls} cursor-pointer select-none list-none`}>
              {form.ages_served.length > 0
                ? form.ages_served.join(', ')
                : <span className="text-gray-400">Select ages served...</span>}
            </summary>
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2">
              {agesOptions.map(option => (
                <label key={option.id} className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 rounded"
                    checked={form.ages_served.includes(option.name)}
                    onChange={() => toggleAge(option.name)}
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </details>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-gray-700">Schedule options</legend>
          <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2 border border-gray-300 rounded-lg p-3">
            {scheduleOptions.length === 0 && <span className="col-span-full text-sm text-gray-400">No schedule options available.</span>}
            {scheduleOptions.map(option => (
              <label key={option.id} className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 rounded"
                  checked={form.schedule_options.includes(option.name)}
                  onChange={() => toggleSchedule(option.name)}
                />
                {option.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <section className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Detailed spot availability</h3>
            <p className="text-xs text-gray-500">Add age group, part-time and full-time counts, and the availability start date.</p>
          </div>
          <button type="button" onClick={addDetailedSpot} className="shrink-0 rounded-lg border border-green-600 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50">
            Add record
          </button>
        </div>
        {detailedSpots.map((spot, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-lg border border-gray-200 p-3">
            <Field label="Age available">
              <select required className={inputCls} value={spot.age_available} onChange={e => updateDetailedSpot(index, 'age_available', e.target.value)}>
                <option value="">Select age group</option>
                {agesOptions.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}
              </select>
            </Field>
            <Field label="Part-time spots">
              <input required type="number" min="0" className={inputCls} value={spot.part_time} onChange={e => updateDetailedSpot(index, 'part_time', e.target.value)} />
            </Field>
            <Field label="Full-time spots">
              <input required type="number" min="0" className={inputCls} value={spot.full_time} onChange={e => updateDetailedSpot(index, 'full_time', e.target.value)} />
            </Field>
            <Field label="Start date">
              <input required type="date" className={inputCls} value={spot.start_date} onChange={e => updateDetailedSpot(index, 'start_date', e.target.value)} />
            </Field>
            <div className="flex items-end">
              <button type="button" onClick={() => setDetailedSpots(spots => spots.filter((_, spotIndex) => spotIndex !== index))} className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Operating hours</h3>
            <p className="text-xs text-gray-500">Add a row for each day and opening period. Days without a row are closed.</p>
          </div>
          <button type="button" onClick={addHours} className="shrink-0 rounded-lg border border-green-600 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50">
            Add hours
          </button>
        </div>
        {hours.map((h, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-lg border border-gray-200 p-3">
            <Field label="Day">
              <select className={inputCls} value={h.day_of_week} onChange={e => updateHours(index, 'day_of_week', e.target.value)}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </Field>
            <Field label="Opens">
              <input required type="time" className={inputCls} value={h.open_time} onChange={e => updateHours(index, 'open_time', e.target.value)} />
            </Field>
            <Field label="Closes">
              <input required type="time" className={inputCls} value={h.close_time} onChange={e => updateHours(index, 'close_time', e.target.value)} />
            </Field>
            <div className="flex items-end">
              <button type="button" onClick={() => setHours(hs => hs.filter((_, i) => i !== index))} className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>
      <Field label="Image">
        <div className="flex items-center gap-3">
          {form.image && <img src={form.image} alt="Provider" className="h-16 w-16 rounded-lg object-cover border" />}
          <div className="flex-1 space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadImage} disabled={uploading}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-green-700 hover:file:bg-green-100" />
            <input placeholder="or paste an image URL" className={inputCls} value={form.image} onChange={set('image')} />
          </div>
        </div>
        {uploading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
      </Field>
      <Field label="Description"><textarea rows={3} maxLength={1000} className={inputCls} value={form.description} onChange={set('description')} /></Field>
      <div>
        <Field label="Phone"><input type="tel" maxLength={50} className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Website"><input className={inputCls} value={form.website} onChange={set('website')} /></Field>
      </div>
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide pt-2 border-t">Address</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Full address"><input className={inputCls} value={form.full_address} onChange={set('full_address')} /></Field>
        </div>
        <AddressLocationFields form={form} setForm={setForm} provinces={provinces} cities={cities} communities={communities} />
        <Field label="Postal code"><input maxLength={20} required={hasAddress(form)} className={inputCls} value={form.postal_code} onChange={set('postal_code')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude"><input type="number" step="any" className={inputCls} value={form.latitude} onChange={set('latitude')} /></Field>
          <Field label="Longitude"><input type="number" step="any" className={inputCls} value={form.longitude} onChange={set('longitude')} /></Field>
        </div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.meals_provided} onChange={set('meals_provided')} /> Meals provided</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.snack_provided} onChange={set('snack_provided')} />         Snack provided</label>
              </div>
    </Modal>
  );
};

const AgencyModal = ({ agency, areaOptions, regionServedOptions, provinces, cities, communities, onClose, onSaved }) => {
  const [form, setForm] = useState(() => {
    if (!agency) return emptyAgency;
    const addr = agency.addresses?.[0]?.address;
    return {
      name: agency.name || '',
      phone: agency.phone || '',
      email: agency.email || '',
      website: agency.website || '',
      description: agency.description || '',
      gov_inspect_profile_link: agency.gov_inspect_profile_link || '',
      area_served: agency.area_served || [],
      region_id: agency.region_id ?? '',
      region_served_id: agency.region_served_id ?? '',
      full_address: addr?.full_address || '',
      city: addr?.city || '',
      province: normalizeProvinceName(addr?.province || ''),
      community: addr?.community || '',
      postal_code: addr?.postal_code || '',
      latitude: addr?.latitude ?? '',
      longitude: addr?.longitude ?? '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const toggleArea = (name) => setForm(f => ({
    ...f,
    area_served: f.area_served.includes(name) ? f.area_served.filter(a => a !== name) : [...f.area_served, name],
  }));
  const visibleAreaOptions = form.region_served_id
    ? areaOptions.filter(option => option.region_served_id === Number(form.region_served_id))
    : areaOptions;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      gov_inspect_profile_link: form.gov_inspect_profile_link.trim() || null,
      area_served: form.area_served,
      region_id: form.region_id === '' ? null : Number(form.region_id),
      region_served_id: form.region_served_id === '' ? null : Number(form.region_served_id),
      address: {
        full_address: form.full_address.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        community: form.community.trim() || null,
        postal_code: form.postal_code.trim() || null,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
      },
    };
    try {
      await apiRequest(agency ? `/admin/agencies/${agency.id}` : '/admin/agencies', {
        method: agency ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={agency ? 'Edit Agency' : 'Add Agency'} onClose={onClose} onSubmit={submit} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
        <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input required className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Website"><input className={inputCls} value={form.website} onChange={set('website')} /></Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea rows={4} maxLength={1000} className={inputCls} value={form.description} onChange={set('description')} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Government Inspection Profile Link">
            <input type="url" maxLength={500} placeholder="https://" className={inputCls} value={form.gov_inspect_profile_link} onChange={set('gov_inspect_profile_link')} />
          </Field>
        </div>
        <Field label="Region served">
          <select
            className={inputCls}
            value={form.region_served_id}
            onChange={event => {
              const regionServedId = event.target.value;
              const allowedAreaNames = new Set(
                areaOptions
                  .filter(option => !regionServedId || option.region_served_id === Number(regionServedId))
                  .map(option => option.name)
              );
              setForm(current => ({
                ...current,
                region_served_id: regionServedId,
                area_served: current.area_served.filter(name => allowedAreaNames.has(name)),
              }));
            }}
          >
            <option value="">None</option>
            {regionServedOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Areas served">
          <details className="relative">
            <summary className={`${inputCls} cursor-pointer select-none list-none`}>
              {form.area_served.length > 0
                ? form.area_served.join(', ')
                : <span className="text-gray-400">Select areas served...</span>}
            </summary>
            <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2">
              {visibleAreaOptions.map(option => (
                <label key={option.id} className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 rounded"
                    checked={form.area_served.includes(option.name)}
                    onChange={() => toggleArea(option.name)}
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </details>
        </Field>
      </div>
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide pt-2 border-t">Address</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Full address"><input className={inputCls} value={form.full_address} onChange={set('full_address')} /></Field>
        </div>
        <AddressLocationFields form={form} setForm={setForm} provinces={provinces} cities={cities} communities={communities} />
        <Field label="Postal code"><input maxLength={20} required={hasAddress(form)} className={inputCls} value={form.postal_code} onChange={set('postal_code')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude"><input type="number" step="any" className={inputCls} value={form.latitude} onChange={set('latitude')} /></Field>
          <Field label="Longitude"><input type="number" step="any" className={inputCls} value={form.longitude} onChange={set('longitude')} /></Field>
        </div>
      </div>
    </Modal>
  );
};

const ResourceModal = ({ resource, onClose, onSaved }) => {
  const [form, setForm] = useState(() => resource ? {
    resource_name: resource.resource_name || '',
    resource_type: resource.resource_type || '',
    status: resource.status || 'Available',
    description: resource.description || '',
    link: resource.link || '',
    image: resource.image || '',
  } : emptyResource);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [typeOptions, setTypeOptions] = useState([]);

  useEffect(() => {
    apiRequest('/resource-type-lookup')
      .then(data => setTypeOptions(data.map(t => t.name)))
      .catch(err => setError(err.message));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); return; }
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      const { url } = await apiRequest('/admin/upload-image', { method: 'POST', body: data });
      setForm(f => ({ ...f, image: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      resource_name: form.resource_name.trim(),
      resource_type: form.resource_type.trim(),
      status: form.status.trim() || 'Available',
      description: form.description.trim() || null,
      link: form.link.trim() || null,
      image: form.image.trim() || null,
    };
    try {
      await apiRequest(resource ? `/admin/resources/${resource.resource_id}` : '/admin/resources', {
        method: resource ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={resource ? 'Edit Resource' : 'Add Resource'} onClose={onClose} onSubmit={submit} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name"><input required maxLength={150} className={inputCls} value={form.resource_name} onChange={set('resource_name')} /></Field>
        <Field label="Type">
          <select required className={inputCls} value={form.resource_type} onChange={set('resource_type')}>
            <option value="">Select a type</option>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={set('status')}>
            {[...new Set([...RESOURCE_STATUSES, form.status])].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Link"><input type="url" maxLength={500} placeholder="https://" className={inputCls} value={form.link} onChange={set('link')} /></Field>
        <div className="sm:col-span-2">
          <Field label="Image">
            <div className="flex items-center gap-3">
              {form.image && <img src={form.image} alt="Resource" className="h-16 w-16 rounded-lg object-cover border" />}
              <div className="flex-1 space-y-2">
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadImage} disabled={uploading}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-green-700 hover:file:bg-green-100" />
                <input placeholder="or paste an image URL" className={inputCls} value={form.image} onChange={set('image')} />
              </div>
            </div>
            {uploading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea rows={4} className={inputCls} value={form.description} onChange={set('description')} />
          </Field>
        </div>
      </div>
    </Modal>
  );
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const emptyWaitlist = {
  parent_names: '', email: '', phone: '', child_name: '', child_age: '', dob_or_due_date: '',
  desired_start_month: '', desired_start_year: new Date().getFullYear(), provider_id: '',
};

const WaitlistModal = ({ entry, providers, onClose, onSaved }) => {
  const [form, setForm] = useState(() => entry ? {
    parent_names: entry.parent_names || '',
    email: entry.email || '',
    phone: entry.phone || '',
    child_name: entry.child_name || '',
    child_age: entry.child_age || '',
    dob_or_due_date: entry.dob_or_due_date || '',
    desired_start_month: entry.desired_start_month || '',
    desired_start_year: entry.desired_start_year ?? '',
    provider_id: entry.provider_id ?? '',
  } : emptyWaitlist);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      parent_names: form.parent_names.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      child_name: form.child_name.trim(),
      child_age: form.child_age.trim(),
      dob_or_due_date: form.dob_or_due_date.trim(),
      desired_start_month: form.desired_start_month,
      desired_start_year: Number(form.desired_start_year),
      provider_id: Number(form.provider_id),
    };
    try {
      await apiRequest(entry ? `/admin/waitlist/${entry.id}` : '/admin/waitlist', {
        method: entry ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const sortedProviders = [...providers].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

  return (
    <Modal title={entry ? 'Edit Waitlist Entry' : 'Add Waitlist Entry'} onClose={onClose} onSubmit={submit} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Parent name(s)"><input required maxLength={255} className={inputCls} value={form.parent_names} onChange={set('parent_names')} /></Field>
        <Field label="Email"><input required type="email" maxLength={255} className={inputCls} value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input required maxLength={50} className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Provider">
          <select required className={inputCls} value={form.provider_id} onChange={set('provider_id')}>
            <option value="">Select a provider</option>
            {sortedProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Child name"><input required maxLength={255} className={inputCls} value={form.child_name} onChange={set('child_name')} /></Field>
        <Field label="Child age"><input required maxLength={100} className={inputCls} value={form.child_age} onChange={set('child_age')} /></Field>
        <Field label="Date of birth / due date"><input required type="date" className={inputCls} value={form.dob_or_due_date} onChange={set('dob_or_due_date')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start month">
            <select required className={inputCls} value={form.desired_start_month} onChange={set('desired_start_month')}>
              <option value="">Month</option>
              {[...new Set([...MONTHS, form.desired_start_month].filter(Boolean))].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Start year"><input required type="number" min="2000" max="2100" className={inputCls} value={form.desired_start_year} onChange={set('desired_start_year')} /></Field>
        </div>
      </div>
    </Modal>
  );
};

const emptyTour = {
  parent_names: '', email: '', phone: '', child_name: '', preferred_date: '', preferred_time: '', message: '', provider_id: '',
};

const TOUR_TIME_SLOTS = ['Morning (8am - 11am)', 'Midday (11am - 2pm)', 'Afternoon (2pm - 5pm)', 'Evening (5pm - 7pm)'];

const formatTourDate = (value) => {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
};

const TourModal = ({ entry, providers, onClose, onSaved }) => {
  const [form, setForm] = useState(() => entry ? {
    parent_names: entry.parent_names || '',
    email: entry.email || '',
    phone: entry.phone || '',
    child_name: entry.child_name || '',
    preferred_date: entry.preferred_date || '',
    preferred_time: entry.preferred_time || '',
    message: entry.message || '',
    provider_id: entry.provider_id ?? '',
  } : emptyTour);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      parent_names: form.parent_names.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      child_name: form.child_name.trim() || null,
      preferred_date: form.preferred_date,
      preferred_time: form.preferred_time,
      message: form.message.trim() || null,
      provider_id: Number(form.provider_id),
    };
    try {
      await apiRequest(entry ? `/admin/tours/${entry.id}` : '/admin/tours', {
        method: entry ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const sortedProviders = [...providers].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  const timeSlots = [...new Set([...TOUR_TIME_SLOTS, form.preferred_time].filter(Boolean))];

  return (
    <Modal title={entry ? 'Edit Tour Request' : 'Add Tour Request'} onClose={onClose} onSubmit={submit} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Parent name(s)"><input required maxLength={255} className={inputCls} value={form.parent_names} onChange={set('parent_names')} /></Field>
        <Field label="Email"><input required type="email" maxLength={255} className={inputCls} value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input required maxLength={50} className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Provider">
          <select required className={inputCls} value={form.provider_id} onChange={set('provider_id')}>
            <option value="">Select a provider</option>
            {sortedProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Child name"><input maxLength={255} className={inputCls} value={form.child_name} onChange={set('child_name')} /></Field>
        <Field label="Preferred date"><input required type="date" className={inputCls} value={form.preferred_date} onChange={set('preferred_date')} /></Field>
        <Field label="Preferred time">
          <select required className={inputCls} value={form.preferred_time} onChange={set('preferred_time')}>
            <option value="">Time of day</option>
            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Message"><textarea rows={3} maxLength={1000} className={inputCls} value={form.message} onChange={set('message')} /></Field>
        </div>
      </div>
    </Modal>
  );
};

const AdminDashboard = () => {
  const isAdmin = localStorage.getItem('user_type') === 'admin' && !!localStorage.getItem('token');
  const [tab, setTab] = useState('providers');
  const [providers, setProviders] = useState([]);
  const [spotsAvailable, setSpotsAvailable] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [resources, setResources] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [tours, setTours] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [agesOptions, setAgesOptions] = useState([]);
  const [scheduleOptions, setScheduleOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);
  const [regionServedOptions, setRegionServedOptions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // { kind, item } ; item null => create

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, a, spots, types, ages, schedules, areas, regionsServed, provinceData, cityData, communityData, res, wl, tr] = await Promise.all([
        apiRequest('/providers'),
        apiRequest('/agencies'),
        apiRequest('/spots-available'),
        apiRequest('/childcare-types'),
        apiRequest('/ages-served'),
        apiRequest('/schedule-options'),
        apiRequest('/areas-served-lookup'),
        apiRequest('/regions-served-lookup'),
        apiRequest('/provinces'),
        apiRequest('/cities'),
        apiRequest('/communities'),
        apiRequest('/admin/resources'),
        apiRequest('/admin/waitlist'),
        apiRequest('/admin/tours'),
      ]);
      setProviders(p);
      setAgencies(a);
      setSpotsAvailable(spots);
      setResources(res);
      setWaitlist(wl);
      setTours(tr);
      setTypeOptions(types);
      setAgesOptions(ages);
      setScheduleOptions(schedules);
      setAreaOptions(areas);
      setRegionServedOptions(regionsServed);
      setProvinces(provinceData);
      setCities(cityData);
      setCommunities(communityData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2">Admin access required</h1>
        <p className="text-gray-600 mb-6">Please log in with an administrator account to view this page.</p>
        <Link to="/" className="text-green-700 font-semibold hover:underline">Back to home</Link>
      </main>
    );
  }

  const agencyName = (id) => agencies.find(a => a.id === id)?.name || '—';
  const q = query.trim().toLowerCase();
  const byName = (key) => (a, b) => (a[key] || '').localeCompare(b[key] || '', undefined, { sensitivity: 'base' });
  const shownProviders = providers.filter(p => !q || [p.name, p.type, p.location, agencyName(p.agency_id)].some(v => (v || '').toLowerCase().includes(q))).sort(byName('name'));
  const shownAgencies = agencies.filter(a => !q || [a.name, a.email, a.phone].some(v => (v || '').toLowerCase().includes(q))).sort(byName('name'));
  const shownResources = resources.filter(r => !q || [r.resource_name, r.resource_type, r.status].some(v => (v || '').toLowerCase().includes(q))).sort(byName('resource_name'));

  const providerName = (id) => providers.find(p => p.id === id)?.name || '—';
  const shownWaitlist = waitlist
    .filter(w => !q || [w.parent_names, w.child_name, w.email, w.phone, providerName(w.provider_id)].some(v => (v || '').toLowerCase().includes(q)))
    .sort((a, b) =>
      providerName(a.provider_id).localeCompare(providerName(b.provider_id), undefined, { sensitivity: 'base' }) ||
      a.provider_id - b.provider_id ||
      (a.parent_names || '').localeCompare(b.parent_names || '', undefined, { sensitivity: 'base' })
    );

  const shownTours = tours
    .filter(t => !q || [t.parent_names, t.child_name, t.email, t.phone, t.preferred_time, providerName(t.provider_id)].some(v => (v || '').toLowerCase().includes(q)))
    .sort((a, b) =>
      providerName(a.provider_id).localeCompare(providerName(b.provider_id), undefined, { sensitivity: 'base' }) ||
      a.provider_id - b.provider_id ||
      (a.preferred_date || '').localeCompare(b.preferred_date || '')
    );

  const handleDelete = async (kind, item) => {
    const label = kind === 'resource' ? item.resource_name : kind === 'waitlist' || kind === 'tour' ? `${item.parent_names}${item.child_name ? ` (${item.child_name})` : ''}` : item.name;
    const note = kind === 'agency'
      ? ' Its providers will be kept but unlinked from the agency.'
      : kind === 'resource' || kind === 'waitlist' || kind === 'tour' ? '' : ' Its waitlist entries, tour requests and spot details will also be deleted.';
    if (!window.confirm(`Delete "${label}"?${note} This cannot be undone.`)) return;
    const paths = { agency: `agencies/${item.id}`, provider: `providers/${item.id}`, resource: `resources/${item.resource_id}`, waitlist: `waitlist/${item.id}`, tour: `tours/${item.id}` };
    try {
      await apiRequest(`/admin/${paths[kind]}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaved = async () => {
    setEditing(null);
    await load();
  };

  const tabBtn = (id, label, count) => (
    <button
      onClick={() => { setTab(id); setQuery(''); }}
      className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === id ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
    >
      {label} ({count})
    </button>
  );

  const actions = (kind, item) => {
    const label = kind === 'resource' ? item.resource_name :     kind === 'waitlist' || kind === 'tour' ? item.parent_names : item.name;
    return (
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditing({ kind, item })} aria-label={`Edit ${label}`} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><Pencil size={16} /></button>
        <button onClick={() => handleDelete(kind, item)} aria-label={`Delete ${label}`} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
      </div>
    );
  };

  const addKind = { providers: 'provider', agencies: 'agency', resources: 'resource', waitlist: 'waitlist', tours: 'tour' }[tab];
  const addLabel = { provider: 'Provider', agency: 'Agency', resource: 'Resource', waitlist: 'Waitlist Entry', tour: 'Tour Request' }[addKind];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Manage providers, agencies, served areas, resources, waitlist and tour requests.</p>
        </div>
        {addKind && (
          <button
            onClick={() => setEditing({ kind: addKind, item: null })}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
          >
            <Plus size={18} /> Add {addLabel}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {tabBtn('providers', 'Providers', providers.length)}
        {tabBtn('agencies', 'Agencies', agencies.length)}
        {tabBtn('resources', 'Resources', resources.length)}
        {tabBtn('waitlist', 'Waitlist', waitlist.length)}
        {tabBtn('tours', 'Tour Requests', tours.length)}
        {tabBtn('served-areas', 'Served Areas', regionServedOptions.length)}
        {tab !== 'served-areas' && <div className="relative ml-auto w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : tab === 'served-areas' ? (
          <ServedAreaLookupForm regions={regionServedOptions} onSaved={load} />
        ) : tab === 'providers' ? (
          <PaginatedList key={`providers-${q}`} items={shownProviders} renderPage={(rows) => (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Agency</th><th className="px-4 py-3">Spots</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.type}</td>
                  <td className="px-4 py-3">{p.location}</td>
                  <td className="px-4 py-3">{agencyName(p.agency_id)}</td>
                  <td className="px-4 py-3">{p.spots_available} / {p.max_capacity}</td>
                  <td className="px-4 py-3">{actions('provider', p)}</td>
                </tr>
              ))}
              {shownProviders.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No providers found.</td></tr>}
            </tbody>
          </table>
          )} />
        ) : tab === 'resources' ? (
          <PaginatedList key={`resources-${q}`} items={shownResources} renderPage={(rows) => (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Link</th><th className="px-4 py-3">Description</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.resource_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.resource_name}</td>
                  <td className="px-4 py-3">{r.resource_type}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {r.link && /^https?:\/\//i.test(r.link) ? (
                      <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-800">{r.link}</a>
                    ) : r.link}
                  </td>
                  <td className="px-4 py-3 max-w-md truncate">{r.description}</td>
                  <td className="px-4 py-3">{actions('resource', r)}</td>
                </tr>
              ))}
              {shownResources.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No resources found.</td></tr>}
            </tbody>
          </table>
          )} />
        ) : tab === 'waitlist' ? (
          <PaginatedList key={`waitlist-${q}`} items={shownWaitlist} renderPage={(rows) => (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Parent(s)</th><th className="px-4 py-3">Child</th><th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Desired start</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((w, i) => (
                <React.Fragment key={w.id}>
                  {(i === 0 || rows[i - 1].provider_id !== w.provider_id) && (
                    <tr className="bg-green-50">
                      <td colSpan={6} className="px-4 py-2 font-bold text-green-800">
                        {providerName(w.provider_id)}
                        <span className="ml-2 text-xs font-medium text-green-700">
                          ({waitlist.filter(x => x.provider_id === w.provider_id).length} on waitlist)
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 pl-8 font-medium">{w.parent_names}</td>
                    <td className="px-4 py-3">{w.child_name}{w.child_age ? ` (${w.child_age})` : ''}</td>
                    <td className="px-4 py-3">{w.email}<br /><span className="text-gray-500">{w.phone}</span></td>
                    <td className="px-4 py-3">{w.desired_start_month} {w.desired_start_year}</td>
                    <td className="px-4 py-3">{w.timestamp ? new Date(w.timestamp).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-3">{actions('waitlist', w)}</td>
                  </tr>
                </React.Fragment>
              ))}
              {shownWaitlist.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No waitlist entries found.</td></tr>}
            </tbody>
          </table>
          )} />
        ) : tab === 'tours' ? (
          <PaginatedList key={`tours-${q}`} items={shownTours} renderPage={(rows) => (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Parent(s)</th><th className="px-4 py-3">Child</th><th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Preferred tour</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((t, i) => (
                <React.Fragment key={t.id}>
                  {(i === 0 || rows[i - 1].provider_id !== t.provider_id) && (
                    <tr className="bg-green-50">
                      <td colSpan={6} className="px-4 py-2 font-bold text-green-800">
                        {providerName(t.provider_id)}
                        <span className="ml-2 text-xs font-medium text-green-700">
                          ({tours.filter(x => x.provider_id === t.provider_id).length} tour requests)
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 pl-8 font-medium">{t.parent_names}</td>
                    <td className="px-4 py-3">{t.child_name}</td>
                    <td className="px-4 py-3">{t.email}<br /><span className="text-gray-500">{t.phone}</span></td>
                    <td className="px-4 py-3">
                      {formatTourDate(t.preferred_date)}<br /><span className="text-gray-500">{t.preferred_time}</span>
                      {t.message && <p className="text-gray-500 text-xs mt-1 max-w-xs truncate" title={t.message}>{t.message}</p>}
                    </td>
                    <td className="px-4 py-3">{t.timestamp ? new Date(t.timestamp + 'Z').toLocaleDateString() : ''}</td>
                    <td className="px-4 py-3">{actions('tour', t)}</td>
                  </tr>
                </React.Fragment>
              ))}
              {shownTours.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No tour requests found.</td></tr>}
            </tbody>
          </table>
          )} />
        ) : (
          <PaginatedList key={`agencies-${q}`} items={shownAgencies} renderPage={(rows) => (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Providers</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3">{a.phone}</td>
                  <td className="px-4 py-3">{a.providers?.length ?? 0}</td>
                  <td className="px-4 py-3">{actions('agency', a)}</td>
                </tr>
              ))}
              {shownAgencies.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No agencies found.</td></tr>}
            </tbody>
          </table>
          )} />
        )}
      </div>

      {editing?.kind === 'provider' && (
        <ProviderModal key={editing.item?.id ?? 'new-provider'} provider={editing.item} spotRecords={spotsAvailable.filter(spot => spot.provider_id === editing.item?.id)} agencies={agencies} typeOptions={typeOptions} agesOptions={agesOptions} scheduleOptions={scheduleOptions} provinces={provinces} cities={cities} communities={communities} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {editing?.kind === 'agency' && (
        <AgencyModal agency={editing.item} areaOptions={areaOptions} regionServedOptions={regionServedOptions} provinces={provinces} cities={cities} communities={communities} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {editing?.kind === 'resource' && (
        <ResourceModal resource={editing.item} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {editing?.kind === 'waitlist' && (
        <WaitlistModal entry={editing.item} providers={providers} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {editing?.kind === 'tour' && (
        <TourModal entry={editing.item} providers={providers} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </main>
  );
};

export default AdminDashboard;
