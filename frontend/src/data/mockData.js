// Données mock pour l'application
export const mockEtudiant = {
  id: 1,
  nom: "Karim Benali",
  email: "karim.benali@universite.edu",
  telephone: "+212 6 12 34 56 78",
  numeroEtudiant: "E2023001",
  promotion: "L3 Informatique",
  filiere: "Informatique",
  dateInscription: "01/09/2023",
  tauxPresenceGlobal: 89,
  totalCours: 45,
  presences: 38,
  retards: 4,
  absences: 3
};

export const mockMatieresEtudiant = [
  {
    id: 1,
    nom: "Mathématiques Appliquées",
    professeur: "Sofia Andersson",
    tauxPresence: 92,
    presences: 12,
    retards: 1,
    absences: 0
  },
  {
    id: 2,
    nom: "Développement Web",
    professeur: "Marc Dupont",
    tauxPresence: 85,
    presences: 11,
    retards: 2,
    absences: 1
  },
  {
    id: 3,
    nom: "Base de Données",
    professeur: "Lisa Martin",
    tauxPresence: 88,
    presences: 10,
    retards: 1,
    absences: 1
  }
];

export const mockCoursDuJourEtudiant = [
  {
    id: 1,
    nom: "Mathématiques Appliquées",
    horaire: "09:00 - 11:00",
    salle: "Salle A101",
    professeur: "Sofia Andersson",
    statut: "present"
  },
  {
    id: 2,
    nom: "Développement Web",
    horaire: "14:00 - 16:00",
    salle: "Salle B202",
    professeur: "Marc Dupont",
    statut: "avenir"
  }
];

export const mockHistoriqueEtudiant = [
  {
    id: 1,
    date: "05/07/2026",
    heure: "09:05",
    matiere: "Mathématiques Appliquées",
    statut: "present"
  },
  {
    id: 2,
    date: "04/07/2026",
    heure: "14:12",
    matiere: "Développement Web",
    statut: "retard"
  },
  {
    id: 3,
    date: "03/07/2026",
    heure: null,
    matiere: "Base de Données",
    statut: "absent"
  }
];

export const mockProfesseur = {
  id: 1,
  nom: "Sofia Andersson",
  email: "sofia.andersson@universite.edu",
  telephone: "+33 6 12 34 56 78"
};

export const mockCoursProfesseur = [
  {
    id: 1,
    nom: "Mathématiques Appliquées",
    horaireDebut: "09:00",
    horaireFin: "11:00",
    salle: "Salle A101",
    promotion: "L3 Informatique",
    nombreEtudiants: 35,
    tauxPresenceMoyen: 91,
    toleranceRetard: 10,
    statut: "en cours",
    date: "06/07/2026"
  },
  {
    id: 2,
    nom: "Statistiques",
    horaireDebut: "11:00",
    horaireFin: "13:00",
    salle: "Salle A102",
    promotion: "L2 Mathématiques",
    nombreEtudiants: 30,
    tauxPresenceMoyen: 84,
    toleranceRetard: 10,
    statut: "avenir",
    date: "06/07/2026"
  },
  {
    id: 3,
    nom: "Mathématiques Appliquées",
    horaireDebut: "09:00",
    horaireFin: "11:00",
    salle: "Salle A101",
    promotion: "L3 Informatique",
    nombreEtudiants: 35,
    tauxPresenceMoyen: 88,
    toleranceRetard: 10,
    statut: "termine",
    date: "05/07/2026"
  }
];

export const mockEtudiantsCours = [
  {
    id: 1,
    nom: "Karim Benali",
    numeroEtudiant: "E2023001",
    statut: "present",
    heurePointage: "09:05"
  },
  {
    id: 2,
    nom: "Marie Dubois",
    numeroEtudiant: "E2023002",
    statut: "present",
    heurePointage: "09:02"
  },
  {
    id: 3,
    nom: "Ahmed El Mansouri",
    numeroEtudiant: "E2023003",
    statut: "retard",
    heurePointage: "09:15"
  },
  {
    id: 4,
    nom: "Sarah Johnson",
    numeroEtudiant: "E2023004",
    statut: "absent",
    heurePointage: null
  }
];

