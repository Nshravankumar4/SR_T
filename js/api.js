/**
 * api.js - Data Layer Bridge
 * Contains ONLY the exact real records from your Shinex Excel sheet.
 * No dummy or fake data.
 */

const REAL_SHINEX_TRANSPORT = [
    {
        "id":  "TR-1",
        "slNo":  1,
        "lrNo":  "162",
        "dcNo":  "894/1124",
        "date":  "20-04-2026",
        "vehicleNumber":  "UP25FT5066",
        "fromCity":  "Medchal",
        "toCity":  "Luknow",
        "quantity":  "35MT",
        "mTax":  "",
        "amount":  "149500",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "Two days halting at loading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-2",
        "slNo":  2,
        "lrNo":  "204",
        "dcNo":  "",
        "date":  "20-04-2026",
        "vehicleNumber":  "UP70GT0273",
        "fromCity":  "Medchal",
        "toCity":  "Raebareli",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  "10000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "Two days halting Truck cancel",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-3",
        "slNo":  3,
        "lrNo":  "163",
        "dcNo":  "",
        "date":  "22-04-2026",
        "vehicleNumber":  "JH04Z2686",
        "fromCity":  "Medchal",
        "toCity":  "Ranchi",
        "quantity":  "12MT",
        "mTax":  "",
        "amount":  "79000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-4",
        "slNo":  4,
        "lrNo":  "164/165",
        "dcNo":  "1125/26/27",
        "date":  "25-04-2026",
        "vehicleNumber":  "AP39TV0267",
        "fromCity":  "Medchal",
        "toCity":  "Raebareli",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "134000",
        "paid":  "Paid",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-5",
        "slNo":  5,
        "lrNo":  "166",
        "dcNo":  "1128",
        "date":  "28-04-2026",
        "vehicleNumber":  "CG04LR6399",
        "fromCity":  "Medchal",
        "toCity":  "Raebareli",
        "quantity":  "31MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "144150",
        "paid":  "Paid",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-6",
        "slNo":  6,
        "lrNo":  "167",
        "dcNo":  "900/1129",
        "date":  "29-04-2026",
        "vehicleNumber":  "AP39WM8829",
        "fromCity":  "Medchal",
        "toCity":  "Raipur",
        "quantity":  "35MT",
        "mTax":  "",
        "amount":  "92750",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-7",
        "slNo":  7,
        "lrNo":  "168",
        "dcNo":  "1130",
        "date":  "29-04-2026",
        "vehicleNumber":  "HP12G7348",
        "fromCity":  "Medchal",
        "toCity":  "Bilaspur",
        "quantity":  "20MT",
        "mTax":  "",
        "amount":  "170000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "One day halting at loading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-8",
        "slNo":  8,
        "lrNo":  "205",
        "dcNo":  "356",
        "date":  "04-05-2026",
        "vehicleNumber":  "AP39UP9666",
        "fromCity":  "Parkala",
        "toCity":  "Medchal",
        "quantity":  "35MT",
        "mTax":  "7200",
        "amount":  "85800",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "5 Days halting at unloading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-9",
        "slNo":  9,
        "lrNo":  "206",
        "dcNo":  "48",
        "date":  "04-05-2026",
        "vehicleNumber":  "TS07TC2355",
        "fromCity":  "Huzurbad",
        "toCity":  "Medchal",
        "quantity":  "30MT",
        "mTax":  "4800",
        "amount":  "59800",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "5 Days halting at unloading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-10",
        "slNo":  10,
        "lrNo":  "169",
        "dcNo":  "1402",
        "date":  "05-05-2026",
        "vehicleNumber":  "HR46G4209",
        "fromCity":  "Medchal",
        "toCity":  "Kota",
        "quantity":  "6MT",
        "mTax":  "",
        "amount":  "58000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-11",
        "slNo":  11,
        "lrNo":  "170/171",
        "dcNo":  "1131/32",
        "date":  "05-05-2026",
        "vehicleNumber":  "HP12G7621",
        "fromCity":  "Medchal",
        "toCity":  "Hamipur/Mandi",
        "quantity":  "18MT",
        "mTax":  "",
        "amount":  "170000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "One day halting at loading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-12",
        "slNo":  12,
        "lrNo":  "172",
        "dcNo":  "1133",
        "date":  "08-05-2026",
        "vehicleNumber":  "HP12S8136",
        "fromCity":  "Medchal",
        "toCity":  "Haminpur",
        "quantity":  "18MT",
        "mTax":  "",
        "amount":  "157000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "One day halting at loading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-13",
        "slNo":  13,
        "lrNo":  "169",
        "dcNo":  "1402",
        "date":  "08-05-2026",
        "vehicleNumber":  "AP39U3006",
        "fromCity":  "Medchal",
        "toCity":  "Barabanki",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "150000",
        "paid":  "Paid",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-14",
        "slNo":  14,
        "lrNo":  "7915",
        "dcNo":  "",
        "date":  "09-05-2026",
        "vehicleNumber":  "GJ13AX4948",
        "fromCity":  "Medchal",
        "toCity":  "Aslali",
        "quantity":  "12MT",
        "mTax":  "",
        "amount":  "65000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "U\u0026S Transport truck place",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-15",
        "slNo":  15,
        "lrNo":  "174",
        "dcNo":  "1135",
        "date":  "10-05-2026",
        "vehicleNumber":  "RJ09GB9317",
        "fromCity":  "Medchal",
        "toCity":  "Indore",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  "99000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-16",
        "slNo":  16,
        "lrNo":  "175",
        "dcNo":  "1404",
        "date":  "11-05-2026",
        "vehicleNumber":  "RJ37GA6308",
        "fromCity":  "Armoor",
        "toCity":  "Jaipur",
        "quantity":  "35MT",
        "mTax":  "",
        "amount":  "175000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-17",
        "slNo":  17,
        "lrNo":  "176",
        "dcNo":  "1137",
        "date":  "14-05-2026",
        "vehicleNumber":  "AP39WR0489",
        "fromCity":  "Medchal",
        "toCity":  "Purnia",
        "quantity":  "18MT",
        "mTax":  "",
        "amount":  "150000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-18",
        "slNo":  18,
        "lrNo":  "177",
        "dcNo":  "1138",
        "date":  "17-05-2026",
        "vehicleNumber":  "CG04MT3934",
        "fromCity":  "Medchal",
        "toCity":  "Raipur",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "87000",
        "paid":  "Paid",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-19",
        "slNo":  19,
        "lrNo":  "180",
        "dcNo":  "1414",
        "date":  "26-05-2026",
        "vehicleNumber":  "AP39UC3929",
        "fromCity":  "Medchal",
        "toCity":  "Jabalpur",
        "quantity":  "25MT",
        "mTax":  "",
        "amount":  "89000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-20",
        "slNo":  20,
        "lrNo":  "181",
        "dcNo":  "1144",
        "date":  "28-05-2026",
        "vehicleNumber":  "CG08AV5297",
        "fromCity":  "Huzurbad",
        "toCity":  "Raipur",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "87000",
        "paid":  "55,000",
        "balance":  "32000",
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-21",
        "slNo":  21,
        "lrNo":  "182",
        "dcNo":  "1145",
        "date":  "30-05-2026",
        "vehicleNumber":  "UP62BT2640",
        "fromCity":  "Medchal",
        "toCity":  "Nawada",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "150000",
        "paid":  "Paid",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-22",
        "slNo":  22,
        "lrNo":  "183",
        "dcNo":  "1146",
        "date":  "02-06-2026",
        "vehicleNumber":  "CG08AS2072",
        "fromCity":  "Medchal",
        "toCity":  "Raipur",
        "quantity":  "12MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "40000",
        "paid":  "Paid",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-23",
        "slNo":  23,
        "lrNo":  "184",
        "dcNo":  "1147",
        "date":  "02-06-2026",
        "vehicleNumber":  "CG04PP8909",
        "fromCity":  "Medchal",
        "toCity":  "Raipur",
        "quantity":  "04MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "15000",
        "paid":  "Paid",
        "balance":  0,
        "note":  "",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-24",
        "slNo":  24,
        "lrNo":  "185",
        "dcNo":  "1148",
        "date":  "02-06-2026",
        "vehicleNumber":  "AP39UD3564",
        "fromCity":  "Medchal",
        "toCity":  "Harnut",
        "quantity":  "35MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "171500",
        "paid":  "50,000",
        "balance":  "121500",
        "note":  "29 bags shortage",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-25",
        "slNo":  25,
        "lrNo":  "186",
        "dcNo":  "1149",
        "date":  "02-06-2026",
        "vehicleNumber":  "TS07UG2577",
        "fromCity":  "Huzurbad",
        "toCity":  "Raipur",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "85000",
        "paid":  "65,000",
        "balance":  "20000",
        "note":  "One day halting at loading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-26",
        "slNo":  26,
        "lrNo":  "187",
        "dcNo":  "1262/4526",
        "date":  "10-06-2026",
        "vehicleNumber":  "TG15T6666",
        "fromCity":  "Medchal",
        "toCity":  "Harnut",
        "quantity":  "35MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "150000",
        "paid":  "Paid",
        "balance":  0,
        "note":  "Two days halting at loading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-27",
        "slNo":  27,
        "lrNo":  "188/189",
        "dcNo":  "1272/1273",
        "date":  "17-06-2026",
        "vehicleNumber":  "TS15UE1122",
        "fromCity":  "Medchal/huzurabad",
        "toCity":  "Raipur/Nawada",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  0,
        "toPay":  "160000",
        "paid":  "50,000",
        "balance":  "110000",
        "note":  "Three days halting at loading point",
        "section":  "April 2026 to August 2026"
    },
    {
        "id":  "TR-S2-1",
        "slNo":  1,
        "lrNo":  "",
        "dcNo":  "998",
        "date":  "22-08-2026",
        "vehicleNumber":  "AP39UD3564",
        "fromCity":  "Lucknow",
        "toCity":  "Medchal",
        "quantity":  "21MT",
        "mTax":  "",
        "amount":  "90000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "one days halting at Unloading point",
        "section":  "NEW August to September 2026"
    },
    {
        "id":  "TR-S2-2",
        "slNo":  2,
        "lrNo":  "",
        "dcNo":  "540",
        "date":  "03-09-2026",
        "vehicleNumber":  "TG15T6666",
        "fromCity":  "Raipur(CG)",
        "toCity":  "Medchal",
        "quantity":  "35MT",
        "mTax":  "",
        "amount":  "110250",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "one days halting at Unloading point",
        "section":  "NEW August to September 2026"
    },
    {
        "id":  "TR-S2-3",
        "slNo":  3,
        "lrNo":  "190",
        "dcNo":  "1416",
        "date":  "10-09-2026",
        "vehicleNumber":  "TG15T6666",
        "fromCity":  "Medchal",
        "toCity":  "CoockBihar",
        "quantity":  "35MT",
        "mTax":  "",
        "amount":  "231000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "halting at 2 days loading pnt \u00262 days  Unloading pnt",
        "section":  "NEW August to September 2026"
    },
    {
        "id":  "TR-S2-4",
        "slNo":  4,
        "lrNo":  "191/192",
        "dcNo":  "1274/75/76/77/78/79",
        "date":  "12-09-2026",
        "vehicleNumber":  "RJ14GN7169",
        "fromCity":  "Medchal",
        "toCity":  "Raiganj \u0026 Dalkohala",
        "quantity":  "30MT",
        "mTax":  "",
        "amount":  "165000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "NEW August to September 2026"
    },
    {
        "id":  "TR-S2-5",
        "slNo":  5,
        "lrNo":  "193/194",
        "dcNo":  "1280/1281",
        "date":  "16-09-2026",
        "vehicleNumber":  "UP38T6479",
        "fromCity":  "Medchal",
        "toCity":  "Sabdhan \u0026 kaliachak",
        "quantity":  "25MT",
        "mTax":  "",
        "amount":  "150000",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "one days halting at loading point",
        "section":  "NEW August to September 2026"
    },
    {
        "id":  "TR-S2-6",
        "slNo":  6,
        "lrNo":  "209",
        "dcNo":  "1417",
        "date":  "19-09-2026",
        "vehicleNumber":  "TS05UF1719",
        "fromCity":  "Medchal",
        "toCity":  "Murshidabad",
        "quantity":  "35",
        "mTax":  "",
        "amount":  "157500",
        "toPay":  0,
        "paid":  "",
        "balance":  0,
        "note":  "",
        "section":  "NEW August to September 2026"
    }
];

