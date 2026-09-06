import React, { createContext, useContext, useState, useEffect } from "react";
import { RequesterUser, getRequesters } from "../api.js";

export interface RequesterContextType {
  currentRequester: RequesterUser | null;
  isLoading: boolean;
  requesters: RequesterUser[];
  error: string | null;
  selectRequester: (requesterId: number) => void;
  changeRequester: () => void;
  loadRequesters: () => Promise<void>;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const STORAGE_KEY = "selectedRequesterId";

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRequester, setCurrentRequester] = useState<RequesterUser | null>(null);
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequesters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRequesters();
      setRequesters(data);

      const savedIdStr = localStorage.getItem(STORAGE_KEY);
      if (savedIdStr) {
        const savedId = Number(savedIdStr);
        const match = data.find((r) => r.id === savedId && r.isActive);
        if (match) {
          setCurrentRequester(match);
        } else {
          // Stale or invalid requester ID: clear storage and redirect
          localStorage.removeItem(STORAGE_KEY);
          setCurrentRequester(null);
        }
      } else {
        setCurrentRequester(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load requesters");
      localStorage.removeItem(STORAGE_KEY);
      setCurrentRequester(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequesters();
  }, []);

  const selectRequester = (requesterId: number) => {
    const found = requesters.find((r) => r.id === requesterId);
    if (found) {
      localStorage.setItem(STORAGE_KEY, String(found.id));
      setCurrentRequester(found);
    }
  };

  const changeRequester = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentRequester(null);
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        isLoading,
        requesters,
        error,
        selectRequester,
        changeRequester,
        loadRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