export const mockResponsable = {
  id: 1,
  nom: "Amara Okonkwo",
  email: "amara.okonkwo@universite.edu",
  telephone: "+221 6 12 34 56 78",
  departement: "Ingénierie"
};

export const mockEtudiantsEnAlerte = [
  {
    id: 1,
    nom: "Jean-Luc Moreau",
    numeroEtudiant: "E2022015",
    promotion: "L3 Informatique",
    filiere: "Informatique",
    criticite: "critique",
    tauxAbsence: 35,
    totalAbsences: 14,
    matieresProblematiques: ["Mathématiques", "Physique", "Développement Web"],
    derniereMiseAJour: "05/07/2026"
  },
  {
    id: 2,
    nom: "Fatima Zahra",
    numeroEtudiant: "E2023042",
    promotion: "L2 Mathématiques",
    filiere: "Mathématiques",
    criticite: "attention",
    tauxAbsence: 22,
    totalAbsences: 9,
    matieresProblematiques: ["Statistiques", "Algèbre"],
    derniereMiseAJour: "04/07/2026"
  }
];

export const mockStatsDepartement = {
  tauxPresenceGlobal: 87,
  totalEtudiants: 800,
  etudiantsEnAlerte: 45,
  coursAujourdhui: 25
};

export const mockPresenceStats = {
  tauxPresence: 89,
  nbAbsences: 3,
  nbRetards: 4
};

export const mockTodaySchedule = [
  {
    id: 1,
    nom: "Mathématiques Appliquées",
    horaireDebut: "09:00",
    horaireFin: "11:00",
    salle: "Salle A101",
    professeur: "Sofia Andersson",
    statut: "present"
  },
  {
    id: 2,
    nom: "Développement Web",
    horaireDebut: "14:00",
    horaireFin: "16:00",
    salle: "Salle B202",
    professeur: "Marc Dupont",
    statut: "avenir"
  }
];

export const mockCours = [
  {
    id: 1,
    nom: "Mathématiques Appliquées",
    date: "05/07/2026",
    statut: "termine"
  },
  {
    id: 2,
    nom: "Base de Données",
    date: "04/07/2026",
    statut: "termine"
  },
  {
    id: 3,
    nom: "Statistiques",
    date: "03/07/2026",
    statut: "termine"
  }
];

export const mockNotificationsByRole = {
  etudiant: [
    {
      id: 1,
      titre: "Rappel de cours",
      description: "Développement Web commence à 14:00 en salle B202.",
      type: "info",
      date: "Aujourd'hui"
    },
    {
      id: 2,
      titre: "Alerte d'assiduité",
      description: "Votre taux de présence en Développement Web est en baisse.",
      type: "warning",
      date: "Hier"
    }
  ],
  professeur: [
    {
      id: 1,
      titre: "Cours dans 15 min",
      description: "Statistiques avec L2 Mathématiques à 11:00.",
      type: "info",
      date: "Aujourd'hui"
    },
    {
      id: 2,
      titre: "Session terminée",
      description: "La feuille de présence de Mathématiques Appliquées est prête à être exportée.",
      type: "success",
      date: "Aujourd'hui"
    }
  ],
  responsable: [
    {
      id: 1,
      titre: "Nouvelle alerte critique",
      description: "Jean-Luc Moreau dépasse le seuil d'absence autorisé.",
      type: "error",
      date: "Aujourd'hui"
    },
    {
      id: 2,
      titre: "Rapport hebdomadaire",
      description: "Le rapport de présence du département est disponible.",
      type: "info",
      date: "Cette semaine"
    }
  ]
};