const REAL_SHINEX_ADVANCES = [
    {
        "id":  "ADV-S1-37",
        "date":  "19-04-2026",
        "amount":  0,
        "note":  "1,20,000 March 2026 balance",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-38",
        "date":  "20-04-2026",
        "amount":  "500000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-39",
        "date":  "04-05-2026",
        "amount":  "200000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-40",
        "date":  "14-05-2026",
        "amount":  "500000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-41",
        "date":  "25-05-2026",
        "amount":  "50000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-42",
        "date":  "07-06-2026",
        "amount":  "100000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-43",
        "date":  "17-06-2026",
        "amount":  "100000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-44",
        "date":  "23-07-2026",
        "amount":  "100000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-45",
        "date":  "05-08--2026",
        "amount":  "50000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-46",
        "date":  "14-08-2026",
        "amount":  "100000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-47",
        "date":  "18-08-2026",
        "amount":  "100000",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-48",
        "date":  "20-08-2026",
        "amount":  "35000",
        "note":  "Note:29 Bags Shortage at Janta agro Bihar 1044Kgs",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S1-49",
        "date":  "23-08-2026",
        "amount":  "48350",
        "note":  "",
        "section":  "Section 1"
    },
    {
        "id":  "ADV-S2-70",
        "date":  "29-08-2026",
        "amount":  "50000",
        "note":  "",
        "section":  "Section 2"
    },
    {
        "id":  "ADV-S2-71",
        "date":  "10-09-2026",
        "amount":  "400000",
        "note":  "",
        "section":  "Section 2"
    }
];



