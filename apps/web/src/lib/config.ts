// Configuration file for the application
// This centralizes all configuration to avoid hardcoded values

export const config = {
  // Project configuration
  project: {
    name: 'Rankup Manager',
    description: 'SEO Ranking Tracker'
  },
  
  // API endpoints configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    timeout: 30000, // 30 seconds
    retryAttempts: 3
  },
  
  // BigQuery configuration
  bigquery: {
    dataset: 'seo_rankings',
    tables: {
      keywords: 'keywords',
      rankings: 'rankings', 
      projects: 'projects'
    }
  },
  
  // UI configuration
  ui: {
    itemsPerPage: 50,
    maxItemsPerPage: 100,
    animationDuration: 500,
    toastDuration: 5000
  },
  
  // Feature flags
  features: {
    enableCache: process.env.NODE_ENV === 'production',
    enableAnalytics: process.env.NODE_ENV === 'production',
    enableExport: true,
    enableBulkActions: true
  },
  
  // Date ranges for filters
  dateRanges: [
    { value: '1', label: '24h' },
    { value: '7', label: '7 ngày' },
    { value: '30', label: '30 ngày' },
    { value: '90', label: '90 ngày' }
  ],
  
  // Priority levels
  priorities: {
    high: { 
      label: 'Cao',
      color: 'bg-red-500/10 text-red-400 border-red-500/20'
    },
    medium: { 
      label: 'Trung bình',
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    },
    low: { 
      label: 'Thấp',
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  },
  
  // Search engines
  searchEngines: {
    google: { label: 'Google', icon: 'google' },
    bing: { label: 'Bing', icon: 'bing' },
    yahoo: { label: 'Yahoo', icon: 'yahoo' }
  },
  
  // Devices
  devices: {
    desktop: { label: 'Desktop', icon: 'monitor' },
    mobile: { label: 'Mobile', icon: 'smartphone' },
    tablet: { label: 'Tablet', icon: 'tablet' }
  }
};

export default config;