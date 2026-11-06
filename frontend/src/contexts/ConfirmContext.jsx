import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import Button from '../components/Button';

const ConfirmContext = createContext(null);

const DEFAULT_OPTIONS = {
  title: 'Confirmer cette action ?',
  message: '',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  danger: true
};

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({ ...DEFAULT_OPTIONS, ...options });
    });
  }, []);

  const close = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {dialog && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => close(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.15)]"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                  dialog.danger ? 'bg-[#FEE2E2]' : 'bg-[#E0F2FE]'
                }`}
              >
                <AlertTriangle className={`h-5 w-5 ${dialog.danger ? 'text-[#DC2626]' : 'text-[#0C4A6E]'}`} />
              </div>
              <h2 className="text-lg font-semibold text-[#0F172A]">{dialog.title}</h2>
              {dialog.message && <p className="mt-2 text-sm text-[#64748B]">{dialog.message}</p>}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant={dialog.danger ? 'primary' : 'primary'}
                  className={`sm:flex-1 ${dialog.danger ? '!bg-[#DC2626] hover:!bg-[#B91C1C]' : ''}`}
                  onClick={() => close(true)}
                >
                  {dialog.confirmLabel}
                </Button>
                <Button variant="secondary" className="sm:flex-1" onClick={() => close(false)}>
                  {dialog.cancelLabel}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

// Usage : const confirm = useConfirm(); if (await confirm({ title, message })) { ... }
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return confirm;
}