// Row ADV-S1-37 is an informational March 2026 note in Excel, amount is 0
if (REAL_SHINEX_ADVANCES.length > 0 && REAL_SHINEX_ADVANCES[0].id === 'ADV-S1-37') {
  REAL_SHINEX_ADVANCES[0].amount = 0;
  REAL_SHINEX_ADVANCES[0].description = "March 2026 balance note";
}

// Global section helpers
window.normalizeSection = function(secStr) {
  if (!secStr) return 'Section 2';
  const s = String(secStr).trim();
  const lower = s.toLowerCase();
  if (lower.includes('section 1') || lower.includes('april') || lower === 's1') return 'Section 1';
  const m = lower.match(/section\s*(\d+)/i);
  if (m) return 'Section ' + m[1];
  if (lower.includes('s2') || lower.includes('new') || lower.includes('august') || lower.includes('september')) return 'Section 2';
  return s;
};

window.getTripSection = function(r) {
  if (!r) return 'Section 2';
  if (r.section) return window.normalizeSection(r.section);
  if (/^TR-([1-9]|1[0-9]|2[0-7])$/.test(String(r.id))) return 'Section 1';
  if (String(r.id).includes('S2')) return 'Section 2';
  if (String(r.id).includes('S3')) return 'Section 3';
  return 'Section 2';
};

