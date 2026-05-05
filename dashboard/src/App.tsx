import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { LayoutDashboard, Users, Globe, Phone, Star, Trash2, Download, Search, Filter, X, BarChart3, Database, Clock, MapPin, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { API_BASE_URL } from './config'
import './App.css'

interface OpeningHours {
  [day: string]: string
}

interface Lead {
  _id: string
  name: string
  rating?: number
  reviews?: number
  category?: string
  address?: string
  city?: string
  phone?: string
  website?: string
  url: string
  openingHours?: OpeningHours
  isOpenNow?: boolean
  plusCode?: string
  priceLevel?: string
  serviceOptions?: string[]
  description?: string
  totalPhotos?: number
  createdAt: string
}

interface Stats {
  totalLeads: number
  categoryStats: { _id: string; count: number }[]
}

function App() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedHours, setExpandedHours] = useState<string | null>(null)
  
  const [filters, setFilters] = useState({
    search: '',
    minRating: '',
    minReviews: '',
    category: '',
    hasPhone: false,
    hasWebsite: false,
    isOpenNow: false,
    priceLevel: '',
    city: '',
    createdAfter: '',
    createdBefore: '',
    hasOpeningHours: false,
    hasDescription: false,
    hasServiceOptions: false,
    hasPlusCode: false,
    hasAddress: false,
    serviceOption: '',
    minPhotos: ''
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.minRating) params.append('minRating', filters.minRating)
      if (filters.minReviews) params.append('minReviews', filters.minReviews)
      if (filters.category) params.append('category', filters.category)
      if (filters.hasPhone) params.append('hasPhone', 'true')
      if (filters.hasWebsite) params.append('hasWebsite', 'true')
      if (filters.isOpenNow) params.append('isOpenNow', 'true')
      if (filters.priceLevel) params.append('priceLevel', filters.priceLevel)
      if (filters.city) params.append('city', filters.city)
      if (filters.createdAfter) params.append('createdAfter', filters.createdAfter)
      if (filters.createdBefore) params.append('createdBefore', filters.createdBefore)
      if (filters.hasOpeningHours) params.append('hasOpeningHours', 'true')
      if (filters.hasDescription) params.append('hasDescription', 'true')
      if (filters.hasServiceOptions) params.append('hasServiceOptions', 'true')
      if (filters.hasPlusCode) params.append('hasPlusCode', 'true')
      if (filters.hasAddress) params.append('hasAddress', 'true')
      if (filters.serviceOption) params.append('serviceOption', filters.serviceOption)
      if (filters.minPhotos) params.append('minPhotos', filters.minPhotos)

      const [leadsRes, statsRes, catRes, citiesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/leads?${params.toString()}`),
        axios.get(`${API_BASE_URL}/api/stats`),
        axios.get(`${API_BASE_URL}/api/categories`),
        axios.get(`${API_BASE_URL}/api/cities`)
      ])
      setLeads(leadsRes.data)
      setStats(statsRes.data)
      setCategories(catRes.data)
      setCities(citiesRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300)
    return () => clearTimeout(timer)
  }, [fetchData])

  const deleteLead = async (id: string) => {
    if (confirm('Move this lead to trash?')) {
      await axios.delete(`${API_BASE_URL}/api/leads/${id}`)
      fetchData()
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Rating', 'Reviews', 'Phone', 'Website', 'Address', 'URL', 'Open Now', 'Price Level', 'Plus Code', 'Service Options', 'Description', 'Opening Hours']
    const csvContent = [headers, ...leads.map(l => [
      `"${l.name}"`,
      `"${l.category || ''}"`,
      l.rating || '',
      l.reviews || '',
      `"${l.phone || ''}"`,
      `"${l.website || ''}"`,
      `"${l.address?.replace(/"/g, '""') || ''}"`,
      `"${l.url}"`,
      l.isOpenNow !== undefined ? (l.isOpenNow ? 'Yes' : 'No') : '',
      `"${l.priceLevel || ''}"`,
      `"${l.plusCode || ''}"`,
      `"${l.serviceOptions?.join(', ') || ''}"`,
      `"${l.description?.replace(/"/g, '""') || ''}"`,
      `"${l.openingHours ? Object.entries(l.openingHours).map(([d, h]) => `${d}: ${h}`).join('; ') : ''}"`
    ])].map(e => e.join(",")).join("\n")
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `leads_export_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
  }

  const exportToCSVBackend = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.minRating) params.append('minRating', filters.minRating)
      if (filters.minReviews) params.append('minReviews', filters.minReviews)
      if (filters.category) params.append('category', filters.category)
      if (filters.hasPhone) params.append('hasPhone', 'true')
      if (filters.hasWebsite) params.append('hasWebsite', 'true')
      if (filters.isOpenNow) params.append('isOpenNow', 'true')
      if (filters.priceLevel) params.append('priceLevel', filters.priceLevel)
      if (filters.city) params.append('city', filters.city)
      if (filters.createdAfter) params.append('createdAfter', filters.createdAfter)
      if (filters.createdBefore) params.append('createdBefore', filters.createdBefore)
      if (filters.hasOpeningHours) params.append('hasOpeningHours', 'true')
      if (filters.hasDescription) params.append('hasDescription', 'true')
      if (filters.hasServiceOptions) params.append('hasServiceOptions', 'true')
      if (filters.hasPlusCode) params.append('hasPlusCode', 'true')
      if (filters.hasAddress) params.append('hasAddress', 'true')
      if (filters.serviceOption) params.append('serviceOption', filters.serviceOption)
      if (filters.minPhotos) params.append('minPhotos', filters.minPhotos)

      const response = await axios.get(API_BASE_URL + '/api/leads/export?' + params.toString(), {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'text/csv' })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = 'leads_export_' + new Date().toISOString().slice(0,10) + '.csv'
      link.click()
    } catch (error) {
      console.error('CSV export failed:', error)
      alert('CSV export failed. Please try again.')
    }
  };

  const toggleHours = (id: string) => {
    setExpandedHours(expandedHours === id ? null : id)
  }

  const withDetailsCount = leads.filter(l => l.openingHours || l.serviceOptions?.length || l.plusCode).length

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo"><span>🚀</span> LeadScraper</div>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="active"><LayoutDashboard size={18} /> Overview</a>
          <a href="#"><Users size={18} /> Audience</a>
          <a href="#"><BarChart3 size={18} /> Analytics</a>
          <a href="#"><Database size={18} /> Database</a>
        </nav>
      </aside>

      <main className="content">
        <header className="content-header">
          <div>
            <h2>Dashboard</h2>
            <p className="subtitle">Real-time business lead intelligence</p>
          </div>
          <div className="header-actions">
            <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-filter ${showFilters ? 'active' : ''}`}>
              <Filter size={16} /> Filters
            </button>
            <button onClick={exportToCSVBackend} className="btn btn-export">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>

        {showFilters && (
          <section className="filter-panel animate-in">
            <div className="filter-grid">
              <div className="filter-group">
                <label>Industry</label>
                <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
                  <option value="">All Categories</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Minimum Rating</label>
                <input type="number" step="0.1" placeholder="4.0" value={filters.minRating} onChange={e => setFilters({...filters, minRating: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>Min Reviews</label>
                <input type="number" placeholder="50" value={filters.minReviews} onChange={e => setFilters({...filters, minReviews: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>Price Level</label>
                <select value={filters.priceLevel} onChange={e => setFilters({...filters, priceLevel: e.target.value})}>
                  <option value="">All Prices</option>
                  <option value="₺">₺</option>
                  <option value="₺₺">₺₺</option>
                  <option value="₺₺₺">₺₺₺</option>
                  <option value="₺₺₺₺">₺₺₺₺</option>
              </div>
              <div className="filter-group">
                <label>City</label>
                <select value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})}>
                  <option value="">All Cities</option>
                  {cities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Created After</label>
                <input type="date" value={filters.createdAfter} onChange={e => setFilters({...filters, createdAfter: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>Created Before</label>
                <input type="date" value={filters.createdBefore} onChange={e => setFilters({...filters, createdBefore: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>Service Option</label>
                <select value={filters.serviceOption} onChange={e => setFilters({...filters, serviceOption: e.target.value})}>
                  <option value="">Any Service</option>
                  <option value="Paket Servisi">Paket Servisi</option>
                  <option value="İç Mekan">İç Mekan</option>
                  <option value="Kapıda Teslim">Kapıda Teslim</option>
                  <option value="Gel Al">Gel Al</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Min Photos</label>
                <input type="number" placeholder="0" value={filters.minPhotos} onChange={e => setFilters({...filters, minPhotos: e.target.value})} />
              </div>
              <div className="filter-group checkboxes">
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.hasPhone} onChange={e => setFilters({...filters, hasPhone: e.target.checked})} />
                  With Phone
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.hasWebsite} onChange={e => setFilters({...filters, hasWebsite: e.target.checked})} />
                  With Website
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.isOpenNow} onChange={e => setFilters({...filters, isOpenNow: e.target.checked})} />
                  Open Now
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.hasOpeningHours} onChange={e => setFilters({...filters, hasOpeningHours: e.target.checked})} />
                  Has Opening Hours
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.hasDescription} onChange={e => setFilters({...filters, hasDescription: e.target.checked})} />
                  Has Description
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.hasServiceOptions} onChange={e => setFilters({...filters, hasServiceOptions: e.target.checked})} />
                  Has Service Options
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.hasPlusCode} onChange={e => setFilters({...filters, hasPlusCode: e.target.checked})} />
                  Has Plus Code
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={filters.hasAddress} onChange={e => setFilters({...filters, hasAddress: e.target.checked})} />
                  Has Address
                </label>
              </div>
            </div>
            <button onClick={() => setFilters({search:'', minRating:'', minReviews:'', category:'', hasPhone:false, hasWebsite:false, isOpenNow: false, priceLevel: '', city: '', createdAfter:'', createdBefore:'', hasOpeningHours:false, hasDescription:false, hasServiceOptions:false, hasPlusCode:false, hasAddress:false, serviceOption:'', minPhotos:''})} className="btn-reset">
              <X size={12} /> Reset all filters
            </button>
          </section>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Users color="var(--primary)" size={24} /></div>
            <div className="stat-info">
              <span className="label">Total Leads</span>
              <span className="value">{stats?.totalLeads || 0}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Filter color="#10b981" size={24} /></div>
            <div className="stat-info">
              <span className="label">Filtered View</span>
              <span className="value">{leads.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Star color="#f59e0b" size={24} /></div>
            <div className="stat-info">
              <span className="label">Avg Rating</span>
              <span className="value">{(leads.reduce((acc, l) => acc + (l.rating || 0), 0) / (leads.length || 1)).toFixed(1)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Clock color="#8b5cf6" size={24} /></div>
            <div className="stat-info">
              <span className="label">With Details</span>
              <span className="value">{withDetailsCount}</span>
            </div>
          </div>
        </div>

        {stats && stats.categoryStats && stats.categoryStats.length > 0 && (
          <div className="chart-section">
            <h3><BarChart3 size={18} /> Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="table-container">
          <div className="table-header">
            <div className="search-bar">
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Search by name, category, or city..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
            </div>
          </div>

          <table className="leads-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Category</th>
                <th>Contact Details</th>
                <th>Performance</th>
                <th>Hours & Details</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="loading-cell">
            <div className="skeleton skeleton-card"></div>
            <div className="skeleton skeleton-card"></div>
            <div className="skeleton skeleton-card"></div>
          </td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="no-results">No leads found.</td></tr>
              ) : leads.map(lead => (
                <tr key={lead._id} className="animate-in">
                  <td>
                    <div className="lead-name">{lead.name}</div>
                    <div className="lead-address">{lead.address}</div>
                    {lead.plusCode && (
                      <div className="lead-pluscode">
                        <MapPin size={11} /> {lead.plusCode}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge">{lead.category || 'Business'}</span>
                    {lead.priceLevel && (
                      <span className="price-badge">
                        <DollarSign size={12} /> {lead.priceLevel}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="contact-details">
                      {lead.phone ? (
                        <div className="contact-item"><Phone size={14} color="var(--text-muted)" /> {lead.phone}</div>
                      ) : <div className="no-contact">No phone</div>}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="contact-item">
                          <Globe size={14} color="var(--primary)" /> Website
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="rating-info">
                      <Star size={16} fill="#facc15" color="#facc15" /> 
                      {lead.rating || '0'} <span className="reviews">({lead.reviews || 0})</span>
                    </div>
                  </td>
                  <td>
                    <div className="hours-details-cell">
                      {/* Open/Closed Status */}
                      {lead.isOpenNow !== undefined && (
                        <div className={`open-status ${lead.isOpenNow ? 'open' : 'closed'}`}>
                          <span className="status-dot"></span>
                          {lead.isOpenNow ? 'Açık' : 'Kapalı'}
                        </div>
                      )}

                      {/* Opening Hours Toggle */}
                      {lead.openingHours && Object.keys(lead.openingHours).length > 0 && (
                        <div className="hours-section">
                          <button className="hours-toggle" onClick={() => toggleHours(lead._id)}>
                            <Clock size={13} />
                            {expandedHours === lead._id ? 'Saatleri Gizle' : 'Saatleri Göster'}
                          </button>
                          {expandedHours === lead._id && (
                            <div className="hours-dropdown animate-in">
                              {Object.entries(lead.openingHours).map(([day, time]) => (
                                <div key={day} className="hours-row">
                                  <span className="hours-day">{day}</span>
                                  <span className="hours-time">{time}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Service Options */}
                      {lead.serviceOptions && lead.serviceOptions.length > 0 && (
                        <div className="service-tags">
                          {lead.serviceOptions.slice(0, 3).map((opt, idx) => (
                            <span key={idx} className="service-tag">{opt}</span>
                          ))}
                          {lead.serviceOptions.length > 3 && (
                            <span className="service-tag more">+{lead.serviceOptions.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Description snippet */}
                      {lead.description && (
                        <div className="lead-description" title={lead.description}>
                          {lead.description.slice(0, 60)}{lead.description.length > 60 ? '...' : ''}
                        </div>
                      )}

                      {/* No details indicator */}
                      {!lead.openingHours && !lead.serviceOptions?.length && lead.isOpenNow === undefined && (
                        <div className="no-details">—</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <button onClick={() => deleteLead(lead._id)} className="btn-delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default App