export const mockEtudiantAlerts = [
  {
    id: 1,
    titre: "Attention à vos absences",
    description: "Vous avez déjà 3 absences en Développement Web. Un accompagnement peut être proposé.",
    niveau: "attention"
  },
  {
    id: 2,
    titre: "Cours à venir",
    description: "Base de Données commence demain à 09:00. Pensez à vous connecter au WiFi du campus.",
    niveau: "info"
  }
];

export const mockPresenceEvolution = [
  { label: "S1", value: 82 },
  { label: "S2", value: 86 },
  { label: "S3", value: 88 },
  { label: "S4", value: 91 },
  { label: "S5", value: 89 },
  { label: "S6", value: 93 }
];

export const mockHistoriqueParMatiere = {
  1: {
    id: 1,
    nom: "Mathématiques Appliquées",
    professeur: "Sofia Andersson",
    tauxPresence: 92,
    salle: "Salle A101",
    horaire: "Lundi 09:00 - 11:00",
    presences: 12,
    retards: 1,
    absences: 0,
    evolution: [
      { label: "S1", value: 100 },
      { label: "S2", value: 100 },
      { label: "S3", value: 85 },
      { label: "S4", value: 100 },
      { label: "S5", value: 90 }
    ],
    seances: [
      { id: 101, date: "05/07/2026", heure: "09:05", statut: "present", remarque: "Présence confirmée" },
      { id: 102, date: "28/06/2026", heure: "09:02", statut: "present", remarque: "Présence confirmée" },
      { id: 103, date: "21/06/2026", heure: "09:14", statut: "retard", remarque: "Au-delà de la tolérance" }
    ]
  },
  2: {
    id: 2,
    nom: "Développement Web",
    professeur: "Marc Dupont",
    tauxPresence: 85,
    salle: "Salle B202",
    horaire: "Mercredi 14:00 - 16:00",
    presences: 11,
    retards: 2,
    absences: 1,
    evolution: [
      { label: "S1", value: 100 },
      { label: "S2", value: 90 },
      { label: "S3", value: 80 },
      { label: "S4", value: 75 },
      { label: "S5", value: 80 }
    ],
    seances: [
      { id: 201, date: "04/07/2026", heure: "14:12", statut: "retard", remarque: "Retard modéré" },
      { id: 202, date: "27/06/2026", heure: null, statut: "absent", remarque: "Absence non justifiée" },
      { id: 203, date: "20/06/2026", heure: "13:58", statut: "present", remarque: "Présence confirmée" }
    ]
  },
  3: {
    id: 3,
    nom: "Base de Données",
    professeur: "Lisa Martin",
    tauxPresence: 88,
    salle: "Salle C303",
    horaire: "Vendredi 10:00 - 12:00",
    presences: 10,
    retards: 1,
    absences: 1,
    evolution: [
      { label: "S1", value: 88 },
      { label: "S2", value: 92 },
      { label: "S3", value: 85 },
      { label: "S4", value: 90 },
      { label: "S5", value: 87 }
    ],
    seances: [
      { id: 301, date: "03/07/2026", heure: null, statut: "absent", remarque: "Absence non justifiée" },
      { id: 302, date: "26/06/2026", heure: "10:03", statut: "present", remarque: "Présence confirmée" },
      { id: 303, date: "19/06/2026", heure: "10:11", statut: "retard", remarque: "Tolérance dépassée" }
    ]
  }
};

export const mockPresenceRealtime = [
  { id: 1, nom: "Karim Benali", numeroEtudiant: "E2023001", statut: "present", heurePointage: "09:05" },
  { id: 2, nom: "Marie Dubois", numeroEtudiant: "E2023002", statut: "present", heurePointage: "09:02" },
  { id: 3, nom: "Ahmed El Mansouri", numeroEtudiant: "E2023003", statut: "retard", heurePointage: "09:15" },
  { id: 4, nom: "Sarah Johnson", numeroEtudiant: "E2023004", statut: "absent", heurePointage: null }
];