window.getAdvanceSection = function(a) {
  if (!a) return 'Section 2';
  if (a.section) return window.normalizeSection(a.section);
  if (a.date && (a.date.startsWith("29-08-2026") || a.date.startsWith("10-09-2026"))) return 'Section 2';
  if (String(a.id).includes('S2')) return 'Section 2';
  if (String(a.id).includes('S3')) return 'Section 3';
  if (String(a.id).includes('S1')) return 'Section 1';
  if (a.date && (a.date.includes('-04-') || a.date.includes('-05-') || a.date.includes('-06-') || a.date.includes('-07-') || a.date.includes('-08-2026'))) {
    if (!a.date.startsWith("29-08-2026")) return 'Section 1';
  }
  return 'Section 1';
};

window.isSection1Trip = function(r) {
  return window.getTripSection(r) === 'Section 1';
};

window.isSection2Trip = function(r) {
  return window.getTripSection(r) === 'Section 2';
};

window.isSection1Advance = function(a) {
  return window.getAdvanceSection(a) === 'Section 1';
};

window.isSection2Advance = function(a) {
  return window.getAdvanceSection(a) === 'Section 2';
};

window.getLatestTripDate = function(trips, defaultDate = '16-09-2026') {
  if (!trips || trips.length === 0) return defaultDate;

  // Filter trips that have a non-empty date
  const valid = trips.filter(r => r && r.date && String(r.date).trim());
  if (valid.length === 0) return defaultDate;

  function parseDateToTs(dStr) {
    const s = String(dStr).trim();
    let day, month, year;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      [year, month, day] = s.split('-');
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      [day, month, year] = s.split('-');
    } else {
      return { ts: 0, str: s };
    }
    const d = new Date(`${year}-${month}-${day}`);
    const ts = isNaN(d.getTime()) ? 0 : d.getTime();
    return { ts, str: `${day}-${month}-${year}` };
  }

  const items = valid.map(r => parseDateToTs(r.date));
  items.sort((a, b) => a.ts - b.ts);
  const latest = items[items.length - 1];
  return latest.str || defaultDate;
};

