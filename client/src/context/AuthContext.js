import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../api.js";
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const refreshUser = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUser = await getMe();
            setUser(currentUser);
        }
        catch (_err) {
            setUser(null);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        refreshUser();
    }, []);
    const login = async (credentials) => {
        setError(null);
        const response = await apiLogin(credentials);
        setUser(response.user);
        return response.user;
    };
    const logout = async () => {
        try {
            await apiLogout();
        }
        finally {
            setUser(null);
        }
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            isLoading,
            error,
            login,
            logout,
            refreshUser,
        }, children: children }));
};
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
