import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [isPlatform, setIsPlatform] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTenant = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTenant();
      if (data.is_platform) {
        setIsPlatform(true);
        setTenant(null);
      } else {
        setIsPlatform(false);
        setTenant(data);

        // Apply tenant primary branding color dynamically
        if (data.website_settings && data.website_settings.primary_color) {
          document.documentElement.style.setProperty('--tenant-primary', data.website_settings.primary_color);
        }
      }
    } catch (err) {
      console.error('Failed to resolve tenant:', err);
      setError({
        status: err.status || 500,
        message: err.message || 'Error resolving tenant',
        code: err.data?.code,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isPlatform, loading, error, reloadTenant: fetchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
