export const employeesSeed = [
  { id: "harry", name: "Harry Bender", role: "Head of Design", pct: 70 },
  { id: "katy", name: "Katy Fuller", role: "Fullstack Engineer", pct: 45 },
  { id: "jon", name: "Jonathan Kelly", role: "Mobile Lead", pct: 55 },
  { id: "sarah", name: "Sarah Page", role: "Network Engineer", pct: 40 },
  { id: "erica", name: "Erica Wyatt", role: "Head of Design", pct: 65 },
];


export const profilesById = {
  harry: {
    name: "Harry Bender",
    role: "Head of Design",
    info: [
      { k: "Birthday", v: "26 September 1998", icon: "cal" },
      { k: "Phone number", v: "+63 900 000 000", icon: "phone" },
      { k: "E-Mail", v: "harrybender@email.com", icon: "mail" },
      { k: "Citizenship", v: "Philippines", icon: "id" },
      { k: "City", v: "Singapore", icon: "pin" },
      { k: "Address", v: "—", icon: "pin" },
    ],
    docs: [
      { name: "Contract", size: "23 mb", type: "word", tag: "W" },
      { name: "Resume", size: "76 mb", type: "ppt", tag: "P" },
    ],
    stats: [
      { label: "Business trips", value: "58 days", fill: 72, theme: "light" },
      { label: "Sickness", value: "24 days", fill: 35, theme: "dark" },
    ],
  },

  katy: {
    name: "Katy Fuller",
    role: "Fullstack Engineer",
    info: [
      { k: "Birthday", v: "26 September 1998", icon: "cal" },
      { k: "Phone number", v: "+33 1 70 36 39 50", icon: "phone" },
      { k: "E-Mail", v: "amelielaurent88@gmail.com", icon: "mail" },
      { k: "Citizenship", v: "France", icon: "id" },
      { k: "City", v: "Paris", icon: "pin" },
      { k: "Address", v: "95700 Roissy-en-France", icon: "pin" },
    ],
    docs: [
      { name: "Contract", size: "23 mb", type: "word", tag: "W" },
      { name: "Resume", size: "76 mb", type: "ppt", tag: "P" },
    ],
    stats: [
      { label: "Business trips", value: "58 days", fill: 72, theme: "light" },
      { label: "Sickness", value: "24 days", fill: 35, theme: "dark" },
    ],
  },

  jon: {
    name: "Jonathan Kelly",
    role: "Mobile Lead",
    info: [
      { k: "Birthday", v: "—", icon: "cal" },
      { k: "Phone number", v: "+1 555 000 000", icon: "phone" },
      { k: "E-Mail", v: "jonathan@email.com", icon: "mail" },
      { k: "Citizenship", v: "USA", icon: "id" },
      { k: "City", v: "New York", icon: "pin" },
      { k: "Address", v: "—", icon: "pin" },
    ],
    docs: [
      { name: "Contract", size: "23 mb", type: "word", tag: "W" },
      { name: "Resume", size: "76 mb", type: "ppt", tag: "P" },
    ],
    stats: [
      { label: "Business trips", value: "12 days", fill: 30, theme: "light" },
      { label: "Sickness", value: "3 days", fill: 12, theme: "dark" },
    ],
  },

  sarah: {
    name: "Sarah Page",
    role: "Network Engineer",
    info: [
      { k: "Birthday", v: "—", icon: "cal" },
      { k: "Phone number", v: "+44 20 0000 0000", icon: "phone" },
      { k: "E-Mail", v: "sarah@email.com", icon: "mail" },
      { k: "Citizenship", v: "UK", icon: "id" },
      { k: "City", v: "London", icon: "pin" },
      { k: "Address", v: "—", icon: "pin" },
    ],
    docs: [
      { name: "Contract", size: "23 mb", type: "word", tag: "W" },
      { name: "Resume", size: "76 mb", type: "ppt", tag: "P" },
    ],
    stats: [
      { label: "Business trips", value: "22 days", fill: 44, theme: "light" },
      { label: "Sickness", value: "6 days", fill: 18, theme: "dark" },
    ],
  },

  erica: {
    name: "Erica Wyatt",
    role: "Head of Design",
    info: [
      { k: "Birthday", v: "—", icon: "cal" },
      { k: "Phone number", v: "+61 2 0000 0000", icon: "phone" },
      { k: "E-Mail", v: "erica@email.com", icon: "mail" },
      { k: "Citizenship", v: "Australia", icon: "id" },
      { k: "City", v: "Sydney", icon: "pin" },
      { k: "Address", v: "—", icon: "pin" },
    ],
    docs: [
      { name: "Contract", size: "23 mb", type: "word", tag: "W" },
      { name: "Resume", size: "76 mb", type: "ppt", tag: "P" },
    ],
    stats: [
      { label: "Business trips", value: "40 days", fill: 60, theme: "light" },
      { label: "Sickness", value: "10 days", fill: 25, theme: "dark" },
    ],
  },
};

export const profileSeed = {
  name: "Amélie Laurent",
  role: "UX Designer",
  info: [
    { k: "Birthday", v: "26 September 1998", icon: "cal" },
    { k: "Phone number", v: "+33 1 70 36 39 50", icon: "phone" },
    { k: "E-Mail", v: "amelielaurent88@gmail.com", icon: "mail" },
    { k: "Citizenship", v: "France", icon: "id" },
    { k: "City", v: "Paris", icon: "pin" },
    { k: "Adress", v: "95700 Roissy-en-France", icon: "pin" },
  ],
  docs: [
    { type: "word", name: "Contract", size: "23 mb", tag: "W" },
    { type: "ppt", name: "Resume", size: "76 mb", tag: "P" },
  ],
  stats: [
    { label: "Business trips", value: "58 days", fill: 70, theme: "yellow" },
    { label: "Sickness", value: "24 days", fill: 32, theme: "dark" },
  ],
};