export const mockDepartmentOptions = [
  "Ingénierie",
  "Informatique",
  "Mathématiques"
];

export const mockPresenceTrendDepartment = [
  { label: "Jan", value: 84 },
  { label: "Fev", value: 86 },
  { label: "Mar", value: 89 },
  { label: "Avr", value: 87 },
  { label: "Mai", value: 90 },
  { label: "Jun", value: 92 }
];

export const mockPresenceByPromotion = [
  { id: 1, label: "L1 Info", value: 81 },
  { id: 2, label: "L2 Maths", value: 87 },
  { id: 3, label: "L3 Info", value: 91 },
  { id: 4, label: "M1 IA", value: 89 }
];

export const mockPresenceByMatiere = [
  { id: 1, label: "Maths", value: 90 },
  { id: 2, label: "Web", value: 83 },
  { id: 3, label: "BDD", value: 88 },
  { id: 4, label: "Algo", value: 86 }
];

export const mockPromotions = [
  { id: 1, nom: "L1 Informatique", filiere: "Informatique", effectif: 140, seuilAlerte: 20, responsable: "Amara Okonkwo" },
  { id: 2, nom: "L2 Mathématiques", filiere: "Mathématiques", effectif: 120, seuilAlerte: 18, responsable: "Amara Okonkwo" },
  { id: 3, nom: "L3 Informatique", filiere: "Informatique", effectif: 95, seuilAlerte: 15, responsable: "Amara Okonkwo" }
];

export const mockCoursGestion = [
  { id: 1, nom: "Mathématiques Appliquées", promotion: "L3 Informatique", professeur: "Sofia Andersson", salle: "Salle A101", horaire: "Lundi 09:00 - 11:00" },
  { id: 2, nom: "Développement Web", promotion: "L3 Informatique", professeur: "Marc Dupont", salle: "Salle B202", horaire: "Mercredi 14:00 - 16:00" },
  { id: 3, nom: "Statistiques", promotion: "L2 Mathématiques", professeur: "Sofia Andersson", salle: "Salle A102", horaire: "Mardi 11:00 - 13:00" }
];

export const mockStudentsManagement = [
  { id: 1, nom: "Karim Benali", numeroEtudiant: "E2023001", promotion: "L3 Informatique", statut: "Actif" },
  { id: 2, nom: "Marie Dubois", numeroEtudiant: "E2023002", promotion: "L3 Informatique", statut: "Actif" },
  { id: 3, nom: "Jean-Luc Moreau", numeroEtudiant: "E2022015", promotion: "L3 Informatique", statut: "Sous surveillance" }
];

export const mockSystemSettings = {
  id: 1,
  nom_etablissement: "Institut Demo",
  seuil_absences: 3,
  tolerance_retard_minutes_defaut: 10,
  contact_support_email: null,
  updated_at: "2026-07-10T09:00:00"
};

export const mockSubjects = [
  { id: 1, nom: "Mathématiques Appliquées" },
  { id: 2, nom: "Développement Web" },
  { id: 3, nom: "Base de Données" },
  { id: 4, nom: "Statistiques" }
];

export const mockFilieres = [
  { id: 1, nom: "Big Data" },
  { id: 2, nom: "Intelligence Artificielle" }
];

export const mockRooms = [
  { id: 1, nom: "Salle A101" },
  { id: 2, nom: "Salle A102" },
  { id: 3, nom: "Salle B202" },
  { id: 4, nom: "Salle C303" }
];

export const mockReportTemplates = [
  { id: 1, nom: "Rapport hebdomadaire", description: "Synthèse globale du département avec tendances et alertes." },
  { id: 2, nom: "Rapport par promotion", description: "Comparaison détaillée des promotions et filières." },
  { id: 3, nom: "Rapport étudiant", description: "Historique complet de présence d'un étudiant." }
];
