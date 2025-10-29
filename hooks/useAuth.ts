
import { useAuth as useAuthFromContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication context.
 * This provides a clear, separated hook for components to use,
 * abstracting away the direct useContext call.
 */
export const useAuth = () => {
    return useAuthFromContext();
};
