import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000' : '');

const TIME_SLOTS = ['Morning (8am - 11am)', 'Midday (11am - 2pm)', 'Afternoon (2pm - 5pm)', 'Evening (5pm - 7pm)'];

const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition';
const labelCls = 'block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2';

const todayString = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const BookTourForm = () => {
  const { id } = useParams();
  const providerId = parseInt(id);
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [providerError, setProviderError] = useState('');
  const [formData, setFormData] = useState({
    parentNames: '',
    email: '',
    phone: '',
    childName: '',
    preferredDate: '',
    preferredTime: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProvider = async () => {
      try {
        const response = await fetch(`${API_BASE}/providers/${providerId}`);
        if (!response.ok) throw new Error(`Provider request failed (${response.status})`);
        setProvider(await response.json());
      } catch (error) {
        console.error('Error fetching provider:', error);
        setProviderError('Unable to load this provider. Please try again later.');
      }
    };
    fetchProvider();
  }, [providerId]);

  if (!provider) {
    return <div className="p-20 text-center text-red-600 font-bold">{providerError || 'Loading...'}</div>;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch(`${API_BASE}/tours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_names: formData.parentNames.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          child_name: formData.childName.trim() || null,
          preferred_date: formData.preferredDate,
          preferred_time: formData.preferredTime,
          message: formData.message.trim() || null,
          provider_id: providerId,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof result?.detail === 'string' ? result.detail : 'Unable to submit the tour request.');
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Error booking tour:', error);
      setSubmitError(error.message || 'Unable to submit the tour request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-green-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Tour Request Sent!</h2>
          <p className="text-gray-600 text-lg mb-8">
            Your tour request for <strong>{provider.name}</strong> has been submitted.
            The provider will contact you to confirm a time.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-lg"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-green-600 font-bold hover:underline cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-green-600 p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Book a Tour</h1>
          <p className="text-green-100 font-medium">{provider.name}</p>
          {provider.location && <p className="text-green-100 text-sm mt-1">{provider.location}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-6">
          <div>
            <label className={labelCls}>Parent or Guardian Names</label>
            <input required type="text" name="parentNames" maxLength={255} value={formData.parentNames} onChange={handleChange}
              placeholder="e.g. Jane and John Doe" className={inputCls} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Email Address</label>
              <input required type="email" name="email" maxLength={255} value={formData.email} onChange={handleChange}
                placeholder="email@example.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input required type="tel" name="phone" maxLength={50} value={formData.phone} onChange={handleChange}
                placeholder="555-555-5555" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Child's Name <span className="text-gray-400 normal-case font-medium">(optional)</span></label>
            <input type="text" name="childName" maxLength={255} value={formData.childName} onChange={handleChange}
              placeholder="Full Name" className={inputCls} />
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <label className="block text-sm font-bold text-blue-800 uppercase tracking-wider mb-4">Preferred Tour Time</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="date" name="preferredDate" min={todayString()} value={formData.preferredDate} onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <select required name="preferredTime" value={formData.preferredTime} onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition">
                <option value="">Time of day</option>
                {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Message <span className="text-gray-400 normal-case font-medium">(optional)</span></label>
            <textarea name="message" rows={4} maxLength={1000} value={formData.message} onChange={handleChange}
              placeholder="Anything you'd like the provider to know?" className={inputCls} />
          </div>

          {submitError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 disabled:cursor-wait disabled:opacity-60 transition shadow-xl text-lg uppercase tracking-wider"
          >
            {submitting ? 'Sending...' : 'Request Tour'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookTourForm;