window.formatDateForInput = function(dStr) {
  if (!dStr) return '';
  const s = String(dStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    const year = m[3];
    return `${year}-${month}-${day}`;
  }
  return s;
};

window.formatDateForDisplay = function(dStr) {
  if (!dStr) return '';
  const s = String(dStr).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const year = m[1];
    const month = m[2].padStart(2, '0');
    const day = m[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }
  return s;
};

// Cross-Tab Real-Time Sync Channel
window.shinexSyncChannel = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('shinex_sync_channel')
  : null;

window.broadcastDataChange = function(type, data = {}) {
  try {
    if (window.shinexSyncChannel) {
      window.shinexSyncChannel.postMessage({
        type: type,
        data: data,
        timestamp: Date.now()
      });
    }
  } catch (e) {
    console.warn("BroadcastChannel error:", e);
  }
};

const API_CONFIG = {
  webAppUrl: localStorage.getItem('transport_api_url') || '',
  storageKeyTransport: 'transport_records_shinex_v7',
  storageKeyAdvances: 'transport_advances_shinex_v7',
  storageKeyOpeningBal: 'transport_opening_bal_shinex_v7',
  storageKeySections: 'transport_sections_shinex_v1'
};

const ApiService = {
  getApiUrl() {
    return localStorage.getItem('transport_api_url') || '';
  },

  setApiUrl(url) {
    localStorage.setItem('transport_api_url', url.trim());
    API_CONFIG.webAppUrl = url.trim();
    window.broadcastDataChange('settings_updated');
  },

  isCloudConnected() {
    return Boolean(this.getApiUrl());
  },

  // Dynamic Section Management
  getSections() {
    const raw = localStorage.getItem(API_CONFIG.storageKeySections);
    let sections = [];
    if (raw) {
      try { sections = JSON.parse(raw); } catch (e) {}
    }
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      sections = [
        { id: 'section-1', name: 'Section 1', title: 'April 2026 to August 2026', num: 1, isArchive: true },
        { id: 'section-2', name: 'Section 2', title: 'NEW August – September 2026', num: 2, isArchive: false }
      ];
      localStorage.setItem(API_CONFIG.storageKeySections, JSON.stringify(sections));
    }

    // Auto-discover any new sections present in existing trips or advances
    const trips = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyTransport) || '[]');
    trips.forEach(t => {
      const secName = window.getTripSection(t);
      if (secName && !sections.find(s => s.name.toLowerCase() === secName.toLowerCase())) {
        const numMatch = secName.match(/\d+/);
        const num = numMatch ? Number(numMatch[0]) : (sections.length + 1);
        sections.push({
          id: 'section-' + num,
          name: secName,
          title: 'NEW',
          num: num,
          isArchive: false
        });
      }
    });

    sections.sort((a, b) => (Number(a.num) || 0) - (Number(b.num) || 0));
    return sections;
  },

  addSection(name, title = 'NEW') {
    const sections = this.getSections();
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Section name cannot be empty.');
    if (sections.some(s => s.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`Section "${cleanName}" already exists!`);
    }
    const numMatch = cleanName.match(/\d+/);
    const num = numMatch ? Number(numMatch[0]) : (sections.length + 1);
    const newSec = {
      id: 'section-' + Date.now(),
      name: cleanName,
      title: title || 'NEW',
      num: num,
      isArchive: false,
      createdAt: new Date().toISOString()
    };
    sections.push(newSec);
    sections.sort((a, b) => (Number(a.num) || 0) - (Number(b.num) || 0));
    localStorage.setItem(API_CONFIG.storageKeySections, JSON.stringify(sections));
    window.broadcastDataChange('sections_updated', { section: newSec });
    return newSec;
  },

  updateSection(oldName, newName, newTitle) {
    const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
    if (!user) {
      throw new Error('Please log in to edit sections!');
    }
    const cleanOld = window.normalizeSection(oldName);
    const cleanNew = (newName || '').trim();
    if (!cleanNew) throw new Error('Section name cannot be empty.');
    let sections = this.getSections();
    const idx = sections.findIndex(s => s.name.toLowerCase() === cleanOld.toLowerCase());
    if (idx === -1) throw new Error(`Section "${oldName}" not found.`);

    if (cleanOld === 'Section 1' || cleanOld === 'Section 2') {
      sections[idx].title = (newTitle || sections[idx].title || '').trim();
    } else {
      sections[idx].name = cleanNew;
      if (newTitle !== undefined) sections[idx].title = (newTitle || '').trim();
    }
    localStorage.setItem(API_CONFIG.storageKeySections, JSON.stringify(sections));

    // Cascade rename to trips and advances
    if (cleanOld.toLowerCase() !== cleanNew.toLowerCase()) {
      const trips = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyTransport) || '[]');
      trips.forEach(t => {
        if (window.getTripSection(t).toLowerCase() === cleanOld.toLowerCase()) {
          t.section = cleanNew;
        }
      });
      localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(trips));

      const advs = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyAdvances) || '[]');
      advs.forEach(a => {
        if (window.getAdvanceSection(a).toLowerCase() === cleanOld.toLowerCase()) {
          a.section = cleanNew;
        }
      });
      localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(advs));
    }
    window.broadcastDataChange('sections_updated', { section: sections[idx] });
    return sections[idx];
  },

  deleteSection(sectionName) {
    const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
    if (!user) {
      throw new Error('Please log in to delete a section.');
    }
    const normalized = window.normalizeSection(sectionName);
    if (normalized === 'Section 1' || normalized === 'Section 2') {
      throw new Error('Default Section 1 and Section 2 cannot be deleted.');
    }
    let sections = this.getSections();
    sections = sections.filter(s => s.name.toLowerCase() !== normalized.toLowerCase());
    localStorage.setItem(API_CONFIG.storageKeySections, JSON.stringify(sections));
    window.broadcastDataChange('sections_updated', { sectionName });
    return true;
  },

  // Initialize storage with exact real Shinex data
  initLocalData() {
    let storedT = null;
    let storedA = null;
    try { storedT = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyTransport)); } catch(e) {}
    try { storedA = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyAdvances)); } catch(e) {}

    if (!storedT || !Array.isArray(storedT) || storedT.length === 0) {
      localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(REAL_SHINEX_TRANSPORT));
    }
    if (!storedA || !Array.isArray(storedA) || storedA.length === 0) {
      localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(REAL_SHINEX_ADVANCES));
    }
    if (!localStorage.getItem(API_CONFIG.storageKeyOpeningBal)) {
      localStorage.setItem(API_CONFIG.storageKeyOpeningBal, '120000'); // March 2026 balance from your Excel
    }
    this.getSections(); // Ensures sections are initialized
  },

  // Reset function to restore the exact 33 Shinex records and 15 advances
  resetToExactExcelData() {
    localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(REAL_SHINEX_TRANSPORT));
    localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(REAL_SHINEX_ADVANCES));
    localStorage.setItem(API_CONFIG.storageKeyOpeningBal, '120000');
    localStorage.setItem(API_CONFIG.storageKeySections, JSON.stringify([
      { id: 'section-1', name: 'Section 1', title: 'April 2026 to August 2026', num: 1, isArchive: true },
      { id: 'section-2', name: 'Section 2', title: 'NEW August – September 2026', num: 2, isArchive: false }
    ]));
    window.broadcastDataChange('data_reset');
  },

  getOpeningBalance() {
    return Number(localStorage.getItem(API_CONFIG.storageKeyOpeningBal)) || 0;
  },

  setOpeningBalance(amount) {
    localStorage.setItem(API_CONFIG.storageKeyOpeningBal, String(Number(amount) || 0));
    window.broadcastDataChange('opening_balance_updated', { amount: Number(amount) || 0 });
  },

  normalizeTransportRecord(t) {
    if (!t) return null;
    const toPay = Number(t.toPay !== undefined ? t.toPay : t.ToPay) || 0;
    const paidRaw = t.paid !== undefined ? t.paid : t.Paid;
    const paid = (paidRaw === 'Paid' || String(paidRaw).toLowerCase() === 'paid') ? 'Paid' : (Number(paidRaw) || 0);
    const balance = (paid === 'Paid') ? 0 : (Number(t.balance !== undefined ? t.balance : t.Balance) || Math.max(0, toPay - (Number(paid) || 0)));
    let status = t.status || t.Status;
    if (!status) {
      if (balance <= 0 && toPay > 0) status = 'Paid';
      else if (paid > 0 && balance > 0) status = 'Partially Paid';
      else status = 'Pending';
    }
    const id = String(t.id || t.ID || ('TR-' + Date.now()));
    const section = window.normalizeSection(t.section || t.Section || (id.includes('S1') ? 'Section 1' : 'Section 2'));

    return {
      id,
      slNo: Number(t.slNo !== undefined ? t.slNo : t.SL_NO) || 1,
      lrNo: String(t.lrNo !== undefined ? t.lrNo : (t.LR_NO || '')),
      dcNo: String(t.dcNo !== undefined ? t.dcNo : (t.DC_NO || '')),
      date: window.formatDateForDisplay(t.date || t.Date || ''),
      vehicleNumber: String(t.vehicleNumber !== undefined ? t.vehicleNumber : (t.Vehicle_Number || '')).toUpperCase(),
      fromCity: String(t.fromCity !== undefined ? t.fromCity : (t.From_City || '')),
      toCity: String(t.toCity !== undefined ? t.toCity : (t.To_City || '')),
      quantity: String(t.quantity !== undefined ? t.quantity : (t.Quantity || '')),
      mTax: String(t.mTax !== undefined ? t.mTax : (t.M_TAX || '')),
      amount: Number(t.amount !== undefined ? t.amount : t.Amount) || 0,
      toPay,
      paid,
      balance,
      status,
      note: String(t.note !== undefined ? t.note : (t.Note || '')),
      section,
      createdBy: String(t.createdBy || t.Created_By || 'User'),
      createdAt: t.createdAt || t.Created_At || new Date().toISOString()
    };
  },

  normalizeAdvanceRecord(a) {
    if (!a) return null;
    const id = String(a.id || a.ID || ('ADV-' + Date.now()));
    const section = window.normalizeSection(a.section || a.Section || window.getAdvanceSection(a));
    return {
      id,
      date: window.formatDateForDisplay(a.date || a.Date || ''),
      amount: Number(a.amount !== undefined ? a.amount : a.Amount) || 0,
      description: String(a.description || a.Description || a.note || a.Note || 'Advance Payment'),
      note: String(a.note || a.Note || a.description || a.Description || ''),
      reference: String(a.reference || a.Reference || ''),
      section,
      createdBy: String(a.createdBy || a.Created_By || 'Admin'),
      createdAt: a.createdAt || a.Created_At || new Date().toISOString()
    };
  },

  // Fetch all transport and advance records
  async fetchAll() {
    const url = this.getApiUrl();
    if (url) {
      try {
        const response = await fetch(`${url}?action=getAll`, { method: 'GET' });
        const result = await response.json();
        if (result.success && result.data) {
          const rawTrips = Array.isArray(result.data.transport) ? result.data.transport : [];
          const rawAdvs = Array.isArray(result.data.advances) ? result.data.advances : [];
          const cleanTrips = rawTrips.map(t => this.normalizeTransportRecord(t)).filter(Boolean);
          const cleanAdvs = rawAdvs.map(a => this.normalizeAdvanceRecord(a)).filter(Boolean);

          if (cleanTrips.length > 0 || cleanAdvs.length > 0) {
            localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(cleanTrips));
            localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(cleanAdvs));
            return {
              transport: cleanTrips,
              advances: cleanAdvs,
              source: 'cloud'
            };
          }
        }
      } catch (err) {
        console.warn("Cloud fetch failed, using local storage fallback:", err);
      }
    }

    // Local fallback
    this.initLocalData();
    let transport = [];
    let advances = [];
    try { transport = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyTransport) || '[]'); } catch(e) {}
    try { advances = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyAdvances) || '[]'); } catch(e) {}

    if (!transport || !Array.isArray(transport) || transport.length === 0) {
      transport = REAL_SHINEX_TRANSPORT;
      localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(REAL_SHINEX_TRANSPORT));
    }
    if (!advances || !Array.isArray(advances) || advances.length === 0) {
      advances = REAL_SHINEX_ADVANCES;
      localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(REAL_SHINEX_ADVANCES));
    }
    return { transport, advances, source: 'local' };
  },

  // Save or update transport record
  async saveTransport(record) {
    const isEdit = Boolean(record.id);
    const url = this.getApiUrl();

    // Ensure numeric calculations
    const toPay = Number(record.toPay) || 0;
    const paid = (record.paid === 'Paid' || String(record.paid).toLowerCase() === 'paid') ? 'Paid' : (Number(record.paid) || 0);
    const balance = (paid === 'Paid') ? 0 : Math.max(0, toPay - (Number(paid) || 0));
    let status = record.status || 'Pending';
    if (balance <= 0 && toPay > 0) status = 'Paid';
    else if (paid > 0 && balance > 0) status = 'Partially Paid';

    const section = window.normalizeSection(record.section || 'Section 2');
    const id = record.id || ('TR-' + Date.now());

    const cleanRecord = {
      ...record,
      id,
      section,
      date: window.formatDateForDisplay(record.date),
      toPay,
      paid,
      balance,
      status,
      amount: Number(record.amount) || 0,
      createdAt: record.createdAt || new Date().toISOString()
    };

    // Save locally
    const list = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyTransport) || '[]');
    if (isEdit) {
      const idx = list.findIndex(item => item.id === cleanRecord.id);
      if (idx !== -1) list[idx] = cleanRecord;
      else list.push(cleanRecord);
    } else {
      list.push(cleanRecord);
    }
    localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(list));
    window.broadcastDataChange('transport_saved', { record: cleanRecord });

    // Post to Google Apps Script if configured
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: isEdit ? 'updateTransport' : 'addTransport',
            data: cleanRecord
          })
        });
      } catch (err) {
        console.error("Cloud sync error for transport:", err);
      }
    }

    return cleanRecord;
  },

  // Delete transport record
  async deleteTransport(id) {
    if (typeof AuthService !== 'undefined' && !AuthService.isAdmin()) {
      alert("Permission denied: Only Admin can delete transport records!");
      return false;
    }
    const list = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyTransport) || '[]');
    const filtered = list.filter(item => item.id !== id);
    localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(filtered));
    window.broadcastDataChange('transport_deleted', { id });

    const url = this.getApiUrl();
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteRecord', type: 'transport', id })
        });
      } catch (err) {
        console.error("Cloud sync error for delete:", err);
      }
    }
    return true;
  },

  // Save advance record
  async saveAdvance(advance) {
    const isEdit = Boolean(advance.id);
    const cleanAdv = {
      ...advance,
      id: advance.id || ('ADV-' + Date.now().toString().slice(-5)),
      section: window.normalizeSection(advance.section || 'Section 2'),
      date: window.formatDateForDisplay(advance.date),
      amount: Number(advance.amount) || 0,
      createdAt: advance.createdAt || new Date().toISOString()
    };

    const list = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyAdvances) || '[]');
    if (isEdit) {
      const idx = list.findIndex(a => a.id === cleanAdv.id);
      if (idx !== -1) list[idx] = cleanAdv;
      else list.unshift(cleanAdv);
    } else {
      list.unshift(cleanAdv);
    }
    localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(list));
    window.broadcastDataChange('advance_saved', { advance: cleanAdv });

    const url = this.getApiUrl();
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: isEdit ? 'updateAdvance' : 'addAdvance', data: cleanAdv })
        });
      } catch (err) {
        console.error("Cloud sync error for advance:", err);
      }
    }
    return cleanAdv;
  },

  // Delete advance record
  async deleteAdvance(id) {
    if (typeof AuthService !== 'undefined' && !AuthService.isAdmin()) {
      alert("Permission denied: Only Admin can delete advances!");
      return false;
    }
    const list = JSON.parse(localStorage.getItem(API_CONFIG.storageKeyAdvances) || '[]');
    const filtered = list.filter(item => item.id !== id);
    localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(filtered));
    window.broadcastDataChange('advance_deleted', { id });

    const url = this.getApiUrl();
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteRecord', type: 'advance', id })
        });
      } catch (err) {
        console.error("Cloud sync error for delete advance:", err);
      }
    }
    return true;
  }
};

window.ApiService = ApiService;


