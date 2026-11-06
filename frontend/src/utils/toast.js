import toastLib from 'react-hot-toast';

const baseStyle = {
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 500,
  boxShadow: '0 10px 15px -3px rgba(15,23,42,0.1), 0 4px 6px -4px rgba(15,23,42,0.1)'
};

export const toast = {
  success: (message) =>
    message &&
    toastLib.success(message, {
      style: { ...baseStyle, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
      iconTheme: { primary: '#10B981', secondary: '#ECFDF5' }
    }),
  error: (message) =>
    message &&
    toastLib.error(message, {
      style: { ...baseStyle, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
      iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' }
    }),
  info: (message) =>
    message &&
    toastLib(message, {
      style: { ...baseStyle, background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' },
      icon: 'ℹ️'
    })
};

export default toast;
