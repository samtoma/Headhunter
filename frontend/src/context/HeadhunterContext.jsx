import { createContext, useContext } from 'react';
import { useHeadhunterData } from '../hooks/useHeadhunterData';

const HeadhunterContext = createContext(null);

export const HeadhunterProvider = ({ children }) => {
    const data = useHeadhunterData();

    return (
        <HeadhunterContext.Provider value={data}>
            {children}
        </HeadhunterContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useHeadhunter = () => {
    const context = useContext(HeadhunterContext);
    if (!context) {
        throw new Error('useHeadhunter must be used within a HeadhunterProvider');
    }
    return context;
};
