import React from 'react';

function StatusBadge({ statut }) {
  const statusConfig = {
    present: { label: 'Présent', bg: '#D1FAE5', text: '#10B981' },
    retard: { label: 'Retard', bg: '#FEF3C7', text: '#F59E0B' },
    absent: { label: 'Absent', bg: '#FEE2E2', text: '#DC2626' },
    avenir: { label: 'À venir', bg: '#F1F5F9', text: '#64748B' },
    'en cours': { label: 'En cours', bg: '#E0F2FE', text: '#0369A1' },
    termine: { label: 'Terminé', bg: '#F1F5F9', text: '#64748B' },
    bon: { label: 'Bon', bg: '#D1FAE5', text: '#10B981' },
    attention: { label: 'Attention', bg: '#FEF3C7', text: '#F59E0B' },
    critique: { label: 'Critique', bg: '#FEE2E2', text: '#DC2626' },
    annule: { label: 'Annulé', bg: '#FEE2E2', text: '#DC2626' },
    reporte: { label: 'Reporté', bg: '#FEF3C7', text: '#F59E0B' },
    modifie: { label: 'Modifié', bg: '#FEF3C7', text: '#F59E0B' },
    absence_justifiee: { label: 'Justifiée', bg: '#E0F2FE', text: '#0369A1' },
    invalide: { label: 'Invalide', bg: '#FEE2E2', text: '#DC2626' },
    non_pointer: { label: 'Non pointé', bg: '#F1F5F9', text: '#64748B' }
  };

  const config = statusConfig[statut] || statusConfig.avenir;

  return (
    <span 
      className="px-3 py-1.5 rounded-[6px] text-sm font-medium"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
